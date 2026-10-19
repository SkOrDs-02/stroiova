// Схема збереження (009 FR-1, FR-3, FR-9). Нова форма — нова версія + міграція в migrations.ts.
import { z } from 'zod';

export const CURRENT_SCHEMA = 10;

const unitRef = z.object({ type: z.enum(['stream', 'stage']), id: z.string() });

export const effectSchema = z.object({
  kind: z.enum(['mult', 'factor']),
  source: z.enum(['ad_boost', 'gift_drone', 'gift_shovel', 'gift_generator', 'inspection_pass', 'telegram_slow', 'telegram_stop', 'kombat_away', 'meeting_overrun', 'pack_beats', 'inspection_fail', 'clerk_away']),
  value: z.number().positive(),
  target: unitRef.optional(),
  startMs: z.number(),
  endMs: z.number(),
});

const nonNeg = z.number().finite().nonnegative();

export const economyStateSchema = z.object({
  level: z.number().int().min(1),
  streamLevels: z.array(z.number().int().nonnegative()),
  stageLevels: z.array(z.number().int().nonnegative()),
  streamClerks: z.array(z.boolean()),
  stageClerks: z.array(z.boolean()),
  signatures: nonNeg,
  lifetimeCycle: nonNeg,
  prestigePoints: z.number().int().nonnegative(),
  hasNoAds: z.boolean(),
  fuelEndMs: z.number().nullable(),
  fuelCapacityMs: z.number().positive(),
  paper: nonNeg,
  storageHours: z.number().positive(),
  seenUnlocks: z.array(z.string()),
  hiredEver: z.boolean(),
  catBonusAtMs: z.number().nullable(),
  tapTimes: z.array(z.number()),
  offlineDoubles: z.object({ date: z.string(), count: z.number().int().nonnegative() }),
  museum: z.object({ unit: z.record(z.string(), z.number().positive()), storage: z.number().positive(), paper: z.number().positive() }),
});

const stepNo = z.number().int().min(1).max(11);

/** Стан онбордингу (002 data-model.md); схема 2. */
export const onboardingSchema = z.object({
  step: z.union([stepNo, z.literal('done')]),
  callsign: z.object({ type: z.enum(['excel', 'skrepka', 'drukar', 'custom']), text: z.string().min(2).max(16) }).nullable(),
  gender: z.enum(['m', 'f']).nullable(),
  birdLeftMs: nonNeg,
  completed: z.array(z.object({ step: stepNo, atPlayMs: nonNeg, durationMs: nonNeg, skipped: z.boolean() })),
  stepStartedAtPlayMs: nonNeg,
  tg1ReceivedAtPlayMs: nonNeg.nullable(),
  tg1: z.object({ choiceId: z.string(), atPlayMs: nonNeg }).nullable(),
  archiveBonus: nonNeg.nullable(),
});

const slowSchema = z.object({ target: z.string(), mult: z.number(), hours: z.number() });
const effectsSchema = z.record(z.string(), z.unknown());

