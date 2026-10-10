// Стан гри: новий гравець і новий цикл (001 FR-12, FR-14; 06; рішення 48).
import { levelItems } from '../core';
import type { EconomyConfig, EconomyState, UnitDef, UnitRef } from './types';

const H = 3600_000;

export function newGame(cfg: EconomyConfig, nowMs: number): EconomyState {
  const p = cfg.params;
  const it = levelItems(p, 1);
  return {
    level: 1,
    streamLevels: it.streams.map((_, i) => (i === 0 ? 1 : 0)),
    stageLevels: it.stages.map(() => 1),
    streamClerks: it.streams.map(() => false),
    stageClerks: it.stages.map(() => false),
    signatures: 0,
    lifetimeCycle: 0,
    prestigePoints: 0,
    hasNoAds: false,
    fuelEndMs: null,
    fuelCapacityMs: p.fuelHours * H,
    paper: p.paperStart,
    storageHours: p.storageHours,
    seenUnlocks: [],
    hiredEver: false,
    catBonusAtMs: null,
    tapTimes: [],
    offlineDoubles: { date: '', count: 0 },
    museum: { unit: {}, storage: 1, paper: 1 },
  };
}

/** Новий цикл після цифровізації: як reset() у sim.js. Бусти, бак, папір, «Без реклами», музей лишаються (рішення 48). */
export function newCycle(state: EconomyState, cfg: EconomyConfig): EconomyState {
  const it = levelItems(cfg.params, state.level);
  return {
    ...state,
    streamLevels: it.streams.map((_, i) => (i === 0 ? 1 : 0)),
    stageLevels: it.stages.map(() => 1),
    streamClerks: it.streams.map(() => false),
    stageClerks: it.stages.map(() => false),
    signatures: 0,
    lifetimeCycle: 0,
  };
}

/** Потоки й ланки поточного рівня (числа рівня вже застосовано). */
export function itemsFor(state: EconomyState, cfg: EconomyConfig): { streams: UnitDef[]; stages: UnitDef[] } {
  return levelItems(cfg.params, state.level);
}

export function unitIndex(state: EconomyState, cfg: EconomyConfig, ref: UnitRef): number {
  const it = itemsFor(state, cfg);
  return (ref.type === 'stream' ? it.streams : it.stages).findIndex((u) => u.id === ref.id);
}
