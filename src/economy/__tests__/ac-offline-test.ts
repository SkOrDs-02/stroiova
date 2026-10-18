// 001 AC-7, AC-8, AC-14, AC-15 (без реклами), AC-16 (сховище); FR-23…FR-28.
import { advance, claimOffline, offline, offlineDoublesLeft } from '../game/advance';
import { income } from '../game/income';
import type { EconomyState, Effect } from '../game/types';
import { cfgV5, game, HOUR, MIN, T0 } from '../test-fixtures';

const allClerks = { streamClerks: [true, false, false, false], stageClerks: [true, true, true] };

describe('офлайн', () => {
  test('AC-7: 10 год, Рапорти 6/хв з діловодами, M 1, порожній бак → 2 880 за 8 год, обрізано 2 год', () => {
    const cfg = cfgV5();
    const s = game(cfg, allClerks);
    const r = offline(s, cfg, T0, T0 + 10 * HOUR);
    expect(r.earned).toBeCloseTo(2880, 9);
    expect(r.creditedMs).toBe(8 * HOUR);
    expect(r.cappedMs).toBe(2 * HOUR);
    expect(r.idle).toBe(false);
  });

  test('AC-8: діловод лише на Стройовій → 0, стан «Стройова стояла»', () => {
    const cfg = cfgV5();
    const s = game(cfg, { stageClerks: [false, true, false] });
    const r = offline(s, cfg, T0, T0 + 2 * HOUR);
    expect(r.earned).toBe(0);
    expect(r.idle).toBe(true);
  });

  test('AC-14: 1 000/хв, буст ×2 ще 1 год, порожній бак, 3 год → 240 000; онлайн при 60 і 15 к/с — те саме', () => {
    const cfg = cfgV5((p) => { p.streams[0]!.rate = 1000; for (const g of p.stages) g.rate = 5000; });
    const s = game(cfg, allClerks);
    const boost: Effect = { kind: 'mult', source: 'ad_boost', value: 2, startMs: T0 - HOUR, endMs: T0 + HOUR };
    expect(offline(s, cfg, T0, T0 + 3 * HOUR, [boost]).earned).toBeCloseTo(240000, 6);
    for (const fps of [60, 15]) {
      let st: EconomyState = s;
      const step = 1000 / fps;
      let t = T0;
      while (t < T0 + 3 * HOUR) {
        const next = Math.min(t + step, T0 + 3 * HOUR);
        st = advance(st, cfg, t, next, [boost]).state;
        t = next;
      }
      expect(st.signatures / 240000).toBeCloseTo(1, 9);
    }
  });

  test('бак ділить відрізок на 20%: повний бак 6 год, відсутність 6 год → ×1,25 рівно 4 год 48 хв', () => {
    const cfg = cfgV5((p) => { p.fuelBonusThreshold = 0.2; p.fuelBonus = 1.25; });
    const s = game(cfg, { ...allClerks, fuelEndMs: T0 + 6 * HOUR });
    const r = offline(s, cfg, T0, T0 + 6 * HOUR);
    expect(r.fuelBonusMs).toBe(4 * HOUR + 48 * MIN);
    expect(r.earned).toBeCloseTo(6 * (288 * 1.25 + 72), 9);
  });

  test('AC-16: 13 год 5 хв при сховищі 8 год → обрізано 5 год 5 хв', () => {
    const cfg = cfgV5();
    const r = offline(game(cfg, allClerks), cfg, T0, T0 + 13 * HOUR + 5 * MIN);
    expect(r.cappedMs).toBe(5 * HOUR + 5 * MIN);
  });

  test('FR-25: відсутність 3 хв — коротка, без довідки', () => {
    const cfg = cfgV5();
    expect(offline(game(cfg, allClerks), cfg, T0, T0 + 3 * MIN).short).toBe(true);
    expect(offline(game(cfg, allClerks), cfg, T0, T0 + 5 * MIN).short).toBe(false);
  });

  test('AC-15 (без реклами): ×2 до 3 нагород на добу; ×1 спроби не витрачає; новий день скидає', () => {
    const cfg = cfgV5();
    let s = game(cfg, allClerks);
    const res = offline(s, cfg, T0, T0 + 7 * HOUR + 42 * MIN);
    const day = '2026-10-10';
    const once = claimOffline(s, cfg, res, true, day);
    if ('error' in once) throw new Error(once.error);
    expect(once.claimed).toBeCloseTo(res.earned * 2, 9);
    s = once.state;
    expect(offlineDoublesLeft(s, cfg, day)).toBe(2);
    const x1 = claimOffline(s, cfg, res, false, day);
    if ('error' in x1) throw new Error(x1.error);
    expect(offlineDoublesLeft(x1.state, cfg, day)).toBe(2);
    for (let i = 0; i < 2; i++) {
      const r = claimOffline(s, cfg, res, true, day);
      if ('error' in r) throw new Error(r.error);
      s = r.state;
    }
    expect(offlineDoublesLeft(s, cfg, day)).toBe(0);
    expect(claimOffline(s, cfg, res, true, day)).toEqual({ error: 'limit' });
    expect(offlineDoublesLeft(s, cfg, '2026-10-11')).toBe(3);
    // годинник переведено назад: ранніша дата ліміт не обнуляє й дату не перезаписує
    expect(offlineDoublesLeft(s, cfg, '2026-10-09')).toBe(0);
    expect(claimOffline(s, cfg, res, true, '2026-10-09')).toEqual({ error: 'limit' });
  });

  test('подарунок «генератор» тримає ×1,25 без пального — входить у fuelBonusMs (FR-21)', () => {
    const cfg = cfgV5((p) => { p.fuelBonus = 1.25; });
    const s = game(cfg, allClerks); // бак порожній
    const gen: Effect = { kind: 'mult', source: 'gift_generator', value: 1, startMs: T0, endMs: T0 + 2 * HOUR };
    const r = offline(s, cfg, T0, T0 + 3 * HOUR, [gen]);
    expect(r.fuelBonusMs).toBe(2 * HOUR);
    expect(r.earned).toBeCloseTo(6 * (120 * 1.25 + 60), 9);
  });
});

describe('003: діловод у відрядженні (clerkAway)', () => {
  test('офлайн одиниця з clerk_away працює як без діловода; онлайн — як завжди', () => {
    const cfg = cfgV5();
    const s = game(cfg, { streamClerks: [true, false, false, false], stageClerks: [true, true, true] });
    const away = [{ kind: 'factor' as const, source: 'clerk_away' as const, value: 1, target: { type: 'stage' as const, id: cfg.params.stages[1]!.id }, startMs: T0, endMs: T0 + HOUR }];
    expect(offline(s, cfg, T0, T0 + HOUR, []).earned).toBeGreaterThan(0);
    expect(offline(s, cfg, T0, T0 + HOUR, away).earned).toBe(0);
    expect(offline(s, cfg, T0, T0 + 2 * HOUR, away).earned).toBeCloseTo(offline(s, cfg, T0 + HOUR, T0 + 2 * HOUR, []).earned, 6);
    expect(income(s, cfg, T0 + 1, away).perMin).toBe(income(s, cfg, T0 + 1, []).perMin);
  });
});
