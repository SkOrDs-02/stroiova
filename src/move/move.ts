// «Переїзд» (017, рішення 121): чистий домен. Раз на початку рівнів `moveLevels` гравець за MOVE_MS (20 с, GDD «Події») складає ящики у бус:
// ящики з'являються по одному, кожен - у своєму вікні часу; нескладений ящик забирає `moveLossPerBox` запасу паперу.
import type { EconomyParams } from '@/economy/core';

/** Тривалість міні-гри, мс ігрового часу на передньому плані (GDD «Події»: 20 с) */
export const MOVE_MS = 20_000;

/** Що йде в запис: рівні, на яких переїзд уже відбувся */
export interface MoveState {
  done: number[];
}

export function newMove(): MoveState {
  return { done: [] };
}

export interface MoveCtx {
  level: number;
  /** Номер Дубля (0 - перше проходження): у Дублях переїзду немає (013 FR-28) */
  dubN: number;
  onboardingDone: boolean;
  /** Фінал почато (013): переїзду немає */
  finaleStarted: boolean;
}

/** Переїзд належить на поточному рівні й ще не відбувся (FR-1, FR-2) */
export function moveDue(m: MoveState, p: EconomyParams, c: MoveCtx): boolean {
  if (!c.onboardingDone || c.dubN > 0 || c.finaleStarted) return false;
  if (p.moveBoxes <= 0 || !p.moveLevels.includes(c.level)) return false;
  return !m.done.includes(c.level);
}

/**
 * Ящик, що зараз у вікні: ящики йдуть по одному, на кожен - MOVE_MS / moveBoxes; null - час вийшов.
 * Складений ящик лишається складеним, а наступний з'являється в свій час (рішення 121).
 */
export function boxAt(elapsedMs: number, p: EconomyParams): number | null {
  if (p.moveBoxes <= 0 || elapsedMs >= MOVE_MS || elapsedMs < 0) return null;
  return Math.floor(elapsedMs / (MOVE_MS / p.moveBoxes));
}

/** Скільки паперу втрачено: частка запасу за кожен нескладений ящик, не більше за запас (FR-8) */
export function paperLost(paper: number, stacked: number, p: EconomyParams): number {
  const missed = Math.max(0, p.moveBoxes - Math.max(0, Math.min(stacked, p.moveBoxes)));
  return Math.max(0, paper) * Math.min(1, missed * p.moveLossPerBox);
}

/** Переїзд рівня завершено: позначка в записі */
export function finishMove(m: MoveState, level: number): MoveState {
  return m.done.includes(level) ? m : { done: [...m.done, level] };
}
