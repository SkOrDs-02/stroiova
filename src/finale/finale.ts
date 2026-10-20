// Фінал (013 FR-15…FR-23): стан-машина кроків order → script → last_book → call → credits → quiet → endless_offer.
// Чистий домен: без годинника й React. Після кожного кроку стан зберігається, запуск продовжує з першого незавершеного.

export const STEPS = ['order', 'script', 'last_book', 'call', 'credits', 'quiet', 'endless_offer'] as const;
export type FinaleStep = (typeof STEPS)[number];

const DAY = 86_400_000;

export interface FinaleState {
  /** Мить конвертації № 6 (початок фіналу); null - фінал не почато */
  startMs: number | null;
  /** Мітки завершення кроків */
  done: Partial<Record<FinaleStep, number>>;
  /** Мить Y на `finale-script`: від неї тиждень тиші й вимкнені телеграми */
  yMs: number | null;
  /** Гравця не пустило на `finale-script` (N) - розсилка працює */
  scriptNs: number;
}

export function newFinale(): FinaleState {
  return { startMs: null, done: {}, yMs: null, scriptNs: 0 };
}

/** Фінал запускає конвертація № 6 (FR-15); повторно не стартує */
export function start(f: FinaleState, nowMs: number): FinaleState {
  return f.startMs == null ? { ...f, startMs: nowMs } : f;
}

export function started(f: FinaleState): boolean {
  return f.startMs != null;
}

/** Фінал пройдено: усі кроки до `endless_offer` включно закрито */
export function finished(f: FinaleState): boolean {
  return f.startMs != null && STEPS.every((s) => f.done[s] != null);
}

/** Тиша спливає за часом від Y (FR-22): годинник назад її не скорочує, бо мітка Y лишається */
export function quietEndsMs(f: FinaleState, quietDays: number): number | null {
  return f.yMs == null ? null : f.yMs + quietDays * DAY;
}

export function quietLeftMs(f: FinaleState, quietDays: number, nowMs: number): number {
  const end = quietEndsMs(f, quietDays);
  return end == null ? quietDays * DAY : Math.max(0, end - nowMs);
}

/**
 * Перший незавершений крок, який гравець може зробити зараз; null - нічого (фінал не почато, тиша йде, чи кінець).
 * `quiet` завершується часом, а не дією, тож його видно як поточний лише до спливання - для цього є `quietLeftMs`.
 */
export function current(f: FinaleState, quietDays: number, nowMs: number): FinaleStep | null {
  if (f.startMs == null) return null;
  for (const s of STEPS) {
    if (f.done[s] != null) continue;
    if (s === 'quiet') return nowMs >= (quietEndsMs(f, quietDays) ?? Infinity) ? 'quiet' : null;
    return s;
  }
  return null;
}

/** Крок, що чекає дії гравця (банер на `main`, FR-16): order, script, last_book, credits; call - перебивний, без банера */
export function pendingAction(f: FinaleState): FinaleStep | null {
  if (f.startMs == null) return null;
  for (const s of STEPS) {
    if (f.done[s] != null) continue;
    return s === 'order' || s === 'script' || s === 'last_book' || s === 'credits' ? s : null;
  }
  return null;
}

export interface Completed {
  f: FinaleState;
  /** Крок справді завершено цим викликом */
  changed: boolean;
}

/** Завершити крок (FR-15). Кроки йдуть по порядку; повторне завершення нічого не змінює. */
export function complete(f: FinaleState, step: FinaleStep, nowMs: number): Completed {
  if (f.startMs == null || f.done[step] != null) return { f, changed: false };
  const i = STEPS.indexOf(step);
  if (STEPS.slice(0, i).some((s) => f.done[s] == null)) return { f, changed: false };
  const next: FinaleState = { ...f, done: { ...f.done, [step]: nowMs } };
  if (step === 'script') next.yMs = nowMs;
  return { f: next, changed: true };
}

/** N на Y/N: нічого не завершує, банер лишається (FR-18) */
export function declineScript(f: FinaleState): FinaleState {
  return f.startMs == null || f.done.script != null ? f : { ...f, scriptNs: f.scriptNs + 1 };
}

/** Розсилка вимкнена Y (FR-19): за розкладом телеграми не приходять; відновить її Дубль 1 (етап 2b, № 113) */
export function mailingStopped(f: FinaleState): boolean {
  return f.yMs != null;
}

/** Секунд від початку фіналу (властивість `sec_since_finale_start`) */
export function secSinceStart(f: FinaleState, nowMs: number): number {
  return f.startMs == null ? 0 : Math.max(0, Math.round((nowMs - f.startMs) / 1000));
}
