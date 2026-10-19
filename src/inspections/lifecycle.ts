// Перебіг перевірки (004): оголошення, пункти з телеграм, купівля, результат у грі й без гравця.
import type { Big } from '@/economy/core/big';
import type { DomainEvent, EconomyConfig, EconomyState, StoredEffect } from '@/economy/game/types';
import { roller, seedFrom } from '@/telegrams/rng';

import { baseChecklist, bossFor, itemDef, priceOf } from './checklist';
import { finalChecklist, hasFinal, type LastPack, mechOk, retryChecklist, streamsOpen } from './final';
import { arrWindow, firstDue, nextArrival, warnMin } from './schedule';
import type { ChecklistItem, Inspection, InspectionOutcome, InspectionState, InspTrigger } from './types';

const MIN = 60_000;
const HOUR = 3_600_000;
/** Технічна межа, не баланс: стільки оголошень і приїздів за один tick (≈ 60 діб відсутності при інтервалі ≥ 24 год) */
const MAX_PER_TICK = 60;

export function newInspections(installMs: number, seedText: string): InspectionState {
  return {
    rng: seedFrom(seedText),
    installMs,
    nextNo: 1,
    nextArrMs: null,
    nextWarnMin: 0,
    active: null,
    last: null,
    pendingRemarkPct: 0,
    bossesSeen: [],
    callPending: false,
    journalGiven: false,
  };
}

export function inspectionId(no: number): string {
  return `insp_${String(no).padStart(4, '0')}`;
}

/** Готовність наживо: пункт механіки рахується за станом економіки, а не за записом (011 FR-5). */
export function readinessLive(insp: Pick<Inspection, 'items'>, eco: EconomyState, cfg: EconomyConfig, pack: LastPack | null = null): number {
  if (!insp.items.length) return 0;
  return Math.round((insp.items.filter((i) => (i.mech ? mechOk(i.id, eco, cfg, pack) : i.done)).length / insp.items.length) * 100);
}

export function readiness(insp: Pick<Inspection, 'items'>): number {
  if (!insp.items.length) return 0;
  return Math.round((insp.items.filter((i) => i.done).length / insp.items.length) * 100);
}

/** «бракує N · ще T» (FR-14): T — час до потрібного балансу при поточному доході, с. */
export function shortfall(item: ChecklistItem, signatures: Big, incomePerMin: number): { lack: Big; etaSec: number } | null {
  if (item.done || signatures >= item.price) return null;
  const lack = item.price - signatures;
  return { lack, etaSec: incomePerMin > 0 ? Math.ceil((lack / incomePerMin) * 60) : Infinity };
}

interface AnnounceArgs {
  nowMs: number;
  annMs: number;
  arrMs: number;
  trigger: InspTrigger;
  reason: { telegramId: string } | null;
  extraItem: string | null;
  reputation: number;
}

function announce(s0: InspectionState, eco: EconomyState, cfg: EconomyConfig, a: AnnounceArgs, rand: () => number): { s: InspectionState; events: DomainEvent[] } {
  const level = eco.level;
  const boss = bossFor(level);
  const items = baseChecklist(eco, cfg, level);
  const extra = a.extraItem ? itemDef(cfg, a.extraItem, level) : undefined;
  if (extra && a.reason) items.push({ id: extra.id, price: priceOf(extra, eco, cfg), done: false, fromTelegram: a.reason.telegramId });
  const remark = s0.pendingRemarkPct > 0 && rand() < s0.pendingRemarkPct / 100;
  const no = s0.nextNo;
  const insp: Inspection = {
    id: inspectionId(no),
    no,
    trigger: a.trigger,
    boss,
    level,
    kind: 'regular',
    attempt: 1,
    annMs: a.annMs,
    arrMs: a.arrMs,
    items,
    reason: a.reason,
    remark,
    warned: false,
    // FR-8, FR-9: модалка — перша в історії, позапланова, перша на комісії; далі лише банер
    modal: no === 1 || a.trigger === 'unscheduled' || !s0.bossesSeen.includes(boss),
  };
  const s: InspectionState = {
    ...s0,
    nextNo: no + 1,
    active: insp,
    pendingRemarkPct: 0,
    bossesSeen: s0.bossesSeen.includes(boss) ? s0.bossesSeen : [...s0.bossesSeen, boss],
  };
  return {
    s,
    events: [
      {
        type: 'inspectionStart',
        id: insp.id,
        no,
        boss,
        kind: 'regular',
        attempt: 1,
        trigger: a.trigger,
        warnSec: Math.round((a.arrMs - a.annMs) / 1000),
        reputation: a.reputation,
        itemsTotal: items.length,
      },
    ],
  };
}

