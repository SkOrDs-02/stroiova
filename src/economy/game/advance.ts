// Нарахування за інтервал (001 FR-3, FR-24): інтеграл кусково-сталої швидкості по точках зміни множників.
// Результат не залежить від частоти кадрів: швидкість × тривалість без проміжного округлення.
import { integrate } from '../core';
import { paperPerMin } from './actions';
import { fuelBonusEndMs, fuelMult, income } from './income';
import type { Big, EconomyConfig, EconomyState, Effect } from './types';

const MIN = 60_000;

/** Точки в (a, b), де змінюється множник чи фактор: межі ефектів і момент, коли бак доходить до порога. */
export function cutPoints(state: EconomyState, cfg: EconomyConfig, a: number, b: number, effects: readonly Effect[]): number[] {
  const cuts = [a, b];
  const add = (x: number) => { if (x > a && x < b) cuts.push(x); };
  for (const e of effects) { add(e.startMs); add(e.endMs); }
  add(fuelBonusEndMs(state, cfg));
  return cuts.sort((x, y) => x - y);
}

/** Підписи, зароблені за [a, b] (мс); idle — лише одиниці з діловодами (FR-15). */
export function earnedBetween(state: EconomyState, cfg: EconomyConfig, a: number, b: number, effects: readonly Effect[], idle = false): Big {
  if (b <= a) return 0;
  return integrate(cutPoints(state, cfg, a, b, effects), (t) => income(state, cfg, t, effects, { idle }).perMin / MIN);
}

/** Онлайн: гра на передньому плані з fromMs до toMs за монотонним годинником (FR-3). */
export function advance(state: EconomyState, cfg: EconomyConfig, fromMs: number, toMs: number, effects: readonly Effect[] = []): { state: EconomyState; earned: Big } {
  const earned = earnedBetween(state, cfg, fromMs, toMs, effects);
  const paper = paperPerMin(state, cfg, false) * Math.max(0, toMs - fromMs) / MIN;
  if (earned === 0 && paper === 0) return { state, earned };
  return {
    state: { ...state, signatures: state.signatures + earned, lifetimeCycle: state.lifetimeCycle + earned, paper: state.paper + paper },
    earned,
  };
}

export interface OfflineResult {
  /** Зароблено за зарахований час, без ×2 */
  earned: Big;
  awayMs: number;
  /** min(відсутність, сховище) */
  creditedMs: number;
  /** Скільки обрізало сховище (FR-27) */
  cappedMs: number;
  storageMs: number;
  /** Скільки зарахованого часу діяв бонус пального */
  fuelBonusMs: number;
  /** Дохід 0, бо немає діловодів (FR-28) */
  idle: boolean;
  /** Коротка відсутність: тост без довідки (FR-25) */
  short: boolean;
  /** Аркуші від Накладних з діловодом за зарахований час (FR-22); ×2 на папір не діє */
  paper: number;
}

/** Скільки відсутності зараховується: min(відсутність, сховище) (FR-15); так само рахує стос до наради (012) */
export function creditedAwayMs(state: EconomyState, leftAtMs: number, backAtMs: number): number {
  const awayMs = Math.max(0, backAtMs - leftAtMs);
  return Math.min(awayMs, state.storageHours * 3_600_000 * state.museum.storage);
}

/** Офлайн-дохід (FR-15, FR-23, FR-24): лише одиниці з діловодами, перші min(Δ, сховище), відрізки за множниками. */
export function offline(state: EconomyState, cfg: EconomyConfig, leftAtMs: number, backAtMs: number, effects: readonly Effect[] = []): OfflineResult {
  const awayMs = Math.max(0, backAtMs - leftAtMs);
  const storageMs = state.storageHours * 3_600_000 * state.museum.storage;
  const creditedMs = creditedAwayMs(state, leftAtMs, backAtMs);
  const end = leftAtMs + creditedMs;
  const earned = earnedBetween(state, cfg, leftAtMs, end, effects, true);
  const idle = income(state, cfg, leftAtMs, [], { idle: true }).flow.v === 0;
  // скільки зарахованого часу діяв ×fuelBonus — від бака понад поріг або від подарунка «генератор» (FR-21)
  const fuelBonusMs = integrate(cutPoints(state, cfg, leftAtMs, end, effects), (t) => (fuelMult(state, cfg, t, effects) > 1 ? 1 : 0));
  const paper = (paperPerMin(state, cfg, true) * creditedMs) / MIN;
  return { earned, awayMs, creditedMs, cappedMs: awayMs - creditedMs, storageMs, fuelBonusMs, idle, short: awayMs < cfg.params.offlineReturnMin * MIN, paper };
}

/**
 * Нагород ×2, використаних на місцеву добу (FR-26). Лічильник скидається, лише коли дата пізніша за збережену
 * (09 FR-15): переведений назад годинник ліміт не обнуляє. Дата — РРРР-ММ-ДД, тож рядки порівнюються як дати.
 */
function doublesUsed(state: EconomyState, localDate: string): number {
  return localDate > state.offlineDoubles.date ? 0 : state.offlineDoubles.count;
}

export function offlineDoublesLeft(state: EconomyState, cfg: EconomyConfig, localDate: string): number {
  return Math.max(0, cfg.params.offlineAdPerDay - doublesUsed(state, localDate));
}

/**
 * Зарахувати довідку: k = 1 або offlineAdMult (×2 за ролик чи «Забрати» з «Без реклами», 08).
 * Лічильник росте лише з нагородою ×2; ×1 спробу не витрачає (FR-26).
 */
export function claimOffline(
  state: EconomyState,
  cfg: EconomyConfig,
  res: OfflineResult,
  doubled: boolean,
  localDate: string,
): { state: EconomyState; claimed: Big } | { error: 'limit' } {
  if (doubled && offlineDoublesLeft(state, cfg, localDate) === 0) return { error: 'limit' };
  const claimed = res.earned * (doubled ? cfg.params.offlineAdMult : 1);
  const used = doublesUsed(state, localDate);
  const date = localDate > state.offlineDoubles.date ? localDate : state.offlineDoubles.date;
  return {
    claimed,
    state: {
      ...state,
      signatures: state.signatures + claimed,
      lifetimeCycle: state.lifetimeCycle + claimed,
      paper: state.paper + res.paper,
      offlineDoubles: doubled ? { date, count: used + 1 } : state.offlineDoubles,
    },
  };
}
