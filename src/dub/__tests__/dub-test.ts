// 013 FR-23…FR-29: домен Дубля - пропозиція, прийняття, масштаб конфігу (паритет з dubParams у sim.js), модифікатори, рекорд.
import { bundledConfig } from '@/economy/config';
import { levelItems } from '@/economy/core';

import { accept, ackClosed, canAccept, closeIfDue, dubConfig, lifetimeLog10, makeOffer, MODIFIERS, newDub, pickModifier, recordNow, shiftDub } from '../dub';

const T = 1_000_000;
const base = bundledConfig;
const D = base.params.dup;

/** Дубль N, прийнятий з пропозиції */
function dubAt(n: number, seed = 'dub'): ReturnType<typeof newDub> {
  let d = newDub(seed);
  for (let i = 0; i < n; i++) {
    d = makeOffer(d, T + i);
    d = accept(d, T + i, 1e6)!.d;
  }
  return d;
}

describe('Дубль: пропозиція й прийняття', () => {
  test('без пропозиції прийняти не можна', () => {
    const d = newDub();
    expect(canAccept(d)).toBe(false);
    expect(accept(d, T, 0)).toBeNull();
  });

  test('AC-17: пропозиція Дубля 1 -> прийняття: n = 1, модифікатор з пропозиції, пропозиція знята', () => {
    const offered = makeOffer(newDub(), T);
    expect(offered.offer).toMatchObject({ n: 1 });
    expect(makeOffer(offered, T + 5)).toBe(offered);
    const r = accept(offered, T + 10, 5e9)!;
    expect(r.d).toMatchObject({ n: 1, modifier: offered.offer!.modifier, offer: null, startMs: T + 10 });
    expect(r.d.earned).toBe(5e9);
    expect(r.record).toBeNull();
  });

  test('модифікатор детермінований: той самий вхід дає ту саму пропозицію, і він не збігається з попереднім (ВП-5)', () => {
    const a = makeOffer(newDub('x'), T);
    const b = makeOffer(newDub('x'), T + 99);
    expect(a.offer!.modifier).toBe(b.offer!.modifier);
    for (let n = 1; n < 40; n++) {
      for (const prev of MODIFIERS) expect(pickModifier(123, n, prev)).not.toBe(prev);
    }
    let d = newDub('y');
    let prev: string | null = null;
    for (let n = 1; n <= 12; n++) {
      d = accept(makeOffer(d, T), T, 0)!.d;
      expect(d.modifier).not.toBe(prev);
      prev = d.modifier;
    }
  });

  test('усі три модифікатори трапляються на різних зернах', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) seen.add(makeOffer(newDub(`s${i}`), T).offer!.modifier);
    expect([...seen].sort()).toEqual([...MODIFIERS].sort());
  });
});

describe('Дубль: закриття', () => {
  test('AC-21: шоста конвертація в Дублі закриває його й пропонує наступний', () => {
    const d = dubAt(1);
    expect(closeIfDue(d, 5, 6, T + 100)).toBe(d);
    const c = closeIfDue(d, 6, 6, T + 100);
    expect(c.closed).toMatchObject({ n: 1, seen: false, cycleMs: T + 100 - d.startMs! });
    expect(c.offer).toMatchObject({ n: 2 });
    expect(c.offer!.modifier).not.toBe(d.modifier);
    // повторно не закривається
    expect(closeIfDue(c, 6, 6, T + 200)).toBe(c);
    expect(ackClosed(c).closed!.seen).toBe(true);
    expect(ackClosed(ackClosed(c)).closed!.seen).toBe(true);
  });

  test('поза Дублем (n = 0) шоста конвертація - це фінал, а не закриття', () => {
    const d = newDub();
    expect(closeIfDue(d, 6, 6, T)).toBe(d);
  });
});

