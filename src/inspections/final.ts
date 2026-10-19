// Підсумкова перевірка рівня (011 FR-2…FR-8): оголошення, чекліст 5 + 1, пункт механіки, повтор. Чисті функції без годинника.
import { baseIncomePerMin } from '@/economy/game/income';
import { itemsFor } from '@/economy/game/state';
import type { EconomyConfig, EconomyState } from '@/economy/game/types';

import { bossFor } from './checklist';
import type { ChecklistItem, Inspection } from './types';

/** Склад підсумкової рівня: 5 базових пунктів і пункт механіки (FR-12). Р3 додасть пачки разом з ними (рішення 93). */
export interface FinalDef {
  base: string[];
  mech: string;
}

export const FINALS: Record<number, FinalDef> = {
  2: { base: ['dust_glove', 'corridor_tape', 'sign_rehang', 'orders_stitch', 'kazna_kopiyka'], mech: 'nakazy_open' },
};

export function hasFinal(level: number): boolean {
  return FINALS[level] != null;
}

/** Пункт механіки на мить `eco`: «Накази по частині» відкрито в поточному циклі (FR-12, ВП-1). */
export function mechOk(id: string, eco: EconomyState, cfg: EconomyConfig): boolean {
  if (id === 'nakazy_open') {
    const i = itemsFor(eco, cfg).streams.findIndex((u) => u.id === 'nakazy');
    return i >= 0 && (eco.streamLevels[i] ?? 0) > 0;
  }
  return false;
}

/** Усі потоки рівня відкрито в новому циклі (FR-2): підсумкова не оголошується одразу після церемонії. */
export function streamsOpen(eco: EconomyState, cfg: EconomyConfig): boolean {
  const it = itemsFor(eco, cfg);
  return it.streams.every((_, i) => (eco.streamLevels[i] ?? 0) > 0);
}

/** Ціна кожного базового пункту: max(inspMinPrice, ⌈boss.checklistMin × базовий дохід⌉ / boss.adItems) (рішення 95). */
export function finalItemPrice(eco: EconomyState, cfg: EconomyConfig): number {
  const b = cfg.params.boss;
  const whole = Math.max(cfg.params.inspMinPrice, Math.ceil(b.checklistMin * baseIncomePerMin(eco, cfg)));
  return Math.ceil(whole / b.adItems);
}

/** Чекліст першої спроби: ціни фіксовано на мить оголошення. */
export function finalChecklist(eco: EconomyState, cfg: EconomyConfig, level: number): ChecklistItem[] {
  const def = FINALS[level]!;
  const price = finalItemPrice(eco, cfg);
  return [...def.base.map((id) => ({ id, price, done: false })), { id: def.mech, price: 0, done: false, mech: true }];
}

/** Чекліст повтору: виконані пункти й ціни лишаються (FR-7); пункт механіки перевіряється заново на приїзді. */
export function retryChecklist(prev: Inspection): ChecklistItem[] {
  return prev.items.map((i) => (i.mech ? { ...i, done: false } : i));
}

/** Пункт на мить `eco`: механіки - наживо, решта - як записано (FR-5). */
export function itemDone(item: ChecklistItem, eco: EconomyState, cfg: EconomyConfig): boolean {
  return item.mech ? mechOk(item.id, eco, cfg) : item.done;
}

export { bossFor };