/** Стан телеграм і репутації (003 data-model.md); схема 3. */
export const telegramStateSchema = z.object({
  rng: z.number(),
  day: z.object({ key: z.string(), slots: z.array(z.number()), used: z.number().int().nonnegative() }).nullable(),
  startMs: z.number().nullable(),
  inbox: z.array(
    z.object({
      uid: z.string(),
      id: z.string(),
      kind: z.enum(['telegram', 'notice', 'override', 'note']),
      receivedAt: z.number(),
      status: z.enum(['new', 'work', 'drawer', 'archive']),
      choiceId: z.string().optional(),
      answeredAt: z.number().optional(),
      workUntil: z.number().optional(),
      read: z.boolean().optional(),
      flagged: z.boolean().optional(),
      vars: z.object({ n: z.number(), n1: z.number() }).optional(),
      result: z
        .object({
          rep: z.number(),
          repAfter: z.number(),
          paper: z.number(),
          slow: z.array(slowSchema),
          chancePct: z.number(),
          inspHit: z.boolean(),
          rollText: z.string().optional(),
          shield: z.boolean(),
        })
        .optional(),
    }),
  ),
  queue: z.array(z.string()),
  timers: z.array(
    z.object({
      atMs: z.number(),
      kind: z.enum(['delayed', 'return', 'followUp', 'fill', 'inspRoll']),
      itemUid: z.string(),
      effects: effectsSchema.optional(),
      telegramId: z.string().optional(),
      pct: z.number().optional(),
    }),
  ),
  flags: z.record(z.string(), z.literal(true)),
  reputation: z.object({
    value: z.number().int().min(0).max(100),
    history: z.array(z.object({ delta: z.number(), atMs: z.number(), uid: z.string() })).max(3),
  }),
  firstInspectionPassed: z.boolean(),
  unscheduledDays: z.array(z.string()),
  refuelBlockedUntil: z.number(),
  override: z.object({ lastDayKey: z.string().nullable(), nextNo: z.number() }),
  kombat: z.object({
    lastDayKey: z.string().nullable(),
    active: z.object({ startMs: z.number(), endMs: z.number(), runnerAtMs: z.number().nullable(), found: z.boolean().optional() }).nullable(),
  }),
  meeting: z.object({
    lastDayKey: z.string().nullable(),
    active: z.object({ startMs: z.number(), endMs: z.number(), runnerAtMs: z.number().nullable(), found: z.boolean().optional() }).nullable(),
  }),
  deliveries: z.number().int().nonnegative(),
  lineBags: z.record(z.string(), z.object({ used: z.array(z.number().int().nonnegative()), last: z.number().int().nullable() })),
});

const bossId = z.enum(['brigade_commission', 'command_commission']);
const trigger = z.enum(['scheduled', 'unscheduled']);
const inspKind = z.enum(['regular', 'final']);
const reason = z.object({ telegramId: z.string() }).nullable();

/** Стан перевірок (004 data-model.md); схема 4. */
export const inspectionStateSchema = z.object({
  rng: z.number(),
  installMs: z.number(),
  nextNo: z.number().int().min(1),
  nextArrMs: z.number().nullable(),
  nextWarnMin: nonNeg,
  active: z
    .object({
      id: z.string().regex(/^insp_\d{4,}$/),
      no: z.number().int().min(1),
      trigger,
      boss: bossId,
      level: z.number().int().min(1),
      kind: inspKind,
      attempt: z.number().int().min(1),
      annMs: z.number(),
      arrMs: z.number(),
      items: z.array(z.object({ id: z.string(), price: nonNeg, done: z.boolean(), doneAtMs: z.number().optional(), fromTelegram: z.string().optional(), mech: z.boolean().optional() })),
      reason,
      remark: z.boolean(),
      warned: z.boolean(),
      modal: z.boolean(),
    })
    .nullable(),
  last: z
    .object({
      id: z.string(),
      no: z.number().int().min(1),
      trigger,
      boss: bossId,
      level: z.number().int().min(1),
      kind: inspKind,
      attempt: z.number().int().min(1),
      exitUnlocked: z.boolean(),
      arrMs: z.number(),
      passed: z.boolean(),
      remark: z.boolean(),
      items: z.array(z.object({ id: z.string(), done: z.boolean(), fromTelegram: z.string().optional(), mech: z.boolean().optional() })),
      reason,
      offline: z.boolean(),
      seen: z.boolean(),
    })
    .nullable(),
  pendingRemarkPct: z.number().min(0).max(100),
  bossesSeen: z.array(bossId),
  callPending: z.boolean(),
  journalGiven: z.boolean(),
});

const giftType = z.enum(['drone', 'shovel', 'generator']);

