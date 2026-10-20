// 016 етап 1: бонуси журналів № 9-24 і серій у економіці (AC-5, AC-6, AC-7, FR-9…FR-13).
import { income, multStack, baseIncomePerMin } from '@/economy/game/income';
import { convertPrice } from '@/economy/game/convert';
import { itemsFor, newCycle } from '@/economy/game/state';
import { itemDef, priceOf } from '@/inspections/checklist';
import { routeFor } from '@/race/race';
import { answer, cutHours } from '@/telegrams/effects';
import { cfg, ctx, eco, tgWith } from '@/telegrams/test-utils';

import { bonuses, grant, newMuseum, raceJournals, seriesCollected } from '../museum';
import type { MuseumState } from '../types';

const T = 1_000_000;
const pct = cfg.params.museumUnitPct / 100;
const k24 = cfg.params.museumLegendaryMult;

function owning(...nos: number[]): MuseumState {
  return grant(newMuseum(), eco(), cfg, nos, T, 'digitization').ms;
}

describe('множники ланок і потоків (AC-5)', () => {
  test('№ 9 дає потоку «Накази по частині» ×(1 + u); з № 24 - ×(1 + k·u); № 8 на № 9 не діє', () => {
    expect(bonuses(owning(9), cfg).unit.nakazy).toBeCloseTo(1 + pct, 12);
    expect(bonuses(owning(9, 24), cfg).unit.nakazy).toBeCloseTo(1 + k24 * pct, 12);
    const withEight = bonuses(owning(1, 2, 3, 4, 5, 6, 7, 9), cfg);
    expect(withEight.unit.nakazy).toBeCloseTo(1 + pct, 12);
    expect(withEight.unit.stroy).toBeCloseTo(1 + 2 * pct, 12);
  });

  test('№ 10, 13, 15, 17, 18, 19, 22 - свої одиниці; № 16 - «Нарада» на museumUnitRarePct', () => {
    const b = bonuses(owning(10, 13, 15, 17, 18, 19, 22, 16), cfg).unit;
    expect(b).toMatchObject({ kazna: 1 + pct, akty: 1 + pct, zvedennia: 1 + pct, dovidky: 1 + pct, dopovid: 1 + pct, zpz: 1 + pct, fin: 1 + pct });
    expect(b.narada).toBeCloseTo(1 + cfg.params.museumUnitRarePct / 100, 12);
  });

  test('виробіток: вузька ланка «Казначейство» росте на u з № 10 (потік income)', () => {
    const base = eco({ level: 2, streamLevels: [3000, 3000, 3000, 3000, 3000], stageLevels: [3000, 3000, 3000, 1] });
    const it = itemsFor(base, cfg);
    expect(it.stages.map((u) => u.id)).toContain('kazna');
    const plain = income(base, cfg, T);
    const withJ = income({ ...base, museum: bonuses(owning(10), cfg) }, cfg, T);
    expect(plain.bottleneck).toEqual({ type: 'stage', id: 'kazna' });
    expect(withJ.flow.v / plain.flow.v).toBeCloseTo(1 + pct, 10);
  });
});

