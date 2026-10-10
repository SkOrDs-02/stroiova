// 001 AC-3, AC-4, AC-5, AC-6 (покупки), AC-17; FR-7…FR-13, FR-29.
import { buy, isOk, nextPurchaseEtaSec, quote } from '../game/purchase';
import type { Result, Success } from '../game/purchase';
import { newCycle } from '../game/state';
import { cfgV5, game, T0 } from '../test-fixtures';

const raporty = { type: 'stream', id: 'raporty' } as const;
const akty = { type: 'stream', id: 'akty' } as const;
const dovidky = { type: 'stream', id: 'dovidky' } as const;

function ok(r: Result): Success {
  if (!isOk(r)) throw new Error(r.error);
  return r;
}

describe('покупки', () => {
  test('AC-4: точна ціна 8,96 при балансі 8,99 — покупка проходить; Акти 300 і 10 → 11 ≈ 360,49', () => {
    const cfg = cfgV5();
    const s = game(cfg, { streamLevels: [2, 0, 0, 0], signatures: 8.99 });
    const q = quote(s, cfg, raporty, 'x1', T0);
    expect(q.price).toBeCloseTo(8.96, 10);
    expect(q.affordable).toBe(true);
    const r = ok(buy(s, cfg, raporty, 'x1', T0));
    expect(r.state.streamLevels[0]).toBe(3);
    expect(r.state.signatures).toBeCloseTo(0.03, 10);
    expect(quote(game(cfg), cfg, akty, 'x1', T0).price).toBe(300);
    expect(quote(game(cfg, { streamLevels: [1, 10, 0, 0] }), cfg, akty, 'x1', T0).price).toBeCloseTo(360.49, 2);
  });

  test('AC-5: 900 підписів — «до віхи» 945,24 недоступно з ETA; ×10 140,39, 6 → 66/хв, рівень 11, одна подія x10', () => {
    const cfg = cfgV5();
    const s = game(cfg, { signatures: 900 });
    const toMs = quote(s, cfg, raporty, 'toMilestone', T0);
    expect(toMs.levels).toBe(24);
    expect(toMs.price).toBeCloseTo(945.24, 2);
    expect(toMs.affordable).toBe(false);
    expect(toMs.etaSec).toBeGreaterThan(0);
    expect(buy(s, cfg, raporty, 'toMilestone', T0)).toEqual({ error: 'insufficient' });
    const x10 = quote(s, cfg, raporty, 'x10', T0);
    expect(x10.price).toBeCloseTo(140.39, 2);
    expect(x10.rateBefore).toBe(6);
    expect(x10.rateAfter).toBe(66);
    const r = ok(buy(s, cfg, raporty, 'x10', T0));
    expect(r.state.streamLevels[0]).toBe(11);
    const purchases = r.events.filter((e) => e.type === 'purchase');
    expect(purchases).toHaveLength(1);
    expect(purchases[0]).toMatchObject({ mode: 'x10', levelsBought: 10, levelFrom: 1, levelTo: 11 });
  });

  test('AC-3: покупка 25-го рівня шле milestone з rateMultiplier 2', () => {
    const cfg = cfgV5();
    const r = ok(buy(game(cfg, { streamLevels: [24, 0, 0, 0], signatures: 1e6 }), cfg, raporty, 'x1', T0));
    expect(r.events).toContainEqual({ type: 'milestone', target: raporty, level: 25, rateMultiplier: 2 });
  });

  test('AC-6: новий цикл — Довідки замкнені до Актів; повторне відкриття Актів без unit-unlock, unlockIndex 2', () => {
    const cfg = cfgV5();
    const first = ok(buy(game(cfg, { signatures: 1e6 }), cfg, akty, 'x1', T0));
    expect(first.events[0]).toMatchObject({ type: 'streamUnlock', streamId: 'akty', unlockIndex: 2, firstTime: true });
    const cycle = { ...newCycle(first.state, cfg), signatures: 1e6 };
    expect(cycle.streamLevels).toEqual([1, 0, 0, 0]);
    expect(buy(cycle, cfg, dovidky, 'x1', T0)).toEqual({ error: 'locked' });
    const again = ok(buy(cycle, cfg, akty, 'x1', T0));
    expect(again.events[0]).toMatchObject({ type: 'streamUnlock', unlockIndex: 2, firstTime: false });
  });

  test('AC-17: дохід 1 000/хв, баланс 0, найдешевша покупка, що піднімає дохід, — 60 000 → 3 600 с', () => {
    // потоки 3 000/хв, вузько Комбат 1 000/хв → дохід 1 000/хв; підняти дохід можна лише Комбатом за 60 000
    const cfg = cfgV5((p) => {
      p.streams[0]!.rate = 3000;
      p.streams[0]!.cost = 1e9;
      p.streams[1]!.unlock = 1e9;
      p.stages[0]!.rate = 1000;
      p.stages[0]!.cost = 60000;
      for (const g of p.stages.slice(1)) { g.rate = 2000; g.cost = 1e9; }
    });
    const s = game(cfg);
    expect(nextPurchaseEtaSec(s, cfg, T0)).toBeCloseTo(3600, 6);
  });
});
