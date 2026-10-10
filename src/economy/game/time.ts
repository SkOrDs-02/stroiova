// Час між сесіями (009 FR-13, FR-14) і межа сесії (FR-4, session_start). Чисті функції: годинник читає застосунок.
import type { EconomyState, Effect } from './types';

/** Нова сесія: холодний старт або повернення після ≥ 120 с (tracking-plan, session_start). */
export const SESSION_GAP_MS = 120_000;

export interface Absence {
  /** Скільки зараховувати: max(0, зараз − savedAt) */
  deltaMs: number;
  /** Годинник переведено назад: офлайн 0, таймери зсунуто (FR-14) */
  clockBack: boolean;
  /** Сирий зсув (від'ємний при clockBack) */
  rawMs: number;
}

export function absence(savedAt: number, now: number): Absence {
  const rawMs = now - savedAt;
  return { deltaMs: Math.max(0, rawMs), clockBack: rawMs < 0, rawMs };
}

export function isNewSession(lastActiveAt: number | null, now: number): boolean {
  return lastActiveAt == null || now - lastActiveAt >= SESSION_GAP_MS;
}

/**
 * FR-14: при годиннику назад усі збережені абсолютні мітки зсуваються на rawMs (< 0),
 * щоб залишок кожного таймера дорівнював залишку на момент запису.
 */
export function shiftTimers(state: EconomyState, effects: readonly Effect[], rawMs: number): { state: EconomyState; effects: Effect[] } {
  if (rawMs >= 0) return { state, effects: effects.slice() };
  const sh = (t: number) => t + rawMs;
  return {
    state: {
      ...state,
      fuelEndMs: state.fuelEndMs == null ? null : sh(state.fuelEndMs),
      catBonusAtMs: state.catBonusAtMs == null ? null : sh(state.catBonusAtMs),
      tapTimes: state.tapTimes.map(sh),
    },
    effects: effects.map((e) => ({ ...e, startMs: sh(e.startMs), endMs: sh(e.endMs) })),
  };
}
