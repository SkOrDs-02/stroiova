// 016 FR-17…FR-24: контент грамот (AC-9), лічильники над подіями, видача один раз, заднім числом, скидання.
import awardsJson from '../../../content/awards.json';
import type { DomainEvent } from '@/economy/game/types';

import { applyFacts, count, markSeen, newAwards, progressOf, resetProgress, retroactive, unseen } from '../awards';
import { AWARDS, AWARDS_TOTAL, COUNTERS } from '../content';
import { factsOf } from '../facts';
import type { AwardCtx, AwardsState, Fact } from '../types';

const CTX: AwardCtx = { levelId: 'batalion', zpzSharePct: 0, curioEntries: 0, unitsWithClerks: 0, unitsTotal: 7 };
const T = 1_000_000;

const answer = (kind: string, telegramId = 'tg_x'): DomainEvent => ({ type: 'telegramAnswer', telegramId, uid: 'u', choiceId: kind, choiceKind: kind, repDelta: 0, chancePct: 0, paper: 0 });
const run = (s: AwardsState, evs: DomainEvent[], ctx: AwardCtx = CTX, at = T) => applyFacts(s, factsOf(evs), ctx, at);
const ids = (r: { grants: { id: string }[] }) => r.grants.map((g) => g.id);

function conditionCounters(c: unknown): string[] {
  const o = c as { counter?: string; all?: unknown[] };
  return [...(o.counter ? [o.counter] : []), ...(o.all ?? []).flatMap(conditionCounters)];
}

describe('контент грамот (AC-9)', () => {
  test('62 грамоти з унікальними id, 35 лічильників, умови лише над відомими лічильниками', () => {
    expect(AWARDS_TOTAL).toBe(62);
    expect(new Set(AWARDS.map((a) => a.id)).size).toBe(62);
    expect(Object.keys(COUNTERS)).toHaveLength(35);
    for (const a of AWARDS) {
      for (const c of conditionCounters(a.condition)) expect(Object.keys(COUNTERS)).toContain(c);
      if (a.progress) expect(Object.keys(COUNTERS)).toContain(a.progress.counter);
    }
  });

  test('назва ≤ 40, текст ≤ 120, підказка ≤ 80; жодної згадки telegram_flag (FR-20)', () => {
    for (const a of AWARDS) {
      expect(a.title.length).toBeLessThanOrEqual(40);
      expect(a.text.length).toBeLessThanOrEqual(120);
      expect((a.hint ?? '').length).toBeLessThanOrEqual(80);
      expect(a.text + a.title + (a.hint ?? '')).not.toContain('—');
      // підказка є в усіх відкритих; прихована може її не мати (замість неї «Умову оголосять після нагородження»)
      if (!a.hidden) expect(a.hint).toBeTruthy();
    }
    expect(JSON.stringify(awardsJson.awards)).not.toContain('telegram_flag');
    expect(JSON.stringify(awardsJson.counters)).not.toContain('telegram_flag');
  });

  test('типи й тости: ≤ 60 знаків із найдовшою назвою', () => {
    for (const a of AWARDS) {
      const t = awardsJson.types[a.type].toast.replace('{title}', a.title);
      expect(t.length).toBeLessThanOrEqual(60);
    }
  });
});

