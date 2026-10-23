// 014 AC-11, AC-12, FR-17, FR-29: коли видаються аркуші Археолога.
import { grantSheets } from '../archive';
import { newStory, onEvent } from '../engine';
import { BEATS } from '../content';
import type { StoryCtx } from '../types';

const T0 = 1_700_000_000_000;
const ctx = (o: Partial<StoryCtx> = {}): StoryCtx => ({ level: 2, counts: {}, conversions: 0, packs: 0, levelStartMs: T0, exitAllowed: false, ...o });

describe('джерела аркушів', () => {
  test('AC-11: Р2, перший подарунок - аркуш 1 (gift); другий - аркуш 2; без події нічого', () => {
    expect(grantSheets(newStory(), ctx(), T0).grants).toEqual([]);
    const s1 = onEvent(newStory(), BEATS, { type: 'gift_arrived', level: 2 }, T0, false);
    const g1 = grantSheets(s1, ctx(), T0);
    expect(g1.grants.map((g) => [g.sheet.id, g.source])).toEqual([['ar_01', 'gift']]);
    const s2 = onEvent(g1.st, BEATS, { type: 'gift_arrived', level: 2 }, T0 + 1, false);
    expect(grantSheets(s2, ctx(), T0 + 1).grants.map((g) => g.sheet.id)).toEqual(['ar_02']);
  });

  test('AC-12: без «Переїзду» (017) його аркуш видається з першим подарунком рівня разом із аркушем подарунка', () => {
    const withR2 = { ...newStory(), sheets: { ar_01: 1, ar_02: 1, ar_03: 1 } };
    const s = onEvent(withR2, BEATS, { type: 'gift_arrived', level: 3 }, T0, false);
    const g = grantSheets(s, ctx({ level: 3 }), T0);
    expect(g.grants.map((x) => [x.sheet.id, x.source])).toEqual([
      ['ar_04', 'move'],
      ['ar_05', 'gift'],
    ]);
  });

  test('017 FR-9: з переїздом аркуш слота видає сам переїзд, а не подарунок', () => {
    const withR2 = { ...newStory(), sheets: { ar_01: 1, ar_02: 1, ar_03: 1 } };
    const s = onEvent(withR2, BEATS, { type: 'gift_arrived', level: 3 }, T0, false);
    expect(grantSheets(s, ctx({ level: 3, moves: [] }), T0).grants.map((x) => [x.sheet.id, x.source])).toEqual([['ar_05', 'gift']]);
    expect(grantSheets(withR2, ctx({ level: 3, moves: [3] }), T0).grants.map((x) => [x.sheet.id, x.source])).toEqual([['ar_04', 'move']]);
  });

  test('підсумкова рівня видає аркуш boss; `exitAllowed` без події теж (оновлення посеред рівня)', () => {
    const viaEvent = onEvent(newStory(), BEATS, { type: 'boss_passed', level: 2 }, T0, false);
    expect(grantSheets(viaEvent, ctx(), T0).grants.map((x) => x.sheet.id)).toEqual(['ar_03']);
    expect(grantSheets(newStory(), ctx({ exitAllowed: true }), T0).grants.map((x) => x.sheet.id)).toEqual(['ar_03']);
  });

  test('AC-12: перехід на Р4 з двома аркушами Р3 - третій видано одразу (catch_up); аркуші Р2 теж', () => {
    const base = { ...newStory(), sheets: { ar_01: 1, ar_02: 1, ar_03: 1, ar_04: 1, ar_05: 1 } };
    const g = grantSheets(base, ctx({ level: 4 }), T0);
    expect(g.grants.map((x) => [x.sheet.id, x.source])).toEqual([['ar_06', 'catch_up']]);
  });

  test('FR-29 / AC-20: перший запуск на Р3 - аркуші Р2 одним пакетом (catch_up)', () => {
    const g = grantSheets(newStory(), ctx({ level: 3 }), T0);
    expect(g.grants.map((x) => x.sheet.id)).toEqual(['ar_01', 'ar_02', 'ar_03']);
    expect(new Set(g.grants.map((x) => x.source))).toEqual(new Set(['catch_up']));
  });

  test('Р5: конвертації № 3 і № 5 видають аркуші 11 і 12; подарунок Р5 - аркуш 10', () => {
    const base = { ...newStory(), sheets: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`ar_0${i + 1}`, 1])) };
    const s = onEvent(base, BEATS, { type: 'gift_arrived', level: 5 }, T0, false);
    expect(grantSheets(s, ctx({ level: 5, conversions: 3 }), T0).grants.map((x) => x.sheet.id)).toEqual(['ar_10', 'ar_11']);
  });
});
