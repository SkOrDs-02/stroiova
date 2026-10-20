// 007: журнали, джерела, бонуси в економіці й гонці, курйози (AC-1, 3-5, 7, 8, 13, 17, 19).
import { offline } from '@/economy/game/advance';
import { giftPaper } from '@/economy/game/actions';
import { income } from '@/economy/game/income';
import { newCycle } from '@/economy/game/state';
import type { DomainEvent } from '@/economy/game/types';
import { routeFor } from '@/race/race';
import { cfg, eco, HOUR, tgWith } from '@/telegrams/test-utils';

import { journal, museumJournals } from '../journals';
import { bonuses, closeInspReveal, closeReveal, count, curioFromRace, curioFromTelegram, curioSummary, fromEvents, grant, has, interrupted, newMuseum, nextReveal, openTab, raceJournals, unseen, visibleCurios } from '../museum';
import type { MuseumState } from '../types';

const T = 1_000_000;
const dig = (journalsCancelled: number[]): DomainEvent => ({ type: 'digitizationComplete', no: 1, level: 1, points: 30, pointsTotal: 30, multiplier: 1.6, lifetimeLog10: 7, journalsCancelled, fromHint: false });

function owning(...nos: number[]): MuseumState {
  // вважаємо, що давніші розкриття вже переглянуто
  const ms = grant(newMuseum(), eco(), cfg, nos, T, 'digitization').ms;
  return { ...ms, reveal: [], owned: ms.owned.map((o) => ({ ...o, seen: true })) };
}

