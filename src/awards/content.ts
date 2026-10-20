// Довідник грамот (016 FR-17): тексти й умови - content/awards.json, змінюються лише оновленням контенту.
import awards from '../../content/awards.json';

import type { AwardCategory, AwardDef, AwardType, CounterDef } from './types';

export const AWARDS = awards.awards as unknown as AwardDef[];
export const COUNTERS = awards.counters as unknown as Record<string, CounterDef>;
export const CATEGORIES = awards.categories as Record<AwardCategory, string>;
export const TYPES = awards.types as Record<AwardType, { label: string; docTitle: string; toast: string }>;

/** Порядок секцій стіни: як у `categories`, «Для службового користування» - останньою */
export const CATEGORY_ORDER = Object.keys(CATEGORIES) as AwardCategory[];

const BY_ID = new Map(AWARDS.map((a) => [a.id, a]));

export function award(id: string): AwardDef | undefined {
  return BY_ID.get(id);
}

/** Усього грамот: «Грамоти · N з 62» */
export const AWARDS_TOTAL = AWARDS.length;
