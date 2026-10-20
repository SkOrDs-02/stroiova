// 014 AC-1, FR-1: схема й цілісність content/story.json і content/diary.json; циклів і невідомих носіїв немає.
import diaryJson from '../../../content/diary.json';
import storyJson from '../../../content/story.json';
import { telegram } from '@/telegrams/content';
import { checkDiary, checkStory } from '../schema';
import { BEATS, DIARY } from '../content';

const knownTelegram = (id: string) => telegram(id) != null;

describe('content/story.json', () => {
  test('схема, носії, залежності без циклів', () => {
    const errs = checkStory(storyJson, { has: knownTelegram } as ReadonlySet<string>);
    expect(errs).toEqual([]);
  });

  test('усі телеграми кроків є в контенті (ВП-11)', () => {
    for (const b of BEATS.filter((x) => x.carrier === 'telegram')) expect([b.id, knownTelegram((b.payload as { telegramId: string }).telegramId)]).toEqual([b.id, true]);
  });

  test('AC-1: цикл у requires і невідомий носій відхиляються', () => {
    const base = structuredClone(storyJson) as { beats: Record<string, unknown>[] };
    const a = base.beats[0]!;
    const b = base.beats[1]!;
    const loop = { ...base, beats: [{ ...a, id: 'st_who_writes_01', requires: [{ beat: 'st_who_writes_02' }] }, { ...b, id: 'st_who_writes_02', arc: 'ptashka', order: 1, requires: [{ beat: 'st_who_writes_01' }] }] };
    expect(checkStory(loop).some((e) => e.includes('цикл'))).toBe(true);
    const bad = { ...base, beats: [{ ...a, carrier: 'hologram' }] };
    expect(checkStory(bad).length).toBeGreaterThan(0);
  });
});

describe('content/diary.json', () => {
  test('схема, пули 12/20/28/28/26 і 7 рядків тиші, обидві форми статі', () => {
    expect(checkDiary(diaryJson)).toEqual([]);
    const by = (l: number) => DIARY.filter((x) => x.level === l).length;
    expect([1, 2, 3, 4, 5].map(by)).toEqual([12, 20, 28, 28, 26]);
    expect(DIARY.filter((x) => x.quiet).length).toBe(7);
  });
});
