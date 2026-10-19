// 011: підсумкова перевірка рівня - оголошення (AC-1), позапланова (AC-2), реклама лише на базові (AC-3), пройдено (AC-4), провал і повтор (AC-5).
import { bundledConfig } from '@/economy/config';
import { baseIncomePerMin } from '@/economy/game/income';
import { itemsFor, newGame } from '@/economy/game/state';
import type { EconomyState } from '@/economy/game/types';

import { offlineLines } from '../offline';
import { buyItem, completeAll, fromTelegramEvent, newInspections, readinessLive, tick } from '../lifecycle';
import { finalItemPrice, itemDone, mechOk, streamsOpen } from '../final';
import type { InspectionState } from '../types';

const cfg = bundledConfig;
const p = cfg.params;
const HOUR = 3_600_000;
const D0 = Date.UTC(2025, 9, 10);
const at = (h: number, day = 0) => D0 + day * 24 * HOUR + h * HOUR;

/** Р2: усі 5 потоків і 4 ланки відкрито, діловоди є; `nakazy` - потік Р2 */
function eco2(patch: Partial<EconomyState> = {}): EconomyState {
  const g = { ...newGame(cfg, at(0)), level: 2 };
  const it = itemsFor(g, cfg);
  return { ...g, streamLevels: it.streams.map(() => 30), stageLevels: it.stages.map(() => 30), streamClerks: it.streams.map(() => true), stageClerks: it.stages.map(() => true), ...patch };
}
const nakazyIdx = (e: EconomyState) => itemsFor(e, cfg).streams.findIndex((u) => u.id === 'nakazy');

const ctx = (nowMs: number, patch: Record<string, unknown> = {}) => ({ fromMs: nowMs - HOUR, nowMs, tzOffsetMin: 0, offline: false, reputation: 50, digitizations: 4, finalDue: true, ...patch });

/** Підсумкова оголошена о 12:00 */
function announced(e = eco2()) {
  const s0 = newInspections(at(0), 'seed-final');
  const r = tick(s0, e, cfg, ctx(at(12)));
  return { s: r.s, events: r.events, e };
}

describe('оголошення (FR-2, FR-3)', () => {
  test('AC-1: усі потоки відкрито - підсумкова з 5 базовими пунктами й пунктом механіки, приїзд ≈ через 24 год, подія kind: final', () => {
    const { s, events } = announced();
    const a = s.active!;
    expect(a).toMatchObject({ kind: 'final', attempt: 1, trigger: 'scheduled', boss: 'command_commission', level: 2, modal: true });
    expect(a.items.map((i) => i.id)).toEqual(['dust_glove', 'corridor_tape', 'sign_rehang', 'orders_stitch', 'kazna_kopiyka', 'nakazy_open']);
    expect(a.items.filter((i) => i.mech).map((i) => i.id)).toEqual(['nakazy_open']);
    expect(a.arrMs - a.annMs).toBeGreaterThanOrEqual(p.boss.warnH * HOUR);
    // приїзд лише у вікні 10:00-21:00: не більше ніж доба + вікно зсуву
    expect(a.arrMs - a.annMs).toBeLessThanOrEqual((p.boss.warnH + 24) * HOUR);
    expect(events).toEqual([expect.objectContaining({ type: 'inspectionStart', kind: 'final', attempt: 1, itemsTotal: 6 })]);
  });

  test('ціна: 5 базових пунктів у сумі ≈ boss.checklistMin хвилин базового доходу, порівну; пункт механіки безкоштовний', () => {
    const e = eco2();
    const price = finalItemPrice(e, cfg);
    const whole = Math.max(p.inspMinPrice, Math.ceil(p.boss.checklistMin * baseIncomePerMin(e, cfg)));
    expect(price).toBe(Math.ceil(whole / p.boss.adItems));
    const a = announced(e).s.active!;
    expect(a.items.filter((i) => !i.mech).every((i) => i.price === price)).toBe(true);
    expect(a.items.find((i) => i.mech)!.price).toBe(0);
  });

  test('потік закрито в новому циклі - підсумкова чекає, поки відкриються всі; потім оголошується', () => {
    const closed = eco2();
    const e = { ...closed, streamLevels: closed.streamLevels.map((l, i) => (i === closed.streamLevels.length - 1 ? 0 : l)) };
    expect(streamsOpen(e, cfg)).toBe(false);
    const s0 = newInspections(at(0), 'seed-final');
    expect(tick(s0, e, cfg, ctx(at(12))).s.active).toBeNull();
    expect(tick(s0, eco2(), cfg, ctx(at(12))).s.active?.kind).toBe('final');
  });

  test('FR-4: активна звичайна блокує оголошення; після її результату підсумкова з\'являється', () => {
    const e = eco2();
    const s0 = newInspections(at(0), 'seed-reg');
    const regular = { ...s0, active: { id: 'insp_0001', no: 1, trigger: 'scheduled' as const, boss: 'command_commission' as const, level: 2, kind: 'regular' as const, attempt: 1, annMs: at(10), arrMs: at(13), items: [{ id: 'dust_glove', price: 1, done: true }], reason: null, remark: false, warned: true, modal: false }, nextNo: 2 };
    const during = tick(regular, e, cfg, ctx(at(12)));
    expect(during.s.active?.kind).toBe('regular');
    const after = tick(regular, e, cfg, ctx(at(14)));
    expect(after.s.last?.kind).toBe('regular');
    expect(after.s.active?.kind).toBe('final');
  });

  test('finalDue = false - звичайний розклад, підсумкової немає', () => {
    const s0 = newInspections(at(0), 'seed-reg');
    expect(tick(s0, eco2(), cfg, ctx(at(12), { finalDue: false })).s.active).toBeNull();
  });
});

