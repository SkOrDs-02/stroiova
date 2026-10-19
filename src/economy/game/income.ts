// Дохід гри (001 FR-4…FR-6, FR-15, FR-17, FR-18, FR-21, FR-31): ядро flow() + множники й фактори з ефектів.
import { capAt, flow, prestigeMult, zpzShare } from '../core';
import type { FlowResult, FlowStage, FlowStream } from '../core';
import { itemsFor } from './state';
import type { Big, EconomyConfig, EconomyState, Effect, UnitRef } from './types';

export const activeAt = (e: Effect, t: number) => e.startMs <= t && t < e.endMs;

/** Добуток факторів подій на одиниці в момент t (FR-18); фактора ×0 немає. */
export function unitFactor(ref: UnitRef, t: number, effects: readonly Effect[]): number {
  let f = 1;
  for (const e of effects) {
    if (e.kind === 'factor' && e.target && e.target.type === ref.type && e.target.id === ref.id && activeAt(e, t)) f *= e.value;
  }
  return f;
}

/** Діловод одиниці у відрядженні в момент t (003 `clerkAway`): офлайн одиниця працює як без діловода. */
export function clerkAwayAt(ref: UnitRef, t: number, effects: readonly Effect[]): boolean {
  return effects.some((e) => e.source === 'clerk_away' && e.target?.type === ref.type && e.target.id === ref.id && activeAt(e, t));
}

/** Пальне: ×fuelBonus, поки бак понад поріг або служить подарунок «генератор» (FR-21). */
export function fuelMult(state: EconomyState, cfg: EconomyConfig, t: number, effects: readonly Effect[]): number {
  const p = cfg.params;
  if (effects.some((e) => e.source === 'gift_generator' && activeAt(e, t))) return p.fuelBonus;
  if (state.fuelEndMs == null) return 1;
  return t < fuelBonusEndMs(state, cfg) ? p.fuelBonus : 1;
}

/** Мить, коли бак доходить до порога (20%) і бонус вимикається. */
export function fuelBonusEndMs(state: EconomyState, cfg: EconomyConfig): number {
  if (state.fuelEndMs == null) return -Infinity;
  return state.fuelEndMs - state.fuelCapacityMs * cfg.params.fuelBonusThreshold;
}

/** Рівень бака в момент t, 0–100 (resource-sheet, generator_refuel). */
export function tankPct(state: EconomyState, t: number): number {
  if (state.fuelEndMs == null) return 0;
  return Math.max(0, Math.min(100, Math.round(((state.fuelEndMs - t) / state.fuelCapacityMs) * 100)));
}

export interface MultRow {
  source: 'prestige' | 'no_ads' | Effect['source'] | 'fuel';
  value: number;
  endsAtMs?: number;
}

/** M і його складники в порядку FR-17: бали, «Без реклами», реклама, подарунок, перевірка, пальне. */
export function multStack(state: EconomyState, cfg: EconomyConfig, t: number, effects: readonly Effect[]): { rows: MultRow[]; total: number } {
  const p = cfg.params;
  const rows: MultRow[] = [];
  if (state.prestigePoints > 0) rows.push({ source: 'prestige', value: prestigeMult(state.prestigePoints, p) });
  if (state.hasNoAds) rows.push({ source: 'no_ads', value: p.paidMult });
  const order: Effect['source'][] = ['onboarding_bird', 'ad_boost', 'gift_drone', 'gift_shovel', 'inspection_pass'];
  for (const src of order) {
    for (const e of effects) {
      if (e.kind === 'mult' && e.source === src && activeAt(e, t)) rows.push({ source: src, value: e.value, endsAtMs: e.endMs });
    }
  }
  const fm = fuelMult(state, cfg, t, effects);
  if (fm !== 1) rows.push({ source: 'fuel', value: fm, endsAtMs: fuelBonusEndMs(state, cfg) });
  let total = 1;
  for (const r of rows) total *= r.value;
  return { rows, total };
}

export interface Income {
  /** Підписів за хвилину з M */
  perMin: Big;
  flow: FlowResult;
  /** «streams», якщо сума потоків ≤ найвужчої ланки (FR-6) */
  bottleneck: 'streams' | UnitRef;
  M: number;
}