/**
 * Підсумкова рівня (011 FR-2, FR-3): `boss.warnH` до приїзду, вікно приїзду як у звичайної, 5 базових пунктів + пункт механіки.
 * Модалка `boss-brief` потрібна завжди. Ціни фіксуються на мить оголошення.
 */
function announceFinal(s0: InspectionState, eco: EconomyState, cfg: EconomyConfig, nowMs: number, tz: number, reputation: number): { s: InspectionState; events: DomainEvent[] } {
  const rng = roller(s0.rng);
  const rand = () => rng.next();
  const level = eco.level;
  const no = s0.nextNo;
  const items = finalChecklist(eco, cfg, level);
  const insp: Inspection = {
    id: inspectionId(no),
    no,
    trigger: 'scheduled',
    boss: bossFor(level),
    level,
    kind: 'final',
    attempt: 1,
    annMs: nowMs,
    arrMs: arrWindow(nowMs + cfg.params.boss.warnH * HOUR, cfg.params, tz, rand),
    items,
    reason: null,
    remark: false,
    warned: false,
    modal: true,
  };
  return {
    s: { ...s0, nextNo: no + 1, active: insp, rng: rng.state },
    events: [{ type: 'inspectionStart', id: insp.id, no, boss: insp.boss, kind: 'final', attempt: 1, trigger: 'scheduled', warnSec: Math.round((insp.arrMs - nowMs) / 1000), reputation, itemsTotal: items.length }],
  };
}

/** Старт сесії: перша перевірка (FR-2) — оголошення зараз, перед ним `call` «Археолога». */
export function onSessionStart(
  s0: InspectionState,
  eco: EconomyState,
  cfg: EconomyConfig,
  nowMs: number,
  tzOffsetMin: number,
  reputation: number,
): { s: InspectionState; events: DomainEvent[] } {
  const p = cfg.params;
  if (s0.nextNo !== 1 || s0.active || !firstDue(s0.installMs, nowMs, p, tzOffsetMin)) return { s: s0, events: [] };
  const rng = roller(s0.rng);
  const rand = () => rng.next();
  const arrMs = arrWindow(nowMs + warnMin(p, rand) * MIN, p, tzOffsetMin, rand);
  const r = announce(s0, eco, cfg, { nowMs, annMs: nowMs, arrMs, trigger: 'scheduled', reason: null, extraItem: null, reputation }, rand);
  return { s: { ...r.s, callPending: true, rng: rng.state }, events: r.events };
}

export interface TickCtxFinal {
  /** Рівень з босом: виконано `exitDigitizations` цифровізацій, перехід ще не дозволено (`finalDue` з 006) */
  finalDue?: boolean;
  /** Остання видана пачка Р3 (для пункту `summary_beats`) */
  lastPack?: LastPack | null;
}

export interface TickCtx extends TickCtxFinal {
  fromMs: number;
  nowMs: number;
  tzOffsetMin: number;
  /** Гра була закрита: результат — у довідку (FR-24, FR-25) */
  offline: boolean;
  reputation: number;
  /** Цифровізацій усього (06); № 7 — лише після першої (FR-20) */
  digitizations: number;
}

export interface TickResult {
  s: InspectionState;
  effects: StoredEffect[];
  events: DomainEvent[];
  /** Приїхала планова: 003 відкриває шанс позапланових (003 FR-15) */
  scheduledArrived: boolean;
}

