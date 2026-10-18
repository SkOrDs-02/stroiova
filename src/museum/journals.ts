// Довідник журналів (007): тексти - content/museum.json, числа бонусів - конфіг економіки.
import museum from '../../content/museum.json';

export type Rarity = 'common' | 'rare' | 'legendary';
export type Cover = 'olive' | 'navy' | 'brown' | 'earth' | 'black';

export interface Journal {
  no: number;
  id: string;
  aliases?: string[];
  title: string;
  head: string;
  name: string;
  category: 'property' | 'personnel';
  rarity: Rarity;
  cover: Cover;
  bonus: { text: string; kind: string; target: string[]; param: string | null };
  source: { type: string; [k: string]: unknown };
  sourceText: string;
  hint: string;
  hintPre?: string;
  flavor: string;
  history: string;
  historySources: string[];
  /** Підпис джерела під «Історією скасування» */
  sourceLabel?: string;
  /** «Скасовано першою цифровізацією» на journal-new */
  fromText?: string;
}

/** Журналів у музеї цієї збірки (рішення 20, 76); № 9-24 - 016 */
export const MUSEUM_SIZE = 8;

const ALL = museum.journals as unknown as Journal[];
const BY_NO = new Map(ALL.map((j) => [j.no, j]));
const BY_KEY = new Map(ALL.flatMap((j) => [[j.id, j.no] as const, ...(j.aliases ?? []).map((a) => [a, j.no] as const)]));
const SOURCES = museum.sources as Record<string, { title: string }>;

export function journal(no: number): Journal | undefined {
  return BY_NO.get(no);
}

/** № 1-8 за порядком слотів */
export function museumJournals(): Journal[] {
  return ALL.filter((j) => j.no <= MUSEUM_SIZE).sort((a, b) => a.no - b.no);
}

/** Номер журналу за `journal_id` чи псевдонімом, яким його називає контент телеграм */
export function journalNo(key: string): number | undefined {
  return BY_KEY.get(key);
}

export function sourceTitle(key: string): string | undefined {
  return SOURCES[key]?.title;
}
