// Розклад і доставка (003 FR-1…FR-7, FR-17, FR-24, FR-31): план доби, слоти до now, таймери, «на виконанні» → архів.
import { refuel } from '@/economy/game/actions';
import type { DomainEvent, EconomyConfig, EconomyState, EconomyParams } from '@/economy/game/types';

import { FADING_FROM, pick } from './bag';
import { dayKey, dayNumber, dayStart, DAY, HOUR, monthOf } from './clock';
import { FIRST_TELEGRAM_ID, OVERRIDE_ID, telegram } from './content';
import { deliverPack, newRows, PACK_HOUR } from './packs';
import { applyRep, replyChance } from './reputation';
import { roller, seedFrom } from './rng';
import type { InboxItem, ItemKind, TelegramState, Timer } from './types';

const MIN = 60_000;

/** Перший номер наказу override — з контенту (`orderNoStart`). */
export function overrideStartNo(): number {
  return telegram(OVERRIDE_ID)?.schedule?.orderNoStart ?? 0;
}

export function newTelegrams(p: EconomyParams, seedText: string): TelegramState {
  return {
    rng: seedFrom(seedText),
    day: null,
    startMs: null,
    inbox: [],
    queue: [],
    timers: [],
    flags: {},
    reputation: { value: p.repStart, history: [] },
    firstInspectionPassed: false,
    unscheduledDays: [],
    refuelBlockedUntil: 0,
    override: { lastDayKey: null, nextNo: overrideStartNo() },
    kombat: { lastDayKey: null, active: null },
    meeting: { lastDayKey: null, active: null },
    packs: { day: null, seq: 0 },
    brief: { lastDay: null },
    sedo: { lastDayKey: null, active: null },
    deliveries: 0,
    lineBags: {},
  };
}

/** Місць у «Нових»: пачка Р3 - одне (011 FR-18) */
export function newCount(tg: TelegramState): number {
  return newRows(tg);
}

function makeItem(tg: TelegramState, id: string, kind: ItemKind, atMs: number): { tg: TelegramState; item: InboxItem } {
  const item: InboxItem = { uid: `${id}#${tg.deliveries + 1}`, id, kind, receivedAt: atMs, status: 'new' };
  return { tg: { ...tg, inbox: [...tg.inbox, item], deliveries: tg.deliveries + 1 }, item };
}

/**
 * Сценарна № 1 (FR-1; 02 FR-18): доба 1 починається з цієї миті, № 1 входить у її квоту (FR-2).
 * Повторно не доставляється.
 */
export function deliverFirst(tg: TelegramState, nowMs: number): { tg: TelegramState; item: InboxItem | null; events: DomainEvent[] } {
  if (tg.inbox.some((x) => x.id === FIRST_TELEGRAM_ID)) return { tg, item: null, events: [] };
  const r = makeItem({ ...tg, startMs: tg.startMs ?? nowMs }, FIRST_TELEGRAM_ID, 'telegram', nowMs);
  return { tg: r.tg, item: r.item, events: [{ type: 'telegramReceive', telegramId: FIRST_TELEGRAM_ID, uid: r.item.uid, delivery: 'live', scripted: true }] };
}

/**
 * План доби (R2): N = slotsMin…slotsMax рівномірно, моменти у вікні tgFromHour–tgToHour з інтервалом ≥ tgMinGapMin;
 * доба 1 — лише після startMs, а № 1 уже з'їла один слот квоти.
 */
export function planDay(p: EconomyParams, start: number, notBefore: number, quotaUsed: number, rand: () => number, level = 1, conversions = 0): number[] {
  // Р3: пачка о 03:00 + 0-1 окрема телеграма у вікні (011 FR-17); на Р4 знову 2-4 окремі на добу без пачок (012 FR-24)
  // Р5 після конвертації № 4: 1-2 на добу (013 FR-14)
  const late = level >= 5 && conversions >= FADING_FROM;
  const lo = late ? p.slowPerDayLateMin : p.slowPerDayMin;
  const hi = late ? p.slowPerDayLateMax : p.slowPerDayMax;
  const n = level === 3 ? (rand() < p.pack.singleChance ? 1 : 0) : lo + Math.floor(rand() * (hi - lo + 1)) - quotaUsed;
  const from = Math.max(start + p.tgFromHour * HOUR, notBefore);
  const to = start + p.tgToHour * HOUR;
  const gap = p.tgMinGapMin * MIN;
  if (n <= 0 || to <= from) return [];
  for (let attempt = 0; attempt < 50; attempt++) {
    const s = Array.from({ length: n }, () => from + rand() * (to - from)).sort((a, b) => a - b);
    let ok = s[0]! - notBefore >= (quotaUsed ? gap : 0);
    for (let i = 1; ok && i < s.length; i++) ok = s[i]! - s[i - 1]! >= gap;
    if (ok) return s.map(Math.round);
  }
  // вікно не вміщає N слотів з інтервалом: стільки, скільки вміщає, рівним кроком
  const fit = Math.max(0, Math.min(n, Math.floor((to - from) / gap) + (quotaUsed ? 0 : 1)));
  return Array.from({ length: fit }, (_, i) => Math.round(from + (quotaUsed ? gap : 0) + i * gap)).filter((t) => t < to);
}

