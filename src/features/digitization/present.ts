// Підписи цифровізації (006): доріжка рівнів, назви журналів.
import museum from '../../../content/museum.json';

import { MUSEUM_SIZE } from '@/museum/journals';

import { digitT } from './texts';

const JOURNALS = new Map<number, string>((museum.journals as { no: number; title: string }[]).map((j) => [j.no, j.title]));

/** Журнали, які музей цієї збірки показує (№ 1-8, рішення 76); № 9+ записуються без розкриття до 016 */
export function shownJournals(nos: readonly number[]): number[] {
  return nos.filter((n) => n <= MUSEUM_SIZE);
}

export function journalTitle(no: number): string {
  return JOURNALS.get(no) ?? `№ ${no}`;
}

export type TrackKey = keyof typeof digitT.track;
const KEYS: TrackKey[] = ['batalion', 'bryhada', 'command', 'general', 'paperless'];

/**
 * Доріжка з 5 рівнів (06 FR-11, 011 FR-11): пройдено / зараз / після 3-ї (Р1) / після підсумкової (Р2) / пізніше.
 * Р3 не має виходу в цій збірці: Р4 «пізніше».
 */
export function track(level: number): { key: TrackKey; name: string; state: string }[] {
  return KEYS.map((key, i) => {
    const n = i + 1;
    const next = n === level + 1;
    const state =
      n < level ? digitT.trackState.done : n === level ? digitT.trackState.now : next && level === 1 ? digitT.trackState.after3 : next && level === 2 ? digitT.trackState.afterFinal : digitT.trackState.later;
    return { key, name: digitT.track[key], state };
  });
}
