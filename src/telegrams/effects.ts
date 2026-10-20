// Відповідь на телеграму (003 FR-9…FR-20, FR-30): стан вхідних, економіка, ефекти, таймери, події — атомарно й чисто.
import { refuel } from '@/economy/game/actions';
import { itemsFor } from '@/economy/game/state';
import type { DomainEvent, EconomyConfig, EconomyState, StoredEffect, UnitRef } from '@/economy/game/types';

import { telegram, OVERRIDE_ID } from './content';
import { applyRep, repTier, replyChance } from './reputation';
import { roller } from './rng';
import type { Choice, Effects, InboxItem, ItemResult, Slow, Telegram, TelegramState } from './types';

const MIN = 60_000;
const HOUR = 3_600_000;

export interface AnswerCtx {
  cfg: EconomyConfig;
  nowMs: number;
  /** Місцева дата РРРР-ММ-ДД: ліміт позапланових за добу */
  dayKey: string;
  /** Зведена відповідь пачки (011 FR-21): папір, репутація, сповільнення й кидок рахує пачка, а не телеграма */
  merge?: boolean;
}

export interface AnswerResult {
  tg: TelegramState;
  eco: EconomyState;
  effects: StoredEffect[];
  events: DomainEvent[];
  item: InboxItem;
}

/** Телеграма, з якої взято вхідний запис (override — шаблон). */
export function telegramOf(item: InboxItem): Telegram | undefined {
  return telegram(item.kind === 'override' ? OVERRIDE_ID : item.id);
}

/** Тривалість сповільнення від телеграми з журналом № 11: ⌈d·(1 − s·k24)⌉ хв (016 FR-10) */
export function cutHours(hours: number, eco: EconomyState): number {
  const cut = eco.museum.slowCut ?? 1;
  return cut === 1 ? hours : Math.ceil(hours * 60 * cut - 1e-9) / 60;
}

/** Ціль сповільнення: ланка чи потік поточного рівня; на Р1 «Казначейства» немає — null. */
export function unitRef(eco: EconomyState, cfg: EconomyConfig, id: string): UnitRef | null {
  const it = itemsFor(eco, cfg);
  if (it.stages.some((u) => u.id === id)) return { type: 'stage', id };
  if (it.streams.some((u) => u.id === id)) return { type: 'stream', id };
  return null;
}

function hasClerk(eco: EconomyState, cfg: EconomyConfig, ref: UnitRef): boolean {
  const it = itemsFor(eco, cfg);
  if (ref.type === 'stage') return !!eco.stageClerks[it.stages.findIndex((u) => u.id === ref.id)];
  return !!eco.streamClerks[it.streams.findIndex((u) => u.id === ref.id)];
}

/** Папір варіанта з урахуванням прапорця (`ifFlag`), без кидків. */
export function paperCost(e: Effects, flags: Record<string, true>): number {
  let n = e.paper ?? 0;
  if (e.ifFlag && flags[e.ifFlag.flag]) n += e.ifFlag.effects.paper ?? 0;
  return n;
}

export type Availability = { ok: true } | { ok: false; reason: 'paper'; n: number } | { ok: false; reason: 'digital' } | { ok: false; reason: 'drawer' };

/** Чи можна обрати варіант (FR-18, FR-25): папір не стає від'ємним, «на цифру» — лише з P_total ≥ 1. */
export function canChoose(tg: TelegramState, eco: EconomyState, c: Choice, fromDrawer = false): Availability {
  if (fromDrawer && c.kind === 'drawer') return { ok: false, reason: 'drawer' };
  if (c.requires?.digitalPoints && eco.prestigePoints < c.requires.digitalPoints) return { ok: false, reason: 'digital' };
  const need = paperCost(c.effects, tg.flags);
  const have = Math.floor(eco.paper);
  return need > have ? { ok: false, reason: 'paper', n: need - have } : { ok: true };
}

/**
 * Застосувати вибір (FR-12…FR-20). Відповідь із шухляди скасовує ще не застосовані `delayed` і повернення (FR-10).
 * Шанс позапланової: p за репутацією й щитом (FR-14…FR-16), ≤ unscheduledPerDay на добу.
 */
