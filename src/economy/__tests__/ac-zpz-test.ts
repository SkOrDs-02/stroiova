// 012 AC-4…AC-8: «Звіти про звіти» - частка від суми інших потоків, без загального множника M, зі сповільненнями.
import { bundledConfig } from '../config';
import { offline } from '../game/advance';
import { baseIncomePerMin, income, zpzInfo } from '../game/income';
import { newGame } from '../game/state';
import type { Effect, EconomyConfig, EconomyState } from '../game/types';
import { HOUR, T0 } from '../test-fixtures';

const cfg: EconomyConfig = { ...bundledConfig, params: { ...structuredClone(bundledConfig.params), zpz: { shareMax: 0.6, K: 20 } } };

/** Р4: усі потоки відкрито; рівень ЗпЗ - `z` */
function r4(z: number, patch: Partial<EconomyState> = {}): EconomyState {
  const s = newGame(cfg, T0);
  return { ...s, level: 4, streamLevels: [30, 20, 10, 5, 3, 2, z], stageLevels: [1000, 1000, 1000, 1000, 1000, 1000], streamClerks: [], stageClerks: [], ...patch };
}

const slow = (id: string, value: number): Effect => ({ kind: 'factor', source: 'telegram_slow', value, target: { type: 'stream', id }, startMs: T0 - HOUR, endMs: T0 + HOUR });

describe('«Звіти про звіти» (012 FR-7…FR-11)', () => {
  test('AC-4: рівень 20 при K = 20 і s_max = 0,6 - s = 0,3: rate = 30% суми інших, сума потоків = 130%', () => {
    const others = income(r4(0), cfg, T0).flow.sum;
    const z = zpzInfo(r4(20), cfg, T0);
    expect(z.s).toBeCloseTo(0.3, 12);
    expect(z.rate).toBeCloseTo(0.3 * others, 6);
    expect(income(r4(20), cfg, T0).flow.sum).toBeCloseTo(1.3 * others, 6);
    expect(z.share).toBeCloseTo(0.3 / 1.3, 12);
  });

  test('AC-5: загальний множник M не входить у суму інших - M застосовано один раз до min()', () => {
    const boost: Effect = { kind: 'mult', source: 'ad_boost', value: 3, startMs: T0 - HOUR, endMs: T0 + HOUR };
    const base = zpzInfo(r4(20), cfg, T0);
    const boosted = zpzInfo(r4(20), cfg, T0, [boost]);
    expect(boosted.rate).toBeCloseTo(base.rate, 6);
    const a = income(r4(20), cfg, T0);
    const b = income(r4(20), cfg, T0, [boost]);
    expect(b.perMin).toBeCloseTo(a.perMin * 3, 6);
  });

  test('AC-6: «Акти на майно» під ×0,5 - сума інших і rate_ЗпЗ падають пропорційно', () => {
    const plain = zpzInfo(r4(20), cfg, T0);
    const slowed = zpzInfo(r4(20), cfg, T0, [slow('akty', 0.5)]);
    const othersPlain = income(r4(0), cfg, T0).flow.sum;
    const othersSlow = income(r4(0), cfg, T0, [slow('akty', 0.5)]).flow.sum;
    expect(othersSlow).toBeLessThan(othersPlain);
    expect(slowed.rate).toBeCloseTo(0.3 * othersSlow, 6);
    expect(slowed.rate).toBeLessThan(plain.rate);
  });

  test('власне сповільнення з ціллю zpz множить rate_ЗпЗ після формули', () => {
    const plain = zpzInfo(r4(20), cfg, T0);
    const slowed = zpzInfo(r4(20), cfg, T0, [slow('zpz', 0.5)]);
    expect(slowed.rate).toBeCloseTo(plain.rate * 0.5, 6);
  });

  test('AC-7: найвужча ланка нижча за суму потоків - дохід = ланка × M, підняття ЗпЗ його не змінює', () => {
    const narrow = (z: number) => r4(z, { stageLevels: [1, 1000, 1000, 1000, 1000, 1000] });
    const a = income(narrow(1), cfg, T0);
    const b = income(narrow(40), cfg, T0);
    expect(a.flow.sum).toBeGreaterThan(a.flow.pipe);
    expect(a.perMin).toBeCloseTo(b.perMin, 6);
    expect(b.bottleneck).toEqual({ type: 'stage', id: 'kombat' });
  });

  test('AC-8: офлайн 2 год, «Акти» сповільнено перші 30 хв - дохід дорівнює інтегралу з меншим rate_ЗпЗ, а не повному', () => {
    const clerks = { streamClerks: Array(7).fill(true), stageClerks: Array(6).fill(true) };
    const s = r4(20, clerks);
    const eff: Effect = { kind: 'factor', source: 'telegram_slow', value: 0.5, target: { type: 'stream', id: 'akty' }, startMs: T0, endMs: T0 + 0.5 * HOUR };
    const full = offline(s, cfg, T0, T0 + 2 * HOUR).earned;
    const withSlow = offline(s, cfg, T0, T0 + 2 * HOUR, [eff]).earned;
    const slowedRate = income(s, cfg, T0, [eff], { idle: true }).perMin;
    const plainRate = income(s, cfg, T0 + HOUR, [eff], { idle: true }).perMin;
    expect(slowedRate).toBeLessThan(plainRate);
    expect(withSlow).toBeCloseTo(slowedRate * 30 + plainRate * 90, 3);
    expect(withSlow).toBeLessThan(full);
  });

  test('потоку ЗпЗ немає або він замкнений (рівень 0) - нулі', () => {
    expect(zpzInfo(r4(0), cfg, T0)).toEqual({ s: 0, share: 0, rate: 0 });
    expect(zpzInfo(newGame(cfg, T0), cfg, T0)).toEqual({ s: 0, share: 0, rate: 0 });
  });

  test('базовий дохід (ціни в хвилинах доходу) враховує ЗпЗ', () => {
    expect(baseIncomePerMin(r4(20), cfg)).toBeGreaterThan(baseIncomePerMin(r4(0), cfg));
  });
});