export interface TickCtx {
  cfg: EconomyConfig;
  /** Від якої миті доставляти (остання оброблена) і до якої */
  fromMs: number;
  nowMs: number;
  tzOffsetMin: number;
  level: number;
  digitizations: number;
  /** Конвертацій ланок Р5 (013): умови пулу й частота після № 4 */
  conversions?: number;
  raceActive: string | null;
  /** Гра була закрита: доставка з `delivery: while_away` (FR-3) */
  away: boolean;
}

export interface TickResult {
  tg: TelegramState;
  eco: EconomyState;
  events: DomainEvent[];
  delivered: InboxItem[];
}

/** Слоти доби в (from, to]: план будується для кожної доби, яку зачепив проміжок (не більше 30 діб). */
function dueSlots(tg0: TelegramState, p: EconomyParams, from: number, to: number, tz: number, rand: () => number, level = 1, conversions = 0): { tg: TelegramState; slots: { at: number; dayKey: string; dayNo: number }[] } {
  let tg = tg0;
  const slots: { at: number; dayKey: string; dayNo: number }[] = [];
  if (tg.startMs == null || to <= from) return { tg, slots };
  const firstDay = dayStart(tg.startMs, tz);
  let d = Math.max(dayStart(from, tz), dayStart(to, tz) - 30 * DAY, firstDay);
  for (; d <= to; d += DAY) {
    const key = dayKey(d + HOUR, tz);
    if (!tg.day || tg.day.key !== key) {
      // годинник назад: доба з меншою датою не перебудовується
      if (tg.day && key < tg.day.key) continue;
      const isFirst = d === firstDay;
      const plan = planDay(p, d, isFirst ? tg.startMs! : d, isFirst ? 1 : 0, rand, level, conversions);
      tg = { ...tg, day: { key, slots: plan, used: 0 } };
    }
    const day = tg.day!;
    const dayNo = Math.round((d - firstDay) / DAY) + 1;
    for (let i = day.used; i < day.slots.length; i++) {
      const at = day.slots[i]!;
      if (at > to) break;
      if (at > from) slots.push({ at, dayKey: key, dayNo });
      tg = { ...tg, day: { ...tg.day!, used: i + 1 } };
    }
  }
  return { tg, slots };
}

