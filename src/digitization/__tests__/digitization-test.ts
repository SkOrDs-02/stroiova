// 006: бали, доступність, підказка, цифровізація, перехід на Р2 (AC-1, 2, 4–8, 11, 12, 17–20).
import { bundledConfig } from '@/economy/config';
import { prestigeMult } from '@/economy/core/formulas';
import { income } from '@/economy/game/income';
import { itemsFor, newGame } from '@/economy/game/state';
import type { EconomyState } from '@/economy/game/types';

import { closeCeremonyStep, digitize, finalDue, newDigitization, pointsNow, shiftDigitization, status } from '../digitization';

const cfg = bundledConfig;
const p = cfg.params;
const T0 = 1_760_000_000_000;
const HOUR = 3_600_000;

/** Усі потоки Р1 відкрито, L = lifetime */
function eco(lifetime: number, patch: Partial<EconomyState> = {}): EconomyState {
  return { ...newGame(cfg, T0), streamLevels: [30, 20, 10, 5], stageLevels: [20, 20, 20], lifetimeCycle: lifetime, signatures: 0, ...patch };
}

describe('бали й множник (FR-1…FR-3)', () => {
  test('AC-1: L = 67,5 млн — +30; L = 100 млн — +36; покупка рівня прогноз не зменшує', () => {
    expect(pointsNow(eco(67_500_000), cfg)).toBe(30);
    expect(pointsNow(eco(100_000_000), cfg)).toBe(36);
    expect(pointsNow(eco(67_499_999), cfg)).toBe(29);
    // витрати L не зменшують: підписи менші, L той самий
    expect(pointsNow(eco(100_000_000, { signatures: 5 }), cfg)).toBe(36);
  });

  test('AC-2: P_total 91 — множник ×2,82 діє на дохід', () => {
    expect(prestigeMult(91, p)).toBeCloseTo(2.82, 10);
    const a = income(eco(0, { prestigePoints: 0 }), cfg, T0, []).perMin;
    const b = income(eco(0, { prestigePoints: 91 }), cfg, T0, []).perMin;
    expect(b / a).toBeCloseTo(2.82, 6);
  });

  test('на Р2 дільник інший (Р2 6,27 млрд)', () => {
    expect(pointsNow(eco(6.27e9 * 900, { level: 2 }), cfg)).toBe(30);
  });
});

describe('доступність (FR-5…FR-7)', () => {
  test('AC-4: 2 потоки з 4 — «замкнено» з переліком закритих; 4 з 4 і P = 22 — «мало балів», бракує 8', () => {
    const locked = status(eco(90_000_000, { streamLevels: [30, 20, 0, 0] }), newDigitization(T0), cfg, T0);
    expect(locked).toMatchObject({ kind: 'locked', lockedStreams: ['dovidky', 'nakladni'] });
    const few = status(eco(22 * 22 * 75_000), newDigitization(T0), cfg, T0);
    expect(few).toMatchObject({ kind: 'few', points: 22, lack: 8 });
  });

  test('AC-5: мінімум 30 діє на кожну цифровізацію', () => {
    const ds = { ...newDigitization(T0), counts: { '1': 1 }, total: 1 };
    expect(status(eco(25 * 25 * 75_000, { prestigePoints: 31 }), ds, cfg, T0)).toMatchObject({ kind: 'few', lack: 5 });
  });

  test('«доступно» з 30 балів; `isLast` на 3-й цифровізації Р1', () => {
    expect(status(eco(30 * 30 * 75_000), newDigitization(T0), cfg, T0)).toMatchObject({ kind: 'available', isLast: false, journals: [1, 2, 3] });
    const ds2 = { ...newDigitization(T0), counts: { '1': 2 }, total: 2 };
    expect(status(eco(30 * 30 * 75_000, { prestigePoints: 60 }), ds2, cfg, T0)).toMatchObject({ isLast: true, journals: [] });
  });
});

