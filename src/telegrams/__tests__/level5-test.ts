// 013 FR-14, AC-10: телеграми Р5 - пул свого рівня без сценарних і Дублів, умови конвертацій, «згасаючі» першими після № 4, 1-2 на добу.
import { pick } from '../bag';
import { poolFor, telegram } from '../content';
import { planDay } from '../schedule';
import { seedFrom } from '../rng';
import { p, tgWith } from '../test-utils';

const D0 = Date.UTC(2025, 9, 10);
const ctx = (conversions: number) => ({ nowMs: D0, level: 5, digitizations: 20, conversions, month: 9, raceActive: null, repeatMinDays: 7 });

describe('пул Р5', () => {
  test('лише телеграми рівня 5; сценарні (108-113) і Дублі (278-287) та сповіщення не входять', () => {
    const pool = poolFor(5);
    expect(pool.length).toBeGreaterThan(40);
    for (const t of pool) {
      expect(t.level).toBe(5);
      expect(t.schedule?.scripted).toBeFalsy();
      expect(t.schedule?.endless).toBeFalsy();
      expect(t.kind ?? 'standard').toBe('standard');
    }
    expect(pool.some((t) => t.schedule?.fading)).toBe(true);
  });

  test('requires.conversionsMin: без конвертацій такі не приходять; з ними - можуть', () => {
    const gated = new Set(poolFor(5).filter((t) => (t.schedule?.requires?.conversionsMin ?? 0) > 0).map((t) => t.id));
    expect(gated.size).toBeGreaterThan(3);
    for (let i = 0; i < 300; i++) {
      const c = pick(tgWith([], { rng: seedFrom(`g-${i}`) }), ctx(0), () => Math.random());
      if (c) expect(gated.has(c.id)).toBe(false);
    }
    let seen = false;
    for (let i = 0; i < 400 && !seen; i++) {
      const c = pick(tgWith([]), ctx(3), () => Math.random());
      if (c && gated.has(c.id)) seen = true;
    }
    expect(seen).toBe(true);
  });

  test('після конвертації № 4 першими йдуть неотримані «згасаючі»; коли вони скінчились - решта', () => {
    const fading = poolFor(5).filter((t) => t.schedule?.fading).map((t) => t.id);
    let tg = tgWith([]);
    const got: string[] = [];
    for (let i = 0; i < fading.length; i++) {
      const c = pick(tg, ctx(5), () => Math.random())!;
      got.push(c.id);
      tg = { ...tg, inbox: [...tg.inbox, { uid: `${c.id}#${i}`, id: c.id, kind: 'telegram', receivedAt: D0, status: 'archive', answeredAt: D0 }] };
    }
    expect(got.sort()).toEqual(fading.slice().sort());
    const next = pick(tg, ctx(5), () => Math.random())!;
    expect(fading).not.toContain(next.id);
    expect(telegram(next.id)?.level).toBe(5);
    // на № 4 доступні лише ті «згасаючі», що вимагають ≤ 4: вони теж першими
    const first = pick(tgWith([]), ctx(4), () => Math.random())!;
    expect(telegram(first.id)?.schedule?.fading).toBe(true);
  });
});

describe('частота (FR-14, AC-10)', () => {
  test('до № 4 - 2-4 на добу; після № 4 - 1-2', () => {
    const counts = (conv: number) => {
      const c = new Set<number>();
      for (let i = 0; i < 60; i++) {
        const r = seedFrom(`d-${i}`);
        let x = r;
        const rand = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
        c.add(planDay(p, D0, D0, 0, rand, 5, conv).length);
      }
      return [...c].sort();
    };
    expect(Math.min(...counts(3))).toBeGreaterThanOrEqual(p.slowPerDayMin);
    expect(Math.max(...counts(3))).toBeLessThanOrEqual(p.slowPerDayMax);
    expect(counts(4).every((n) => n >= p.slowPerDayLateMin && n <= p.slowPerDayLateMax)).toBe(true);
    expect(counts(6)).toEqual([1, 2]);
  });
});
