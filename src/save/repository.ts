// Збереження гри (009 FR-1…FR-11): запис, перевірка, міграції, знімки, відновлення.
// Без годинника й React: час і сховище приходять аргументами.
import { fnv1a } from './checksum';
import type { Migration } from './migrations';
import { saveFileSchema, type SaveFile } from './schema';
import type { KeyValue } from './storage';

export const KEY_SAVE = 'save';
export const KEY_BAK1 = 'save.bak1';
export const KEY_BAK2 = 'save.bak2';
export const KEY_INSTALL = 'install_id';

export type SaveDraft = Omit<SaveFile, 'checksum'>;

export interface LoadOptions {
  current: number;
  migrations: Record<number, Migration>;
  /** Викликається перед першою міграцією: boot показує стан «міграція» (FR-10) */
  onMigrating?: () => void;
}

export type CorruptReason = 'parse' | 'checksum' | 'schema' | 'migration';

export type LoadResult =
  | { kind: 'empty' }
  | { kind: 'ok'; save: SaveFile; migratedFrom?: number }
  | { kind: 'corrupt'; reason: CorruptReason; schemaVersion: number | null; sizeChars: number; from?: number; to?: number; backup: SaveFile | null }
  | { kind: 'newer'; schemaVersion: number; appVersion: string };

/** Контрольна сума — від усіх полів, крім неї самої, у фіксованому порядку. */
function body(d: SaveDraft): string {
  return JSON.stringify([d.schemaVersion, d.savedAt, d.appVersion, d.contentVersion, d.economyConfig, d.game]);
}

export function serialize(d: SaveDraft): string {
  const file: SaveFile = {
    schemaVersion: d.schemaVersion,
    savedAt: d.savedAt,
    appVersion: d.appVersion,
    contentVersion: d.contentVersion,
    economyConfig: d.economyConfig,
    checksum: fnv1a(body(d)),
    game: d.game,
  };
  return JSON.stringify(file);
}

/** Запис `save`; false — не вдалося (повтор на наступному тіку, FR-2). */
export function writeSave(kv: KeyValue, d: SaveDraft): boolean {
  try {
    kv.set(KEY_SAVE, serialize(d));
    return true;
  } catch {
    return false;
  }
}

type Parsed =
  | { ok: true; raw: Record<string, unknown>; schemaVersion: number }
  | { ok: false; reason: CorruptReason; schemaVersion: number | null };

/** Розбір і контрольна сума без схеми (схема — після міграцій). */
function parse(text: string): Parsed {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'parse', schemaVersion: null };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'parse', schemaVersion: null };
  const r = raw as Record<string, unknown>;
  const v = typeof r.schemaVersion === 'number' && Number.isInteger(r.schemaVersion) && r.schemaVersion >= 1 ? r.schemaVersion : null;
  if (v == null) return { ok: false, reason: 'schema', schemaVersion: null };
  const draft = r as unknown as SaveDraft;
  if (r.checksum !== fnv1a(body(draft))) return { ok: false, reason: 'checksum', schemaVersion: v };
  return { ok: true, raw: r, schemaVersion: v };
}

/** Версія схеми з запису без перевірки суми: новіша схема може мати інший конверт (FR-11). */
function peekSchema(text: string): { version: number; appVersion: string } | null {
  try {
    const r = JSON.parse(text) as Record<string, unknown>;
    return typeof r?.schemaVersion === 'number' ? { version: r.schemaVersion, appVersion: String(r.appVersion ?? '') } : null;
  } catch {
    return null;
  }
}

/** Ланцюжок міграцій до поточної версії й zod-перевірка. */
function upgrade(raw: Record<string, unknown>, from: number, opts: LoadOptions): { ok: true; save: SaveFile } | { ok: false; reason: CorruptReason } {
  let game: unknown = raw.game;
  try {
    for (let v = from; v < opts.current; v++) {
      const m = opts.migrations[v];
      if (!m) return { ok: false, reason: 'migration' };
      game = m(game);
    }
  } catch {
    return { ok: false, reason: 'migration' };
  }
  const res = saveFileSchema.safeParse({ ...raw, schemaVersion: opts.current, game });
  return res.success ? { ok: true, save: res.data } : { ok: false, reason: from < opts.current ? 'migration' : 'schema' };
}

