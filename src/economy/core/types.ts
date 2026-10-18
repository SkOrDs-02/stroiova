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

/** Пункт чекліста (04): хвилини базового доходу; added — не базовий, його додає відписка (`inspExtraItem` у контенті) */
export interface InspItemDef {
  id: string;
  level: number;
  min: number;
  added?: boolean;
}

/** Подарунок Ліни (005): множник до підписів (дрон, лопати), fuel — тримає пальне (генератор) */
export interface GiftDef {
  mult: number;
  fuel?: number;
  serviceH: number;
  steps: number[];
}

export interface EconomyParams {
  streams: UnitDef[];
  stages: UnitDef[];
  levels: LevelDef[];
  milestoneEvery: number;
  milestoneMult: number;
  tapValue: number;
  tapRateMax: number;
  offlineReturnMin: number;
  /** Онбординг (002): «Пташка» ×onboardingBirdMult на onboardingBirdMin хв ігрового часу; бонус архіву archiveBonusMin хв базового доходу на archiveBonusAtSec с гри */
  onboardingBirdMin: number;
  onboardingBirdMult: number;
  archiveBonusMin: number;
  archiveBonusAtSec: number;
  /** 003: репутація, позапланові перевірки, розклад телеграм, override, «Комбата шукають» (рішення 61–63) */
  slowPerDayMin: number;
  slowPerDayMax: number;
  repStart: number;
  repLow: number;
  repHigh: number;
  replyChanceLow: number;
  replyChanceHigh: number;
  unscheduledPerDay: number;
  unscheduledWarnH: number;
  tgFromHour: number;
  tgToHour: number;
  tgMinGapMin: number;
  tgMaxNew: number;
  tgRepeatMinDays: number;
  overrideFromDay: number;
  overrideMinGapDays: number;
  overrideChance: number;
  kombatChance: number;
  kombatMult: number;
  kombatMinMin: number;
  kombatMaxMin: number;
  kombatRunnerMin: number;
  kombatRunnerCostMin: number;
  /** 004: перевірки (рішення 25, 28, 61, 65); хвилини пунктів — таблиця «Пункти чекліста» */
  inspFirstAfterHours: number;
  inspIntervalMinH: number;
  inspIntervalMaxH: number;
  inspWarnMinH: number;
  inspWarnMaxH: number;
  inspMult: number;
  inspHours: number;
  inspFailMult: number;
  inspFailHours: number;
  inspFirstFromHour: number;
  inspFirstToHour: number;
  inspArriveFromHour: number;
  inspArriveToHour: number;
  inspArriveJitterMin: number;
  inspMinPrice: number;
  inspItems: InspItemDef[];
  /** 005: подарунки й гонка (рішення 29–31); кроки акта — години (Акти, Комбат, Стройова, Фін.) */
  gifts: Record<'drone' | 'shovel' | 'generator', GiftDef>;
  giftOrder: ('drone' | 'shovel' | 'generator')[];
  giftL2StepH: number;
  giftFirstDay: number;
  giftGapHours: number;
  giftFromHour: number;
  giftToHour: number;
  /** 008: реклама - буст підписів: нагорода, множник, межа накопичення, добовий ліміт */
  adsPerDay: number;
  adHours: number;
  adMult: number;
  adCapHours: number;
  /** 008: «Стартовий набір» - разова видача підписів і бак генератора, год */
  starterSignatures: number;
  starterFuelHours: number;
  raceAdPerDay: number;
  raceAdCut: number;
  raceDigitalCutH: number;
  /** 007: музей. 0 - вимкнено, 1 - № 1-8, 2 - № 1-24 (016); відсотки бонусів журналів */
  museum: number;
  museumUnitPct: number;
  museumStoragePct: number;
  museumPaperPct: number;
  museumRacePct: number;
  /** 006: журнали, які скасовує цифровізація: рівень → номер цифровізації на рівні → номери журналів (sim.js, 016 FR-5) */
  digitJournals: Record<string, Record<string, number[]>>;
  storageHours: number;
  offlineAdMult: number;
  offlineAdPerDay: number;
  paidMult: number;
  fuelHours: number;
  fuelBonus: number;
  fuelBonusThreshold: number;
  prestigeExponent: number;
  prestigeBonus: number;
  /** Мінімум балів для кожної цифровізації (рішення 26) і підказка «Час цифровізуватися» (06 FR-9) */
  prestigeMinPoints: number;
  prestigeStallHours: number;
  prestigeStallShare: number;
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
