// 001 AC-2, AC-19, FR-6, FR-12, FR-31.
import { baseIncomePerMin, income } from '../game/income';
import { itemsFor } from '../game/state';
import type { Effect } from '../game/types';
import { cfgV5, game, HOUR, T0 } from '../test-fixtures';

const boost = (value: number): Effect => ({ kind: 'mult', source: 'ad_boost', value, startMs: T0 - HOUR, endMs: T0 + HOUR });

describe('дохід і вузьке місце', () => {
  test('новий гравець: Рапорти 1-го рівня, решта потоків замкнена, ланки на 1-му (FR-12)', () => {
    const cfg = cfgV5();
    const s = game(cfg);
    expect(s.streamLevels).toEqual([1, 0, 0, 0]);
    expect(s.stageLevels).toEqual([1, 1, 1]);
    expect(s.streamClerks.some(Boolean) || s.stageClerks.some(Boolean)).toBe(false);
    expect(s.paper).toBe(30);
  });

  test('AC-2: потоки 4 392, ланки 2 880 / 3 600 / 4 464, M ×2,5 → 7 200/хв, вузько — Резолюції комбата', () => {
    const cfg = cfgV5((p) => {
      p.streams[0]!.rate = 4392;
      p.stages[0]!.rate = 2880;
      p.stages[1]!.rate = 3600;
      p.stages[2]!.rate = 4464;
    });
    const s = game(cfg, { fuelEndMs: T0 + 6 * HOUR }); // повний бак ×1,25
    const inc = income(s, cfg, T0, [boost(2)]);
    expect(inc.M).toBeCloseTo(2.5, 12);
    expect(inc.perMin).toBeCloseTo(7200, 9);
    expect(inc.flow.sum).toBe(4392);
    expect(inc.flow.pipe).toBe(2880);
    expect(inc.bottleneck).toEqual({ type: 'stage', id: 'kombat' });
  });

  test('сума потоків дорівнює ланці → вузько «потоки» (крайовий випадок)', () => {
    const cfg = cfgV5((p) => { p.streams[0]!.rate = 12; });
    const inc = income(game(cfg), cfg, T0);
    expect(inc.flow.sum).toBe(12);
    expect(inc.flow.pipe).toBe(12);
    expect(inc.bottleneck).toBe('streams');
  });

  test('AC-19: «Бригада» — Рапорти 60/хв і 40 за рівень, Казначейство 210/хв і діловод 400, Накази 15 млн', () => {
    const cfg = cfgV5();
    const s = game(cfg, { level: 2 });
    const it = itemsFor(s, cfg);
    expect(it.streams.map((u) => u.id)).toEqual(['raporty', 'akty', 'dovidky', 'nakladni', 'nakazy']);
    expect(it.stages.map((u) => u.id)).toEqual(['kombat', 'stroy', 'fin', 'kazna']);
    expect(it.streams[0]!.rate).toBe(60);
    expect(it.streams[0]!.cost).toBe(40);
    expect(it.stages[3]!.rate).toBe(210);
    expect(it.stages[3]!.manager).toBe(400);
    expect(it.streams[4]!.unlock).toBe(15_000_000);
  });

  test('базовий дохід без тимчасових множників і факторів (FR-31)', () => {
    const cfg = cfgV5();
    const s = game(cfg, { prestigePoints: 10, hasNoAds: true, fuelEndMs: T0 + 6 * HOUR });
    const slow: Effect = { kind: 'factor', source: 'kombat_away', value: 0.25, target: { type: 'stage', id: 'kombat' }, startMs: T0, endMs: T0 + HOUR };
    expect(income(s, cfg, T0, [boost(2), slow]).perMin).not.toBeCloseTo(baseIncomePerMin(s, cfg));
    expect(baseIncomePerMin(s, cfg)).toBeCloseTo(6 * 1.2 * 1.3, 12); // Рапорти 6/хв × бали × «Без реклами»
  });
});
