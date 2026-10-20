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
  series?: string;
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

/** Журналів у музеї: 24 з рівнями 1-5 (016 FR-2, рішення 107+); № 1-8 - 07, № 9-24 - 016 */
export const MUSEUM_SIZE = 24;
/** Журнали першої серії (07): їх зводить у лічильник «N з 8» і множить № 8 */
export const CLASSIC_SIZE = 8;

const ALL = museum.journals as unknown as Journal[];
const BY_NO = new Map(ALL.map((j) => [j.no, j]));
const BY_KEY = new Map(ALL.flatMap((j) => [[j.id, j.no] as const, ...(j.aliases ?? []).map((a) => [a, j.no] as const)]));
const SOURCES = museum.sources as Record<string, { title: string }>;

/** Підставляє значення параметрів економіки в шаблон бонусу: «+{museumUnitPct}%» -> «+5%» (016: числа лише з balance/) */
export function bonusText(j: Journal, params: object): string {
  const p = params as Record<string, unknown>;
  return j.bonus.text.replace(/\{(\w+)\}/g, (m, k: string) => (typeof p[k] === 'number' ? String(p[k]).replace('.', ',') : m));
}

export function journal(no: number): Journal | undefined {
  return BY_NO.get(no);
}

/** Усі журнали музею за порядком слотів */
export function museumJournals(): Journal[] {
  return ALL.filter((j) => j.no <= MUSEUM_SIZE).sort((a, b) => a.no - b.no);
}

export interface Series {
  id: string;
  no: number;
  title: string;
  journals: number[];
  /** Рівень, на якому серія відкривається (id рівня з контенту) */
  level: string;
  bonus: { text: string; kind: string; param: string | null };
}

const SERIES = museum.series as unknown as Series[];
export const museumSeries = (): Series[] => SERIES;

/** Бонус серії з контенту з підставленим параметром: «+{museumSeriesPct}% до всіх підписів» -> «+1% до всіх підписів» */
export function seriesBonusText(se: Series, params: object): string {
  const p = params as Record<string, unknown>;
  return se.bonus.text.replace(/\{(\w+)\}/g, (m, k: string) => (typeof p[k] === 'number' ? String(p[k]).replace('.', ',') : m));
}
export const seriesOf = (no: number): Series | undefined => SERIES.find((s) => s.journals.includes(no));

/** Номер журналу за `journal_id` чи псевдонімом, яким його називає контент телеграм */
export function journalNo(key: string): number | undefined {
  return BY_KEY.get(key);
}

export function sourceTitle(key: string): string | undefined {
  return SOURCES[key]?.title;
}
