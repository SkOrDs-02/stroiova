// Схема збереження (009 FR-1, FR-3, FR-9). Нова форма — нова версія + міграція в migrations.ts.
import { z } from 'zod';

export const CURRENT_SCHEMA = 1;

const unitRef = z.object({ type: z.enum(['stream', 'stage']), id: z.string() });

export const effectSchema = z.object({
  kind: z.enum(['mult', 'factor']),
  source: z.enum(['ad_boost', 'gift_drone', 'gift_shovel', 'gift_generator', 'inspection_pass', 'telegram_slow', 'telegram_stop', 'kombat_away', 'inspection_fail']),
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

export const gameSaveSchema = z.object({
  economy: economyStateSchema,
  effects: z.array(effectSchema),
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
