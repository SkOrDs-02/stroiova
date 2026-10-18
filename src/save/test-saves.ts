// Фікстури записів для тестів 009.
import { cfgV5, game, T0 } from '@/economy/test-fixtures';

import { inspectionsV4, onboardingDone, raceV5, telegramsV3 } from './migrations';
import type { SaveDraft } from './repository';
import { CURRENT_SCHEMA } from './schema';

export function draft(patch: Partial<SaveDraft> = {}, economy: Parameters<typeof game>[1] = {}): SaveDraft {
  return {
    schemaVersion: CURRENT_SCHEMA,
    savedAt: T0,
    appVersion: '0.1.0',
    contentVersion: 'content-2026.10.10',
    economyConfig: null,
    game: { economy: game(cfgV5(), economy), effects: [], playtimeMs: 0, onboarding: onboardingDone(), telegrams: telegramsV3(), inspections: inspectionsV4(0), race: raceV5() },
    ...patch,
  };
}
