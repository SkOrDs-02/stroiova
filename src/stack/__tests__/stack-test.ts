// 012 FR-13…FR-16, AC-10…AC-12: стос до наради - ріст за частку ЗпЗ, нова сесія з нуля, «Метр звітів» раз на цикл.
import { bundledConfig } from '@/economy/config';
import { itemsFor, newGame } from '@/economy/game/state';
import type { EconomyState } from '@/economy/game/types';

import { digitize, newDigitization, shiftDigitization } from '@/digitization/digitization';
import { cmPerMin, display, grow, growOffline, newStack, resetCycle, startSession } from '../stack';

const cfg = bundledConfig;
const MIN = 60_000;
const T0 = Date.UTC(2025, 9, 10, 12);

function eco4(z = 8, clerk = true): EconomyState {
  const g = { ...newGame(cfg, T0), level: 4 };
  const it = itemsFor(g, cfg);
  return { ...g, streamLevels: it.streams.map((u) => (u.share ? z : 20)), stageLevels: it.stages.map(() => 20), streamClerks: it.streams.map(() => clerk), stageClerks: it.stages.map(() => clerk) };
}

describe('швидкість (FR-14)', () => {
  test('s(n) / shareMinPerCm; ЗпЗ закрито або не Р4 - 0', () => {
    const s8 = (1.5 * 8) / (8 + 9);
    expect(cmPerMin(eco4(8), cfg)).toBeCloseTo(s8 / cfg.params.stack.shareMinPerCm, 12);
    expect(cmPerMin(eco4(0), cfg)).toBe(0);
    expect(cmPerMin({ ...newGame(cfg, T0), level: 3 }, cfg)).toBe(0);
  });
});

describe('ріст і нова сесія (AC-10)', () => {
  test('стос починає з 0 см і росте за хвилини × частку; нова сесія знову з 0', () => {
    let st = startSession(newStack(), T0);
    expect(st.cm).toBe(0);
    st = grow(st, eco4(), cfg, T0, T0 + 100 * MIN).st;
    expect(st.cm).toBeCloseTo(100 * cmPerMin(eco4(), cfg), 9);
    expect(startSession(st, T0 + 1e7).cm).toBe(0);
  });

  test('офлайн додає стос на старті сесії лише з діловодом ЗпЗ; offlineCm рахується', () => {
    const st0 = startSession(newStack(), T0);
    expect(growOffline(st0, eco4(8, false), cfg, 8 * 60 * MIN, T0).st.cm).toBe(0);
    const r = growOffline(st0, eco4(8, true), cfg, 8 * 60 * MIN, T0);
    expect(r.st.cm).toBeCloseTo(480 * cmPerMin(eco4(), cfg), 9);
    expect(r.st.offlineCm).toBeCloseTo(r.st.cm, 12);
  });

  test('показ ≤ 120 см, лічильник ≤ 999', () => {
    const d = display({ ...newStack(), cm: 2500 }, cfg);
    expect(d).toEqual({ shownCm: 120, counterCm: 999 });
    expect(display({ ...newStack(), cm: 64.9 }, cfg)).toEqual({ shownCm: 64.9, counterCm: 64 });
  });
});

describe('«Метр звітів» (FR-15, AC-11)', () => {
  const need = (e: EconomyState) => 100 / cmPerMin(e, cfg);

  test('перетин 100 см - одна подія з властивостями; повторно в циклі - ні; після скидання циклу - знову', () => {
    const e = eco4(8);
    let st = startSession(newStack(), T0);
    const a = grow(st, e, cfg, T0, T0 + (need(e) - 1) * MIN);
    expect(a.events).toEqual([]);
    const b = grow(a.st, e, cfg, T0, T0 + 3 * MIN);
    expect(b.events).toEqual([expect.objectContaining({ type: 'stackReach', cm: 100, zpzLevel: 8, zpzSharePct: 41.3, offlineSharePct: 0 })]);
    expect(b.st.reached).toBe(true);
    // та сама сесія і наступна сесія того самого циклу: запису немає
    expect(grow(b.st, e, cfg, T0, T0 + 1000 * MIN).events).toEqual([]);
    st = startSession(b.st, T0 + 1e8);
    expect(grow(st, e, cfg, T0, T0 + 2 * need(e) * MIN).events).toEqual([]);
    // цифровізація: цикл новий - може з'явитися знову
    const again = grow(startSession(resetCycle(b.st), T0 + 2e8), e, cfg, T0, T0 + 2 * need(e) * MIN);
    expect(again.events).toHaveLength(1);
  });

  test('офлайн 12 год перед переглядом: запис створюється при поверненні, offline_share_pct = 100', () => {
    const e = eco4(40);
    const r = growOffline(startSession(newStack(), T0), e, cfg, 8 * 60 * MIN, T0);
    expect(r.st.cm).toBeGreaterThan(100);
    expect(r.events).toEqual([expect.objectContaining({ type: 'stackReach', offlineSharePct: 100 })]);
  });
});

describe('AC-12: стос не впливає на гру', () => {
  test('жодних змін економіки: grow лише повертає StackState', () => {
    const e = eco4(8);
    const before = JSON.stringify(e);
    grow(startSession(newStack(), T0), e, cfg, T0, T0 + 60 * MIN);
    expect(JSON.stringify(e)).toBe(before);
  });
});

describe('цифровізація і годинник (крайові випадки)', () => {
  test('справжня цифровізація скидає стос і прапорець циклу; новий «Метр» можливий знову', () => {
    const e = { ...eco4(8), lifetimeCycle: 22.9e12 * 40 * 40, signatures: 1e15, prestigePoints: 100 };
    const reached = { sessionStartMs: T0, cm: 130, offlineCm: 40, reached: true };
    const r = digitize(e, { ...newDigitization(T0), counts: { '4': 2 }, stack: reached }, cfg, T0, false);
    if ('error' in r) throw new Error(r.error);
    expect(r.ds.stack).toEqual({ sessionStartMs: T0, cm: 0, offlineCm: 0, reached: false });
    const again = grow(startSession(r.ds.stack, T0), eco4(60), cfg, T0, T0 + 8 * 60 * MIN);
    expect(again.events).toHaveLength(1);
  });

  test('годинник назад зсуває мітку початку сесії разом з іншими', () => {
    const ds = { ...newDigitization(T0), stack: { ...newStack(), sessionStartMs: T0 } };
    expect(shiftDigitization(ds, -3_600_000).stack.sessionStartMs).toBe(T0 - 3_600_000);
    expect(shiftDigitization(ds, 5).stack).toBe(ds.stack);
  });
});
