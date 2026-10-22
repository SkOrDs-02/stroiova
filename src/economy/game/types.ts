// Типи гри поверх ядра (001 data-model.md). Числа балансу — лише в EconomyConfig.params (принцип I).
import type { DubModifier } from '@/dub/dub';
import type { FinaleStep } from '@/finale/finale';
import type { Big, EconomyParams } from '../core';

export type { Big, EconomyParams, UnitDef } from '../core';

/** Вбудований чи віддалений конфіг економіки (рішення 52; закріплення — 009). */
export interface EconomyConfig {
  version: string;
  source: 'bundled' | 'remote' | 'cached';
  params: EconomyParams;
  /** Дубль (013), на який масштабовано `params` (`dubConfig`): телеграми читають модифікатор. Немає - Дублів не було */
  dub?: { n: number; modifier: DubModifier | null };
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
  museum: {
    unit: Record<string, number>;
    storage: number;
    paper: number;
    /** 016: M серій музею, 1 + S·museumSeriesPct/100 (входить у M поруч із балами) */
    series?: number;
    /** 016: № 21 - додаток до множника кожної цифрової ланки (0 без журналу) */
    digital?: number;
    /** 016: множник тривалості сповільнень від телеграм (№ 11) */
    slowCut?: number;
    /** 016: множник ціни пункту чекліста (№ 12) */
    checklist?: number;
    /** 016: множник кроку «Казначейство» у гонці (№ 14, разом із № 6) */
    kazna?: number;
    /** 016: множник служби подарунків (№ 20) */
    service?: number;
    /** 016: множник ціни конвертації (№ 23) */
    convert?: number;
  };
  /** Нагороди ×2 за місцеву добу пристрою; скидається, лише коли дата пізніша (FR-26, 09 FR-15) */
  offlineDoubles: { date: string; count: number };
  /** Р5 (013): id ланок, оцифрованих конвертаціями, у порядку конвертацій; переживають цифровізації */
  digital: string[];
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
    /** «Нарада затягнулась» (011 FR-25): «Нарада» ×naradaMult */
    | 'meeting_overrun'
    /** «Зведення б'ється» (011 FR-22): потік «Зведення» ×pack.summaryBuff */
    | 'pack_beats'
    | 'inspection_fail'
    /** «Збій СЕДО» (013 FR-12): одна цифрова ланка ×sedoFailMult */
    | 'sedo_failure'
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
  | { type: 'telegramAnswer'; telegramId: string; uid: string; choiceId: string; choiceKind: string; repDelta: number; chancePct: number; paper: number; packId?: string; isPackSummary?: boolean }
  // 011: пачки Р3; аналітика етапу 5 (telegram_pack_receive, telegram_pack_resolve), музей 07 (один запис на пачку)
  | { type: 'packReceive'; packId: string; no: number; isRepeat: boolean; delivery: 'live' | 'while_away' }
  | { type: 'packResolve'; packId: string; no: number; mode: 'summary' | 'separate' | 'mixed'; /** лише для summary */ choiceKind?: string; paperSpent: number; repDelta: number; chancePct: number; isBeats: boolean; secSinceReceived: number }
  | { type: 'stageConvert'; stageId: string; convertIndex: number; costLog10: number; digitizationsOnLevel: number; secSinceLevelStart: number }
  | { type: 'stackReach'; cm: number; zpzLevel: number; zpzSharePct: number; secSinceSessionStart: number; offlineSharePct: number }
  | { type: 'packBeats'; mult: number; hours: number }
  | { type: 'packCurio'; packId: string; no: number; kind: 'diligent' | 'formal_reply' | 'drawer'; uids: string[] }
  | { type: 'reputationTierChange'; from: 'low' | 'norm' | 'high'; to: 'low' | 'norm' | 'high'; value: number }
  | { type: 'unscheduledInspection'; telegramId: string; warnSec: number; extraItem: string | null }
  | { type: 'inspItem'; telegramId: string; item: string | null; remarkPct: number }
  | { type: 'kombatRequest'; maxMin: number }
  | { type: 'kombatStart'; endMs: number }
  | { type: 'kombatFound'; how: 'wait' | 'runner' }
  /** «Нарада затягнулась» (011 FR-25): random_event_resolve, event_type = meeting_overrun, choice = send_note */
  | { type: 'meetingStart'; endMs: number }
  /** «Збій СЕДО» (013 FR-12) */
  | { type: 'sedoStart'; stageId: string; endMs: number }
  | { type: 'sedoPrint'; stageId: string; paperSpent: number }
  | { type: 'meetingFound'; how: 'wait' | 'note' }
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
      boss: 'brigade_commission' | 'command_commission' | 'digital_commission';
      /** inspection_kind (011): звичайна чи підсумкова; attempt_number - спроба підсумкової */
      kind: 'regular' | 'final';
      attempt: number;
      trigger: 'scheduled' | 'unscheduled';
      warnSec: number;
      reputation: number;
      itemsTotal: number;
    }
  /** Пройдена підсумкова рівня: стор дозволяє перехід (`levelExitAllowed`) */
  | { type: 'finalPassed'; id: string; level: number; attempt: number }
  | { type: 'inspectionItemAdded'; id: string; itemId: string; telegramId: string }
  | { type: 'inspectionItemComplete'; id: string; itemId: string; method: 'signatures' | 'ad' | 'no_ads_pass'; cost: Big; secToDeadline: number }
  | {
      type: 'inspectionFinish';
      id: string;
      kind: 'regular' | 'final';
      attempt: number;
      /** Пункт механіки виконано на мить приїзду; null - у звичайної його немає */
      mechDone: boolean | null;
      /** Пройдена підсумкова відкрила перехід на наступний рівень (011 FR-6) */
      exitUnlocked: boolean;
      result: 'passed' | 'failed';
      /** Рівень перевірки і чи вона без зауваження № 16 (016 FR-19: лічильники грамот) */
      level: number;
      withoutRemarks: boolean;
      itemsDone: number;
      itemsTotal: number;
      offline: boolean;
      secFromStart: number;
    }
  | {
      type: 'boostActivate';
      boostType: 'income_x2' | 'inspection_x3' | 'drone_x2' | 'shovels_x1_5' | 'generator_fuel_hold';
      /** Звідки буст (аналітика `boost_activate.source`) */
      source: 'ad' | 'no_ads_pass' | 'inspection' | 'race' | 'onboarding';
      mult: number;
      durationSec: number;
      /** Лише буст за рекламу: скільки лишилось після накопичення і чи впертись у стелю `adCapHours` */
      stackedRemainingSec?: number;
      isCapped?: boolean;
    }
  // 005: гонка з часом; аналітика етапу 5 (race_start, race_speedup_apply, race_finish), курйози 07
  | { type: 'raceStart'; id: string; giftType: 'drone' | 'shovel' | 'generator'; docSec: number; resourceSec: number; winnable: boolean }
  | { type: 'raceSpeedup'; id: string; method: 'digital_bonus' | 'ad' | 'no_ads_pass'; secSaved: number }
  | { type: 'raceFinish'; id: string; giftType: 'drone' | 'shovel' | 'generator'; result: 'success' | 'fail'; marginSec: number; speedups: number; offline: boolean; level: number }
  /** Програна гонка: запис «Списано раніше, ніж поставлено на облік» (07) */
  | {
      type: 'raceCurio';
      id: string;
      giftType: 'drone' | 'shovel' | 'generator';
      raceNo: number;
      level: number;
      steps: { unit: 'akty' | 'kombat' | 'stroy' | 'fin' | 'kazna' | 'narada' | 'dopovid'; sec: number }[];
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
  | { type: 'museumJournalUnlock'; no: number; journalId: string; rarity: 'common' | 'rare' | 'legendary'; source: 'digitization' | 'telegram' | 'inspection' | 'final_inspection' | 'conversion' | 'story' | 'finale'; ownedAfter: number; isSeriesComplete: boolean; seriesId: string; seriesOwnedAfter: number; seriesCompleteCount: number }
  // 008: реклама й покупки; аналітика етапу 5 (ad_*, purchase_*, offline_income_claim)
  | { type: 'adRewardGrant'; placement: 'income_boost' | 'offline_double' | 'race_speedup' | 'inspection_checklist'; isNoAdsClaim: boolean }
  | { type: 'adFail'; placement: 'income_boost' | 'offline_double' | 'race_speedup' | 'inspection_checklist'; stage: 'not_ready' | 'load' | 'show' | 'closed_early' | 'consent_blocked'; code?: string }
  | { type: 'purchaseComplete'; productId: 'no_ads' | 'starter_pack' | 'storage_24h'; isFirstPurchase: boolean; purchaseNumber: number }
  | { type: 'purchaseFail'; productId: 'no_ads' | 'starter_pack' | 'storage_24h'; reason: 'user_cancelled' | 'payment_pending' | 'store_problem' | 'network' | 'product_unavailable' | 'already_owned' | 'not_allowed' | 'unknown' }
  | { type: 'purchaseRestore'; trigger: 'shop_button' | 'settings_button' | 'auto_check'; isSuccess: boolean; restoredProductIds: ('no_ads' | 'starter_pack' | 'storage_24h')[] }
  | {
      type: 'offlineIncomeClaim';
      isDoubled: boolean;
      doubleSource: 'ad' | 'no_ads_pass' | 'none';
      offlineDoublesToday: number;
      /** Дані для `offline_income_claim` (довідка повернення, 001 FR-25): відсутність, сховище, обрізане, зароблене до подвоєння й зараховане */
      awaySec: number;
      storageCapSec: number;
      cappedSec: number;
      earned: Big;
      claimed: Big;
      clerksCount: number;
      giftsWrittenOff: number;
      fuelBonusSec: number;
    }
  // 001: «Заправити» (generator_refuel)
  | { type: 'generatorRefuel'; tankPctBefore: number; tankCapacitySec: number; bonusOffSec: number }
  // 002: крок онбордингу закрито (onboarding_step_complete); `bonus` - бонус архіву кроку 9
  | { type: 'onboardingStep'; no: number; durationSec: number; skipped: boolean; gender: 'm' | 'f' | null; bonus: number | null }
  // застосунок пішов у фон / повернувся (аналітика сесій, docs/analytics.md)
  | { type: 'appBackground'; atMs: number }
  | { type: 'appForeground'; atMs: number }
  // 010: налаштування; аналітика етапу 5 (setting_change, push_permission_request)
  // newValue: true/false -> on/off у tracking-plan; null (progress_reset) -> done; для progress_reset лічильники взято до стирання
  | { type: 'settingChange'; settingName: 'sound' | 'haptics' | 'notif_storage' | 'notif_telegrams' | 'notif_inspections' | 'notif_gifts' | 'notif_boosts' | 'analytics' | 'progress_reset'; newValue: boolean | null; digitizationCount?: number; playtimeSec?: number }
  | { type: 'pushPermissionRequest'; trigger: 'onboarding_session_end' | 'settings'; prePromptResult: 'accepted' | 'declined'; osResult: 'granted' | 'denied' | 'provisional' | 'not_shown' }
  | { type: 'museumOpen'; source: 'tab' | 'unlock_toast'; journalsOwned: number; journalsUnseen: number }
  // 014: сюжет; аналітика етапу 5 (story_beat_deliver, diary_open)
  | { type: 'archiveSheetUnlock'; sheetId: string; sheetNumber: number; source: 'gift' | 'move' | 'boss' | 'conversion' | 'catch_up'; sheetsOwnedAfter: number }
  | { type: 'storyBeatDeliver'; beatId: string; arc: string; carrier: string; beatOrder: number; delaySec: number; isCatchUp: boolean; isWhileAway: boolean }
  // 013: фінал; аналітика етапу 5 (finale_step_complete). `finaleStepStart` - лише для тригерів сюжету (014 `finale_step`)
  | { type: 'finaleStepStart'; step: FinaleStep }
  | { type: 'finaleStepComplete'; step: FinaleStep; stepIndex: number; secSinceFinaleStart: number; isResumed: boolean; declinedCount: number }
  // 013: Дублі; аналітика етапу 5 (dub_start, personal_record_update). `dubClosed` - лише для журналу подій (акт «Дубль N закрито»)
  | { type: 'dubStart'; dubNumber: number; modifier: DubModifier; pointsTotal: number; secSinceFinale: number; secSinceOffer: number }
  | { type: 'dubClosed'; dubNumber: number; cycleSec: number }
  | { type: 'personalRecordUpdate'; recordType: 'dub' | 'lifetime_signatures'; value: number; previous: number }
  // 016: грамоти; аналітика етапу 5 (award_unlock, awards_wall_open)
  | { type: 'awardUnlock'; awardId: string; category: string; awardType: 'gramota' | 'podyaka' | 'nakaz'; isHidden: boolean; awardsOwnedAfter: number; isRetroactive: boolean; isResolvedOffline: boolean; isMirrored: boolean }
  | { type: 'awardsWallOpen'; source: 'segment' | 'award_toast' | 'profile'; awardsOwned: number; awardsUnseen: number };

/** Ефекти, що потрапляють у запис: «Пташка» онбордингу живе лише в пам'яті стору (002 R3). */
export type StoredEffect = Effect & { source: Exclude<Effect['source'], 'onboarding_bird'> };
