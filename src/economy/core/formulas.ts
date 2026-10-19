// Формули економіки (001 FR-5, FR-7, FR-8; 06). Дослівно як у balance/sim.js — порядок операцій той самий.
import type { Big } from './big';
import type { EconomyParams, UnitDef } from './types';

/** Виробіток одиниці на рівні L, /хв: rate · L · milestoneMult^⌊L/milestoneEvery⌋ (FR-5). */
export function capAt(item: UnitDef, L: number, p: EconomyParams): number {
  if (L <= 0) return 0;
  return item.rate * L * Math.pow(p.milestoneMult, Math.floor(L / p.milestoneEvery));
}

/** Ціна наступного рівня на рівні L; рівень 1 замкненого потоку коштує `unlock` (FR-7). */
export function priceAt(item: UnitDef, L: number): Big {
  if (L === 0) return item.unlock || 0;
  return item.cost * Math.pow(item.growth, L - 1);
}

/** Ціна пакета з n рівнів від рівня L: сума цін кожного рівня, як цикл бота в sim.js (FR-8). */
export function packPrice(item: UnitDef, L: number, n: number): Big {
  let c = 0;
  for (let k = L; k < L + n; k++) c += priceAt(item, k);
  return c;
}

/** Найближчий рівень, кратний milestoneEvery, вищий за L («до віхи», FR-8). */
export function milestoneTarget(L: number, p: EconomyParams): number {
  return (Math.floor(L / p.milestoneEvery) + 1) * p.milestoneEvery;
}

/** Множник цифрових балів: 1 + prestigeBonus · P (FR-17). */
export function prestigeMult(P: number, p: EconomyParams): number {
  return 1 + p.prestigeBonus * P;
}

/** Цифрові бали за цикл: ⌊(life / divisor)^prestigeExponent⌋ (06). */
export function points(life: Big, divisor: number, p: EconomyParams): number {
  return Math.floor(Math.pow(life / (divisor || 75000), p.prestigeExponent));
}

/** Р4 «Звіти про звіти» (012 FR-7): s(n) = shareMax · n / (n + K); на рівні 0 потоку немає */
export function zpzShare(n: number, p: EconomyParams): number {
  return n > 0 ? (p.zpz.shareMax * n) / (n + p.zpz.K) : 0;
}
