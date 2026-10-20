// 014 AC-17, AC-18, FR-24: щоденник - один рядок на першу сесію доби, за порядком пулу рівня; key-рядки пройдених рівнів першими.
import { DIARY } from '../content';
import { diaryOnSessionStart, gameDay, nextLine } from '../diary';
import { newStory } from '../engine';
import type { DiaryLine } from '../types';

const DAY = 86_400_000;
const INSTALL = Date.UTC(2026, 9, 1, 10, 0);
const line = (id: string, level: number, order: number, key = false): DiaryLine => ({ id, level, order, key, text: id });

describe('щоденник', () => {
  test('у день встановлення рядка немає; наступної доби - перший рядок Р1; та сама доба вдруге - нічого', () => {
    const s0 = newStory();
    expect(diaryOnSessionStart(s0, DIARY, 1, INSTALL, INSTALL + 3_600_000, 0).line).toBeNull();
    const a = diaryOnSessionStart(s0, DIARY, 1, INSTALL, INSTALL + DAY, 0);
    expect(a.line?.id).toBe('di_l1_01');
    expect(a.day).toBe(2);
    const b = diaryOnSessionStart(a.st, DIARY, 1, INSTALL, INSTALL + DAY + 5 * 3_600_000, 0);
    expect(b.line).toBeNull();
    const c = diaryOnSessionStart(a.st, DIARY, 1, INSTALL, INSTALL + 2 * DAY, 0);
    expect(c.line?.id).toBe('di_l1_02');
    expect(c.st.diary.got.map((g) => g.day)).toEqual([2, 3]);
  });

  test('AC-18: пул Р1 з 12 рядків - на 13-й день рядка немає', () => {
    let st = newStory();
    let last: DiaryLine | null = null;
    for (let d = 1; d <= 13; d++) {
      const r = diaryOnSessionStart(st, DIARY, 1, INSTALL, INSTALL + d * DAY, 0);
      st = r.st;
      last = r.line;
    }
    expect(st.diary.got).toHaveLength(12);
    expect(last).toBeNull();
  });

  test('AC-18: перехід на Р2 з непрочитаним key-рядком Р1 - він першим; не-key рядки Р1 пропущено', () => {
    const lines = [line('a1', 1, 1), line('a2', 1, 2, true), line('a3', 1, 3), line('b1', 2, 1)];
    expect(nextLine([{ id: 'a1', atMs: 0, day: 2 }], 2, lines)?.id).toBe('a2');
    expect(nextLine([{ id: 'a1', atMs: 0, day: 2 }, { id: 'a2', atMs: 0, day: 3 }], 2, lines)?.id).toBe('b1');
  });

  test('номер дня гри: день встановлення - 1; зсув зони враховано', () => {
    expect(gameDay(INSTALL, INSTALL, 0)).toBe(1);
    expect(gameDay(INSTALL, INSTALL + 2 * DAY, 0)).toBe(3);
    expect(gameDay(Date.UTC(2026, 9, 1, 22, 30), Date.UTC(2026, 9, 1, 23, 30), 120)).toBe(1 + 0);
  });
});