export function answer(tg0: TelegramState, eco0: EconomyState, uid: string, choiceId: string, ctx: AnswerCtx): AnswerResult | { error: 'state' | 'choice' | 'paper' | 'digital' | 'drawer' } {
  const idx = tg0.inbox.findIndex((x) => x.uid === uid);
  const item0 = tg0.inbox[idx];
  if (!item0 || (item0.status !== 'new' && item0.status !== 'drawer')) return { error: 'state' };
  const tel = telegramOf(item0);
  const choice = tel?.choices.find((c) => c.id === choiceId);
  if (!tel || !choice) return { error: 'choice' };
  const fromDrawer = item0.status === 'drawer';
  const av = canChoose(tg0, eco0, choice, fromDrawer);
  // зведена відповідь перевіряє папір одним числом на всю пачку (`packs.ts`)
  if (!av.ok && !(ctx.merge && av.reason === 'paper')) return { error: av.reason };

  const { cfg, nowMs } = ctx;
  const p = cfg.params;
  const rng = roller(tg0.rng);
  let tg: TelegramState = fromDrawer ? { ...tg0, timers: tg0.timers.filter((t) => t.itemUid !== uid || (t.kind !== 'delayed' && t.kind !== 'return')) } : tg0;
  let eco = eco0;
  const effects: StoredEffect[] = [];
  const events: DomainEvent[] = [];
  const tierBefore = repTier(tg.reputation.value, p);
  const shield = !!choice.effects.digitalShield && eco.prestigePoints >= 1;
  const res: ItemResult = { rep: 0, repAfter: tg.reputation.value, paper: 0, slow: [], chancePct: 0, inspHit: false, shield };
  let workUntil = 0;
  let returnsAfter: number | null = null;

  const slowEffect = (s0: Slow) => {
    // № 11 (016): сповільнення від телеграми триває коротше, до хвилини вгору; події (комбат, нарада) не чіпаємо
    const s: Slow = { ...s0, hours: cutHours(s0.hours, eco) };
    const ref = unitRef(eco, cfg, s.target);
    if (!ref) return;
    // 013 FR-9: цифрову ланку телеграми не сповільнюють
    if (ref.type === 'stage' && eco.digital.includes(ref.id)) {
      res.immune = [...(res.immune ?? []), s.target];
      return;
    }
    const endMs = nowMs + Math.round(s.hours * HOUR);
    effects.push({ kind: 'factor', source: 'telegram_slow', value: s.mult, target: ref, startMs: nowMs, endMs });
    res.slow.push(s);
    workUntil = Math.max(workUntil, endMs);
  };

  const apply = (e: Effects, nested: boolean, merged = !!ctx.merge) => {
    if (e.paper && !merged) {
      eco = { ...eco, paper: Math.max(0, eco.paper - e.paper) };
      res.paper += e.paper;
    }
    if (!merged) for (const s of e.slow ?? []) slowEffect(s);
    if (e.rep && !merged) {
      // цифровий щит: без зниження репутації (FR-16)
      const d = e.rep < 0 && shield ? 0 : e.rep;
      if (d) {
        tg = applyRep(tg, d, nowMs, uid);
        res.rep += d;
      }
    }
    if (e.durationMin) workUntil = Math.max(workUntil, nowMs + e.durationMin * MIN);
    // № 19: кидок не зараз, а через inspRollAfterHours (таймер рахує шанс на мить кидка)
    if (e.inspPct && !e.inspRollAfterHours && !merged) {
      const pr = replyChance(tg, p, e.inspPct, !!choice.effects.digitalShield, eco.prestigePoints);
      res.chancePct = Math.round(pr * 100);
      const used = tg.unscheduledDays.filter((d) => d === ctx.dayKey).length;
      if (pr > 0 && rng.next() < pr && used < p.unscheduledPerDay) {
        res.inspHit = true;
        tg = { ...tg, unscheduledDays: [...tg.unscheduledDays, ctx.dayKey].slice(-7) };
        events.push({ type: 'unscheduledInspection', telegramId: tel.id, warnSec: p.unscheduledWarnH * 3600, extraItem: e.inspExtraItem ?? null });
      }
    }
    if (e.inspRollAfterHours && e.inspPct) {
      tg = { ...tg, timers: [...tg.timers, { atMs: nowMs + e.inspRollAfterHours * HOUR, kind: 'inspRoll', itemUid: uid, pct: e.inspPct }] };
    }
    // пункт чекліста — лише разом із випадінням (FR-15); зауваження № 16 — окремо, для 04
    if (e.inspExtraItem && res.inspHit) events.push({ type: 'inspItem', telegramId: tel.id, item: e.inspExtraItem, remarkPct: 0 });
    if (e.inspRemarkPct) events.push({ type: 'inspItem', telegramId: tel.id, item: null, remarkPct: e.inspRemarkPct });
    if (e.roll && rng.next() < e.roll.pct / 100) {
      res.rollText = e.roll.text;
      apply(e.roll.effects, true, false);
    }
    for (const d of e.delayed ?? []) tg = { ...tg, timers: [...tg.timers, { atMs: nowMs + d.afterHours * HOUR, kind: 'delayed', itemUid: uid, effects: d.effects }] };
    if (e.returnsAfterHours) returnsAfter = e.returnsAfterHours;
    if (e.fuel) {
      if (e.fuel.fillTank) eco = refuel(eco, cfg, nowMs).state;
      if (e.fuel.fillAfterHours) tg = { ...tg, timers: [...tg.timers, { atMs: nowMs + e.fuel.fillAfterHours * HOUR, kind: 'fill', itemUid: uid }] };
      if (e.fuel.refuelBlockedHours) tg = { ...tg, refuelBlockedUntil: Math.max(tg.refuelBlockedUntil, nowMs + e.fuel.refuelBlockedHours * HOUR) };
    }
    if (e.kombat && rng.next() < e.kombat.pct / 100) events.push({ type: 'kombatRequest', maxMin: e.kombat.maxMin });
    if (e.clerkAway) {
      const ref = unitRef(eco, cfg, e.clerkAway.target);
      if (ref) effects.push({ kind: 'factor', source: 'clerk_away', value: 1, target: ref, startMs: nowMs, endMs: nowMs + e.clerkAway.hours * HOUR });
    }
    if (e.setFlag) tg = { ...tg, flags: { ...tg.flags, [e.setFlag]: true } };
    if (e.ifFlag && tg.flags[e.ifFlag.flag]) {
      const flag = e.ifFlag.flag;
      apply(e.ifFlag.effects, true, merged);
      if (e.ifFlag.effects.clearFlag) {
        const { [flag]: _gone, ...rest } = tg.flags;
        tg = { ...tg, flags: rest };
      }
    }
    if (e.ifNoClerk) {
      const ref = unitRef(eco, cfg, e.ifNoClerk.target);
      if (ref && !hasClerk(eco, cfg, ref)) {
        if (e.text) res.rollText = e.text;
        apply(e.ifNoClerk.effects, true, merged);
      }
    }
    if (e.queueNext && !nested) tg = { ...tg, queue: [...e.queueNext, ...tg.queue] };
    if (e.race) events.push({ type: 'raceEffect', telegramId: tel.id, effect: e.race });
    if (e.arc) events.push({ type: 'arc', id: e.arc });
  };

  apply(choice.effects, false);
  res.repAfter = tg.reputation.value;

  for (const f of tel.followUps ?? []) {
    if (f.ifChoice && !f.ifChoice.includes(choiceId)) continue;
    tg = { ...tg, timers: [...tg.timers, { atMs: nowMs + f.afterHours * HOUR, kind: 'followUp', itemUid: uid, telegramId: f.id }] };
  }

  // статус (FR-9): шухляда — у шухляду; сповільнення чи durationMin — «на виконанні»; решта — в архів
  let item: InboxItem;
  if (choice.kind === 'drawer') {
    item = { ...item0, status: 'drawer', choiceId, answeredAt: nowMs, result: res };
  } else if (workUntil > nowMs) {
    item = { ...item0, status: 'work', choiceId, answeredAt: nowMs, workUntil, result: res };
  } else {
    item = { ...item0, status: 'archive', choiceId, answeredAt: nowMs, result: res };
  }
  if (returnsAfter != null) tg = { ...tg, timers: [...tg.timers, { atMs: nowMs + returnsAfter * HOUR, kind: 'return', itemUid: uid }] };

  const inbox = tg.inbox.slice();
  inbox[idx] = item;
  tg = { ...tg, inbox, rng: rng.state };

  const tierAfter = repTier(tg.reputation.value, p);
  if (tierAfter !== tierBefore) events.push({ type: 'reputationTierChange', from: tierBefore, to: tierAfter, value: tg.reputation.value });
  events.push({
    type: 'telegramAnswer',
    telegramId: tel.id,
    uid,
    choiceId,
    choiceKind: choice.kind,
    repDelta: res.rep,
    chancePct: res.chancePct,
    paper: res.paper,
    ...(item0.pack ? { packId: item0.pack.id, isPackSummary: !!ctx.merge } : {}),
  });
  // зведена відповідь дає один запис курйозів на пачку (011 FR-24), а не три
  if (!ctx.merge) events.push({ type: 'curio', telegramId: tel.id, uid, text: choice.effects.curio ?? null });
  return { tg, eco, effects, events, item };
}

/** Відкрити телеграму без вибору (FR-11): в архів «до відома», її ефекти — `journal`, `cancelInspRollOf`. */
export function openNotice(tg: TelegramState, uid: string, nowMs: number): { tg: TelegramState; events: DomainEvent[] } {
  const idx = tg.inbox.findIndex((x) => x.uid === uid);
  const item = tg.inbox[idx];
  if (!item || item.kind !== 'notice' || item.status !== 'new') return { tg, events: [] };
  const tel = telegram(item.id);
  const events: DomainEvent[] = [{ type: 'curio', telegramId: item.id, uid, text: null }];
  let timers = tg.timers;
  const e = tel?.effects ?? {};
  if (e.journal) events.push({ type: 'journal', id: e.journal });
  if (e.cancelInspRollOf) {
    const target = e.cancelInspRollOf;
    const uids = new Set(tg.inbox.filter((x) => x.id === target).map((x) => x.uid));
    timers = timers.filter((t) => !(t.kind === 'inspRoll' && uids.has(t.itemUid)));
  }
  const inbox = tg.inbox.slice();
  inbox[idx] = { ...item, status: 'archive', read: true, answeredAt: nowMs };
  return { tg: { ...tg, inbox, timers }, events };
}
