// Розклад подарунків (005 FR-1…FR-3, рішення 30): як `giftTime` у balance/sim.js.
import type { EconomyParams } from '@/economy/core/types';
import { localHour } from '@/inspections/schedule';
import { dayKey, dayStart, DAY, HOUR } from '@/telegrams/clock';

import type { RaceState } from './types';

/**
 * Найраніша мить подарунка в (fromMs, toMs] або null. Подарунок чекає, поки немає гонки й відкрито «Акти на майно»
 * (умови на мить виклику), не раніше доби giftFirstDay від встановлення, ≥ giftGapHours після кінця попередньої гонки,
 * лише giftFromHour–giftToHour і не в ту саму добу, що попередній.
 */
export function giftTime(s: RaceState, p: EconomyParams, fromMs: number, toMs: number, tz: number, installMs: number, aktyOpen: boolean): number | null {
  if (!p.giftOrder.length || s.active || !aktyOpen || toMs <= fromMs) return null;
  let c = Math.max(
    fromMs,
    s.lastRaceEndMs == null ? -Infinity : s.lastRaceEndMs + p.giftGapHours * HOUR,
    dayStart(installMs, tz) + p.giftFirstDay * DAY + p.giftFromHour * HOUR,
  );
  for (let k = 0; k < 60 && c <= toMs; k++) {
    const h = localHour(c, tz);
    if (dayKey(c, tz) === s.lastGiftDayKey || h >= p.giftToHour) {
      c = dayStart(c, tz) + DAY + p.giftFromHour * HOUR;
      continue;
    }
    if (h < p.giftFromHour) {
      c = dayStart(c, tz) + p.giftFromHour * HOUR;
      continue;
    }
    // як у sim.js: подарунок, що «настав» раніше, приходить у першу мить проміжку (from, to]
    return c > fromMs ? c : Math.min(fromMs + 1, toMs);
  }
  return null;
}
