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
    /** «Пташка в небі» онбордингу (002 FR-12): живе лише в пам'яті стору, за ігровим часом; у запис і офлайн не потрапляє */
    | 'onboarding_bird'
    | 'ad_boost'
    | 'gift_drone'
    | 'gift_shovel'
    | 'gift_generator'
    | 'inspection_pass'
    | 'telegram_slow'
    | 'telegram_stop'
    | 'kombat_away'
    | 'inspection_fail'
    /** Діловод одиниці у відрядженні (003, `clerkAway`): поки триває, офлайн одиниця працює як без діловода */
    | 'clerk_away';
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
  | { type: 'milestone'; target: UnitRef; level: number; rateMultiplier: number }
  // 003: телеграми й репутація; приймають 04 (перевірки), 05 (гонка), 07 (курйози, музей), 014 (сюжет), аналітика етапу 5
  | { type: 'telegramReceive'; telegramId: string; uid: string; delivery: 'live' | 'while_away'; scripted: boolean }
  | { type: 'telegramAnswer'; telegramId: string; uid: string; choiceId: string; choiceKind: string; repDelta: number; chancePct: number; paper: number }
  | { type: 'reputationTierChange'; from: 'low' | 'norm' | 'high'; to: 'low' | 'norm' | 'high'; value: number }
  | { type: 'unscheduledInspection'; telegramId: string; warnSec: number; extraItem: string | null }
  | { type: 'inspItem'; telegramId: string; item: string | null; remarkPct: number }
  | { type: 'kombatRequest'; maxMin: number }
  | { type: 'kombatStart'; endMs: number }
  | { type: 'kombatFound'; how: 'wait' | 'runner' }
  | { type: 'raceEffect'; telegramId: string; effect: Record<string, unknown> }
  | { type: 'arc'; id: string }
  | { type: 'journal'; id: string }
  | { type: 'curio'; telegramId: string; uid: string; text: string | null }
  | { type: 'telegramFlag'; telegramId: string; reason: number | null; hasComment: boolean; afterChoice: boolean }
  /** «Готуватися» з tg-result: 04 відкриє insp-warning */
  | { type: 'inspectionPrepare'; telegramId: string }
  // 004: перевірки; аналітика етапу 5 (inspection_start, inspection_item_complete, inspection_finish, boost_activate), музей 07 (№ 7)
  | {
      type: 'inspectionStart';
      id: string;
      no: number;
      boss: 'brigade_commission' | 'command_commission';
      trigger: 'scheduled' | 'unscheduled';
      warnSec: number;
      reputation: number;
      itemsTotal: number;
    }
  | { type: 'inspectionItemAdded'; id: string; itemId: string; telegramId: string }
  | { type: 'inspectionItemComplete'; id: string; itemId: string; method: 'signatures' | 'ad' | 'no_ads_pass'; cost: Big; secToDeadline: number }
  | {
      type: 'inspectionFinish';
      id: string;
      result: 'passed' | 'failed';
      itemsDone: number;
      itemsTotal: number;
      offline: boolean;
      secFromStart: number;
    }
  | { type: 'boostActivate'; boostType: 'income_x2' | 'inspection_x3' | 'drone_x2' | 'shovels_x1_5' | 'generator_fuel_hold'; mult: number; durationSec: number }
  // 005: гонка з часом; аналітика етапу 5 (race_start, race_speedup_apply, race_finish), курйози 07
  | { type: 'raceStart'; id: string; giftType: 'drone' | 'shovel' | 'generator'; docSec: number; resourceSec: number; winnable: boolean }
  | { type: 'raceSpeedup'; id: string; method: 'digital_bonus' | 'ad' | 'no_ads_pass'; secSaved: number }
  | { type: 'raceFinish'; id: string; giftType: 'drone' | 'shovel' | 'generator'; result: 'success' | 'fail'; marginSec: number; speedups: number; offline: boolean }
  /** Програна гонка: запис «Списано раніше, ніж поставлено на облік» (07) */
  | {
      type: 'raceCurio';
      id: string;
      giftType: 'drone' | 'shovel' | 'generator';
      raceNo: number;
      level: number;
      steps: { unit: 'akty' | 'kombat' | 'stroy' | 'fin' | 'kazna'; sec: number }[];
      stepsDone: number;
      stepsTotal: number;
      marginSec: number;
      endMs: number;
    }
  // 006: цифровізація; аналітика етапу 5 (digitization_complete, level_advance), музей 07 (museum_journal_unlock)
  | { type: 'digitizationComplete'; no: number; level: number; points: number; pointsTotal: number; multiplier: number; lifetimeLog10: number; journalsCancelled: number[]; fromHint: boolean }
  | { type: 'levelAdvance'; from: number; to: number; digitizationCount: number; pointsTotal: number }
  | { type: 'digitizationHint'; etaSec: number; points: number; pointsTotal: number; isFirst: boolean }
  /** Перша без зауважень після першої цифровізації: журнал № 7 (07 FR-8) */
  | { type: 'inspectionJournal'; id: string }
  // 007: музей; аналітика етапу 5 (museum_journal_unlock)
  | { type: 'museumJournalUnlock'; no: number; journalId: string; rarity: 'common' | 'rare' | 'legendary'; source: 'digitization' | 'telegram' | 'inspection'; ownedAfter: number; isSeriesComplete: boolean }
  // 008: реклама й покупки; аналітика етапу 5 (ad_*, purchase_*, offline_income_claim)
  | { type: 'adRewardGrant'; placement: 'income_boost' | 'offline_double' | 'race_speedup' | 'inspection_checklist'; isNoAdsClaim: boolean }
  | { type: 'adFail'; placement: 'income_boost' | 'offline_double' | 'race_speedup' | 'inspection_checklist'; stage: 'not_ready' | 'load' | 'show' | 'closed_early' | 'consent_blocked'; code?: string }
  | { type: 'purchaseComplete'; productId: 'no_ads' | 'starter_pack' | 'storage_24h'; isFirstPurchase: boolean; purchaseNumber: number }
  | { type: 'purchaseFail'; productId: 'no_ads' | 'starter_pack' | 'storage_24h'; reason: 'user_cancelled' | 'payment_pending' | 'store_problem' | 'network' | 'product_unavailable' | 'already_owned' | 'not_allowed' | 'unknown' }
  | { type: 'purchaseRestore'; trigger: 'shop_button' | 'settings_button' | 'auto_check'; isSuccess: boolean; restoredProductIds: ('no_ads' | 'starter_pack' | 'storage_24h')[] }
  | { type: 'offlineIncomeClaim'; isDoubled: boolean; doubleSource: 'ad' | 'no_ads_pass' | 'none'; offlineDoublesToday: number }
  // 010: налаштування; аналітика етапу 5 (setting_change, push_permission_request)
  | { type: 'settingChange'; settingName: 'sound' | 'haptics' | 'notif_storage' | 'notif_telegrams' | 'notif_inspections' | 'notif_gifts' | 'notif_boosts' | 'analytics' | 'progress_reset'; newValue: boolean | null }
  | { type: 'pushPermissionRequest'; trigger: 'onboarding_session_end' | 'settings'; prePromptResult: 'accepted' | 'declined'; osResult: 'granted' | 'denied' | 'provisional' | 'not_shown' }
  | { type: 'museumOpen'; source: 'tab' | 'unlock_toast'; journalsOwned: number; journalsUnseen: number };

/** Ефекти, що потрапляють у запис: «Пташка» онбордингу живе лише в пам'яті стору (002 R3). */
export type StoredEffect = Effect & { source: Exclude<Effect['source'], 'onboarding_bird'> };
