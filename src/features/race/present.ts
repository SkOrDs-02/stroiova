// Підписи гонки (005): тривалості, бонус, рядки довідки.
import { formatDuration, formatMult } from '@/economy/format';
import type { EconomyParams } from '@/economy/core/types';
import type { GiftType, RaceOutcome } from '@/race/types';

import { raceT } from './texts';

/** «5 год 12 хв», менше години — «40 хв», без днів (FR-10, рішення 14); секунди не показуємо */
export function dur(ms: number): string {
  return formatDuration(Math.ceil(Math.max(0, ms) / 60_000) * 60);
}

export function bonusText(type: GiftType, p: EconomyParams): string {
  const g = p.gifts[type];
  return raceT.bonus(type, formatMult(g.fuel ? p.fuelBonus : g.mult));
}

export function multText(type: GiftType, p: EconomyParams): string {
  const g = p.gifts[type];
  return formatMult(g.fuel ? p.fuelBonus : g.mult);
}

/** Рядок довідки повернення (FR-26): гонка скінчилась без гравця. */
export function offlineRaceRows(last: RaceOutcome | null): { k: string; v: string; bad: boolean }[] {
  if (!last || !last.offline || last.seen) return [];
  return last.won ? [{ k: raceT.offWon[last.type], v: raceT.offWonN[last.type], bad: false }] : [{ k: raceT.offLost, v: raceT.offLostV[last.type], bad: true }];
}