describe('позапланова під час підсумкової (FR-4, AC-2)', () => {
  test('відписка додає inspExtraItem у чекліст підсумкової як базовий пункт, нової перевірки немає', () => {
    const { s, e } = announced();
    const r = fromTelegramEvent(s, e, cfg, { type: 'unscheduledInspection', telegramId: 'tg_x', warnSec: 7200, extraItem: 'where_journal' }, at(13), 0, 50);
    expect(r.s.active!.kind).toBe('final');
    expect(r.s.active!.items.map((i) => i.id)).toContain('where_journal');
    expect(r.s.active!.items.find((i) => i.id === 'where_journal')!.mech).toBeUndefined();
    expect(r.s.nextNo).toBe(s.nextNo);
  });
});

describe('«Усе за рекламу» і купівля (FR-5, AC-3)', () => {
  test('completeAll закриває 5 базових, пункт механіки - ні; купити його не можна', () => {
    const { s } = announced();
    const r = completeAll(s, at(13), 'ad');
    if ('error' in r) throw new Error(r.error);
    const items = r.s.active!.items;
    expect(items.filter((i) => i.done).map((i) => i.id)).toEqual(['dust_glove', 'corridor_tape', 'sign_rehang', 'orders_stitch', 'kazna_kopiyka']);
    expect(items.find((i) => i.mech)!.done).toBe(false);
    expect(r.events).toHaveLength(5);
    const e = eco2({ signatures: 1e12 });
    expect(buyItem(s, e, 'nakazy_open', at(13))).toEqual({ error: 'mech' });
  });

  test('читає наживо: пункт механіки "виконано", якщо Накази відкрито, інакше "ще ні" (готовність рахується з ним)', () => {
    const { s, e } = announced();
    const mech = s.active!.items.find((i) => i.mech)!;
    expect(mechOk('nakazy_open', e, cfg)).toBe(true);
    expect(itemDone(mech, e, cfg)).toBe(true);
    const closed = { ...e, streamLevels: e.streamLevels.map((l, i) => (i === nakazyIdx(e) ? 0 : l)) };
    expect(itemDone(mech, closed, cfg)).toBe(false);
    expect(readinessLive(s.active!, closed, cfg)).toBe(0);
    expect(readinessLive(s.active!, e, cfg)).toBe(Math.round((1 / 6) * 100));
  });
});

