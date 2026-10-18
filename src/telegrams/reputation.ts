// Репутація (003 FR-21…FR-23; рішення 61–63): ціле 0–100, три рівні, множник шансу позапланової перевірки.
import type { EconomyParams } from '@/economy/game/types';

import type { TelegramState } from './types';

export type Tier = 'low' | 'norm' | 'high';

export function repTier(value: number, p: EconomyParams): Tier {
  return value < p.repLow ? 'low' : value >= p.repHigh ? 'high' : 'norm';
}

/** R' = min(100, max(0, R + Δ)); історія — 3 останні зміни для reputation-sheet. */
export function applyRep(tg: TelegramState, delta: number, atMs: number, uid: string): TelegramState {
  if (delta === 0) return tg;
  const value = Math.min(100, Math.max(0, tg.reputation.value + delta));
  const history = [{ delta, atMs, uid }, ...tg.reputation.history].slice(0, 3);
  return { ...tg, reputation: { value, history } };
}

/**
 * Шанс позапланової перевірки після відписки (FR-14…FR-16): 0 до першої пройденої планової і з цифровим щитом при P_total ≥ 1;
 * інакше min(1, inspPct/100 × k), k = ×1,5 / ×1 / ×0,5 за рівнем.
 */
export function replyChance(tg: TelegramState, p: EconomyParams, inspPct: number, shield: boolean, pTotal: number): number {
  if (!tg.firstInspectionPassed || inspPct <= 0) return 0;
  if (shield && pTotal >= 1) return 0;
  const tier = repTier(tg.reputation.value, p);
  const k = tier === 'low' ? p.replyChanceLow : tier === 'high' ? p.replyChanceHigh : 1;
  return Math.min(1, (inspPct / 100) * k);
}
