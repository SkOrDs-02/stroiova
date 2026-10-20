// Фікстури записів для тестів 009.
import { cfgV5, game, T0 } from '@/economy/test-fixtures';
import { newAwards } from '@/awards/awards';
import { newFinale } from '@/finale/finale';
import { newStory } from '@/story/engine';

import { digitizationV6, inspectionsV4, monetizationV8, museumV7, onboardingDone, settingsV9, raceV5, telegramsV3 } from './migrations';
import type { SaveDraft } from './repository';
import { CURRENT_SCHEMA } from './schema';

export function draft(patch: Partial<SaveDraft> = {}, economy: Parameters<typeof game>[1] = {}): SaveDraft {
  return {
    schemaVersion: CURRENT_SCHEMA,
    savedAt: T0,
    appVersion: '0.1.0',
    contentVersion: 'content-2026.10.10',
    economyConfig: null,
    game: { economy: game(cfgV5(), economy), effects: [], playtimeMs: 0, onboarding: onboardingDone(), telegrams: telegramsV3(), inspections: inspectionsV4(0), race: raceV5(), digitization: digitizationV6(0), museum: museumV7(), monetization: monetizationV8(), ...settingsV9(), story: newStory(), awards: newAwards(), finale: newFinale() },
    ...patch,
  };
}
