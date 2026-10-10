// 001 AC-10, AC-11; FR-17…FR-19.
import { income, multStack } from '../game/income';
import type { Effect } from '../game/types';
import { cfgV5, game, HOUR, MIN, T0 } from '../test-fixtures';

const factor = (source: Effect['source'], id: string, value: number, ms: number): Effect => ({
  kind: 'factor', source, value, target: { type: 'stage', id }, startMs: T0, endMs: T0 + ms,
});

describe('множники й фактори', () => {
  test('AC-10: 38 балів, «Без реклами», буст ×2, бак 82% → ×1,76, ×1,3, ×2, ×1,25, разом ×5,72', () => {
    const cfg = cfgV5((p) => { p.fuelBonus = 1.25; p.fuelBonusThreshold = 0.2; });
    const s = game(cfg, { prestigePoints: 38, hasNoAds: true, fuelEndMs: T0 + 0.82 * 6 * HOUR });
    const boost: Effect = { kind: 'mult', source: 'ad_boost', value: 2, startMs: T0, endMs: T0 + 4 * HOUR };
    const m = multStack(s, cfg, T0, [boost]);
    expect(m.rows.map((r) => r.source)).toEqual(['prestige', 'no_ads', 'ad_boost', 'fuel']);
    expect(m.rows.map((r) => +r.value.toFixed(2))).toEqual([1.76, 1.3, 2, 1.25]);
    expect(m.total).toBeCloseTo(5.72, 10);
  });

  test('AC-11: «сумлінно» на Фін ×0,5 на 1 год; «Комбата шукають» 720/хв, не 0; провалена перевірка — Стройова ×0,5', () => {
    const cfg = cfgV5((p) => {
      p.streams[0]!.rate = 4392;
      p.stages[0]!.rate = 2880;
      p.stages[1]!.rate = 3600;
      p.stages[2]!.rate = 4464;
    });
    const s = game(cfg);
    const slow = factor('telegram_slow', 'fin', 0.5, HOUR);
    const a = income(s, cfg, T0, [slow]);
    expect(a.flow.pipe).toBe(2232);
    expect(a.bottleneck).toEqual({ type: 'stage', id: 'fin' });
    expect(income(s, cfg, T0 + HOUR, [slow]).flow.pipe).toBe(2880);
    const away = factor('kombat_away', 'kombat', 0.25, 30 * MIN);
    expect(income(s, cfg, T0, [away]).perMin).toBe(720);
    expect(income(s, cfg, T0 + 30 * MIN, [away]).perMin).toBe(2880);
    const fail = factor('inspection_fail', 'stroy', 0.5, HOUR);
    expect(income(s, cfg, T0, [fail, away]).perMin).toBe(720);
    expect(income(s, cfg, T0 + 31 * MIN, [fail, away]).perMin).toBe(1800);
  });

  test('бонус музею діє на дохід, лише коли вузько саме в цій одиниці (AC-11)', () => {
    const cfg = cfgV5((p) => {
      p.streams[0]!.rate = 4392;
      p.stages[0]!.rate = 2880;
      p.stages[1]!.rate = 3600;
      p.stages[2]!.rate = 4464;
    });
    const s = game(cfg, { museum: { unit: { stroy: 1.05 }, storage: 1, paper: 1 } });
    expect(income(s, cfg, T0).perMin).toBe(2880);
  });
});
