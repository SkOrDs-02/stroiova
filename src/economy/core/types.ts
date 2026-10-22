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

/** Підсумкова перевірка рівня: попередження, повтор, ціна чекліста в хвилинах базового доходу, пункти (5 базових + 1 механіки) */
export interface BossParams {
  warnH: number;
  retryH: number;
  checklistMin: number;
  items: number;
  adItems: number;
  saveH: number;
  zpzMin: number;
}

/** Пачки Р3 (011): розмір, імовірність окремої телеграми дня, сповільнення «Нарада» і баф «Зведення б'ється» зведеної відповіді */
export interface PackParams {
  size: number;
  perDay: number;
  singleChance: number;
  /** Стратегія бота в sim.js (0 - окремо, 1 - зведена, 2 - краща за втратою доходу); у грі вибір за гравцем */
  merge: number;
  slowMult: number;
  slowHours: number;
  summaryBuff: number;
  summaryBuffHours: number;
}

/** Р4 «Звіти про звіти» (012): s(n) = shareMax · n / (n + K) - частка від суми інших потоків */
export interface ZpzParams {
  shareMax: number;
  K: number;
}

/** Стос до наради Р4 (012 FR-13…FR-15): висота h = Σ хвилини · s(n) / shareMinPerCm, см */
export interface StackParams {
  shareMinPerCm: number;
  reachCm: number;
  showCm: number;
  counterCm: number;
}

/** «Доповідь тезово» (012 FR-17): імовірність на старті сесії і мінімум діб між подіями */
export interface BriefParams {
  chance: number;
  minGapDays: number;
}

/** Масштаб і модифікатори Дублів (013): rateMult, costMult і clerkMult рівнів × mult^N, дільник балів × divisorMult^N */
export interface DupParams {
  mult: number;
  /** Цифровізацій на Р1-Р4 для виходу з рівня в Дублі (на Р2-Р4 ще й підсумкова перевірка) */
  exitDigitizations: number;
  divisorMult: number;
  /** «Мокра печатка»: проміжок між плановими перевірками × intervalMult, ×3 триває × boostMult */
  wetSeal: { intervalMult: number; boostMult: number };
  /** «Без Діда»: бонус пального замість fuelBonus */
  noDid: { fuelMult: number };
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
  /** 011: «Нарада затягнулась» (Р3+) - шаблон «Комбата шукають» на ланці «Нарада» */
  /** «Збій СЕДО» (013 FR-12): імовірність на добу, множник цифрової ланки, хвилини, аркуші на друк */
  sedoFailChance: number;
  sedoFailMult: number;
  sedoFailMin: number;
  sedoPrintPaper: number;
  /** Телеграм на добу після конвертації № 4 (013 FR-14) */
  slowPerDayLateMin: number;
  slowPerDayLateMax: number;
  /** Сюжет (014 FR-7): тостів сюжетних кроків за сесію */
  storyMaxToasts: number;
  /** Тиждень тиші після Y на `finale-script` (013 FR-22), доби */
  finaleQuietDays: number;
  /** Нескінченний режим «Дубль N» (013 FR-24…FR-27, рішення 111) */
  dup: DupParams;
  /** Скільки Дублів програє `simulate` після фіналу (лише модель; у грі не читається), 0 - фінал зупиняє прогін */
  dubs: number;
  naradaChance: number;
  naradaMult: number;
  naradaMinMin: number;
  naradaMaxMin: number;
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
  /** 011: підсумкова перевірка рівня (рішення 95, 96) */
  boss: BossParams;
  pack: PackParams;
  zpz: ZpzParams;
  /** Р5: порядок конвертацій ланок, множник цифрової ланки, ціна в хвилинах базового доходу (013 FR-4…FR-8) */
  convert: { order: string[]; mult: number; costMin: number };
  stack: StackParams;
  brief: BriefParams;
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
  storageHoursPaid: number;
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
  /** 016 (museum >= 2): № 16 (Нарада) */
  museumUnitRarePct: number;
  /** № 11: на скільки відсотків коротші сповільнення від телеграм */
  museumSlowCutPct: number;
  /** № 12: на скільки відсотків дешевші пункти чекліста */
  museumChecklistCutPct: number;
  /** № 20: на скільки відсотків довша служба подарунків */
  museumGiftServicePct: number;
  /** № 23: на скільки відсотків дешевша конвертація */
  museumConvertCutPct: number;
  /** Кожна зібрана серія 2-5: +% до всіх підписів */
  museumSeriesPct: number;
  /** № 24 множить бонуси № 9-23 */
  museumLegendaryMult: number;
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