/** Обробити все, що настало в (fromMs, nowMs]: таймери й слоти в хронологічному порядку (FR-3, FR-17). */
export function tick(tg0: TelegramState, eco0: EconomyState, ctx: TickCtx): TickResult {
  const p = ctx.cfg.params;
  const rng = roller(tg0.rng);
  const planned = dueSlots(tg0, p, ctx.fromMs, ctx.nowMs, ctx.tzOffsetMin, () => rng.next(), ctx.level, ctx.conversions ?? 0);
  let tg = planned.tg;
  let eco = eco0;
  const events: DomainEvent[] = [];
  const delivered: InboxItem[] = [];
  const delivery = ctx.away ? 'while_away' : 'live';

  // 011 FR-17: пачка Р3 о 03:00 кожної доби; перша - після 03:00 наступної доби від входу на Р3. На Р4 пачок немає (012 FR-24)
  const packDays: { at: number }[] = [];
  if (ctx.level === 3 && tg.startMs != null && ctx.nowMs > ctx.fromMs) {
    let last = tg.packs.day ?? dayKey(ctx.fromMs, ctx.tzOffsetMin);
    for (let d = dayStart(ctx.fromMs, ctx.tzOffsetMin); d <= ctx.nowMs; d += DAY) {
      const key = dayKey(d + HOUR, ctx.tzOffsetMin);
      const at = d + PACK_HOUR * HOUR;
      if (key > last && at > ctx.fromMs && at <= ctx.nowMs) {
        packDays.push({ at });
        last = key;
      }
    }
    tg = { ...tg, packs: { ...tg.packs, day: last } };
  }

  type Step = { at: number; slot?: (typeof planned.slots)[number]; timer?: Timer; pack?: boolean };
  const steps: Step[] = [
    ...planned.slots.map((s) => ({ at: s.at, slot: s })),
    ...packDays.map((d) => ({ at: d.at, pack: true })),
    ...tg.timers.filter((t) => t.atMs <= ctx.nowMs).map((t) => ({ at: t.atMs, timer: t })),
  ].sort((a, b) => a.at - b.at);
  tg = { ...tg, timers: tg.timers.filter((t) => t.atMs > ctx.nowMs) };

  const deliver = (id: string, kind: ItemKind, at: number, extra: Partial<InboxItem> = {}) => {
    const r = makeItem(tg, id, kind, at);
    tg = r.tg;
    let item = r.item;
    if (Object.keys(extra).length) {
      item = { ...item, ...extra };
      tg = { ...tg, inbox: [...tg.inbox.slice(0, -1), item] };
    }
    delivered.push(item);
    events.push({ type: 'telegramReceive', telegramId: id, uid: item.uid, delivery, scripted: false });
  };

  for (const st of steps) {
    if (st.pack) {
      // FR-4 (011): у «Нових» уже п'ять - пачку пропущено як слот, наступна завтра
      if (newCount(tg) >= p.tgMaxNew) continue;
      const r = deliverPack(tg, st.at, () => rng.next(), delivery);
      if (!r) continue;
      tg = r.tg;
      delivered.push(...r.items);
      events.push(...r.events);
      continue;
    }
    if (st.slot) {
      const { at, dayKey: key, dayNo } = st.slot;
      if (newCount(tg) >= p.tgMaxNew) continue; // FR-4: слот пропускається, а не відкладається
      // «Новий наказ скасовує старий» займає слот (FR-24)
      const ov = telegram(OVERRIDE_ID)?.schedule;
      const gapOk = tg.override.lastDayKey == null || daysBetween(tg.override.lastDayKey, key) >= p.overrideMinGapDays;
      if (ov && dayNo >= p.overrideFromDay && gapOk && rng.next() < p.overrideChance) {
        const n = tg.override.nextNo;
        tg = { ...tg, override: { lastDayKey: key, nextNo: n + 2 } };
        deliver(OVERRIDE_ID, 'override', at, { vars: { n, n1: n + 1 } });
        continue;
      }
      const choice = pick(tg, { nowMs: at, level: ctx.level, digitizations: ctx.digitizations, conversions: ctx.conversions ?? 0, month: monthOf(at, ctx.tzOffsetMin), raceActive: ctx.raceActive, repeatMinDays: p.tgRepeatMinDays }, () => rng.next());
      if (!choice) continue;
      // черга чиститься й від уже отриманих id (FR-6)
      tg = { ...tg, queue: tg.queue.filter((q) => q !== choice.id && !tg.inbox.some((x) => x.id === q)) };
      deliver(choice.id, choice.fromQueue && telegram(choice.id)?.kind === 'notice' ? 'notice' : 'telegram', at);
      continue;
    }
    const t = st.timer!;
    const item = tg.inbox.find((x) => x.uid === t.itemUid);
    if (t.kind === 'delayed' && t.effects) {
      if (t.effects.rep) tg = applyRep(tg, t.effects.rep, t.atMs, t.itemUid);
      if (t.effects.paper) eco = { ...eco, paper: Math.max(0, eco.paper - t.effects.paper) };
    } else if (t.kind === 'return' && item) {
      // повертається в «Нові» (№ 26 із шухляди, повернення після відписки)
      tg = { ...tg, inbox: tg.inbox.map((x) => (x.uid === item.uid ? { ...x, status: 'new', receivedAt: t.atMs, choiceId: undefined, result: undefined, workUntil: undefined } : x)) };
    } else if (t.kind === 'followUp' && t.telegramId) {
      const f = telegram(t.telegramId);
      if (f) deliver(f.id, f.kind === 'notice' ? 'notice' : 'telegram', t.atMs);
    } else if (t.kind === 'fill') {
      eco = refuel(eco, ctx.cfg, t.atMs).state;
    } else if (t.kind === 'inspRoll' && t.pct) {
      const used = tg.unscheduledDays.filter((d) => d === dayKey(t.atMs, ctx.tzOffsetMin)).length;
      // шанс на мить кидка: рівень репутації й перша планова — як у FR-14…FR-16
      const pr = replyChance(tg, p, t.pct, false, eco.prestigePoints);
      if (pr > 0 && rng.next() < pr && used < p.unscheduledPerDay) {
        tg = { ...tg, unscheduledDays: [...tg.unscheduledDays, dayKey(t.atMs, ctx.tzOffsetMin)].slice(-7) };
        events.push({ type: 'unscheduledInspection', telegramId: item?.id ?? '', warnSec: p.unscheduledWarnH * 3600, extraItem: null });
      }
    }
  }

  // «Комбата знайшли» (FR-28): подія для random_event_resolve (етап 5), один раз
  const k = tg.kombat.active;
  if (k && !k.found && k.endMs <= ctx.nowMs) {
    tg = { ...tg, kombat: { ...tg.kombat, active: { ...k, found: true } } };
    events.push({ type: 'kombatFound', how: k.runnerAtMs != null ? 'runner' : 'wait' });
  }

  // «Нарада закінчилась» (011 FR-25): так само, один раз
  const m = tg.meeting.active;
  if (m && !m.found && m.endMs <= ctx.nowMs) {
    tg = { ...tg, meeting: { ...tg.meeting, active: { ...m, found: true } } };
    events.push({ type: 'meetingFound', how: m.runnerAtMs != null ? 'note' : 'wait' });
  }

  // «на виконанні» → архів (FR-9)
  if (tg.inbox.some((x) => x.status === 'work' && (x.workUntil ?? 0) <= ctx.nowMs)) {
    tg = { ...tg, inbox: tg.inbox.map((x) => (x.status === 'work' && (x.workUntil ?? 0) <= ctx.nowMs ? { ...x, status: 'archive' } : x)) };
  }
  return { tg: { ...tg, rng: rng.state }, eco, events, delivered };
}

function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}