/** Валідний вміст ключа (з міграціями в пам'яті, без запису) або null. */
function readValid(kv: KeyValue, key: string, opts: LoadOptions): SaveFile | null {
  const text = kv.getString(key);
  if (text == null) return null;
  const p = parse(text);
  if (!p.ok || p.schemaVersion > opts.current) return null;
  const u = upgrade(p.raw, p.schemaVersion, opts);
  return u.ok ? u.save : null;
}

/** Найновіший валідний знімок (FR-5, FR-6). */
export function latestBackup(kv: KeyValue, opts: LoadOptions): SaveFile | null {
  return readValid(kv, KEY_BAK1, opts) ?? readValid(kv, KEY_BAK2, opts);
}

/**
 * Знімок `save`: bak1 → bak2, save → bak1 (FR-4). Знімком стає лише цілий запис (розбір і контрольна сума);
 * схему перевіряємо при читанні знімка, бо перед міграцією запис ще старої форми.
 */
export function snapshot(kv: KeyValue): boolean {
  try {
    const text = kv.getString(KEY_SAVE);
    if (text == null || !parse(text).ok) return false;
    const b1 = kv.getString(KEY_BAK1);
    // той самий вміст не витісняє старішу копію (повторний старт після збою міграції, відновлення)
    if (b1 === text) return false;
    if (b1 != null) kv.set(KEY_BAK2, b1);
    kv.set(KEY_BAK1, text);
    return true;
  } catch {
    return false; // місце скінчилося: гра йде без знімка
  }
}

/**
 * Читання на boot (FR-3, FR-9…FR-11). Пошкоджений запис не перезаписується; новіша схема не читається й не пишеться.
 * Перед міграцією — знімок; мігрований стан записується як `save`.
 */
export function loadSave(kv: KeyValue, opts: LoadOptions): LoadResult {
  const text = kv.getString(KEY_SAVE);
  if (text == null) return { kind: 'empty' };
  const sizeChars = text.length;
  // новіша схема — до будь-яких перевірок: не читаємо й не пишемо (FR-11)
  const peek = peekSchema(text);
  if (peek && peek.version > opts.current) return { kind: 'newer', schemaVersion: peek.version, appVersion: peek.appVersion };
  const p = parse(text);
  if (!p.ok) return { kind: 'corrupt', reason: p.reason, schemaVersion: p.schemaVersion, sizeChars, backup: latestBackup(kv, opts) };
  if (p.schemaVersion < opts.current) {
    opts.onMigrating?.();
    snapshot(kv);
    const u = upgrade(p.raw, p.schemaVersion, opts);
    if (!u.ok) {
      return { kind: 'corrupt', reason: 'migration', schemaVersion: p.schemaVersion, sizeChars, from: p.schemaVersion, to: opts.current, backup: latestBackup(kv, opts) };
    }
    try {
      kv.set(KEY_SAVE, serialize(u.save));
    } catch {
      // запис мігрованого не вдався: гра йде з мігрованим станом у пам'яті, автозапис повторить
    }
    return { kind: 'ok', save: u.save, migratedFrom: p.schemaVersion };
  }
  const u = upgrade(p.raw, p.schemaVersion, opts);
  if (!u.ok) return { kind: 'corrupt', reason: u.reason, schemaVersion: p.schemaVersion, sizeChars, backup: latestBackup(kv, opts) };
  return { kind: 'ok', save: u.save };
}

/** «Відновити з копії» (FR-6): найновіший валідний знімок стає `save`. */
export function restoreFromBackup(kv: KeyValue, opts: LoadOptions): SaveFile | null {
  const b = latestBackup(kv, opts);
  if (!b) return null;
  try {
    kv.set(KEY_SAVE, serialize(b));
  } catch {
    // гра відновиться в пам'яті, автозапис повторить запис
  }
  return b;
}

/** install_id поза `save`: пошкодження й скидання його не чіпають. */
export function installId(kv: KeyValue, uuid: () => string): { id: string; isNew: boolean } {
  const cur = kv.getString(KEY_INSTALL);
  if (cur) return { id: cur, isNew: false };
  const id = uuid();
  if (typeof id !== 'string' || id.length === 0) throw new Error('install_id: генератор UUID повернув порожнє значення');
  kv.set(KEY_INSTALL, id);
  return { id, isNew: true };
}
