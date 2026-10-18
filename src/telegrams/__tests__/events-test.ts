// 003 AC-17, AC-20, AC-21; FR-24, FR-25, FR-28, FR-29.
import { baseIncomePerMin } from '@/economy/game/income';
import { T0 } from '@/economy/test-fixtures';

import { answer, canChoose, telegramOf } from '../effects';
import { onSessionStart, runnerCost, sendRunner, fromTelegram } from '../events';
import { cfg, ctx, eco, p, tgWith } from '../test-utils';

const MIN = 60_000;

describe('override', () => {
  test('AC-17: «Послатися на цифровий облік» неактивний при P_total 0; при 2 — без наслідків, бали ті самі', () => {
    const tg = tgWith(['tg_override_order'], {}, 'override');
    const c = telegramOf(tg.inbox[0]!)!.choices.find((x) => x.id === 'cite_digital')!;
    expect(canChoose(tg, eco(), c)).toEqual({ ok: false, reason: 'digital' });
    const r = answer(tg, eco({ prestigePoints: 2 }), tg.inbox[0]!.uid, 'cite_digital', ctx());
    if ('error' in r) throw new Error(r.error);
    expect(r.eco.prestigePoints).toBe(2);
    expect(r.effects).toEqual([]);
    expect(r.item.status).toBe('archive');
  });
});

describe('«Комбата шукають»', () => {
  test('AC-21: не в першій сесії й не частіше разу на добу', () => {
    const tg = tgWith([]);
    expect(onSessionStart(tg, { ...cfg, params: { ...p, kombatChance: 1 } }, T0, 0, true).effect).toBeNull();
    const first = onSessionStart(tg, { ...cfg, params: { ...p, kombatChance: 1 } }, T0, 0, false);
    expect(first.effect).toMatchObject({ source: 'kombat_away', value: p.kombatMult, target: { type: 'stage', id: 'kombat' } });
    expect(first.effect!.endMs - T0).toBeLessThanOrEqual(p.kombatMaxMin * MIN);
    expect(onSessionStart(first.tg, { ...cfg, params: { ...p, kombatChance: 1 } }, T0 + 3 * 3_600_000, 0, false).effect).toBeNull();
  });

  test('AC-20: посильний коштує 4 хв базового доходу, «знайшли» через 3 хв; повторний тап нічого не робить', () => {
    const e = eco({ signatures: 1e9, streamLevels: [30, 10, 0, 0], stageLevels: [30, 30, 30] });
    const k = fromTelegram(tgWith([]), cfg, T0, 0, 30);
    const cost = runnerCost(e, cfg);
    expect(cost).toBe(Math.ceil(p.kombatRunnerCostMin * baseIncomePerMin(e, cfg)));
    const r = sendRunner(k.tg, e, cfg, T0 + MIN);
    if ('error' in r) throw new Error(r.error);
    expect(r.endMs).toBe(T0 + MIN + p.kombatRunnerMin * MIN);
    expect(r.eco.signatures).toBe(1e9 - cost);
    expect(sendRunner(r.tg, r.eco, cfg, T0 + 2 * MIN)).toEqual({ error: 'sent' });
  });
});