/** Гонка з часом (005 data-model.md); схема 5. */
export const raceStateSchema = z.object({
  rng: z.number(),
  giftIdx: z.number().int().nonnegative(),
  lastGiftDayKey: z.string().nullable(),
  lastRaceEndMs: z.number().nullable(),
  active: z
    .object({
      id: z.string(),
      no: z.number().int().min(1),
      type: giftType,
      level: z.number().int().min(1),
      startMs: z.number(),
      svcEndMs: z.number(),
      steps: z.array(z.object({ unit: z.enum(['akty', 'kombat', 'stroy', 'fin', 'kazna', 'narada']), sec: nonNeg })),
      actTotalSec: nonNeg,
      actEndMs: z.number(),
      pausedAtMs: z.number().nullable(),
      digUsed: z.boolean(),
      sped: z.array(z.object({ method: z.enum(['digital_bonus', 'telegram', 'ad']), sec: z.number() })),
      seen: z.boolean(),
    })
    .nullable(),
  last: z
    .object({
      id: z.string(),
      no: z.number().int().min(1),
      type: giftType,
      level: z.number().int().min(1),
      won: z.boolean(),
      endMs: z.number(),
      tookSec: nonNeg,
      marginSec: nonNeg,
      steps: z.array(z.object({ unit: z.enum(['akty', 'kombat', 'stroy', 'fin', 'kazna', 'narada']), sec: nonNeg })),
      stepsDone: z.number().int().nonnegative(),
      stepsTotal: z.number().int().min(1),
      speedups: z.number().int().nonnegative(),
      offline: z.boolean(),
      seen: z.boolean(),
    })
    .nullable(),
});

/** Цифровізація (006 plan.md); схема 6. */
export const digitizationStateSchema = z.object({
  counts: z.record(z.string(), z.number().int().nonnegative()),
  total: z.number().int().nonnegative(),
  howSeen: z.boolean(),
  ceremony: z
    .object({
      no: z.number().int().min(1),
      level: z.number().int().min(1),
      levelCount: z.number().int().min(1),
      atMs: z.number(),
      lifetime: nonNeg,
      points: z.number().int().nonnegative(),
      pointsTotal: z.number().int().nonnegative(),
      multBefore: z.number(),
      multAfter: z.number(),
      journals: z.array(z.number().int()),
      levelUp: z.boolean(),
      step: z.enum(['result', 'levelUp']),
    })
    .nullable(),
  cycleStartMs: z.number(),
  levelExitAllowed: z.boolean(),
});

/** Музей й журнал курйозів (007); схема 7. */
export const museumStateSchema = z.object({
  owned: z.array(z.object({ no: z.number().int().min(1), atMs: z.number(), source: z.enum(['digitization', 'telegram', 'inspection']), seen: z.boolean() })),
  reveal: z.array(z.object({ no: z.number().int().min(1), k: z.number().int().min(1), m: z.number().int().min(1), nAfter: z.number().int().min(1), via: z.enum(['insp', 'other']) })),
  curios: z.array(
    z.object({
      seq: z.number().int().min(1),
      kind: z.enum(['telegram', 'gift']),
      atMs: z.number(),
      telegramId: z.string().optional(),
      uid: z.string().optional(),
      choiceId: z.string().optional(),
      status: z.enum(['diligent', 'formal', 'drawer', 'special', 'info']).optional(),
      text: z.string().nullable().optional(),
      gift: z
        .object({
          raceId: z.string(),
          raceNo: z.number().int().min(1),
          type: z.enum(['drone', 'shovel', 'generator']),
          level: z.number().int().min(1),
          steps: z.array(z.object({ unit: z.enum(['akty', 'kombat', 'stroy', 'fin', 'kazna', 'narada']), sec: z.number() })),
          stepsDone: z.number().int().nonnegative(),
          stepsTotal: z.number().int().min(1),
          marginSec: z.number(),
        })
        .optional(),
    }),
  ),
  curioSeq: z.number().int().nonnegative(),
  curiosSeen: z.number().int().nonnegative(),
});

