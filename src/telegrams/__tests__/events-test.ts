// 003 AC-17, AC-20, AC-21; FR-24, FR-25, FR-28, FR-29.
import { baseIncomePerMin } from '@/economy/game/income';
import { T0 } from '@/economy/test-fixtures';

import { answer, canChoose, telegramOf } from '../effects';
import { activeAt, hasStage, onSessionStart, runnerCost, sendRunner, fromTelegram } from '../events';
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

describe('«Нарада затягнулась» (011 FR-25, AC-17)', () => {
  const always = { ...cfg, params: { ...p, kombatChance: 1, naradaChance: 1 } };

  test('«Нарада» ×0,25 не довше 30 хв, ≤ 1 на добу, не в першій сесії; подія meetingStart', () => {
    const tg = tgWith([]);
    expect(onSessionStart(tg, always, T0, 0, true, 'meeting').effect).toBeNull();
    const m = onSessionStart(tg, always, T0, 0, false, 'meeting');
    expect(m.effect).toMatchObject({ source: 'meeting_overrun', value: p.naradaMult, target: { type: 'stage', id: 'narada' } });
    expect(m.effect!.endMs - T0).toBeLessThanOrEqual(p.naradaMaxMin * MIN);
    expect(m.effect!.endMs - T0).toBeGreaterThanOrEqual(p.naradaMinMin * MIN);
    expect(m.events).toEqual([{ type: 'meetingStart', endMs: m.effect!.endMs }]);
    expect(onSessionStart(m.tg, always, T0 + 3 * 3_600_000, 0, false, 'meeting').effect).toBeNull();
  });

  test('через 30 хв подія знята ефектом (кінець), «Комбата шукають» у цей час не стартує, і навпаки', () => {
    const tg = tgWith([]);
    const m = onSessionStart(tg, always, T0, 0, false, 'meeting');
    const end = m.effect!.endMs;
    expect(end - T0).toBeLessThanOrEqual(30 * MIN);
    expect(activeAt(m.tg, 'meeting', end - 1)).not.toBeNull();
    expect(activeAt(m.tg, 'meeting', end)).toBeNull();
    const k = onSessionStart(m.tg, always, T0 + 1000, 0, false, 'kombat');
    expect(k.effect).toBeNull();
    expect(k.events).toEqual([]);
    expect(fromTelegram(m.tg, always, T0 + 1000, 0, 30).effect).toBeNull();
    const k2 = onSessionStart(tg, always, T0, 0, false, 'kombat');
    expect(onSessionStart(k2.tg, always, T0 + 1000, 0, false, 'meeting').effect).toBeNull();
  });

  test('записка: за підписи, подія скінчиться за kombatRunnerMin; повторний тап нічого не робить; без активної - error none', () => {
    const e = eco({ signatures: 1e9, streamLevels: [30, 10, 0, 0], stageLevels: [30, 30, 30] });
    expect(sendRunner(tgWith([]), e, cfg, T0, 'meeting')).toEqual({ error: 'none' });
    const m = onSessionStart(tgWith([]), always, T0, 0, false, 'meeting');
    const r = sendRunner(m.tg, e, cfg, T0 + MIN, 'meeting');
    if ('error' in r) throw new Error(r.error);
    expect(r.endMs).toBeLessThanOrEqual(m.effect!.endMs);
    expect(r.eco.signatures).toBe(1e9 - runnerCost(e, cfg));
    expect(r.tg.meeting.active!.runnerAtMs).toBe(T0 + MIN);
    expect(r.tg.kombat.active).toBeNull();
    expect(sendRunner(r.tg, r.eco, cfg, T0 + 2 * MIN, 'meeting')).toEqual({ error: 'sent' });
  });

  test('«Нарада» є лише з Р3', () => {
    expect(hasStage('meeting', eco({ level: 2 }))).toBe(false);
    expect(hasStage('meeting', eco({ level: 3 }))).toBe(true);
    expect(hasStage('kombat', eco({ level: 1 }))).toBe(true);
  });
});
