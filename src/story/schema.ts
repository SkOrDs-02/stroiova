// Перевірка контенту сюжету (014 FR-1): схема кроку, унікальні id, відомі носії, ланцюжки `requires` без циклів, порядок в арці.
import { z } from 'zod';

import { ARCS, CARRIERS, type Beat, type DiaryLine } from './types';

const hours = z.number().nonnegative();
const trigger = z.discriminatedUnion('type', [
  z.object({ type: z.literal('level_enter'), level: z.number().int().min(1).max(5), afterHours: hours.optional() }).strict(),
  z.object({ type: z.literal('digitization_on_level'), n: z.number().int().positive(), afterHours: hours.optional() }).strict(),
  z.object({ type: z.literal('boss_announced'), afterHours: hours.optional() }).strict(),
  z.object({ type: z.literal('boss_passed'), level: z.number().int().min(1).max(5), afterHours: hours.optional() }).strict(),
  z.object({ type: z.literal('pack_received'), n: z.number().int().positive(), afterHours: hours.optional() }).strict(),
  z.object({ type: z.literal('race_won'), gift: z.string(), level: z.number().int().min(1).max(5), nth: z.number().int().positive(), afterHours: hours.optional() }).strict(),
  z.object({ type: z.literal('gift_arrived'), level: z.number().int().min(1).max(5), nth: z.number().int().positive(), afterHours: hours.optional() }).strict(),
  z.object({ type: z.literal('conversion'), k: z.number().int().min(1).max(6), afterHours: hours.optional() }).strict(),
  z.object({ type: z.literal('finale_step'), step: z.string(), afterHours: z.union([hours, z.literal('next_day')]).optional() }).strict(),
  z.object({ type: z.literal('session_first_of_day'), afterHours: hours.optional() }).strict(),
  z.object({ type: z.literal('telegram_answered'), telegramId: z.string(), choiceKind: z.string().optional(), afterHours: hours.optional() }).strict(),
  z.object({ type: z.literal('beat_delivered'), beat: z.string(), afterHours: hours.optional() }).strict(),
]);

const beat = z
  .object({
    id: z.string().regex(/^st_[a-z_]+_\d{2}$/),
    rev: z.number().int().positive(),
    arc: z.enum(ARCS),
    order: z.number().int().positive(),
    level: z.number().int().min(1).max(5).optional(),
    trigger,
    requires: z.array(z.object({ beat: z.string(), afterHours: hours.optional() }).strict()).optional(),
    carrier: z.enum(CARRIERS),
    payload: z.record(z.string(), z.unknown()),
    required: z.boolean().optional(),
    outsideQuota: z.boolean().optional(),
    minAppVersion: z.string().optional(),
    review: z.boolean().optional(),
    effects: z.object({ journal: z.number().int().optional(), characterState: z.string().optional() }).strict().optional(),
  })
  .strict();

const str = z.string().min(1);
/** Обов'язкові поля `payload` за носієм */
const PAYLOAD: Record<(typeof CARRIERS)[number], z.ZodType> = {
  telegram: z.object({ telegramId: str }).strict(),
  note: z.object({ from: str, title: str, body: str }).strict(),
  event_toast: z.object({ from: str, title: str, body: str }).strict(),
  curio: z.object({ from: str, title: str, body: str }).strict(),
  call: z.object({ from: str, lines: z.array(str).min(1) }).strict(),
  scene: z.object({ screen: str, state: str, lines: z.array(str) }).strict(),
  archive_sheet: z.object({ sheetId: str }).strict(),
  share_card: z.object({ card: str, caption: str }).strict(),
  insp_act_line: z.object({ line: str }).strict(),
  credits_line: z.object({ line: str }).strict(),
  character_state: z.object({ character: str, state: str }).strict(),
};

export const storyFileSchema = z.object({ schema: z.literal(1), beats: z.array(beat).min(1) }).strict();

const diaryLine = z
  .object({
    id: z.string().regex(/^di_[a-z0-9_]+$/),
    level: z.number().int().min(1).max(5).optional(),
    quiet: z.boolean().optional(),
    order: z.number().int().positive(),
    key: z.boolean(),
    text: str,
    review: z.boolean().optional(),
  })
  .strict();
export const diaryFileSchema = z.object({ schema: z.literal(1), lines: z.array(diaryLine).min(1) }).strict();