function resolve(s0: InspectionState, eco: EconomyState, cfg: EconomyConfig, ctx: TickCtx): TickResult {
  const active = s0.active!;
  const p = cfg.params;
  const arr = active.arrMs;
  // пункт механіки перевіряється на мить приїзду (011 FR-5, крайовий випадок «пункт зламався»)
  const insp: Inspection = { ...active, items: active.items.map((i) => (i.mech ? { ...i, done: mechOk(i.id, eco, cfg, ctx.lastPack ?? null) } : i)) };
  const done = insp.items.filter((i) => i.done).length;
  // рішення 65: пройшли лише на 100%
  const passed = done === insp.items.length;
  const mechItem = insp.items.find((i) => i.mech);
  const final = insp.kind === 'final';
  const effects: StoredEffect[] = [];
  const events: DomainEvent[] = [
    {
      type: 'inspectionFinish',
      id: insp.id,
      kind: insp.kind,
      attempt: insp.attempt,
      mechDone: mechItem ? mechItem.done : null,
      exitUnlocked: final && passed,
      result: passed ? 'passed' : 'failed',
      itemsDone: done,
      itemsTotal: insp.items.length,
      offline: ctx.offline,
      secFromStart: Math.round((arr - insp.annMs) / 1000),
    },
  ];
  if (passed && insp.trigger === 'scheduled') {
    // FR-19: ×3 на 2 год від приїзду; позапланова ×3 не дає (рішення 28)
    effects.push({ kind: 'mult', source: 'inspection_pass', value: p.inspMult, startMs: arr, endMs: arr + p.inspHours * HOUR });
    events.push({ type: 'boostActivate', boostType: 'inspection_x3', mult: p.inspMult, durationSec: p.inspHours * 3600 });
  }
  if (final && passed) events.push({ type: 'finalPassed', id: insp.id, level: insp.level, attempt: insp.attempt });
  if (!passed) {
    // FR-21, рішення 25: «Стройова частина» ×0,5 на 1 год
    effects.push({ kind: 'factor', source: 'inspection_fail', value: p.inspFailMult, target: { type: 'stage', id: 'stroy' }, startMs: arr, endMs: arr + p.inspFailHours * HOUR });
  }
  let journalGiven = s0.journalGiven;
  if (passed && !insp.remark && ctx.digitizations >= 1 && !journalGiven) {
    journalGiven = true;
    events.push({ type: 'inspectionJournal', id: insp.id });
  }
  const last: InspectionOutcome = {
    id: insp.id,
    no: insp.no,
    trigger: insp.trigger,
    boss: insp.boss,
    level: insp.level,
    kind: insp.kind,
    attempt: insp.attempt,
    exitUnlocked: final && passed,
    arrMs: arr,
    passed,
    remark: passed && insp.remark,
    items: insp.items.map((i) => ({ id: i.id, done: i.done, ...(i.fromTelegram ? { fromTelegram: i.fromTelegram } : {}), ...(i.mech ? { mech: true } : {}) })),
    reason: insp.reason,
    offline: ctx.offline,
    seen: false,
  };
  const rng = roller(s0.rng);
  const rand = () => rng.next();
  // FR-3, FR-6: наступна планова — від приїзду цієї (і планової, і позапланової)
  const nextArrMs = nextArrival(arr, p, ctx.tzOffsetMin, rand);
  const nextWarn = warnMin(p, rand);
  const base: InspectionState = { ...s0, active: null, last, journalGiven, nextArrMs, nextWarnMin: nextWarn, rng: rng.state };
  // FR-7: провал підсумкової - повтор одразу, приїзд через `boss.retryH`, виконані пункти лишаються, спроб без ліміту
  if (final && !passed) {
    const no = base.nextNo;
    const retry: Inspection = {
      ...insp,
      id: inspectionId(no),
      no,
      attempt: insp.attempt + 1,
      annMs: arr,
      arrMs: arrWindow(arr + p.boss.retryH * HOUR, p, ctx.tzOffsetMin, rand),
      items: retryChecklist(insp),
      warned: false,
      modal: true,
    };
    events.push({ type: 'inspectionStart', id: retry.id, no, boss: retry.boss, kind: 'final', attempt: retry.attempt, trigger: 'scheduled', warnSec: Math.round((retry.arrMs - arr) / 1000), reputation: ctx.reputation, itemsTotal: retry.items.length });
    return { s: { ...base, nextNo: no + 1, active: retry, rng: rng.state }, effects, events, scheduledArrived: false };
  }
  return { s: base, effects, events, scheduledArrived: insp.trigger === 'scheduled' };
}