describe('підказка (FR-9)', () => {
  const far = (patch: Partial<EconomyState> = {}) => eco(31 * 31 * 75_000, { prestigePoints: 30, streamLevels: [120, 120, 120, 120], stageLevels: [120, 120, 120], ...patch });

  test('AC-6: P = 31, P_total = 30, наступна покупка далеко — рекомендовано; ближче за 4 год — ні', () => {
    const s = status(far(), newDigitization(T0), cfg, T0);
    expect(s.kind).toBe('available');
    expect(s.etaSec).toBeGreaterThanOrEqual(4 * 3600);
    expect(s.recommended).toBe(true);
    const near = status(far({ signatures: 1e15 }), newDigitization(T0), cfg, T0);
    expect(near.etaSec).toBe(0);
    expect(near.recommended).toBe(false);
  });

  test('AC-7: P_total = 200, P = 35 — 35 < 40, підказки немає, але цифровізація доступна', () => {
    const s = status(eco(35 * 35 * 75_000, { prestigePoints: 200 }), { ...newDigitization(T0), counts: { '1': 1 }, total: 1 }, cfg, T0);
    expect(s.kind).toBe('available');
    expect(s.recommended).toBe(false);
  });
});

describe('цифровізація (FR-14…FR-19, FR-24)', () => {
  test('AC-11, AC-12: скидання як reset(); бали додаються; «Без реклами», музей, папір, пальне лишаються', () => {
    const e = eco(40 * 40 * 75_000, { signatures: 1e9, streamClerks: [true, true, true, true], stageClerks: [true, true, true], hasNoAds: true, paper: 17, fuelEndMs: T0 + HOUR, museum: { unit: { raporty: 1.05 }, storage: 1.05, paper: 1 } });
    const r = digitize(e, newDigitization(T0), cfg, T0 + 5 * HOUR, true);
    if ('error' in r) throw new Error(r.error);
    expect(r.state).toMatchObject({
      level: 1,
      signatures: 0,
      lifetimeCycle: 0,
      prestigePoints: 40,
      streamLevels: [1, 0, 0, 0],
      stageLevels: [1, 1, 1],
      streamClerks: [false, false, false, false],
      stageClerks: [false, false, false],
      hasNoAds: true,
      paper: 17,
      fuelEndMs: T0 + HOUR,
    });
    expect(r.state.museum).toEqual(e.museum);
    expect(r.ds).toMatchObject({ total: 1, counts: { '1': 1 }, cycleStartMs: T0 + 5 * HOUR });
    expect(r.ds.ceremony).toMatchObject({ no: 1, level: 1, levelCount: 1, points: 40, pointsTotal: 40, multBefore: 1, multAfter: 1.8, journals: [1, 2, 3], levelUp: false, step: 'result' });
    expect(r.events).toEqual([expect.objectContaining({ type: 'digitizationComplete', points: 40, pointsTotal: 40, journalsCancelled: [1, 2, 3], fromHint: true })]);
  });

  test('«замкнено» і «мало балів» цифровізації не дають; подвійний запит під час церемонії ігнорується', () => {
    expect(digitize(eco(1e9, { streamLevels: [3, 0, 0, 0] }), newDigitization(T0), cfg, T0, false)).toEqual({ error: 'locked' });
    expect(digitize(eco(1000), newDigitization(T0), cfg, T0, false)).toEqual({ error: 'few' });
    const first = digitize(eco(1e9), newDigitization(T0), cfg, T0, false);
    if ('error' in first) throw new Error(first.error);
    const again = digitize({ ...eco(1e9), prestigePoints: first.state.prestigePoints }, first.ds, cfg, T0 + 1, false);
    expect(again).toEqual({ error: 'busy' });
  });

  test('AC-13 (частково): 2-га на Р1 скасовує № 4 і 5', () => {
    const ds = { ...newDigitization(T0), counts: { '1': 1 }, total: 1 };
    const r = digitize(eco(1e9, { prestigePoints: 40 }), ds, cfg, T0, false);
    if ('error' in r) throw new Error(r.error);
    expect(r.ds.ceremony!.journals).toEqual([4, 5]);
    expect(r.ds.ceremony!.levelUp).toBe(false);
  });

  test('AC-17: 3-тя цифровізація переводить на Р2; levelAdvance; акт, потім наказ; бали й лічильник лишаються', () => {
    const ds = { ...newDigitization(T0), counts: { '1': 2 }, total: 2 };
    const e = eco(1e9, { prestigePoints: 70, signatures: 1e9, stageClerks: [true, true, true] });
    const r = digitize(e, ds, cfg, T0, false);
    if ('error' in r) throw new Error(r.error);
    expect(r.state.level).toBe(2);
    expect(r.state.prestigePoints).toBe(70 + pointsNow(e, cfg));
    expect(r.ds.counts).toEqual({ '1': 3 });
    expect(r.ds.ceremony).toMatchObject({ levelUp: true, journals: [], step: 'result' });
    expect(r.events.map((x) => x.type)).toEqual(['digitizationComplete', 'levelAdvance']);
    expect(r.events[1]).toMatchObject({ from: 1, to: 2, digitizationCount: 3, pointsTotal: r.state.prestigePoints });
    // кроки церемонії
    const s1 = closeCeremonyStep(r.ds);
    expect(s1.ceremony!.step).toBe('levelUp');
    expect(closeCeremonyStep(s1).ceremony).toBeNull();
  });

  test('AC-18: початок Р2 — 5 потоків, 4 ланки на 1-му рівні, «Рапорти» 60/хв, Казначейство 210/хв', () => {
    const ds = { ...newDigitization(T0), counts: { '1': 2 }, total: 2 };
    const r = digitize(eco(1e9, { prestigePoints: 70 }), ds, cfg, T0, false);
    if ('error' in r) throw new Error(r.error);
    expect(r.state.streamLevels).toEqual([1, 0, 0, 0, 0]);
    expect(r.state.stageLevels).toEqual([1, 1, 1, 1]);
    // виробіток Р2 = Р1 × rateMult (10), ціни рівнів × costMult (5), діловод × clerkMult (1): числа з конфігу, не з v5 (рішення 72)
    const base = income({ ...r.state, prestigePoints: 0 }, cfg, T0, []);
    expect(base.flow.sum).toBeCloseTo(p.streams[0]!.rate * p.levels[1]!.rateMult, 6);
    expect(p.levels[1]!.rateMult).toBe(10);
    expect(p.levels[1]!.costMult).toBe(5);
    expect(p.levels[1]!.clerkMult).toBe(1);
  });

  test('AC-20: на Р2 цифровізація лишає на Р2 без виходу; 1-ша на Р2 скасовує № 9', () => {
    const e = eco(6.27e9 * 1000, { level: 2, streamLevels: [30, 20, 10, 5, 3], stageLevels: [20, 20, 20, 20], prestigePoints: 100 });
    const ds = { ...newDigitization(T0), counts: { '1': 3 }, total: 3 };
    const r = digitize(e, ds, cfg, T0, false);
    if ('error' in r) throw new Error(r.error);
    expect(r.state.level).toBe(2);
    expect(r.ds.counts).toEqual({ '1': 3, '2': 1 });
    expect(r.ds.ceremony).toMatchObject({ journals: [9], levelUp: false, level: 2 });
    // навіть 4-та й далі: нічого не скасовує
    const ds4 = { ...newDigitization(T0), counts: { '1': 3, '2': 3 }, total: 6 };
    const r4 = digitize({ ...e, prestigePoints: 500 }, ds4, cfg, T0, false);
    if ('error' in r4) throw new Error(r4.error);
    expect(r4.ds.ceremony!.journals).toEqual([]);
    expect(r4.state.level).toBe(2);
  });

  test('годинник назад зсуває початок циклу', () => {
    const ds = shiftDigitization({ ...newDigitization(T0), cycleStartMs: T0 }, -HOUR);
    expect(ds.cycleStartMs).toBe(T0 - HOUR);
  });
});

