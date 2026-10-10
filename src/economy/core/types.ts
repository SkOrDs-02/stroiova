// Типи ядра економіки. Поля — як у balance/sim.js; невідомі поля пресетів лишаються (index signature).
import type { Big } from './big';

export interface UnitDef {
  id: string;
  name: string;
  rate: number;
  cost: Big;
  growth: number;
  manager: Big;
  unlock?: Big;
  /** Р4 «Звіти про звіти»: частка від інших потоків замість власного виробітку */
  share?: number;
}

export interface LevelDef {
  id: string;
  name: string;
  rateMult: number;
  costMult: number;
  clerkMult?: number;
  growthMult?: number;
  stream: UnitDef | null;
  stage: UnitDef | null;
  prestigeDivisor: number;
  exitDigitizations: number;
  boss: number;
  inspChecklistMin: number;
  [key: string]: unknown;
}

export interface EconomyParams {
  streams: UnitDef[];
  stages: UnitDef[];
  levels: LevelDef[];
  milestoneEvery: number;
  milestoneMult: number;
  tapValue: number;
  tapRateMax?: number;
  storageHours: number;
  offlineAdMult: number;
  offlineAdPerDay: number;
  paidMult: number;
  fuelHours: number;
  fuelBonus: number;
  fuelBonusThreshold: number;
  prestigeExponent: number;
  prestigeBonus: number;
  paperStart: number;
  paperPerMinPerLevel: number;
  paperGift: number;
  catBonusMin: number;
  catCooldownMin: number;
  [key: string]: unknown;
}

export interface Scenario {
  id: string;
  name: string;
  ads: boolean;
  paid: boolean;
  starter?: boolean;
}