describe('лічильники й видача', () => {
  test('перша відповідь дає «Першу телеграму», повторна нічого (FR-21)', () => {
    const a = run(newAwards(), [answer('diligent')]);
    expect(ids(a)).toEqual(['aw_tg_first']);
    expect(a.s.got.aw_tg_first).toEqual({ atMs: T });
    expect(a.s.pendingPlatform).toContain('aw_tg_first');
    const b = run(a.s, [answer('diligent')]);
    expect(b.grants).toEqual([]);
    expect(count(b.s)).toBe(1);
  });

  test('AC-11: 49 відповідей + «Це не смішно» + 50-та: tg_answered = 50, flag лічильників не змінює', () => {
    let s = newAwards();
    for (let i = 0; i < 49; i++) s = run(s, [answer(i % 2 ? 'diligent' : 'formal_reply')]).s;
    expect(s.counters.tg_answered).toBe(49);
    const flag: DomainEvent = { type: 'telegramFlag', telegramId: 'tg_x', reason: 1, hasComment: false, afterChoice: false };
    const same = run(s, [flag]);
    expect(same.s).toBe(s);
    const r = run(s, [answer('diligent')]);
    expect(r.s.counters.tg_answered).toBe(50);
    expect(ids(r)).toContain('aw_tg_50');
  });

  test('AC-14: 9 «у шухляду» поспіль і «сумлінно» між ними - серія скинута; 10 поспіль - видано', () => {
    let s = newAwards();
    for (let i = 0; i < 9; i++) s = run(s, [answer('drawer')]).s;
    expect(s.counters.tg_drawer_streak).toBe(9);
    s = run(s, [answer('diligent')]).s;
    expect(s.counters.tg_drawer_streak).toBe(0);
    for (let i = 0; i < 9; i++) s = run(s, [answer('drawer')]).s;
    expect(s.got.aw_h_drawer_streak).toBeUndefined();
    const r = run(s, [answer('drawer')]);
    expect(ids(r)).toContain('aw_h_drawer_streak');
  });

  test('усі чотири види відповідей разом - умова all', () => {
    let s = newAwards();
    for (const k of ['diligent', 'formal_reply', 'drawer']) s = run(s, [answer(k)]).s;
    expect(s.got.aw_tg_all_kinds).toBeUndefined();
    expect(ids(run(s, [answer('special')]))).toContain('aw_tg_all_kinds');
  });

  test('наказ має наскрізний номер серед отриманих nakaz (FR-24)', () => {
    const adv = (to: number): DomainEvent => ({ type: 'levelAdvance', from: to - 1, to, digitizationCount: 3, pointsTotal: 1 });
    let r = run(newAwards(), [adv(2)]);
    expect(r.s.got.aw_level_bryhada!.orderNo).toBe(1);
    r = run(r.s, [adv(3)]);
    expect(r.s.got.aw_level_komand!.orderNo).toBe(2);
    expect(r.s.lastOrderNo).toBe(2);
    expect(r.s.got.aw_tg_first).toBeUndefined();
  });

  test('подія з where: підсумкова Р2 дає наказ, звичайна ні', () => {
    const fin = (kind: 'regular' | 'final', result: 'passed' | 'failed' = 'passed'): DomainEvent => ({ type: 'inspectionFinish', id: 'i', kind, attempt: 1, mechDone: null, exitUnlocked: false, result, level: 2, withoutRemarks: false, itemsDone: 1, itemsTotal: 1, offline: false, secFromStart: 1 });
    expect(ids(run(newAwards(), [fin('regular')]))).not.toContain('aw_boss_r2');
    expect(ids(run(newAwards(), [fin('final', 'failed')]))).not.toContain('aw_boss_r2');
    expect(ids(run(newAwards(), [fin('final')]))).toContain('aw_boss_r2');
  });

  test('серія «без зауважень» скидається провалом і зауваженням', () => {
    const fin = (result: 'passed' | 'failed', withoutRemarks: boolean): DomainEvent => ({ type: 'inspectionFinish', id: 'i', kind: 'regular', attempt: 1, mechDone: null, exitUnlocked: false, result, level: 1, withoutRemarks, itemsDone: 1, itemsTotal: 1, offline: false, secFromStart: 1 });
    let s = newAwards();
    for (let i = 0; i < 4; i++) s = run(s, [fin('passed', true)]).s;
    s = run(s, [fin('passed', false)]).s;
    expect(s.counters.insp_clean_streak).toBe(0);
    expect(s.counters.insp_passed).toBe(5);
    for (let i = 0; i < 4; i++) s = run(s, [fin('passed', true)]).s;
    expect(s.got.aw_insp_streak_5).toBeUndefined();
    expect(ids(run(s, [fin('passed', true)]))).toContain('aw_insp_streak_5');
  });

  test('гонки: distinct за видами подарунків, «на хвилину» програш, Р3', () => {
    const race = (result: 'success' | 'fail', giftType: 'drone' | 'shovel' | 'generator', marginSec: number, level = 1): DomainEvent => ({ type: 'raceFinish', id: 'r', giftType, result, marginSec, speedups: 0, offline: false, level });
    let s = newAwards();
    s = run(s, [race('success', 'drone', 100)]).s;
    s = run(s, [race('success', 'drone', 100)]).s;
    expect(s.counters.race_gift_types_won).toBe(1);
    s = run(s, [race('success', 'shovel', 100)]).s;
    expect(s.got.aw_race_all_gifts).toBeUndefined();
    const r = run(s, [race('success', 'generator', 100, 3)]);
    expect(ids(r)).toEqual(expect.arrayContaining(['aw_race_all_gifts', 'aw_race_ptashka3']));
    // програш: у домені запас - модуль, у фактах від'ємний
    expect(ids(run(newAwards(), [race('fail', 'drone', 61)]))).not.toContain('aw_h_race_minute');
    expect(ids(run(newAwards(), [race('fail', 'drone', 60)]))).toContain('aw_h_race_minute');
  });

  test('конвертації - максимум convert_index; діловоди на всіх одиницях рівня Р3', () => {
    const conv = (i: number): DomainEvent => ({ type: 'stageConvert', stageId: 'kombat', convertIndex: i, costLog10: 1, digitizationsOnLevel: 0, secSinceLevelStart: 0 });
    let s = run(newAwards(), [conv(1), conv(3)]).s;
    expect(s.counters.conversions).toBe(3);
    s = run(s, [conv(2)]).s;
    expect(s.counters.conversions).toBe(3);
    expect(s.got.aw_convert_3).toBeDefined();
    const r3: AwardCtx = { ...CTX, levelId: 'komanduvannia', unitsTotal: 9, unitsWithClerks: 8 };
    const hire = (): DomainEvent => ({ type: 'clerkHire', target: { type: 'stream', id: 'raporty' }, cost: 1, isFirstClerk: false, clerksCountAfter: 1 });
    let c = run(newAwards(), [], r3).s;
    c = applyFacts(c, factsOf([hire()]), r3, T).s;
    expect(c.got.aw_clerks_all_r3).toBeUndefined();
    const full = applyFacts(c, factsOf([hire()]), { ...r3, unitsWithClerks: 9 }, T);
    expect(ids(full)).toContain('aw_clerks_all_r3');
    // на іншому рівні та сама кількість не рахується
    const other = applyFacts(newAwards(), factsOf([hire()]), { ...r3, levelId: 'bryhada', unitsWithClerks: 9 }, T);
    expect(ids(other)).not.toContain('aw_clerks_all_r3');
  });

  test('станові лічильники: частка «Звітів про звіти» - максимум, кроки з кліком у «Журнал курйозів»', () => {
    let s = applyFacts(newAwards(), [], { ...CTX, zpzSharePct: 48.5 }, T).s;
    s = applyFacts(s, [], { ...CTX, zpzSharePct: 30 }, T).s;
    expect(s.counters.zpz_share_max_pct).toBe(48.5);
    expect(ids(applyFacts(s, [], { ...CTX, zpzSharePct: 50 }, T))).toContain('aw_zpz_half');
  });

  test('UI-події: тап по спляче кіт скидається бонусним, шторки журналів - distinct', () => {
    const ui = (event: string, props: Fact['props']): Fact => ({ event, props });
    let s = newAwards();
    for (let i = 0; i < 9; i++) s = applyFacts(s, [ui('ui:cat_tap', { is_bonus: false })], CTX, T).s;
    s = applyFacts(s, [ui('ui:cat_tap', { is_bonus: true })], CTX, T).s;
    expect(s.counters.cat_sleep_taps).toBe(0);
    expect(s.counters.cat_bonus_taps).toBe(1);
    expect(s.got.aw_cat_first).toBeDefined();
    for (let i = 0; i < 9; i++) s = applyFacts(s, [ui('ui:cat_tap', { is_bonus: false })], CTX, T).s;
    expect(s.got.aw_h_cat_sleep).toBeUndefined();
    expect(applyFacts(s, [ui('ui:cat_tap', { is_bonus: false })], CTX, T).s.got.aw_h_cat_sleep).toBeDefined();
    let j = newAwards();
    for (const id of ['a', 'a', 'b']) j = applyFacts(j, [ui('ui:journal-detail', { is_found: true, journal_id: id })], CTX, T).s;
    expect(j.counters.journal_details_read).toBe(2);
  });

  test('FR-34: подія без гравця дає грамоті мітку події і ознаку', () => {
    const f: Fact = { event: 'race_finish', props: { result: 'success', gift_type: 'drone', margin_sec: 5, level_id: 'batalion' }, atMs: T - 5000, offline: true };
    const r = applyFacts(newAwards(), [f], CTX, T);
    expect(r.grants[0]).toMatchObject({ atMs: T - 5000, offline: true });
    expect(r.s.got.aw_race_first_win).toEqual({ atMs: T - 5000, offline: true });
  });

  test('кілька грамот однією подією - у порядку awards.json', () => {
    const d: DomainEvent = { type: 'digitizationComplete', no: 1, level: 1, points: 1, pointsTotal: 1, multiplier: 1, lifetimeLog10: 1, journalsCancelled: [], fromHint: false };
    const j: DomainEvent = { type: 'museumJournalUnlock', no: 1, journalId: 'x', rarity: 'common', source: 'digitization', ownedAfter: 1, isSeriesComplete: false, seriesId: 'battalion_property', seriesOwnedAfter: 1, seriesCompleteCount: 0 };
    expect(ids(run(newAwards(), [d, j]))).toEqual(['aw_digit_first', 'aw_museum_first']);
  });
});

