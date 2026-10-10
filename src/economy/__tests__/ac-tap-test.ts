// 001 AC-9, FR-16.
import { tap } from '../game/actions';
import type { EconomyState, Effect } from '../game/types';
import { cfgV5, game, HOUR, T0 } from '../test-fixtures';

const boost: Effect = { kind: 'mult', source: 'ad_boost', value: 2, startMs: T0 - HOUR, endMs: T0 + HOUR };
const kombat: Effect = { kind: 'factor', source: 'kombat_away', value: 0.25, target: { type: 'stage', id: 'kombat' }, startMs: T0, endMs: T0 + HOUR };

describe('печатка', () => {
  test('AC-9: M ×2,5 → +5 за тап; «Комбата шукають» не впливає; 14 дотиків за 1 с → 10 тапів, +50', () => {
    const cfg = cfgV5((p) => { p.fuelBonus = 1.25; });
    const s0 = game(cfg, { fuelEndMs: T0 + 6 * HOUR });
    expect(tap(s0, cfg, T0, [boost]).gain).toBeCloseTo(5, 12);
    expect(tap(s0, cfg, T0, [boost, kombat]).gain).toBeCloseTo(5, 12);
    let s: EconomyState = s0;
    let credited = 0;
    for (let i = 0; i < 14; i++) {
      const r = tap(s, cfg, T0 + i * 70, [boost]);
      s = r.state;
      if (r.credited) credited++;
    }
    expect(credited).toBe(10);
    expect(s.signatures).toBeCloseTo(50, 9);
    expect(tap(s, cfg, T0 + 1000, [boost]).credited).toBe(true); // нова секунда
  });
});