/** Усе, що настало в (fromMs, nowMs]: оголошення планових і приїзди (FR-3, FR-4, FR-17…FR-21, FR-24). */
export function tick(s0: InspectionState, eco: EconomyState, cfg: EconomyConfig, ctx: TickCtx): TickResult {
  let s = s0;
  const effects: StoredEffect[] = [];
  const events: DomainEvent[] = [];
  let scheduledArrived = false;
  // пройдена в цьому ж тіку підсумкова не оголошується вдруге (стор ще не знає про `levelExitAllowed`)
  let finalPassed = false;
  for (let i = 0; i < MAX_PER_TICK; i++) {
    if (s.active) {
      if (s.active.arrMs > ctx.nowMs) break;
      const r = resolve(s, eco, cfg, ctx);
      s = r.s;
      effects.push(...r.effects);
      events.push(...r.events);
      scheduledArrived ||= r.scheduledArrived;
      finalPassed ||= r.events.some((e) => e.type === 'finalPassed');
      continue;
    }
    // FR-2, FR-4: підсумкова - коли в новому циклі знову відкрито всі потоки й жодна перевірка не йде
    if (ctx.finalDue && !finalPassed && hasFinal(eco.level) && streamsOpen(eco, cfg)) {
      const r = announceFinal(s, eco, cfg, ctx.nowMs, ctx.tzOffsetMin, ctx.reputation);
      s = r.s;
      events.push(...r.events);
      continue;
    }
    if (s.nextArrMs == null) break;
    const annMs = s.nextArrMs - s.nextWarnMin * MIN;
    if (annMs > ctx.nowMs) break;
    const rng = roller(s.rng);
    const r = announce(
      s,
      eco,
      cfg,
      { nowMs: ctx.nowMs, annMs, arrMs: s.nextArrMs, trigger: 'scheduled', reason: null, extraItem: null, reputation: ctx.reputation },
      () => rng.next(),
    );
    s = { ...r.s, nextArrMs: null, rng: rng.state };
    events.push(...r.events);
  }
  return { s, effects, events, scheduledArrived };
}

/**
 * Події 003 (FR-5…FR-7, FR-18): позапланова, пункт з телеграми, зауваження № 16.
 * Пункт додається лише раз; тост — назва пункту для `insp.toast_item`.
 */
export function fromTelegramEvent(
  s0: InspectionState,
  eco: EconomyState,
  cfg: EconomyConfig,
  ev: DomainEvent,
  nowMs: number,
  tzOffsetMin: number,
  reputation: number,
): { s: InspectionState; events: DomainEvent[]; addedItem: string | null } {
  const rng = roller(s0.rng);
  const rand = () => rng.next();
  const out = (s: InspectionState, events: DomainEvent[] = [], addedItem: string | null = null) => ({ s: { ...s, rng: rng.state }, events, addedItem });

  if (ev.type === 'unscheduledInspection') {
    if (s0.active) return addItem(s0, eco, cfg, ev.extraItem, ev.telegramId, out);
    const arrMs = arrWindow(nowMs + ev.warnSec * 1000, cfg.params, tzOffsetMin, rand);
    const r = announce(s0, eco, cfg, { nowMs, annMs: nowMs, arrMs, trigger: 'unscheduled', reason: { telegramId: ev.telegramId }, extraItem: ev.extraItem, reputation }, rand);
    return out(r.s, r.events);
  }
  if (ev.type === 'inspItem') {
    if (ev.item) return addItem(s0, eco, cfg, ev.item, ev.telegramId, out);
    if (ev.remarkPct > 0) {
      // № 16: на активній кидок одразу, інакше — на найближчому оголошенні (рішення 66)
      if (s0.active) return out({ ...s0, active: { ...s0.active, remark: s0.active.remark || rand() < ev.remarkPct / 100 } });
      return out({ ...s0, pendingRemarkPct: Math.max(s0.pendingRemarkPct, ev.remarkPct) });
    }
  }
  return { s: s0, events: [], addedItem: null };
}