describe('результат (FR-6, FR-7)', () => {
  const allBase = (s: InspectionState) => {
    const r = completeAll(s, at(14), 'ad');
    if ('error' in r) throw new Error(r.error);
    return r.s;
  };

  test('AC-4: усі пункти й Накази відкрито - ×3 на 2 год, finalPassed, виходу дозволено; нової підсумкової в тому ж тіку немає', () => {
    const { s, e } = announced();
    const arr = s.active!.arrMs;
    const r = tick(allBase(s), e, cfg, ctx(arr + 1000, { fromMs: arr - HOUR }));
    expect(r.events.map((x) => x.type)).toEqual(expect.arrayContaining(['inspectionFinish', 'boostActivate', 'finalPassed']));
    expect(r.events.find((x) => x.type === 'inspectionFinish')).toMatchObject({ kind: 'final', result: 'passed', mechDone: true, exitUnlocked: true });
    expect(r.effects).toEqual([expect.objectContaining({ kind: 'mult', source: 'inspection_pass', value: p.inspMult, endMs: arr + p.inspHours * HOUR })]);
    expect(r.s.last).toMatchObject({ kind: 'final', passed: true, exitUnlocked: true });
    expect(r.s.active).toBeNull();
    expect(r.events.filter((x) => x.type === 'inspectionStart')).toEqual([]);
  });

  test('AC-5: куплено 4 з 5 - провал, «Стройова» ×0,5 на 1 год, повтор одразу з приїздом через boss.retryH, 4 пункти лишаються', () => {
    const { s, e } = announced();
    const arr = s.active!.arrMs;
    const four = { ...s, active: { ...s.active!, items: s.active!.items.map((i, k) => (k < 4 ? { ...i, done: true } : i)) } };
    const r = tick(four, e, cfg, ctx(arr + 1000, { fromMs: arr - HOUR }));
    expect(r.events.find((x) => x.type === 'inspectionFinish')).toMatchObject({ result: 'failed', mechDone: true, exitUnlocked: false });
    expect(r.effects).toEqual([expect.objectContaining({ kind: 'factor', source: 'inspection_fail', value: p.inspFailMult, endMs: arr + p.inspFailHours * HOUR })]);
    const retry = r.s.active!;
    expect(retry).toMatchObject({ kind: 'final', attempt: 2, modal: true, warned: false });
    expect(retry.id).not.toBe(s.active!.id);
    expect(retry.items.filter((i) => i.done && !i.mech).map((i) => i.id)).toEqual(['dust_glove', 'corridor_tape', 'sign_rehang', 'orders_stitch']);
    expect(retry.items.find((i) => i.id === 'kazna_kopiyka')!.price).toBe(s.active!.items[4]!.price);
    expect(retry.arrMs).toBeGreaterThanOrEqual(arr + p.boss.retryH * HOUR);
    expect(r.s.last).toMatchObject({ kind: 'final', passed: false, attempt: 1 });
    expect(r.events).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'inspectionStart', kind: 'final', attempt: 2 })]));
  });

  test('пункт механіки "зламався" до приїзду (потік Накази закрито цифровізацією) - провал, хоч базові всі', () => {
    const { s, e } = announced();
    const arr = s.active!.arrMs;
    const closed = { ...e, streamLevels: e.streamLevels.map((l, i) => (i === nakazyIdx(e) ? 0 : l)) };
    const r = tick(allBase(s), closed, cfg, ctx(arr + 1000, { fromMs: arr - HOUR }));
    expect(r.events.find((x) => x.type === 'inspectionFinish')).toMatchObject({ result: 'failed', mechDone: false });
    expect(r.s.active).toMatchObject({ kind: 'final', attempt: 2 });
  });

  test('офлайн: провали повторюються без ліміту спроб, кожна - своя довідка (last), у межах MAX_PER_TICK', () => {
    const { s, e } = announced();
    const r = tick(s, e, cfg, ctx(at(12) + 10 * 24 * HOUR, { offline: true, fromMs: at(12) }));
    expect(r.s.active?.attempt).toBeGreaterThan(1);
    expect(r.events.filter((x) => x.type === 'inspectionFinish').length).toBeGreaterThan(1);
  });
});

describe('довідка повернення (FR-25 004 + 011)', () => {
  test('підсумкова без гравця: пройдена - рядок "перехід дозволено" і ×3; провалена - рядок з повтором через boss.retryH', () => {
    const { s, e } = announced();
    const arr = s.active!.arrMs;
    const done = completeAll(s, at(14), 'ad');
    if ('error' in done) throw new Error(done.error);
    const pass = tick(done.s, e, cfg, ctx(arr + HOUR, { offline: true, fromMs: arr - HOUR }));
    expect(offlineLines(pass.s.last, p, arr + HOUR)[0]).toEqual({ kind: 'passed', remark: false, final: true });
    const fail = tick(s, e, cfg, ctx(arr + HOUR, { offline: true, fromMs: arr - HOUR }));
    expect(offlineLines(fail.s.last, p, arr + HOUR)).toEqual([{ kind: 'failed', factor: p.inspFailMult, hours: p.inspFailHours, final: true, retryH: p.boss.retryH }]);
  });
});
