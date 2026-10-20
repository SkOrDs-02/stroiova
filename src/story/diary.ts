// Щоденник стройовика (014 FR-24, FR-25): один рядок на першу сесію календарної доби, за порядком пулу рівня.
import { DAY, dayKey, localMs } from '@/telegrams/clock';

import type { DiaryGot, DiaryLine, StoryState } from './types';

/**
 * Наступний рядок: спершу непрочитані `key`-рядки пройдених рівнів (за рівнем і порядком), далі непрочитані рядки поточного рівня за порядком.
 * Не-`key` рядки пройдених рівнів пропускаються. Пул вичерпано - null.
 */
export function nextLine(got: readonly DiaryGot[], level: number, lines: readonly DiaryLine[], quiet = false): DiaryLine | null {
  const seen = new Set(got.map((g) => g.id));
  // тиждень тиші (013 FR-22): щоденник веде свій пул `quiet`, за порядком; вичерпаний - далі звичайний
  if (quiet) {
    const q = lines.filter((l) => l.quiet && !seen.has(l.id)).sort((a, b) => a.order - b.order)[0];
    if (q) return q;
  }
  const byOrder = (a: DiaryLine, b: DiaryLine) => (a.level ?? 99) - (b.level ?? 99) || a.order - b.order;
  const key = lines.filter((l) => l.level != null && l.level < level && l.key && !seen.has(l.id)).sort(byOrder)[0];
  if (key) return key;
  return lines.filter((l) => l.level === level && !seen.has(l.id)).sort(byOrder)[0] ?? null;
}

/** Номер дня гри (1 - день встановлення) */
export function gameDay(installMs: number, nowMs: number, tz: number): number {
  const d = (ms: number) => Math.floor(localMs(ms, tz) / DAY);
  return Math.max(1, d(nowMs) - d(installMs) + 1);
}

/**
 * Перша сесія нової календарної доби дає рядок (FR-24). У день встановлення рядка немає ("Перший рядок з'явиться завтра").
 * Повертає новий стан і рядок або той самий стан, якщо рядка немає.
 */
export function diaryOnSessionStart(st: StoryState, lines: readonly DiaryLine[], level: number, installMs: number, nowMs: number, tz: number, quiet = false): { st: StoryState; line: DiaryLine | null; day: number } {
  const today = dayKey(nowMs, tz);
  const day = gameDay(installMs, nowMs, tz);
  if (st.diary.lastDay === today || dayKey(installMs, tz) === today) return { st, line: null, day };
  const line = nextLine(st.diary.got, level, lines, quiet);
  // доба позначається, навіть коли пул вичерпано: повторно не питаємо
  const diary = { got: line ? [...st.diary.got, { id: line.id, atMs: nowMs, day }] : st.diary.got, lastDay: today };
  return { st: { ...st, diary }, line, day };
}
