// Підписи цифровізації (006): доріжка рівнів, назви журналів.
import museum from '../../../content/museum.json';

import { PLAYABLE_LEVELS } from '@/digitization/digitization';
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
 * Рівень без виходу в цій збірці (PLAYABLE_LEVELS): наступний «пізніше».
 */
export function track(level: number): { key: TrackKey; name: string; state: string }[] {
  return KEYS.map((key, i) => {
    const n = i + 1;
    const next = n === level + 1;
    const state =
      n < level
        ? digitT.trackState.done
        : n === level
          ? digitT.trackState.now
          : next && level === 1
            ? digitT.trackState.after3
            : next && level >= 2 && level < PLAYABLE_LEVELS
              ? digitT.trackState.afterFinal
              : digitT.trackState.later;
    return { key, name: digitT.track[key], state };
  });
}

/** Тексти екранів цифровізації за рівнем, на якому гравець зараз (Р4 - 012) */
export const byLevel = {
  sub: (l: number) => (l >= 4 ? digitT.subR4 : l === 3 ? digitT.subR3 : l === 2 ? digitT.subR2 : digitT.subR1),
  cta: (l: number, isLast: boolean) => (l >= 4 ? digitT.ctaR4 : l === 3 ? (isLast ? digitT.ctaToR3 : digitT.ctaR3) : l === 2 ? (isLast ? digitT.ctaToR3 : digitT.ctaR2) : isLast ? digitT.ctaLast : digitT.ctaR1),
  confirmTitle: (l: number) => (l >= 4 ? digitT.confirmTitleR4 : l === 3 ? digitT.confirmTitleR3 : l === 2 ? digitT.confirmTitleR2 : digitT.confirmTitleR1),
  confirmLvl: (l: number) => (l === 3 ? digitT.confirmLvlR4 : l === 2 ? digitT.confirmLvlR3 : digitT.confirmLvl),
  place: (l: number) => (l >= 4 ? digitT.placeR4 : l === 3 ? digitT.placeR3 : digitT.placeR2),
  /** Примітка акта цифровізації: з переходом рівня або новий цикл */
  note: (l: number, levelUp: boolean) => (levelUp ? (l >= 3 ? digitT.noteR4 : l >= 2 ? digitT.noteR3 : digitT.noteL2) : l >= 2 ? digitT.noteR2 : digitT.noteR1),
};