describe('вихід з Р2 (011 FR-1, FR-8, FR-9, FR-14)', () => {
  const l2 = (lifetime: number, patch: Partial<EconomyState> = {}) => {
    const g = newGame(cfg, T0);
    return { ...g, level: 2, streamLevels: [30, 20, 10, 5, 3], stageLevels: [20, 20, 20, 20], lifetimeCycle: lifetime, prestigePoints: 70, ...patch };
  };

  test('finalDue: після exitDigitizations на Р2 і поки перехід не дозволено; на Р1 його немає', () => {
    const n = p.levels[1]!.exitDigitizations;
    const ds = (k: number, allowed = false) => ({ ...newDigitization(T0), counts: { '2': k }, levelExitAllowed: allowed });
    expect(finalDue(cfg, ds(n - 1), 2)).toBe(false);
    expect(finalDue(cfg, ds(n), 2)).toBe(true);
    expect(finalDue(cfg, ds(n + 2), 2)).toBe(true);
    expect(finalDue(cfg, ds(n, true), 2)).toBe(false);
    expect(finalDue(cfg, { ...newDigitization(T0), counts: { '1': 3 } }, 1)).toBe(false);
    // Р3 (011 етап 2): підсумкова після exitDigitizations Р3
    const n3 = p.levels[2]!.exitDigitizations;
    expect(finalDue(cfg, { ...newDigitization(T0), counts: { '3': n3 - 1 } }, 3)).toBe(false);
    expect(finalDue(cfg, { ...newDigitization(T0), counts: { '3': n3 } }, 3)).toBe(true);
    expect(finalDue(cfg, { ...newDigitization(T0), counts: { '3': n3 }, levelExitAllowed: true }, 3)).toBe(false);
    // Р4 (012): те саме; Р5 підсумкової не має
    const n4 = p.levels[3]!.exitDigitizations;
    expect(finalDue(cfg, { ...newDigitization(T0), counts: { '4': n4 - 1 } }, 4)).toBe(false);
    expect(finalDue(cfg, { ...newDigitization(T0), counts: { '4': n4 } }, 4)).toBe(true);
    expect(finalDue(cfg, { ...newDigitization(T0), counts: { '5': 9 } }, 5)).toBe(false);
  });

  test('AC-6: цифровізації між N-ю і пройденою підсумковою на Р2 - без переходу, лічильник росте, рівень той самий', () => {
    const n = p.levels[1]!.exitDigitizations;
    const ds = { ...newDigitization(T0), counts: { '2': n }, total: 6 };
    expect(status(l2(1e18), ds, cfg, T0).isLast).toBe(false);
    const r = digitize(l2(1e18), ds, cfg, T0, false);
    if ('error' in r) throw new Error(r.error);
    expect(r.state.level).toBe(2);
    expect(r.ds.counts['2']).toBe(n + 1);
    expect(r.ds.ceremony!.levelUp).toBe(false);
    expect(r.events.map((x) => x.type)).toEqual(['digitizationComplete']);
  });

  test('AC-7: levelExitAllowed - наступна цифровізація з переходом на Р3, прапорець скинуто, лічильник Р3 з нуля, бали й множник лишаються', () => {
    const n = p.levels[1]!.exitDigitizations;
    const ds = { ...newDigitization(T0), counts: { '2': n }, total: 6, levelExitAllowed: true };
    const e = l2(1e18);
    expect(status(e, ds, cfg, T0).isLast).toBe(true);
    const r = digitize(e, ds, cfg, T0, false);
    if ('error' in r) throw new Error(r.error);
    expect(r.state.level).toBe(3);
    expect(r.state.prestigePoints).toBe(70 + pointsNow(e, cfg));
    expect(r.ds.levelExitAllowed).toBe(false);
    expect(r.ds.counts).toEqual({ '2': n + 1 });
    expect(r.ds.ceremony).toMatchObject({ levelUp: true, level: 2 });
    expect(r.events[1]).toMatchObject({ type: 'levelAdvance', from: 2, to: 3, digitizationCount: n + 1 });
  });

  test('Р3: 6 потоків і 5 ланок, перший рівень «Рапортів» = Р1 × rateMult; вихід на Р4 лише після пройденої підсумкової', () => {
    const ds = { ...newDigitization(T0), counts: { '3': 20 }, levelExitAllowed: true };
    const e = { ...newGame(cfg, T0), level: 3, streamLevels: [1, 0, 0, 0, 0, 0], stageLevels: [1, 1, 1, 1, 1] };
    expect(status(e, ds, cfg, T0).isLast).toBe(true);
    expect(status(e, { ...ds, levelExitAllowed: false }, cfg, T0).isLast).toBe(false);
    expect(finalDue(cfg, { ...ds, levelExitAllowed: false, counts: { '3': 5 } }, 3)).toBe(false);
    const it = itemsFor(e, cfg);
    expect(it.streams.map((u) => u.id)).toEqual(['raporty', 'akty', 'dovidky', 'nakladni', 'nakazy', 'zvedennia']);
    expect(it.stages.map((u) => u.id)).toEqual(['kombat', 'stroy', 'fin', 'kazna', 'narada']);
    const l1 = itemsFor({ ...e, level: 1 }, cfg);
    expect(it.streams[0]!.rate).toBeCloseTo(l1.streams[0]!.rate * p.levels[2]!.rateMult, 6);
  });

  test('AC-10: на Р3 цифровізація "замкнена", поки не відкрито всі 6 потоків; відкрито - доступна при P ≥ prestigeMinPoints', () => {
    const base = { ...newGame(cfg, T0), level: 3, stageLevels: [1, 1, 1, 1, 1], lifetimeCycle: 6.76e11 * 40 * 40 };
    const ds = newDigitization(T0);
    expect(status({ ...base, streamLevels: [30, 20, 10, 5, 3, 0] }, ds, cfg, T0)).toMatchObject({ kind: 'locked', lockedStreams: ['zvedennia'] });
    expect(status({ ...base, streamLevels: [30, 20, 10, 5, 3, 1] }, ds, cfg, T0)).toMatchObject({ kind: 'available', points: 40 });
  });

  test('Р4 (012): 7 потоків і 6 ланок, ЗпЗ - потік-частка; вихід на Р5 ще немає (isLast завжди false)', () => {
    const ds = { ...newDigitization(T0), counts: { '4': 20 }, levelExitAllowed: true };
    const e = { ...newGame(cfg, T0), level: 4, streamLevels: [1, 0, 0, 0, 0, 0, 0], stageLevels: [1, 1, 1, 1, 1, 1] };
    expect(status(e, ds, cfg, T0).isLast).toBe(false);
    const it = itemsFor(e, cfg);
    expect(it.streams.map((u) => u.id)).toEqual(['raporty', 'akty', 'dovidky', 'nakladni', 'nakazy', 'zvedennia', 'zpz']);
    expect(it.stages.map((u) => u.id)).toEqual(['kombat', 'stroy', 'fin', 'kazna', 'narada', 'dopovid']);
    expect(it.streams[6]!.share).toBe(1);
    const base = { ...newGame(cfg, T0), level: 4, stageLevels: [1, 1, 1, 1, 1, 1], lifetimeCycle: 2.29e13 * 40 * 40 };
    expect(status({ ...base, streamLevels: [30, 20, 10, 5, 3, 2, 0] }, newDigitization(T0), cfg, T0)).toMatchObject({ kind: 'locked', lockedStreams: ['zpz'] });
    expect(status({ ...base, streamLevels: [30, 20, 10, 5, 3, 2, 1] }, newDigitization(T0), cfg, T0)).toMatchObject({ kind: 'available' });
  });
});