/** Повертає список помилок; порожній - файл правильний. `telegramIds` - усі відомі id телеграм (ВП-11). */
export function checkStory(file: unknown, telegramIds?: ReadonlySet<string>): string[] {
  const p = storyFileSchema.safeParse(file);
  if (!p.success) return p.error.issues.map((i) => `story: ${i.path.join('.')}: ${i.message}`);
  const beats = p.data.beats as unknown as Beat[];
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const b of beats) {
    if (ids.has(b.id)) errs.push(`${b.id}: дубль id`);
    ids.add(b.id);
    const pl = PAYLOAD[b.carrier].safeParse(b.payload);
    if (!pl.success) errs.push(`${b.id}: payload не збігається з носієм ${b.carrier}: ${pl.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`);
    if (b.carrier === 'telegram' && telegramIds && !telegramIds.has((b.payload as { telegramId: string }).telegramId)) errs.push(`${b.id}: телеграми ${(b.payload as { telegramId: string }).telegramId} немає в контенті`);
  }
  const orders = new Set<string>();
  for (const b of beats) {
    const k = `${b.arc}:${b.order}`;
    if (orders.has(k)) errs.push(`${b.id}: порядок ${b.order} в арці ${b.arc} уже зайнято`);
    orders.add(k);
    for (const r of b.requires ?? []) if (!ids.has(r.beat)) errs.push(`${b.id}: requires невідомий крок ${r.beat}`);
    if (b.trigger.type === 'beat_delivered' && !ids.has(b.trigger.beat)) errs.push(`${b.id}: trigger на невідомий крок ${b.trigger.beat}`);
  }
  // цикли: залежність кроку = requires + trigger.beat_delivered + усі попередні кроки арки
  const deps = new Map<string, string[]>();
  for (const b of beats) {
    const d = (b.requires ?? []).map((r) => r.beat);
    if (b.trigger.type === 'beat_delivered') d.push(b.trigger.beat);
    for (const o of beats) if (o.arc === b.arc && o.order < b.order) d.push(o.id);
    deps.set(b.id, d);
  }
  const state = new Map<string, 1 | 2>();
  const visit = (id: string, trail: string[]): void => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      errs.push(`цикл у залежностях: ${[...trail, id].join(' -> ')}`);
      return;
    }
    state.set(id, 1);
    for (const d of deps.get(id) ?? []) if (ids.has(d)) visit(d, [...trail, id]);
    state.set(id, 2);
  };
  for (const id of ids) visit(id, []);
  return errs;
}

/** Бойові деталі, яких у вісточках «Пташки» немає (FR-12, FR-20): лише добрі новини без війни */
export const COMBAT_WORDS = /бо[йї]|бойов|снаряд|боєприпас|вибух|обстріл|уражен|ворож|ворог|окупант|ракет|атак|нальот|приціл|ціль|цілі/i;

const textsOf = (b: Beat): string[] => {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(b.payload);
  return out;
};

/** Додаткові правила тексту й порядку кроків (FR-1, FR-12) */
export function checkStoryRules(file: unknown): string[] {
  const p = storyFileSchema.safeParse(file);
  if (!p.success) return [];
  const beats = p.data.beats as unknown as Beat[];
  const errs: string[] = [];
  for (const b of beats) {
    for (const t of textsOf(b)) {
      for (const m of t.matchAll(/\{([mf]):[^|}]*(\|[^}]*)?\}/g)) if (!m[2]) errs.push(`${b.id}: форма ${m[0]} без другої`);
      if (b.arc === 'ptashka' && COMBAT_WORDS.test(t)) errs.push(`${b.id}: бойова деталь у вісточці Пташки: ${t.slice(0, 60)}`);
    }
    if ((b.trigger.type === 'digitization_on_level' || b.trigger.type === 'boss_announced') && b.level == null) errs.push(`${b.id}: тригер ${b.trigger.type} без level ніколи не спрацює`);
  }
  // наскрізний order в арці: 1…n без прогалин
  for (const arc of new Set(beats.map((b) => b.arc))) {
    const orders = beats.filter((b) => b.arc === arc).map((b) => b.order).sort((a, c) => a - c);
    orders.forEach((o, i) => {
      if (o !== i + 1) errs.push(`арка ${arc}: порядок має бути наскрізним 1…${orders.length}, знайдено ${o} на місці ${i + 1}`);
    });
  }
  return errs;
}

export function checkDiary(file: unknown): string[] {
  const p = diaryFileSchema.safeParse(file);
  if (!p.success) return p.error.issues.map((i) => `diary: ${i.path.join('.')}: ${i.message}`);
  const lines = p.data.lines as unknown as DiaryLine[];
  const errs: string[] = [];
  const ids = new Set<string>();
  const orders = new Set<string>();
  for (const l of lines) {
    if (ids.has(l.id)) errs.push(`${l.id}: дубль id`);
    ids.add(l.id);
    if ((l.level == null) === (l.quiet !== true)) errs.push(`${l.id}: потрібне рівно одне з level чи quiet`);
    const k = `${l.level ?? 'q'}:${l.order}`;
    if (orders.has(k)) errs.push(`${l.id}: порядок ${l.order} уже зайнято`);
    orders.add(k);
    // обидві форми там, де є стать протагоніста
    for (const m of l.text.matchAll(/\{([mf]):[^|}]*(\|[^}]*)?\}/g)) if (!m[2]) errs.push(`${l.id}: форма ${m[0]} без другої`);
  }
  return errs;
}
