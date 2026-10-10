// 001 AC-12, AC-13, AC-20, AC-21; FR-20…FR-22, FR-31, FR-32.
import { advance, claimOffline, offline } from '../game/advance';
import { catTap, giftPaper, refuel, tap } from '../game/actions';
import { baseIncomePerMin, income, multStack } from '../game/income';
import type { Effect } from '../game/types';
import { cfgV5, game, HOUR, MIN, T0 } from '../test-fixtures';

describe('пальне, папір, кіт', () => {
  test('AC-12: заправка порожнього бака — 6 год, ×1,25 діє 4 год 48 хв; 12 год зі «Стартовим набором»', () => {
    const cfg = cfgV5((p) => { p.fuelBonus = 1.25; p.fuelBonusThreshold = 0.2; });
    const r = refuel(game(cfg), cfg, T0);
    expect(r.info).toEqual({ tankPctBefore: 0, tankCapacitySec: 21600, bonusOffSec: 0 });
    expect(multStack(r.state, cfg, T0 + 4 * HOUR + 47 * MIN, []).total).toBe(1.25);
    expect(multStack(r.state, cfg, T0 + 4 * HOUR + 48 * MIN, []).total).toBe(1);
    const starter = refuel(game(cfg, { fuelCapacityMs: 12 * HOUR }), cfg, T0);
    expect(starter.info.tankCapacitySec).toBe(43200);
    const later = refuel(r.state, cfg, T0 + 6 * HOUR);
    expect(later.info).toEqual({ tankPctBefore: 0, tankCapacitySec: 21600, bonusOffSec: 72 * 60 });
  });

  test('AC-13: папір 0 не впливає на дохід, тапи й офлайн', () => {
    const cfg = cfgV5();
    const clerks = { streamClerks: [true, false, false, false], stageClerks: [true, true, true] };
    const a = game(cfg, { ...clerks, paper: 30 });
    const b = game(cfg, { ...clerks, paper: 0 });
    expect(income(b, cfg, T0).perMin).toBe(income(a, cfg, T0).perMin);
    expect(tap(b, cfg, T0).gain).toBe(tap(a, cfg, T0).gain);
    expect(offline(b, cfg, T0, T0 + HOUR).earned).toBe(offline(a, cfg, T0, T0 + HOUR).earned);
    expect(advance(b, cfg, T0, T0 + 10 * MIN).earned).toBe(advance(a, cfg, T0, T0 + 10 * MIN).earned);
  });

  test('AC-20: базовий 2 880/хв при бусті, баку 90% і «Комбата шукають»; посильний 4 хв = 11 520; кіт 14 400, далі 60 хв нічого', () => {
    const cfg = cfgV5((p) => { p.streams[0]!.rate = 4392; p.stages[0]!.rate = 2880; p.stages[1]!.rate = 3600; p.stages[2]!.rate = 4464; p.catBonusMin = 5; p.catCooldownMin = 60; });
    const s = game(cfg, { fuelEndMs: T0 + 0.9 * 6 * HOUR });
    expect(baseIncomePerMin(s, cfg)).toBe(2880);
    expect(4 * baseIncomePerMin(s, cfg)).toBe(11520);
    const c = catTap(s, cfg, T0);
    expect(c.gain).toBe(14400);
    expect(catTap(c.state, cfg, T0 + 59 * MIN).gain).toBe(0);
    expect(catTap(c.state, cfg, T0 + 60 * MIN).gain).toBe(14400);
    // фактичний дохід із бустом, баком і «Комбата шукають» інший, а базовий — ні (FR-31)
    const boost: Effect = { kind: 'mult', source: 'ad_boost', value: 2, startMs: T0, endMs: T0 + HOUR };
    const away: Effect = { kind: 'factor', source: 'kombat_away', value: 0.25, target: { type: 'stage', id: 'kombat' }, startMs: T0, endMs: T0 + HOUR };
    expect(income(s, cfg, T0, [boost, away]).perMin).toBe(720 * 2 * 1.25);
  });

  test('AC-21: новий цикл — папір 30; Накладні 20-го рівня з діловодом і журнал № 3, 24 год → +5,28 (на екрані 5); Ліна +22', () => {
    const cfg = cfgV5();
    expect(game(cfg).paper).toBe(30);
    const s = game(cfg, {
      paper: 0,
      streamLevels: [1, 1, 1, 20],
      streamClerks: [true, true, true, true],
      stageClerks: [true, true, true],
      museum: { unit: {}, storage: 1, paper: 1.1 },
    });
    const r = offline(s, cfg, T0, T0 + 24 * HOUR);
    expect(r.paper).toBeCloseTo(5.28, 10);
    const claimed = claimOffline(s, cfg, r, true, '2026-10-10');
    if ('error' in claimed) throw new Error(claimed.error);
    expect(Math.floor(claimed.state.paper)).toBe(5);
    expect(giftPaper(s, cfg).paper).toBeCloseTo(22, 10);
  });
});