describe('інші бонуси (AC-6)', () => {
  test('№ 11: сповільнення від телеграми 60 хв триває ⌈60·(1 − s·k)⌉ хв, події (комбат) - без змін', () => {
    const s = cfg.params.museumSlowCutPct / 100;
    const e = { ...eco(), museum: bonuses(owning(11), cfg) };
    expect(cutHours(1, e) * 60).toBeCloseTo(Math.ceil(60 * (1 - s)), 9);
    const e24 = { ...eco(), museum: bonuses(owning(11, 24), cfg) };
    expect(cutHours(1, e24) * 60).toBeCloseTo(Math.ceil(60 * (1 - s * k24)), 9);
    expect(cutHours(1.75, e) * 60).toBeCloseTo(Math.ceil(105 * (1 - s)), 9);
    expect(cutHours(1, eco())).toBe(1);
  });

  test('№ 11 у відповіді на телеграму: ефект Стройової закінчується раніше', () => {
    const e = { ...eco(), museum: bonuses(owning(11), cfg) };
    const r = answer(tgWith(['tg_0001_sergeants']), e, 'tg_0001_sergeants#1', 'diligent', ctx());
    if ('error' in r) throw new Error(r.error);
    expect(r.effects[0]!.endMs - r.effects[0]!.startMs).toBe(54 * 60_000);
  });

  test('№ 12: ціна пункту чекліста ×(1 − c·k)', () => {
    const e = eco({ signatures: 1, streamLevels: [200, 200, 200, 200], stageLevels: [200, 200, 200], prestigePoints: 10 });
    const def = itemDef(cfg, 'minutes_stitch', 3)!;
    const c = cfg.params.museumChecklistCutPct / 100;
    const base = priceOf(def, e, cfg);
    const cut = priceOf(def, { ...e, museum: bonuses(owning(12), cfg) }, cfg);
    expect(cut).toBe(Math.max(cfg.params.inspMinPrice, Math.ceil(def.min * baseIncomePerMin(e, cfg) * (1 - c))));
    expect(cut).toBeLessThan(base);
  });

  test('№ 14 і № 6: крок Казначейства в гонці Р2 ×(1 − r·k6)·(1 − r·k14); № 20: служба подарунка ×(1 + g·k)', () => {
    const r = cfg.params.museumRacePct / 100;
    const plain = routeFor('drone', 2, cfg);
    const m = owning(6, 14);
    const j = raceJournals(m, cfg);
    const cutRoute = routeFor('drone', 2, cfg, j);
    const kz = (x: typeof plain) => x.find((s) => s.unit === 'kazna')!.sec;
    expect(kz(cutRoute) / kz(plain)).toBeCloseTo((1 - r) * (1 - r), 2);
    expect(raceJournals(owning(20), cfg).service).toBeCloseTo(1 + cfg.params.museumGiftServicePct / 100, 12);
    expect(raceJournals(owning(20, 24), cfg).service).toBeCloseTo(1 + (cfg.params.museumGiftServicePct / 100) * k24, 12);
    expect(raceJournals(owning(), cfg).kazna).toBeUndefined();
  });

  test('№ 23: ціна конвертації ×(1 − v·k)', () => {
    const e = eco({ level: 5, streamLevels: [100, 100, 100, 100, 100, 100, 100], stageLevels: [100, 100, 100, 100, 100, 100], prestigePoints: 20 });
    const v = cfg.params.museumConvertCutPct / 100;
    const base = convertPrice(e, cfg);
    const cut = convertPrice({ ...e, museum: bonuses(owning(23), cfg) }, cfg);
    expect(cut / base).toBeCloseTo(1 - v, 3);
  });
});

describe('№ 21 і серії (AC-7, FR-12, FR-13)', () => {
  test('№ 21: додаток u до множника кожної цифрової ланки; без цифрових ланок нічого не змінює', () => {
    const base = eco({ level: 5, streamLevels: [500, 500, 500, 500, 500, 500, 500], stageLevels: [1, 500, 500, 500, 500, 500], digital: [] });
    const m = bonuses(owning(21), cfg);
    expect(m.digital).toBeCloseTo(pct, 12);
    const none = income({ ...base, museum: m }, cfg, T).flow.v / income(base, cfg, T).flow.v;
    expect(none).toBeCloseTo(1, 12);
    const dig = { ...base, digital: ['kombat'] };
    const gain = income({ ...dig, museum: m }, cfg, T).flow.v / income(dig, cfg, T).flow.v;
    expect(gain).toBeGreaterThan(1);
    expect(gain).toBeCloseTo(1 + pct / 1, 1);
  });

  test('серія 2-5 зібрана: M × (1 + S·p), лише рядок у multStack, № 8 і № 24 на нього не діють; серія 1 не рахується', () => {
    const p = cfg.params.museumSeriesPct / 100;
    expect(seriesCollected(owning(1, 2, 3, 4, 5, 6, 7, 8))).toBe(0);
    const one = owning(9, 10, 11, 12);
    expect(seriesCollected(one)).toBe(1);
    const b1 = bonuses(one, cfg);
    expect(b1.series).toBeCloseTo(1 + p, 12);
    const e1 = { ...eco(), museum: b1 };
    expect(multStack(e1, cfg, T, []).rows).toEqual([{ source: 'museum_series', value: 1 + p }]);
    const two = owning(9, 10, 11, 12, 13, 14, 15, 16, 24);
    expect(bonuses(two, cfg).series).toBeCloseTo(1 + 2 * p, 12);
    expect(multStack(eco(), cfg, T, []).rows.some((r) => r.source === 'museum_series')).toBe(false);
  });

  test('базовий дохід (ціни в хвилинах доходу) враховує серії', () => {
    const e = eco({ streamLevels: [50, 50, 0, 0], stageLevels: [50, 50, 50], prestigePoints: 5 });
    const p = cfg.params.museumSeriesPct / 100;
    const base = baseIncomePerMin(e, cfg);
    expect(baseIncomePerMin({ ...e, museum: bonuses(owning(9, 10, 11, 12), cfg) }, cfg) / base).toBeCloseTo(1 + p, 8);
  });

  test('FR-9: бонус лишається після newCycle (цифровізація)', () => {
    const b = bonuses(owning(9, 10, 11, 12), cfg);
    expect(newCycle({ ...eco({ level: 2 }), museum: b }, cfg).museum).toEqual(b);
  });
});
