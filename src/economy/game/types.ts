// Типи гри поверх ядра (001 data-model.md). Числа балансу — лише в EconomyConfig.params (принцип I).
import type { Big, EconomyParams } from '../core';

export type { Big, EconomyParams, UnitDef } from '../core';

/** Вбудований чи віддалений конфіг економіки (рішення 52; закріплення — 009). */
export interface EconomyConfig {
  version: string;
  source: 'bundled' | 'remote' | 'cached';
  params: EconomyParams;
}

export interface UnitRef {
  type: 'stream' | 'stage';
  id: string;
}

export interface EconomyState {
  /** Рівень гри: 1 «Батальйон», 2 «Бригада» (перехід — 06) */
  level: number;
  /** 0 = замкнено. Новий цикл: [1, 0, 0, 0] (FR-12) */
  streamLevels: number[];
  /** Новий цикл: усі 1 */
  stageLevels: number[];
  /** Новий цикл: усі false (FR-14) */
  streamClerks: boolean[];
  stageClerks: boolean[];
  /** Баланс підписів; ≥ 0 */
  signatures: Big;
  /** Зібрано за цикл (бали цифровізації, 06) */
  lifetimeCycle: Big;
  /** P, ціле ≥ 0 (06 нараховує) */
  prestigePoints: number;
  /** «Без реклами» (08) */
  hasNoAds: boolean;
  /** Коли бак порожній; null = ще не заправляли */
  fuelEndMs: number | null;
  /** 6 год або 12 год зі «Стартовим набором» */
  fuelCapacityMs: number;
  /** Дробове, на екрані ціле вниз (FR-22) */
  paper: number;
  /** 8 або 24 (08) */
  storageHours: number;
  /** Одиниці, для яких уже показано unit-unlock за встановлення (FR-13) */
  seenUnlocks: string[];
  /** Чи наймали вже діловода за встановлення (clerk_hire.is_first_clerk) */
  hiredEver: boolean;
  /** Останній бонус Кота Сейфа (FR-32) */
  catBonusAtMs: number | null;
  /** Мітки останніх зарахованих тапів, не більше tapRateMax: ковзне вікно 1 с (FR-16) */
  tapTimes: number[];
  /** Бонуси музею (07): множник виробітку одиниці за id, сховища (№ 2) і паперу (№ 3); без журналів — 1 */
  museum: { unit: Record<string, number>; storage: number; paper: number };
  /** Нагороди ×2 за місцеву добу пристрою; скидається, лише коли дата пізніша (FR-26, 09 FR-15) */
  offlineDoubles: { date: string; count: number };
}

/** Кусково-сталий множник (FR-17) або фактор одиниці (FR-18) з абсолютними мітками; приходить з 03, 04, 05, 08. */
export interface Effect {
  kind: 'mult' | 'factor';
  source:
    | 'ad_boost'
    | 'gift_drone'
    | 'gift_shovel'
    | 'gift_generator'
    | 'inspection_pass'
    | 'telegram_slow'
    | 'telegram_stop'
    | 'kombat_away'
    | 'inspection_fail';
  value: number;
  target?: UnitRef;
  startMs: number;
  endMs: number;
}

export type BuyMode = 'x1' | 'x10' | 'toMilestone';

export type DomainEvent =
  | { type: 'streamUnlock'; streamId: string; unlockIndex: number; cost: Big; firstTime: boolean }
  | {
      type: 'purchase';
      target: UnitRef;
      levelFrom: number;
      levelTo: number;
      levelsBought: number;
      mode: BuyMode;
      cost: Big;
      wasBottleneck: boolean;
      incomeBefore: Big;
      incomeAfter: Big;
    }
  | { type: 'clerkHire'; target: UnitRef; cost: Big; isFirstClerk: boolean; clerksCountAfter: number }
  | { type: 'milestone'; target: UnitRef; level: number; rateMultiplier: number };
