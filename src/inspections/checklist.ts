// Чекліст (004 FR-12, FR-13): пункти рівня з конфігу, ціни від базового доходу в мить оголошення.
import type { Big } from '@/economy/core/big';
import type { InspItemDef } from '@/economy/core/types';
import { baseIncomePerMin } from '@/economy/game/income';
import type { EconomyConfig, EconomyState } from '@/economy/game/types';

import type { BossId, ChecklistItem } from './types';

/** Комісію задає рівень у мить оголошення (FR-27). */
export function bossFor(level: number): BossId {
  return level >= 2 ? 'command_commission' : 'brigade_commission';
}

/** Рівень чекліста: Р1-Р4 мають свої пункти; Р5 бере пункти Р4, доки 013 не додасть свої. */
export function checklistLevel(level: number): number {
  return Math.min(4, Math.max(1, level));
}

export function itemDef(cfg: EconomyConfig, id: string, level: number): InspItemDef | undefined {
  // пункт, доданий відпискою на телеграму попереднього рівня, діє й на вищому (011: Р3 бере телеграми Р1-Р2)
  const cl = checklistLevel(level);
  return cfg.params.inspItems.find((d) => d.id === id && (d.level === cl || (d.added && d.level < cl)));
}

/**
 * Ціна пункту: max(inspMinPrice, ⌈m × базовий дохід⌉). Базовий дохід — без тимчасових множників і факторів подій,
 * з P і «Без реклами» (FR-13, рев'ю № 16).
 */
export function priceOf(def: InspItemDef, eco: EconomyState, cfg: EconomyConfig): Big {
  return Math.max(cfg.params.inspMinPrice, Math.ceil(def.min * baseIncomePerMin(eco, cfg)));
}

/** Базові пункти рівня (Р1 — 5, Р2-Р4 — 4), ціни зафіксовано. */
export function baseChecklist(eco: EconomyState, cfg: EconomyConfig, level: number): ChecklistItem[] {
  return cfg.params.inspItems
    .filter((d) => d.level === checklistLevel(level) && !d.added)
    .map((d) => ({ id: d.id, price: priceOf(d, eco, cfg), done: false }));
}
