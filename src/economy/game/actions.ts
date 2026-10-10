// Дії гравця поза покупками (001 FR-16, FR-20, FR-22, FR-32).
import { baseIncomePerMin, fuelBonusEndMs, multStack } from './income';
import type { Big, EconomyConfig, EconomyState, Effect } from './types';

const SEC = 1000;
const MIN = 60_000;

/**
 * Тап по печатці (FR-16): tapValue × M незалежно від вузького місця, діловода й сповільнень (M той самий, що для конвеєра,
 * разом із пальним). Зараховуємо не більше tapRateMax тапів за секунду, решту ігноруємо.
 */
export function tap(state: EconomyState, cfg: EconomyConfig, t: number, effects: readonly Effect[] = []): { state: EconomyState; credited: boolean; gain: Big } {
  const max = cfg.params.tapRateMax ?? 10;
  const win = t - state.tapWindow.startMs >= SEC || t < state.tapWindow.startMs ? { startMs: t, count: 0 } : state.tapWindow;
  if (win.count >= max) return { state: win === state.tapWindow ? state : { ...state, tapWindow: win }, credited: false, gain: 0 };
  const gain = cfg.params.tapValue * multStack(state, cfg, t, effects).total;
  return {
    credited: true,
    gain,
    state: {
      ...state,
      signatures: state.signatures + gain,
      lifetimeCycle: state.lifetimeCycle + gain,
      tapWindow: { startMs: win.startMs, count: win.count + 1 },
    },
  };
}

export interface RefuelInfo {
  /** Рівень бака до заправки, 0–100 (generator_refuel.tank_pct_before) */
  tankPctBefore: number;
  tankCapacitySec: number;
  /** Скільки бак простояв ≤ порога перед заправкою; 0, якщо бонус ще діяв */
  bonusOffSec: number;
}

/** «Заправити» безкоштовно до повного (FR-20). */
export function refuel(state: EconomyState, cfg: EconomyConfig, t: number): { state: EconomyState; info: RefuelInfo } {
  const cap = state.fuelCapacityMs;
  const left = state.fuelEndMs == null ? 0 : Math.max(0, state.fuelEndMs - t);
  const offFrom = fuelBonusEndMs(state, cfg);
  return {
    state: { ...state, fuelEndMs: t + cap },
    info: {
      tankPctBefore: Math.round((left / cap) * 100),
      tankCapacitySec: Math.round(cap / SEC),
      bonusOffSec: state.fuelEndMs == null ? 0 : Math.max(0, Math.round((t - offFrom) / SEC)),
    },
  };
}

/** Кіт Сейф (FR-32): catBonusMin хвилин базового доходу не частіше разу на catCooldownMin. */
export function catTap(state: EconomyState, cfg: EconomyConfig, t: number): { state: EconomyState; gain: Big } {
  const p = cfg.params;
  const ready = state.catBonusAtMs == null || t - state.catBonusAtMs >= p.catCooldownMin * MIN;
  if (!ready || p.catBonusMin <= 0) return { state, gain: 0 };
  const gain = p.catBonusMin * baseIncomePerMin(state, cfg);
  return { gain, state: { ...state, signatures: state.signatures + gain, lifetimeCycle: state.lifetimeCycle + gain, catBonusAtMs: t } };
}

/** Аркушів за хвилину від Накладних (FR-22); поза грою — лише з діловодом на Накладних. */
export function paperPerMin(state: EconomyState, cfg: EconomyConfig, idle: boolean): number {
  const i = cfg.params.streams.findIndex((u) => u.id === 'nakladni');
  if (i < 0) return 0;
  const L = state.streamLevels[i] ?? 0;
  if (L <= 0 || (idle && !state.streamClerks[i])) return 0;
  return L * cfg.params.paperPerMinPerLevel * state.museum.paper;
}

/** Подарунок Ліни (05): paperGift аркушів × журнал № 3. */
export function giftPaper(state: EconomyState, cfg: EconomyConfig): EconomyState {
  return { ...state, paper: state.paper + cfg.params.paperGift * state.museum.paper };
}