const productId = z.enum(['no_ads', 'starter_pack', 'storage_24h']);

/** Реклама й покупки (008); схема 8. */
export const monetizationStateSchema = z.object({
  rights: z.object({ no_ads: z.boolean(), starter_pack: z.boolean(), storage_24h: z.boolean() }),
  rightsAt: z.number().nullable(),
  starterGranted: z.boolean(),
  offer: z.enum(['wait', 'due', 'done']),
  pending: z.array(productId),
  ads: z.object({ date: z.string(), boost: z.number().int().nonnegative(), race: z.number().int().nonnegative() }),
  inspAdId: z.string().nullable(),
  purchases: z.number().int().nonnegative(),
  success: z.array(productId),
});

/** Налаштування (010); схема 9. */
export const settingsSchema = z.object({
  sound: z.boolean(),
  haptics: z.boolean(),
  notif: z.object({ storage: z.boolean(), telegrams: z.boolean(), inspections: z.boolean(), gifts: z.boolean(), boosts: z.boolean() }),
  analytics: z.boolean(),
  pushPermission: z.enum(['not_asked', 'granted', 'denied', 'provisional']),
  testUser: z.boolean(),
});

/** Заплановані сповіщення й лічильник доби (010); схема 9. */
export const notificationsSchema = z.object({
  planned: z.array(
    z.object({
      type: z.enum(['storage_full', 'telegram_new', 'inspection', 'inspection_passed', 'race_reminder', 'race_won', 'boost_end', 'fuel_bonus_end', 'kombat_found', 'gift_arrived']),
      atMs: z.number(),
      title: z.string(),
      body: z.string(),
      target: z.enum(['offline-return', 'tg-detail', 'insp-prep', 'main', 'race-sheet', 'boosts-sheet', 'resource-sheet']),
      ref: z.string().optional(),
    }),
  ),
  sent: z.object({ day: z.string(), count: z.number().int().nonnegative(), fuel: z.number().int().nonnegative() }),
});

/** Лічильники особової справи (010 FR-26); схема 9. */
export const statsSchema = z.object({ inspTotal: z.number().int().nonnegative(), inspPassed: z.number().int().nonnegative(), drones: z.number().int().nonnegative() });

export const gameSaveSchema = z.object({
  economy: economyStateSchema,
  effects: z.array(effectSchema),
  /** Ігровий час на передньому плані від першого запуску (002 FR-29) */
  playtimeMs: nonNeg,
  onboarding: onboardingSchema,
  /** Телеграми й репутація (003) */
  telegrams: telegramStateSchema,
  /** Перевірки (004) */
  inspections: inspectionStateSchema,
  /** Гонка з часом (005) */
  race: raceStateSchema,
  /** Цифровізація (006) */
  digitization: digitizationStateSchema,
  /** Музей й курйози (007) */
  museum: museumStateSchema,
  /** Реклама й покупки (008) */
  monetization: monetizationStateSchema,
  /** Налаштування й сповіщення (010) */
  settings: settingsSchema,
  notifications: notificationsSchema,
  stats: statsSchema,
});

const unitDef = z.object({ id: z.string(), rate: z.number(), cost: z.number(), growth: z.number(), manager: z.number() }).loose();

export const economyConfigSchema = z.object({
  version: z.string(),
  source: z.enum(['bundled', 'remote', 'cached']),
  params: z.object({ streams: z.array(unitDef), stages: z.array(unitDef), levels: z.array(z.object({}).loose()) }).loose(),
});

export const saveFileSchema = z.object({
  schemaVersion: z.number().int().min(1),
  savedAt: z.number(),
  appVersion: z.string(),
  contentVersion: z.string(),
  economyConfig: economyConfigSchema.nullable(),
  checksum: z.string().regex(/^[0-9a-f]{8}$/),
  game: gameSaveSchema,
});

export type GameSave = z.infer<typeof gameSaveSchema>;
export type SaveFile = z.infer<typeof saveFileSchema>;