function addItem(
  s0: InspectionState,
  eco: EconomyState,
  cfg: EconomyConfig,
  itemId: string | null,
  telegramId: string,
  out: (s: InspectionState, events?: DomainEvent[], addedItem?: string | null) => { s: InspectionState; events: DomainEvent[]; addedItem: string | null },
) {
  const insp = s0.active;
  if (!insp || !itemId || insp.items.some((i) => i.id === itemId)) return out(s0);
  const def = itemDef(cfg, itemId, insp.level);
  if (!def) return out(s0);
  // ціна пункту, доданого пізніше, — від доходу в мить додавання (R3)
  const item: ChecklistItem = { id: def.id, price: priceOf(def, eco, cfg), done: false, fromTelegram: telegramId };
  return out({ ...s0, active: { ...insp, items: [...insp.items, item] } }, [{ type: 'inspectionItemAdded', id: insp.id, itemId: def.id, telegramId }], def.id);
}

/** Годинник назад (009 FR-14): усі мітки зсуваються на rawMs (< 0), щоб залишок відліку не змінився. */
export function shiftInspections(s: InspectionState, rawMs: number): InspectionState {
  if (rawMs >= 0) return s;
  const sh = (t: number) => t + rawMs;
  const a = s.active;
  return {
    ...s,
    nextArrMs: s.nextArrMs == null ? null : sh(s.nextArrMs),
    active: a && {
      ...a,
      annMs: sh(a.annMs),
      arrMs: sh(a.arrMs),
      items: a.items.map((i) => (i.doneAtMs == null ? i : { ...i, doneAtMs: sh(i.doneAtMs) })),
    },
    last: s.last && { ...s.last, arrMs: sh(s.last.arrMs) },
  };
}

/** «Усе за рекламу» / «Забрати все» (008 FR-6): усі пункти, що є на мить нагороди; пізніші коштують підписи. */
export function completeAll(
  s0: InspectionState,
  nowMs: number,
  method: 'ad' | 'no_ads_pass',
): { s: InspectionState; events: DomainEvent[] } | { error: 'no_active' | 'done' } {
  const insp = s0.active;
  if (!insp || nowMs >= insp.arrMs) return { error: 'no_active' };
  // FR-5: пункт механіки рекламою не закривається
  const open = insp.items.filter((i) => !i.done && !i.mech);
  if (!open.length) return { error: 'done' };
  const items = insp.items.map((i) => (i.done || i.mech ? i : { ...i, done: true, doneAtMs: nowMs }));
  return {
    s: { ...s0, active: { ...insp, items } },
    events: open.map((i) => ({ type: 'inspectionItemComplete' as const, id: insp.id, itemId: i.id, method, cost: 0, secToDeadline: Math.round((insp.arrMs - nowMs) / 1000) })),
  };
}

export type BuyError = 'no_active' | 'unknown' | 'done' | 'short' | 'mech';

/** Тап по пункту (FR-14): списує ціну без підтвердження, позначку не зняти. */
export function buyItem(
  s0: InspectionState,
  eco: EconomyState,
  itemId: string,
  nowMs: number,
): { s: InspectionState; eco: EconomyState; events: DomainEvent[] } | { error: BuyError } {
  const insp = s0.active;
  if (!insp || nowMs >= insp.arrMs) return { error: 'no_active' };
  const item = insp.items.find((i) => i.id === itemId);
  if (!item) return { error: 'unknown' };
  if (item.mech) return { error: 'mech' };
  if (item.done) return { error: 'done' };
  if (eco.signatures < item.price) return { error: 'short' };
  const items = insp.items.map((i) => (i.id === itemId ? { ...i, done: true, doneAtMs: nowMs } : i));
  return {
    s: { ...s0, active: { ...insp, items } },
    eco: { ...eco, signatures: eco.signatures - item.price },
    events: [{ type: 'inspectionItemComplete', id: insp.id, itemId, method: 'signatures', cost: item.price, secToDeadline: Math.round((insp.arrMs - nowMs) / 1000) }],
  };
}
