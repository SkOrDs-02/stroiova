// Покупки й діловоди (001 FR-7…FR-14, FR-29): котирування, атомарна покупка, доменні події.
import { capAt, milestoneTarget, packPrice } from '../core';
import { income, unitMult } from './income';
import { itemsFor } from './state';
import type { Big, BuyMode, DomainEvent, EconomyConfig, EconomyState, Effect, UnitDef, UnitRef } from './types';

export interface Quote {
  levelFrom: number;
  levels: number;
  price: Big;
  affordable: boolean;
  /** Відкриття потоку можливе лише після попереднього (FR-12) */
  locked: boolean;
  /** Секунд до покупки при поточному доході; 0 — уже можна; null — дохід 0 (FR-9) */
  etaSec: number | null;
  rateBefore: number;
  rateAfter: number;
  incomeBefore: Big;
  incomeAfter: Big;
}

interface Located {
  def: UnitDef;
  index: number;
  levels: number[];
}

function locate(state: EconomyState, cfg: EconomyConfig, ref: UnitRef): Located {
  const it = itemsFor(state, cfg);
  const list = ref.type === 'stream' ? it.streams : it.stages;
  const index = list.findIndex((u) => u.id === ref.id);
  if (index < 0) throw new Error(`Немає одиниці ${ref.type}:${ref.id} на рівні ${state.level}`);
  return { def: list[index]!, index, levels: ref.type === 'stream' ? state.streamLevels : state.stageLevels };
}

function withLevel(state: EconomyState, ref: UnitRef, index: number, L: number): EconomyState {
  const key = ref.type === 'stream' ? 'streamLevels' : 'stageLevels';
  const next = state[key].slice();
  next[index] = L;
  return { ...state, [key]: next };
}

/** Скільки рівнів купує режим: відкриття — завжди 1; ×10; «до віхи» — до найближчого рівня, кратного 25 (FR-8). */
export function levelsFor(L: number, mode: BuyMode, cfg: EconomyConfig): number {
  if (L === 0) return 1;
  if (mode === 'x10') return 10;
  if (mode === 'toMilestone') return milestoneTarget(L, cfg.params) - L;
  return 1;
}

export function quote(state: EconomyState, cfg: EconomyConfig, ref: UnitRef, mode: BuyMode, t: number, effects: readonly Effect[] = []): Quote {
  const p = cfg.params;
  const { def, index, levels } = locate(state, cfg, ref);
  const L = levels[index] ?? 0;
  const n = levelsFor(L, mode, cfg);
  const price = packPrice(def, L, n);
  const locked = ref.type === 'stream' && L === 0 && index > 0 && (state.streamLevels[index - 1] ?? 0) === 0;
  const mus = unitMult(state, def.id);
  const before = income(state, cfg, t, effects).perMin;
  const after = income(withLevel(state, ref, index, L + n), cfg, t, effects).perMin;
  const affordable = !locked && state.signatures >= price;
  const etaSec = affordable ? 0 : before > 0 ? ((price - state.signatures) / before) * 60 : null;
  return {
    levelFrom: L,
    levels: n,
    price,
    affordable,
    locked,
    etaSec,
    rateBefore: capAt(def, L, p) * mus,
    rateAfter: capAt(def, L + n, p) * mus,
    incomeBefore: before,
    incomeAfter: after,
  };
}

function isBottleneck(state: EconomyState, cfg: EconomyConfig, ref: UnitRef, t: number, effects: readonly Effect[]): boolean {
  const b = income(state, cfg, t, effects).bottleneck;
  return b === 'streams' ? ref.type === 'stream' : b.type === ref.type && b.id === ref.id;
}

export type Success = { state: EconomyState; events: DomainEvent[] };
export type Result = Success | { error: 'insufficient' | 'locked' | 'already' };

export function isOk(r: Result): r is Success {
  return !('error' in r);
}

/** Атомарна покупка: або вся, або жодна (крайовий випадок «вбивство посеред покупки»). */
export function buy(state: EconomyState, cfg: EconomyConfig, ref: UnitRef, mode: BuyMode, t: number, effects: readonly Effect[] = []): Result {
  const q = quote(state, cfg, ref, mode, t, effects);
  if (q.locked) return { error: 'locked' };
  if (!q.affordable) return { error: 'insufficient' };
  const p = cfg.params;
  const { def, index } = locate(state, cfg, ref);
  const L = q.levelFrom;
  const to = L + q.levels;
  let next = withLevel(state, ref, index, to);
  next = { ...next, signatures: state.signatures - q.price };
  const events: DomainEvent[] = [];
  if (ref.type === 'stream' && L === 0) {
    const firstTime = !state.seenUnlocks.includes(def.id);
    if (firstTime) next = { ...next, seenUnlocks: [...state.seenUnlocks, def.id] };
    events.push({ type: 'streamUnlock', streamId: def.id, unlockIndex: index + 1, cost: q.price, firstTime });
  } else {
    events.push({
      type: 'purchase',
      target: ref,
      levelFrom: L,
      levelTo: to,
      levelsBought: q.levels,
      mode,
      cost: q.price,
      wasBottleneck: isBottleneck(state, cfg, ref, t, effects),
      incomeBefore: q.incomeBefore,
      incomeAfter: q.incomeAfter,
    });
  }
  for (let k = L + 1; k <= to; k++) {
    if (k % p.milestoneEvery === 0) {
      events.push({ type: 'milestone', target: ref, level: k, rateMultiplier: Math.pow(p.milestoneMult, k / p.milestoneEvery) });
    }
  }
  return { state: next, events };
}

export function clerkCount(state: EconomyState): number {
  return state.streamClerks.filter(Boolean).length + state.stageClerks.filter(Boolean).length;
}

/** Найм діловода: один на одиницю за `manager`, до цифровізації (FR-14). */
export function hire(state: EconomyState, cfg: EconomyConfig, ref: UnitRef): Result {
  const { def, index, levels } = locate(state, cfg, ref);
  if (ref.type === 'stream' && (levels[index] ?? 0) === 0) return { error: 'locked' };
  const key = ref.type === 'stream' ? 'streamClerks' : 'stageClerks';
  if (state[key][index]) return { error: 'already' };
  if (state.signatures < def.manager) return { error: 'insufficient' };
  const clerks = state[key].slice();
  clerks[index] = true;
  const next: EconomyState = { ...state, [key]: clerks, signatures: state.signatures - def.manager, hiredEver: true };
  return {
    state: next,
    events: [{ type: 'clerkHire', target: ref, cost: def.manager, isFirstClerk: !state.hiredEver, clerksCountAfter: clerkCount(next) }],
  };
}

/** Секунд до найдешевшої покупки, що піднімає дохід, при поточному доході (FR-29); null — дохід 0 або покупок немає. */
export function nextPurchaseEtaSec(state: EconomyState, cfg: EconomyConfig, t: number, effects: readonly Effect[] = []): number | null {
  const it = itemsFor(state, cfg);
  const refs: UnitRef[] = [
    ...it.streams.map((u) => ({ type: 'stream' as const, id: u.id })),
    ...it.stages.map((u) => ({ type: 'stage' as const, id: u.id })),
  ];
  let best: Quote | null = null;
  for (const ref of refs) {
    const q = quote(state, cfg, ref, 'x1', t, effects);
    if (q.locked || !(q.incomeAfter > q.incomeBefore)) continue;
    if (!best || q.price < best.price) best = q;
  }
  return best ? best.etaSec : null;
}
