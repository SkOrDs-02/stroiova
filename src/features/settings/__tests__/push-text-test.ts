// 010 AC-5, FR-7: текст сповіщення з пулу push.<type> - мішок, підстановка місця й предмета, фільтр item, довжини ≤ 30 / ≤ 90.
import { newTelegrams } from '@/telegrams/schedule';
import { cfg } from '@/telegrams/test-utils';
import type { Candidate } from '@/notifications/types';

import { pushText } from '../pushText';

const cand = (type: Candidate['type'], extra: Partial<Candidate> = {}): Candidate => ({ type, atMs: 1, target: 'main', ...extra });

describe('текст сповіщень', () => {
  test('AC-5: № 5 підставляє місце акта, без залишків {місце}, не довший за ліміти', () => {
    let tg = newTelegrams(cfg.params, 'seed');
    for (let i = 0; i < 12; i++) {
      const r = pushText(tg, cand('race_reminder', { item: 'drone', place: 'fin' }));
      tg = r.tg;
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.title.length).toBeLessThanOrEqual(30);
      expect(r.body.length).toBeLessThanOrEqual(90);
      expect(r.body + r.title).not.toMatch(/[{}]/);
    }
  });

  test('AC-5: для лопат і генератора рядок з item: drone не береться', () => {
    let tg = newTelegrams(cfg.params, 'seed2');
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const r = pushText(tg, cand('gift_arrived', { item: 'shovel' }));
      tg = r.tg;
      seen.add(r.title + '|' + r.body);
    }
    for (const s of seen) expect(s).not.toMatch(/квадрокоптер|дрон/i);
  });

  test('мішок: поки пул не вичерпано, три підряд тексти різні', () => {
    let tg = newTelegrams(cfg.params, 'seed3');
    const out: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = pushText(tg, cand('storage_full'));
      tg = r.tg;
      out.push(r.body);
    }
    expect(new Set(out).size).toBe(3);
  });
});
