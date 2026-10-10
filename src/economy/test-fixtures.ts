// Фікстури тестів 001: preset-v5 (рішення 52) і конфіг із заданими одиницями.
import P5 from '../../balance/preset-v5.json';
import { withDefaults } from './core';
import { newGame } from './game/state';
import type { EconomyConfig, EconomyParams, EconomyState } from './game/types';

export const T0 = 1_760_000_000_000;
export const MIN = 60_000;
export const HOUR = 3_600_000;

export function cfgV5(patch: (p: EconomyParams) => void = () => {}): EconomyConfig {
  const params = withDefaults(P5.params);
  patch(params);
  return { version: 'econ-v5-test', source: 'bundled', params };
}

export function game(cfg: EconomyConfig, patch: Partial<EconomyState> = {}): EconomyState {
  return { ...newGame(cfg, T0), ...patch };
}
