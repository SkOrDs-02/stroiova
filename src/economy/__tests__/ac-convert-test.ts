// 013 AC-2…AC-5, FR-5…FR-9: конвертації ланок Р5 - доступність за порядком, ціна, ×convert.mult, імунітет до сповільнень.
import { bundledConfig } from '../config';
import { convertInfo, convertPrice, convertStage } from '../game/convert';
import { baseIncomePerMin, income, isDigital } from '../game/income';
import { itemsFor, newCycle, newGame } from '../game/state';
import type { Effect, EconomyConfig, EconomyState } from '../game/types';
import { HOUR, T0 } from '../test-fixtures';

const cfg: EconomyConfig = { ...bundledConfig, params: { ...structuredClone(bundledConfig.params), convert: { ...bundledConfig.params.convert, costMin: 120 } } };
const ctx = { levelStartMs: T0 - 3 * HOUR, nowMs: T0 };

/** Р5: усі потоки відкрито, ланки на рівні `stage` */
function r5(patch: Partial<EconomyState> = {}, stage = 50): EconomyState {
  const g = { ...newGame(cfg, T0), level: 5 };
  const it = itemsFor(g, cfg);
  return { ...g, streamLevels: it.streams.map(() => 30), stageLevels: it.stages.map(() => stage), streamClerks: it.streams.map(() => true), stageClerks: it.stages.map(() => true), signatures: 1e30, prestigePoints: 77, ...patch };
}

const slow = (id: string, source: Effect['source'], value = 0.5): Effect => ({ kind: 'factor', source, value, target: { type: 'stage', id }, startMs: T0 - HOUR, endMs: T0 + HOUR });

describe('доступність (FR-5, AC-2)', () => {
  test('без цифровізацій на рівні доступна лише № 1 (Резолюції комбата); № 2 - «замкнено до цифровізації»', () => {
    const e0 = r5();
    expect(convertInfo(e0, cfg, 0)).toMatchObject({ status: 'available', next: { index: 1, stageId: 'kombat' }, done: 0, total: 6 });
    const r = convertStage(e0, cfg, 0, ctx);
    if ('error' in r) throw new Error(r.error);
    expect(convertInfo(r.state, cfg, 0)).toMatchObject({ status: 'locked_cycle', next: { index: 2, stageId: 'stroy' }, done: 1 });
    expect(convertInfo(r.state, cfg, 1)).toMatchObject({ status: 'available' });
  });

  test('доступна, але не куплена, лишається; не всі потоки відкрито - «замкнено до потоків»; не Р5 - немає', () => {
    expect(convertInfo(r5(), cfg, 5).status).toBe('available');
    const it = itemsFor(r5(), cfg);
    expect(convertInfo(r5({ streamLevels: it.streams.map((_, i) => (i === 3 ? 0 : 5)) }), cfg, 0).status).toBe('locked_streams');
    expect(convertInfo({ ...r5(), level: 4 }, cfg, 0)).toMatchObject({ status: 'none', next: null });
  });

  test('усі шість - «done», порядок за convert.order', () => {
    let e = r5();
    const ids: string[] = [];
    for (let k = 0; k < 6; k++) {
      const r = convertStage(e, cfg, k, ctx);
      if ('error' in r) throw new Error(r.error);
      ids.push(r.stageId);
      e = r.state;
    }
    expect(ids).toEqual(['kombat', 'stroy', 'fin', 'kazna', 'narada', 'dopovid']);
    expect(convertInfo(e, cfg, 9).status).toBe('done');
    expect(convertStage(e, cfg, 9, ctx)).toEqual({ error: 'unavailable' });
  });
});

describe('ціна (FR-6, AC-3)', () => {
  test('⌈costMin × базовий дохід⌉; бали не чіпаються; підписів мало - помилка', () => {
    const e = r5();
    const base = baseIncomePerMin(e, cfg);
    expect(convertPrice(e, cfg)).toBe(Math.ceil(120 * base));
    const r = convertStage(e, cfg, 0, ctx);
    if ('error' in r) throw new Error(r.error);
    expect(r.state.prestigePoints).toBe(77);
    expect(r.state.signatures).toBe(e.signatures - r.price);
    expect(r.events).toEqual([expect.objectContaining({ type: 'stageConvert', stageId: 'kombat', convertIndex: 1, digitizationsOnLevel: 0, secSinceLevelStart: 3 * 3600 })]);
    expect(convertStage(r5({ signatures: 10 }), cfg, 0, ctx)).toEqual({ error: 'signatures' });
  });

  test('ціна з шторки (ВП-1) тримається, хоч дохід змінився', () => {
    const e = r5();
    const shown = convertPrice(e, cfg);
    const r = convertStage({ ...e, stageLevels: e.stageLevels.map((l) => l * 2) }, cfg, 0, ctx, shown);
    if ('error' in r) throw new Error(r.error);
    expect(r.price).toBe(shown);
  });
});

describe('виробіток (FR-8, AC-4)', () => {
  test('вузька ланка Резолюції комбата 200/хв після конвертації дає 600/хв (×convert.mult)', () => {
    const c: EconomyConfig = { ...cfg, params: { ...cfg.params, convert: { ...cfg.params.convert, mult: 3 } } };
    const e = r5({}, 1);
    const narrow = { ...e, stageLevels: e.stageLevels.map((_, i) => (i === 0 ? 1 : 100000)) };
    const before = income(narrow, c, T0).flow.pipe;
    const after = income({ ...narrow, digital: ['kombat'] }, c, T0).flow.pipe;
    expect(after).toBeCloseTo(before * 3, 6);
    expect(isDigital({ ...narrow, digital: ['kombat'] }, 'kombat')).toBe(true);
  });
});

describe('імунітет до сповільнень (FR-9, AC-5)', () => {
  const pipeOf = (e: EconomyState, fx: Effect[]) => {
    // лише «Стройова» вузька: решта ланок надшироко
    const narrow = { ...e, stageLevels: e.stageLevels.map((_, i) => (i === 1 ? 1 : 100000)) };
    return income(narrow, cfg, T0, fx).flow.pipe;
  };

  test('телеграма, комбат, нарада й доповідь не сповільнюють цифрову ланку, паперову - сповільнюють', () => {
    const e = { ...r5(), digital: ['stroy'] };
    const paper = { ...r5(), digital: [] };
    for (const src of ['telegram_slow', 'kombat_away', 'meeting_overrun'] as const) {
      expect(pipeOf(e, [slow('stroy', src)])).toBe(pipeOf(e, []));
      expect(pipeOf(paper, [slow('stroy', src)])).toBeCloseTo(pipeOf(paper, []) * 0.5, 6);
    }
  });

  test('провал перевірки (ВП-2) і «Збій СЕДО» сповільнюють і цифрову ланку', () => {
    const e = { ...r5(), digital: ['stroy'] };
    expect(pipeOf(e, [slow('stroy', 'inspection_fail')])).toBeCloseTo(pipeOf(e, []) * 0.5, 6);
    expect(pipeOf(e, [slow('stroy', 'sedo_failure', 0.4)])).toBeCloseTo(pipeOf(e, []) * 0.4, 6);
  });

  test('цифрові ланки переживають цифровізацію (newCycle не чіпає digital)', () => {
    expect(newCycle({ ...r5(), digital: ['kombat', 'stroy'] }, cfg).digital).toEqual(['kombat', 'stroy']);
  });
});
