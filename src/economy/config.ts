// Вбудований конфіг економіки (рішення 52): preset-v7 rev 7.2. Закріплення й віддалений конфіг — 009.
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
  return { ...pinned, source: 'cached', params: { ...bundledConfig.params, ...pinned.params } };
}
