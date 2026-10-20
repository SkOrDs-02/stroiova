// Сюжетні дані з content/ (014 FR-1): кроки й рядки щоденника. Перевірка схеми - тест `content-test.ts` і CI.
import diaryJson from '../../content/diary.json';
import storyJson from '../../content/story.json';

import type { Beat, DiaryLine } from './types';

export const BEATS = (storyJson as unknown as { beats: Beat[] }).beats;
export const DIARY = (diaryJson as unknown as { lines: DiaryLine[] }).lines;

export const beatById = (id: string): Beat | undefined => BEATS.find((b) => b.id === id);
