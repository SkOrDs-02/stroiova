// Вбудований конфіг економіки (рішення 52): preset-v7 rev 7.3. Закріплення й віддалений конфіг — 009.
import preset from '../../balance/preset-v7.json';
import { withDefaults } from './core';
import type { EconomyConfig } from './game/types';

export const bundledConfig: EconomyConfig = {
  version: `econ-v${preset.rev}`,
  source: 'bundled',
  params: withDefaults(preset.params),
};

/**
 * Закріплений конфіг (009 FR-22) після оновлення застосунку: числа економіки — закріплені, а параметри фіч,
 * яких у ньому ще не було (003, 004…), беруться з вбудованого.
 */
export function withBundled(pinned: EconomyConfig): EconomyConfig {
  const params = { ...bundledConfig.params, ...pinned.params };
  // пункти перевірок нових рівнів (Р3 - 011, Р4 - 012) допоповнюємо з вбудованого за (id, рівень): закріплений список їх не мав
  const have = pinned.params.inspItems ?? [];
  params.inspItems = [...have, ...bundledConfig.params.inspItems.filter((b) => !have.some((x) => x.id === b.id && x.level === b.level))];
  // журнали за цифровізації нових рівнів (016: Р3, Р4) допоповнюємо за (рівень, номер): закріплений конфіг епохи Р2 їх не мав
  const dj: Record<string, Record<string, number[]>> = {};
  for (const lvl of new Set([...Object.keys(bundledConfig.params.digitJournals), ...Object.keys(pinned.params.digitJournals ?? {})])) {
    dj[lvl] = { ...bundledConfig.params.digitJournals[lvl], ...(pinned.params.digitJournals ?? {})[lvl] };
  }
  params.digitJournals = dj;
  return { ...pinned, source: 'cached', params };
}
