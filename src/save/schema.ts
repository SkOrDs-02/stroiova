// Схема збереження (009 FR-1, FR-3, FR-9). Нова форма — нова версія + міграція в migrations.ts.
import { z } from 'zod';

export const CURRENT_SCHEMA = 3;

const unitRef = z.object({ type: z.enum(['stream', 'stage']), id: z.string() });

export const effectSchema = z.object({
  kind: z.enum(['mult', 'factor']),
  source: z.enum(['ad_boost', 'gift_drone', 'gift_shovel', 'gift_generator', 'inspection_pass', 'telegram_slow', 'telegram_stop', 'kombat_away', 'inspection_fail', 'clerk_away']),
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
      kind: z.enum(['delayed', 'return', 'followUp', 'fill', 'kombatEnd', 'runner', 'inspRoll']),
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
    active: z.object({ startMs: z.number(), endMs: z.number(), runnerAtMs: z.number().nullable() }).nullable(),
  }),
  deliveries: z.number().int().nonnegative(),
});

export const gameSaveSchema = z.object({
  economy: economyStateSchema,
  effects: z.array(effectSchema),
  /** Ігровий час на передньому плані від першого запуску (002 FR-29) */
  playtimeMs: nonNeg,
  onboarding: onboardingSchema,
  /** Телеграми й репутація (003) */
  telegrams: telegramStateSchema,
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