function conveyor(state: EconomyState, cfg: EconomyConfig, t: number, effects: readonly Effect[], idle: boolean, withFactors: boolean): FlowResult {
  const p = cfg.params;
  const it = itemsFor(state, cfg);
  const mus = (id: string) => state.museum.unit[id] ?? 1;
  const streams: FlowStream[] = it.streams.map((u, i) => {
    const L = state.streamLevels[i] ?? 0;
    const on = L > 0 && (!idle || (!!state.streamClerks[i] && !clerkAwayAt({ type: 'stream', id: u.id }, t, effects)));
    const f = withFactors ? unitFactor({ type: 'stream', id: u.id }, t, effects) : 1;
    // Р4: «Звіти про звіти» не мають власного виробітку - s(n) від суми інших потоків, далі музей і фактор події (012 FR-7…FR-9)
    if (u.share) return { cap: 0, on, share: { base: on ? zpzShare(L, p) : 0, factors: [mus(u.id), f] } };
    return { cap: on ? capAt(u, L, p) * mus(u.id) * f : 0, on };
  });
  const stages: FlowStage[] = it.stages.map((u, j) => {
    const on = !idle || (!!state.stageClerks[j] && !clerkAwayAt({ type: 'stage', id: u.id }, t, effects));
    const f = withFactors ? unitFactor({ type: 'stage', id: u.id }, t, effects) : 1;
    return { cap: capAt(u, state.stageLevels[j] ?? 0, p) * mus(u.id) * f, on };
  });
  return flow(streams, stages);
}

export function income(state: EconomyState, cfg: EconomyConfig, t: number, effects: readonly Effect[] = [], opts: { idle?: boolean } = {}): Income {
  const fl = conveyor(state, cfg, t, effects, !!opts.idle, true);
  const M = multStack(state, cfg, t, effects).total;
  const it = itemsFor(state, cfg);
  const bottleneck: Income['bottleneck'] = fl.sum <= fl.pipe ? 'streams' : { type: 'stage', id: it.stages[fl.which]!.id };
  return { perMin: fl.v * M, flow: fl, bottleneck, M };
}

/** Базовий дохід (FR-31): без тимчасових множників і факторів подій; від нього ціни «у хвилинах доходу». */
export function baseIncomePerMin(state: EconomyState, cfg: EconomyConfig): Big {
  const fl = conveyor(state, cfg, 0, [], false, false);
  return fl.v * prestigeMult(state.prestigePoints, cfg.params) * (state.hasNoAds ? cfg.params.paidMult : 1);
}

export interface ZpzInfo {
  /** s(n): частка від суми інших потоків */
  s: number;
  /** Частка ЗпЗ у сумі всіх потоків: rate_ЗпЗ / (Σ інших + rate_ЗпЗ) з усіма факторами (рішення 103) */
  share: number;
  /** Виробіток ЗпЗ, /хв, без загального множника M */
  rate: Big;
}

/** «Звіти про звіти» на мить t: частка й виробіток (unit-sheet, `zpz_level`); без потоку на рівні - нулі. */
export function zpzInfo(state: EconomyState, cfg: EconomyConfig, t: number, effects: readonly Effect[] = []): ZpzInfo {
  const it = itemsFor(state, cfg);
  const zi = it.streams.findIndex((u) => u.share);
  if (zi < 0 || (state.streamLevels[zi] ?? 0) <= 0) return { s: 0, share: 0, rate: 0 };
  const withZ = conveyor(state, cfg, t, effects, false, true);
  const without = conveyor({ ...state, streamLevels: state.streamLevels.map((l, i) => (i === zi ? 0 : l)) }, cfg, t, effects, false, true);
  const rate = withZ.sum - without.sum;
  return { s: zpzShare(state.streamLevels[zi] ?? 0, cfg.params), share: withZ.sum > 0 ? rate / withZ.sum : 0, rate };
}

/** Частка (0…1) у десятих відсотка з відкиданням дробу: показ і перевірка `zpz_level` беруть це саме число */
export function shareTenths(share: number): number {
  return Math.floor(share * 1000 + 1e-9);
}

/** Приріст частки ЗпЗ (десяті відсотка) від покупки `levels` рівнів потоку з урахуванням музею й сповільнень */
export function zpzGainTenths(state: EconomyState, cfg: EconomyConfig, t: number, effects: readonly Effect[], levels: number): number {
  const it = itemsFor(state, cfg);
  const zi = it.streams.findIndex((u) => u.share);
  if (zi < 0) return 0;
  const cur = state.streamLevels[zi] ?? 0;
  const after = { ...state, streamLevels: state.streamLevels.map((l, i) => (i === zi ? cur + levels : l)) };
  return Math.max(0, shareTenths(zpzInfo(after, cfg, t, effects).share) - shareTenths(zpzInfo(state, cfg, t, effects).share));
}
