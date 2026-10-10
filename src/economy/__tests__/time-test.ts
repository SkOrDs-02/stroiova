// 009 AC-9, AC-10, AC-11; FR-12…FR-15.
import { advance, offline, offlineDoublesLeft } from '../game/advance';
import { absence, isNewSession, shiftTimers } from '../game/time';
import type { Effect } from '../game/types';
import { cfgV5, game, HOUR, MIN, T0 } from '../test-fixtures';

describe('час між сесіями', () => {
  test('AC-10: вихід 14:00 з бустом ×2 на 3 год, повернення о 12:00 → офлайн 0, буст «ще 3:00:00»', () => {
    const cfg = cfgV5();
    const leftAt = T0 + 14 * HOUR;
    const backAt = T0 + 12 * HOUR;
    const boost: Effect = { kind: 'mult', source: 'ad_boost', value: 2, startMs: leftAt, endMs: leftAt + 3 * HOUR };
    const s = game(cfg, { streamClerks: [true, false, false, false], stageClerks: [true, true, true], fuelEndMs: leftAt + HOUR });
    const a = absence(leftAt, backAt);
    expect(a).toMatchObject({ deltaMs: 0, clockBack: true, rawMs: -2 * HOUR });
    const shifted = shiftTimers(s, [boost], a.rawMs);
    expect(shifted.effects[0]!.endMs - backAt).toBe(3 * HOUR);
    expect(shifted.state.fuelEndMs! - backAt).toBe(HOUR);
    expect(offline(shifted.state, cfg, backAt, backAt + a.deltaMs, shifted.effects).earned).toBe(0);
  });

  test('годинник уперед або без змін — нічого не зсувається', () => {
    const s = game(cfgV5(), { fuelEndMs: T0 });
    expect(shiftTimers(s, [], 5 * MIN).state).toBe(s);
    expect(absence(T0, T0 + 5 * MIN)).toMatchObject({ deltaMs: 5 * MIN, clockBack: false });
  });

  test('AC-9: дохід сесії — за монотонним годинником; стрибок стінного годинника не впливає', () => {
    const cfg = cfgV5((p) => { p.streams[0]!.rate = 1000; for (const g of p.stages) g.rate = 5000; });
    // гра рахує інтервали монотонного годинника: 60 кадрів по 1 с = 1 хв, хоч би що показував стінний
    let st = game(cfg);
    let mono = 0;
    for (let i = 0; i < 60; i++) { st = advance(st, cfg, mono, mono + 1000).state; mono += 1000; }
    expect(st.signatures).toBeCloseTo(1000, 9);
  });

  test('AC-11: 3 з 3 подвоєння 10.10; дата 09.10 — так само 3 з 3; 11.10 — 0 з 3', () => {
    const cfg = cfgV5();
    const s = game(cfg, { offlineDoubles: { date: '2026-10-10', count: 3 } });
    expect(offlineDoublesLeft(s, cfg, '2026-10-10')).toBe(0);
    expect(offlineDoublesLeft(s, cfg, '2026-10-09')).toBe(0);
    expect(offlineDoublesLeft(s, cfg, '2026-10-11')).toBe(3);
  });

  test('нова сесія: холодний старт або ≥ 120 с', () => {
    expect(isNewSession(null, T0)).toBe(true);
    expect(isNewSession(T0, T0 + 119_000)).toBe(false);
    expect(isNewSession(T0, T0 + 120_000)).toBe(true);
  });
});