describe('довідник журналів (FR-1, AC-1)', () => {
  test('8 слотів у порядку № 1-8: назви, категорії, рідкості й бонуси з texts.md §3 і рішення 29', () => {
    const js = museumJournals();
    expect(js.map((j) => j.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(js.map((j) => [j.title, j.category, j.rarity, j.bonus.text])).toMatchSnapshot();
    expect(js.filter((j) => j.rarity === 'common')).toHaveLength(4);
    expect(js.filter((j) => j.rarity === 'rare')).toHaveLength(3);
    expect(js.filter((j) => j.rarity === 'legendary')).toHaveLength(1);
  });

  test('рядки j2, j3, j7 (рішення 29) і флейвор № 5 з позивним', () => {
    expect(journal(2)!.bonus.text).toBe('+5% до місткості сховища офлайну');
    expect(journal(3)!.bonus.text).toBe('+10% паперу з будь-якого джерела');
    expect(journal(7)!.bonus.text).toBe('−10% часу кроку Фінслужби в гонці');
    expect(journal(5)!.flavor).toContain('{позивний}');
  });

  test('жодного довгого тире в текстах 1-8 (рішення 55)', () => {
    expect(JSON.stringify(museumJournals())).not.toMatch(/—/);
  });
});

describe('джерела (FR-3…FR-9)', () => {
  test('AC-2 (домен): перша цифровізація дає № 1-3 однією групою «k з M», друга - № 4 і 5', () => {
    const a = fromEvents(newMuseum(), eco(), cfg, [dig([1, 2, 3])], T, { offline: false });
    expect(a.ms.owned.map((o) => o.no)).toEqual([1, 2, 3]);
    expect(a.ms.reveal.map((r) => [r.no, r.k, r.m, r.nAfter])).toEqual([[1, 1, 3, 1], [2, 2, 3, 2], [3, 3, 3, 3]]);
    expect(a.events.map((e) => e.type)).toEqual(['museumJournalUnlock', 'museumJournalUnlock', 'museumJournalUnlock']);
    const b = fromEvents(a.ms, a.eco, cfg, [dig([4, 5])], T + 1, { offline: false });
    expect(count(b.ms)).toBe(5);
    expect(b.ms.reveal.slice(3).map((r) => [r.no, r.k, r.m, r.nAfter])).toEqual([[4, 1, 2, 4], [5, 2, 2, 5]]);
  });

  test('AC-3: третя цифровізація на Р1 журналів не дає; Р2 записує № 9-11 без розкриття й без лічильника', () => {
    const a = fromEvents(owning(1, 2, 3, 4, 5), eco(), cfg, [dig([])], T, { offline: false });
    expect(count(a.ms)).toBe(5);
    const b = fromEvents(a.ms, a.eco, cfg, [dig([9])], T, { offline: false });
    expect(has(b.ms, 9)).toBe(true);
    expect(count(b.ms)).toBe(5);
    expect(b.events).toEqual([]);
    expect(b.ms.reveal).toHaveLength(a.ms.reveal.length);
    expect(unseen(b.ms)).toBe(unseen(a.ms));
  });

  test('AC-4: телеграма 25 без вибору дає № 6 (за псевдонімом з контенту), повторно - ні', () => {
    const a = fromEvents(owning(1, 2, 3), eco(), cfg, [{ type: 'journal', id: 'prizes_gifts_book' }], T, { offline: false });
    expect(has(a.ms, 6)).toBe(true);
    expect(a.events).toMatchObject([{ type: 'museumJournalUnlock', no: 6, rarity: 'rare', source: 'telegram', ownedAfter: 4 }]);
    const b = fromEvents(a.ms, a.eco, cfg, [{ type: 'journal', id: 'prizes_gifts_book' }], T, { offline: false });
    expect(b.ms).toBe(a.ms);
    expect(b.events).toEqual([]);
  });

  test('невідомий journal_id нічого не дає', () => {
    const a = fromEvents(newMuseum(), eco(), cfg, [{ type: 'journal', id: 'nonexistent' }], T, { offline: false });
    expect(a.ms.owned).toEqual([]);
  });

  test('AC-5: перша перевірка без зауважень після цифровізації дає № 7 (блок в insp-result), офлайн - модалка', () => {
    const online = fromEvents(owning(1, 2, 3), eco(), cfg, [{ type: 'inspectionJournal', id: 'insp_0001' }], T, { offline: false });
    expect(online.ms.reveal).toMatchObject([{ no: 7, via: 'insp', nAfter: 4 }]);
    // мітка отримання - мітка перевірки, а не повернення гравця
    const dated = fromEvents(owning(1, 2, 3), eco(), cfg, [{ type: 'inspectionJournal', id: 'insp_0001' }], T + 5 * HOUR, { offline: true, inspAtMs: T + HOUR });
    expect(dated.ms.owned.find((o) => o.no === 7)!.atMs).toBe(T + HOUR);
    expect(nextReveal(online.ms)).toBeNull();
    const off = fromEvents(owning(1, 2, 3), eco(), cfg, [{ type: 'inspectionJournal', id: 'insp_0001' }], T, { offline: true });
    expect(nextReveal(off.ms)).toMatchObject({ no: 7, via: 'other' });
    const again = fromEvents(online.ms, online.eco, cfg, [{ type: 'inspectionJournal', id: 'insp_0002' }], T, { offline: false });
    expect(again.events).toEqual([]);
  });

  test('AC-7: 6 з 8 без № 7 - перевірка дає № 7 і одразу № 8 в одному розкритті, is_series_complete лише у № 8', () => {
    const a = fromEvents(owning(1, 2, 3, 4, 5, 6), eco(), cfg, [{ type: 'inspectionJournal', id: 'insp_0003' }], T, { offline: false });
    expect(a.ms.owned.map((o) => o.no).slice(-2)).toEqual([7, 8]);
    expect(a.ms.reveal.map((r) => [r.no, r.k, r.m, r.nAfter])).toEqual([[7, 1, 2, 7], [8, 2, 2, 8]]);
    expect(a.events.map((e) => (e.type === 'museumJournalUnlock' ? [e.no, e.isSeriesComplete, e.source] : null))).toEqual([[7, false, 'inspection'], [8, true, 'inspection']]);
    expect(count(a.ms)).toBe(8);
  });

  test('конфіг museum = 0 вимикає музей', () => {
    const off = { ...cfg, params: { ...cfg.params, museum: 0 } };
    const a = grant(newMuseum(), eco(), off, [1, 2, 3], T, 'digitization');
    expect(a.ms.owned).toEqual([]);
  });
});

describe('бонуси в економіці (FR-10, FR-11, AC-8, AC-19)', () => {
  test('нейтральні без журналів і за відсотками з конфігу з ними', () => {
    expect(bonuses(newMuseum(), cfg)).toEqual({ unit: {}, storage: 1, paper: 1 });
    const b = bonuses(owning(1, 2, 3, 4, 5), cfg);
    expect(b.unit).toEqual({ stroy: 1.05, nakladni: 1.05, raporty: 1.05 });
    expect(b.storage).toBe(1.05);
    expect(b.paper).toBeCloseTo(1.1, 12);
  });

  test('AC-8: ланка «Стройова частина» - 105 з № 1 і 110 з № 1 і № 8 на кожні 100; бонус лишається після Р2', () => {
    const ms1 = owning(1);
    const ms18 = owning(1, 2, 3, 4, 5, 6, 7);
    expect(has(ms18, 8)).toBe(true);
    // Стройова вузька: потоки й решта ланок високо
    const base = eco({ streamLevels: [2000, 2000, 0, 0], stageLevels: [2000, 1, 2000] });
    const ratio = (m: MuseumState, level = 1) => {
      const s = { ...base, level, museum: bonuses(m, cfg) };
      const plain = income({ ...base, level }, cfg, T);
      expect(plain.bottleneck).toEqual({ type: 'stage', id: 'stroy' });
      return income(s, cfg, T).flow.v / plain.flow.v;
    };
    expect(ratio(ms1)).toBeCloseTo(1.05, 10);
    expect(ratio(ms18)).toBeCloseTo(1.1, 10);
    // після цифровізацій і переходу на Р2 бонус лишається: у стані він зберігається поза newCycle
    expect(newCycle({ ...base, level: 2, museum: bonuses(ms18, cfg) }, cfg).museum.unit.stroy).toBeCloseTo(1.1, 10);
  });

  test('AC-19: сховище 8 год -> 8 год 24 хв (з № 8 - 8 год 48 хв); з розширеним 24 год -> 25 год 12 хв і 26 год 24 хв', () => {
    const st = (hours: number, m: MuseumState) => offline({ ...eco({ storageHours: hours }), museum: bonuses(m, cfg) }, cfg, 0, 100 * HOUR).storageMs / HOUR;
    expect(st(8, newMuseum())).toBe(8);
    expect(st(8, owning(2))).toBeCloseTo(8.4, 10);
    expect(st(8, owning(2, 1, 3, 4, 5, 6, 7))).toBeCloseTo(8.8, 10);
    expect(st(24, owning(2))).toBeCloseTo(25.2, 10);
    expect(st(24, owning(1, 2, 3, 4, 5, 6, 7))).toBeCloseTo(26.4, 10);
  });

  test('AC-19: подарунок на 20 аркушів дає 22 з № 3 (з № 8 - 24)', () => {
    const give = (m: MuseumState) => Math.floor(giftPaper({ ...eco({ paper: 0 }), museum: bonuses(m, cfg) }, cfg).paper);
    expect(give(newMuseum())).toBe(20);
    expect(give(owning(3))).toBe(22);
    expect(give(owning(1, 2, 3, 4, 5, 6, 7))).toBe(24);
  });

  test('AC-19: крок Фінслужби акта дрона 2 год 40 хв -> 2 год 24 хв з № 7 (з № 8 - 2 год 8 хв); № 6 скорочує кожен крок', () => {
    const fin = (m: MuseumState) => routeFor('drone', 1, cfg, raceJournals(m)).find((s) => s.unit === 'fin')!.sec / 60;
    expect(fin(newMuseum())).toBe(160);
    expect(fin(owning(7))).toBe(144);
    expect(fin(owning(1, 7, 8))).toBe(128);
    const all = (m: MuseumState) => routeFor('drone', 1, cfg, raceJournals(m)).map((s) => s.sec);
    const plain = all(newMuseum());
    const j6 = all(owning(6));
    j6.forEach((sec, i) => expect(sec).toBe(Math.round(plain[i]! * 0.9)));
  });
});

describe('розкриття й перегляд (рішення 79, FR-20)', () => {
  test('закриття розкриття позначає журнал переглянутим; вкладка гасить усе', () => {
    let ms = fromEvents(newMuseum(), eco(), cfg, [dig([1, 2, 3])], T, { offline: false }).ms;
    expect(unseen(ms)).toBe(3);
    ms = closeReveal(ms);
    expect(unseen(ms)).toBe(2);
    expect(nextReveal(ms)?.no).toBe(2);
    ms = openTab(ms);
    expect(unseen(ms)).toBe(0);
    expect(ms.reveal).toEqual([]);
  });

  test('блок в insp-result: закриття результату знімає розкриття перевірки', () => {
    const a = fromEvents(owning(1, 2, 3), eco(), cfg, [{ type: 'inspectionJournal', id: 'insp_0001' }], T, { offline: false });
    const ms = closeInspReveal(a.ms);
    expect(ms.reveal).toEqual([]);
    expect(ms.owned.find((o) => o.no === 7)!.seen).toBe(true);
  });

  test('AC-18: вбито посеред розкриття - черга стає списком тостів, журнали лишаються непереглянутими', () => {
    const a = fromEvents(newMuseum(), eco(), cfg, [dig([1, 2, 3])], T, { offline: false }).ms;
    const half = closeReveal(a);
    const r = interrupted(half);
    expect(r.nos).toEqual([2, 3]);
    expect(r.ms.reveal).toEqual([]);
    expect(unseen(r.ms)).toBe(2);
    expect(count(r.ms)).toBe(3);
  });
});

describe('курйози (FR-21…FR-23, AC-13)', () => {
  test('дві відповіді й програна гонка: номери 1-3, підсумок «3 записи · 2 телеграми · 1 подарунок»', () => {
    const tg = tgWith(['tg_0015_paper_copy', 'tg_0016_second_page']);
    const answered = {
      ...tg,
      inbox: [
        { ...tg.inbox[0]!, status: 'archive' as const, choiceId: 'diligent' },
        { ...tg.inbox[1]!, status: 'drawer' as const, choiceId: 'drawer' },
      ],
    };
    let ms = newMuseum();
    ms = curioFromTelegram(ms, { type: 'curio', telegramId: answered.inbox[0]!.id, uid: answered.inbox[0]!.uid, text: null }, answered, T);
    ms = curioFromTelegram(ms, { type: 'curio', telegramId: answered.inbox[1]!.id, uid: answered.inbox[1]!.uid, text: null }, answered, T + 1);
    const lost = { type: 'raceCurio' as const, id: 'race_0001', giftType: 'drone' as const, raceNo: 1, level: 1, steps: [{ unit: 'akty' as const, sec: 100 }], stepsDone: 2, stepsTotal: 4, marginSec: 5520, endMs: T + 2 };
    ms = curioFromRace(ms, lost);
    expect(ms.curios.map((c) => [c.seq, c.kind, c.status ?? null])).toEqual([[1, 'telegram', 'diligent'], [2, 'telegram', 'drawer'], [3, 'gift', null]]);
    expect(curioSummary(ms)).toEqual({ total: 3, telegrams: 2, gifts: 1, packs: 0, stacks: 0 });
    expect(ms.curios[2]!.gift).toMatchObject({ raceNo: 1, stepsDone: 2, stepsTotal: 4, marginSec: 5520 });
  });

  test('повідомлення без вибору - статус «до відома»', () => {
    const tg = tgWith(['tg_0025b_prize_cancelled'], {}, 'notice');
    const ms = curioFromTelegram(newMuseum(), { type: 'curio', telegramId: 'tg_0025b_prize_cancelled', uid: tg.inbox[0]!.uid, text: null }, tg, T);
    expect(ms.curios[0]).toMatchObject({ kind: 'telegram', status: 'info' });
  });

  test('телеграму вилучено контентом - запис ховається зі списку й підсумку, номер лишається', () => {
    let ms = curioFromTelegram(newMuseum(), { type: 'curio', telegramId: 'tg_gone', uid: 'tg_gone#1', text: null }, tgWith([]), T);
    expect(ms.curioSeq).toBe(1);
    expect(visibleCurios(ms)).toEqual([]);
    expect(curioSummary(ms).total).toBe(0);
    ms = curioFromTelegram(ms, { type: 'curio', telegramId: 'tg_gone', uid: 'tg_gone#2', text: null }, tgWith([]), T);
    expect(ms.curios.map((c) => c.seq)).toEqual([1, 2]);
  });

  test('дві програні гонки за один tick - обидві в журналі (дані беруться з події, а не з останнього підсумку)', () => {
    const ev = (n: number) => ({ type: 'raceCurio' as const, id: `race_000${n}`, giftType: 'shovel' as const, raceNo: n, level: 1, steps: [{ unit: 'akty' as const, sec: 60 }], stepsDone: 1, stepsTotal: 4, marginSec: 60, endMs: T + n });
    const ms = curioFromRace(curioFromRace(newMuseum(), ev(1)), ev(2));
    expect(ms.curios.map((c) => [c.seq, c.gift!.raceNo])).toEqual([[1, 1], [2, 2]]);
  });
});