describe('Дубль: рекорд', () => {
  test('AC-20: рекорд «Дубль 2», старт Дубля 3 - рекорд побито; Дубль 1 і 2 - ні (немає з чим порівнювати / вперше)', () => {
    let d = dubAt(1);
    expect(d.record.dub).toBe(1);
    d = makeOffer(d, T);
    const r2 = accept(d, T, 0)!;
    expect(r2.record).toEqual({ value: 2, previous: 1 });
    const r3 = accept(makeOffer(r2.d, T), T, 0)!;
    expect(r3.record).toEqual({ value: 3, previous: 2 });
    expect(r3.d.record.dub).toBe(3);
  });

  test('log₁₀ за весь час: завершені цикли + живий, два знаки', () => {
    const d = { ...newDub(), earned: 1e9 };
    expect(lifetimeLog10(d, 0)).toBe(9);
    expect(lifetimeLog10(d, 1e9)).toBe(9.3);
    expect(recordNow(d, 1e9).lifetimeLog10).toBe(9.3);
    expect(lifetimeLog10(newDub(), 0)).toBe(0);
  });

  test('рекорд не зменшується: пізніший Дубль не нижчий, а log₁₀ тримає максимум', () => {
    const d = dubAt(2);
    const r = recordNow({ ...d, record: { dub: 7, lifetimeLog10: 50 } }, 10);
    expect(r).toEqual({ dub: 7, lifetimeLog10: 50 });
  });
});

describe('Дубль: годинник назад', () => {
  test('мітки зсуваються разом з годинником; уперед - без змін', () => {
    const d = closeIfDue(dubAt(1), 6, 6, T + 500);
    expect(shiftDub(d, 100)).toBe(d);
    const s = shiftDub(d, -300);
    expect(s.startMs).toBe(d.startMs! - 300);
    expect(s.offer!.atMs).toBe(d.offer!.atMs - 300);
    expect(s.closed!.atMs).toBe(d.closed!.atMs - 300);
  });
});

describe('dubConfig: масштаб Дубля (паритет з dubParams у sim.js)', () => {
  test('без Дубля - той самий об\'єкт', () => {
    expect(dubConfig(base, newDub())).toBe(base);
  });

  test('AC-18: Дубль 2, mult 10: rateMult/costMult/clerkMult × 100, дільник × divisorMult², вихід = dup.exitDigitizations', () => {
    const d = { ...dubAt(2), modifier: 'two_copies' as const };
    const c = dubConfig(base, d);
    base.params.levels.forEach((L, i) => {
      const S = c.params.levels[i]!;
      expect(S.rateMult).toBeCloseTo(L.rateMult * 100, 6);
      expect(S.costMult).toBeCloseTo(L.costMult * 100, 6);
      if (L.clerkMult != null) expect(S.clerkMult).toBeCloseTo(L.clerkMult * 100, 6);
      expect(S.prestigeDivisor).toBeCloseTo(L.prestigeDivisor * D.divisorMult ** 2, 6);
      expect(S.exitDigitizations).toBe(L.exitDigitizations > 0 ? D.exitDigitizations : 0);
    });
    expect(c.dub).toEqual({ n: 2, modifier: 'two_copies' });
    // база не змінилась
    expect(base.params.levels[0]!.rateMult).not.toBe(c.params.levels[0]!.rateMult);
    expect(base.dub).toBeUndefined();
  });

  test('виробіток «Рапортів» на Р1 у Дублі 2 - 100 × базовий (AC-18)', () => {
    const d = { ...dubAt(2), modifier: 'two_copies' as const };
    const c = dubConfig(base, d);
    const a = levelItems(base.params, 1).streams[0]!;
    const b = levelItems(c.params, 1).streams[0]!;
    expect(b.rate / a.rate).toBeCloseTo(100, 6);
  });

  test('AC-19: модифікатори міняють лише своє', () => {
    const none = { ...dubAt(1), modifier: 'two_copies' as const };
    const noDid = dubConfig(base, { ...none, modifier: 'no_did' });
    expect(noDid.params.fuelBonus).toBe(D.noDid.fuelMult);
    expect(noDid.params.inspHours).toBe(base.params.inspHours);
    const wet = dubConfig(base, { ...none, modifier: 'wet_seal' });
    expect(wet.params.inspIntervalMinH).toBeCloseTo(base.params.inspIntervalMinH * D.wetSeal.intervalMult, 6);
    expect(wet.params.inspIntervalMaxH).toBeCloseTo(base.params.inspIntervalMaxH * D.wetSeal.intervalMult, 6);
    expect(wet.params.inspHours).toBeCloseTo(base.params.inspHours * D.wetSeal.boostMult, 6);
    expect(wet.params.fuelBonus).toBe(base.params.fuelBonus);
    const copies = dubConfig(base, none);
    expect(copies.params.fuelBonus).toBe(base.params.fuelBonus);
    expect(copies.params.inspHours).toBe(base.params.inspHours);
  });
});
