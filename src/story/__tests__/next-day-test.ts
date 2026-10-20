// 013 FR-19, 014 FR-19: `afterHours: next_day` - перша мить наступної календарної доби за місцевим часом.
import { dueAt } from '../engine';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const utc = (d: number, h: number, m = 0) => Date.UTC(2025, 9, d, h, m);

describe('dueAt', () => {
  test('години додаються до мітки', () => {
    expect(dueAt(utc(10, 12), 4)).toBe(utc(10, 16));
    expect(dueAt(utc(10, 12), undefined)).toBe(utc(10, 12));
  });

  test('next_day у UTC - наступна північ', () => {
    expect(dueAt(utc(10, 12), 'next_day')).toBe(utc(11, 0));
    expect(dueAt(utc(10, 23, 59), 'next_day')).toBe(utc(11, 0));
  });

  test('next_day за місцевим часом: UTC+3 о 22:30 UTC вже наступна доба - північ через добу', () => {
    // 22:30 UTC = 01:30 місцевого 11-го, наступна місцева північ - 12-го 00:00 місцевого = 11-го 21:00 UTC
    expect(dueAt(utc(10, 22, 30), 'next_day', 180)).toBe(utc(11, 21));
    // 12:00 UTC = 15:00 місцевого 10-го -> 11-го 00:00 місцевого = 10-го 21:00 UTC
    expect(dueAt(utc(10, 12), 'next_day', 180)).toBe(utc(10, 21));
  });

  test('next_day лише на добу вперед і для від’ємного зсуву', () => {
    expect(dueAt(utc(10, 3), 'next_day', -300)).toBe(utc(10, 5));
    expect(dueAt(utc(10, 12), 'next_day', 0) - utc(10, 12)).toBeLessThanOrEqual(DAY);
  });
});
