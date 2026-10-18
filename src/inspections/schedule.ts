// Розклад (004 FR-2…FR-4): перша, наступна планова, вікно приїзду; як `arrWindow` у balance/sim.js.
import type { EconomyParams } from '@/economy/core/types';
import { dayStart, DAY, HOUR, localMs } from '@/telegrams/clock';

const MIN = 60_000;

export function localHour(ms: number, tzOffsetMin: number): number {
  return (((localMs(ms, tzOffsetMin) % DAY) + DAY) % DAY) / HOUR;
}

/** Приїзд лише в inspArriveFromHour–inspArriveToHour, інакше початок вікна (цієї чи наступної доби) + 0–jitter хв. */
export function arrWindow(t: number, p: EconomyParams, tzOffsetMin: number, rand: () => number): number {
  const h = localHour(t, tzOffsetMin);
  if (h >= p.inspArriveFromHour && h < p.inspArriveToHour) return t;
  const day = dayStart(t, tzOffsetMin) + (h >= p.inspArriveToHour ? DAY : 0);
  return day + p.inspArriveFromHour * HOUR + Math.floor(rand() * p.inspArriveJitterMin) * MIN;
}

/** Попередження: inspWarnMinH–inspWarnMaxH у цілих хвилинах (FR-4). */
export function warnMin(p: EconomyParams, rand: () => number): number {
  return Math.round((p.inspWarnMinH + rand() * (p.inspWarnMaxH - p.inspWarnMinH)) * 60);
}

/** Наступна планова: від приїзду попередньої через U(inspIntervalMinH, inspIntervalMaxH), у вікні (FR-3, рішення 61). */
export function nextArrival(arrMs: number, p: EconomyParams, tzOffsetMin: number, rand: () => number): number {
  const gap = (p.inspIntervalMinH + rand() * (p.inspIntervalMaxH - p.inspIntervalMinH)) * HOUR;
  return arrWindow(arrMs + gap, p, tzOffsetMin, rand);
}

/** Перша: сесія не раніше ніж через inspFirstAfterHours після встановлення, у inspFirstFromHour–inspFirstToHour (FR-2). */
export function firstDue(installMs: number, nowMs: number, p: EconomyParams, tzOffsetMin: number): boolean {
  if (nowMs - installMs < p.inspFirstAfterHours * HOUR) return false;
  const h = localHour(nowMs, tzOffsetMin);
  return h >= p.inspFirstFromHour && h < p.inspFirstToHour;
}