describe('заднім числом, перегляд, скидання', () => {
  test('AC-20: нова грамота над наявним лічильником видається з retro', () => {
    const s: AwardsState = { ...newAwards(), counters: { tg_diligent: 120 }, got: {} };
    const r = retroactive(s, CTX, T);
    expect(r.grants).toEqual([{ id: 'aw_tg_diligent_25', atMs: T, retro: true, offline: false }]);
    expect(r.s.got.aw_tg_diligent_25).toEqual({ atMs: T, retro: true });
    expect(retroactive(r.s, CTX, T).grants).toEqual([]);
  });

  test('подійні умови заднім числом не видаються', () => {
    const r = retroactive(newAwards(), CTX, T);
    expect(r.grants).toEqual([]);
  });

  test('FR-29: нові грамоти непереглянуті, показ позначає всі', () => {
    const a = run(newAwards(), [answer('diligent')]);
    expect(unseen(a.s)).toEqual(['aw_tg_first']);
    const m = markSeen(a.s);
    expect(unseen(m)).toEqual([]);
    expect(markSeen(m)).toBe(m);
  });

  test('AC-19: скидання обнуляє лічильники, грамоти й номер наказу лишаються', () => {
    let s = run(newAwards(), [answer('diligent'), { type: 'levelAdvance', from: 1, to: 2, digitizationCount: 3, pointsTotal: 1 }]).s;
    s = resetProgress(s);
    expect(count(s)).toBe(2);
    expect(s.counters).toEqual({});
    expect(s.lastOrderNo).toBe(1);
    // повторне виконання умови нічого не видає
    expect(run(s, [answer('diligent')]).grants).toEqual([]);
  });

  test('прогрес неотриманої: «k з n» не більше n', () => {
    const s: AwardsState = { ...newAwards(), counters: { tg_answered: 37 } };
    const a = AWARDS.find((x) => x.id === 'aw_tg_100')!;
    expect(progressOf(s, a)).toEqual({ k: 37, n: 100 });
    expect(progressOf({ ...s, counters: { tg_answered: 500 } }, a)).toEqual({ k: 100, n: 100 });
    expect(progressOf(s, AWARDS.find((x) => x.id === 'aw_digit_first')!)).toBeNull();
  });
});
