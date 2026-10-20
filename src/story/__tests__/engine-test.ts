// 014 AC-2…AC-5, AC-8, FR-3, FR-4, FR-7, FR-10: рушій сюжету.
import { confirmTelegram, newStory, onEvent, pull, ready, storyForLevel, sync } from '../engine';
import type { Beat, Carrier, SessionBudget, StoryCtx } from '../types';

const HOUR = 3_600_000;
const T0 = 1_700_000_000_000;
const ALL = new Set<Carrier>(['telegram', 'note', 'call', 'event_toast', 'curio', 'character_state']);
const OPTS = { supports: ALL, maxToasts: 2 };
const FRESH: SessionBudget = { interrupting: 0, toasts: 0 };

const beat = (id: string, o: Partial<Beat> & Pick<Beat, 'arc' | 'order' | 'trigger'>): Beat => ({ rev: 1, carrier: 'note', payload: { from: 'x', title: 't', body: 'b' }, id, ...o });
const ctx = (o: Partial<StoryCtx> = {}): StoryCtx => ({ level: 3, counts: {}, conversions: 0, packs: 0, levelStartMs: T0, ...o });

describe('готовність (FR-3, FR-4, AC-2)', () => {
  const beats = [
    beat('st_a_01', { arc: 'who_writes', order: 1, level: 3, trigger: { type: 'pack_received', n: 1 } }),
    beat('st_a_02', { arc: 'who_writes', order: 2, level: 3, trigger: { type: 'pack_received', n: 3 }, requires: [{ beat: 'st_a_01' }] }),
  ];

  test('третя пачка з доставленим попереднім кроком дає наступний крок готовим; без попереднього - ні', () => {
    const noPrev = pull(sync(newStory(), beats, ctx({ packs: 3 }), T0), beats, ctx({ packs: 3 }), T0, FRESH, OPTS);
    expect(noPrev.out.map((p) => p.beat.id)).toEqual(['st_a_01', 'st_a_02']);
    const onlySecond = ready({ ...newStory(), fired: { st_a_02: { at: T0, away: false } } }, beats, ctx({ packs: 3 }), T0, ALL);
    expect(onlySecond).toEqual([]);
  });

  test('спрацювання запам\'ятовується, поки requires не виконано (afterHours), і крок виходить без нової події', () => {
    const b = [
      beat('st_a_01', { arc: 'who_writes', order: 1, level: 2, trigger: { type: 'digitization_on_level', n: 1 } }),
      beat('st_a_02', { arc: 'who_writes', order: 2, level: 2, trigger: { type: 'beat_delivered', beat: 'st_a_01' }, requires: [{ beat: 'st_a_01', afterHours: 24 }] }),
    ];
    const c = ctx({ level: 2, counts: { '2': 1 } });
    const r1 = pull(newStory(), b, c, T0, FRESH, OPTS);
    expect(r1.out.map((p) => p.beat.id)).toEqual(['st_a_01']);
    const r2 = pull(r1.st, b, c, T0 + 23 * HOUR, FRESH, OPTS);
    expect(r2.out).toEqual([]);
    const r3 = pull(r2.st, b, c, T0 + 25 * HOUR, FRESH, OPTS);
    expect(r3.out.map((p) => p.beat.id)).toEqual(['st_a_02']);
    expect(r3.out[0]!.delaySec).toBe(3600);
  });

  test('крок іншого рівня не готовий; афтерГодинс від тригера', () => {
    const b = [beat('st_c_01', { arc: 'cat', order: 1, level: 3, trigger: { type: 'level_enter', level: 3, afterHours: 24 } })];
    expect(pull(newStory(), b, ctx({ level: 4 }), T0, FRESH, OPTS).out).toEqual([]);
    expect(pull(newStory(), b, ctx({ level: 3 }), T0 + 12 * HOUR, FRESH, OPTS).out).toEqual([]);
    expect(pull(newStory(), b, ctx({ level: 3 }), T0 + 25 * HOUR, FRESH, OPTS).out.map((p) => p.beat.id)).toEqual(['st_c_01']);
  });
});

describe('події (race_won, gift_arrived, boss)', () => {
  const b = [
    beat('st_p_01', { arc: 'ptashka', order: 1, level: 3, trigger: { type: 'race_won', gift: 'drone', level: 3, nth: 1 } }),
    beat('st_g_01', { arc: 'archaeologist', order: 1, level: 2, trigger: { type: 'gift_arrived', level: 2, nth: 2 } }),
  ];

  test('перша виграна гонка за дрон дає крок; гонка за лопату - ні', () => {
    let s = onEvent(newStory(), b, { type: 'race_won', gift: 'shovel', level: 3 }, T0, false);
    expect(pull(s, b, ctx(), T0, FRESH, OPTS).out).toEqual([]);
    s = onEvent(s, b, { type: 'race_won', gift: 'drone', level: 3 }, T0, true);
    const r = pull(s, b, ctx(), T0, FRESH, OPTS);
    expect(r.out.map((p) => [p.beat.id, p.away])).toEqual([['st_p_01', true]]);
  });

  test('nth: другий подарунок на рівні', () => {
    let s = onEvent(newStory(), b, { type: 'gift_arrived', level: 2 }, T0, false);
    expect(pull(s, b, ctx({ level: 2 }), T0, FRESH, OPTS).out).toEqual([]);
    s = onEvent(s, b, { type: 'gift_arrived', level: 2 }, T0 + 1, false);
    expect(pull(s, b, ctx({ level: 2 }), T0 + 1, FRESH, OPTS).out.map((p) => p.beat.id)).toEqual(['st_g_01']);
  });
});

describe('ліміти сесії (FR-7, AC-5)', () => {
  test('два готові дзвінки: у сесії один, другий у наступній', () => {
    const b = [
      beat('st_k_01', { arc: 'who_writes', order: 1, level: 1, carrier: 'call', payload: { from: 'a', lines: ['x'] }, trigger: { type: 'digitization_on_level', n: 1 } }),
      beat('st_k_02', { arc: 'archaeologist', order: 1, level: 1, carrier: 'call', payload: { from: 'a', lines: ['y'] }, trigger: { type: 'digitization_on_level', n: 1 } }),
    ];
    const c = ctx({ level: 1, counts: { '1': 1 } });
    const r1 = pull(newStory(), b, c, T0, FRESH, OPTS);
    expect(r1.out).toHaveLength(1);
    const r2 = pull(r1.st, b, c, T0 + 1, FRESH, OPTS);
    expect(r2.out).toHaveLength(1);
    expect(r2.out[0]!.beat.id).not.toBe(r1.out[0]!.beat.id);
  });

  test('тостів не більше maxToasts за сесію, записки - без ліміту', () => {
    const toasts = [1, 2, 3].map((i) => beat(`st_t_0${i}`, { arc: 'tumbochkin', order: i, level: 5, carrier: 'event_toast', trigger: { type: 'conversion', k: i } }));
    const notes = [1, 2, 3].map((i) => beat(`st_n_0${i}`, { arc: 'ptashka', order: i, level: 5, trigger: { type: 'conversion', k: i } }));
    const c = ctx({ level: 5, conversions: 3 });
    const r = pull(newStory(), [...toasts, ...notes], c, T0, FRESH, { ...OPTS, maxToasts: 1 });
    expect(r.out.filter((p) => p.beat.carrier === 'event_toast')).toHaveLength(1);
    expect(r.out.filter((p) => p.beat.carrier === 'note')).toHaveLength(3);
  });
});

describe('наздоганяння (FR-10, AC-8) і міграція (FR-29)', () => {
  const b = [
    beat('st_r_01', { arc: 'who_writes', order: 1, level: 3, required: true, trigger: { type: 'digitization_on_level', n: 3 } }),
    beat('st_o_01', { arc: 'ptashka', order: 1, level: 3, trigger: { type: 'digitization_on_level', n: 3 } }),
    beat('st_n_01', { arc: 'cat', order: 1, level: 4, trigger: { type: 'digitization_on_level', n: 1 } }),
  ];

  test('required-крок Р3, недоставлений до переходу, іде першим на Р4 з catchUp; не-required пропущено', () => {
    const fired = { st_r_01: { at: T0, away: false }, st_o_01: { at: T0, away: false } };
    const c = ctx({ level: 4, counts: { '3': 3, '4': 1 } });
    const r = pull({ ...newStory(), fired }, b, c, T0 + HOUR, FRESH, OPTS);
    expect(r.out.map((p) => [p.beat.id, p.catchUp])).toEqual([
      ['st_r_01', true],
      ['st_n_01', false],
    ]);
  });

  test('перший запуск версії з сюжетом: кроки пройдених рівнів закриті, поточного - наздоганяють з лічильників', () => {
    const s = storyForLevel(b, 4);
    expect(s.skipped.sort()).toEqual(['st_o_01', 'st_r_01']);
    const r = pull(s, b, ctx({ level: 4, counts: { '3': 6, '4': 1 } }), T0, FRESH, OPTS);
    expect(r.out.map((p) => p.beat.id)).toEqual(['st_n_01']);
  });
});

describe('доставка один раз (FR-5, AC-3)', () => {
  test('доставлений крок не повертається, хай навіть rev контенту виріс', () => {
    const b1 = [beat('st_x_01', { arc: 'cat', order: 1, level: 3, trigger: { type: 'digitization_on_level', n: 1 } })];
    const c = ctx({ counts: { '3': 1 } });
    const r = pull(newStory(), b1, c, T0, FRESH, OPTS);
    expect(r.out).toHaveLength(1);
    const b2 = [{ ...b1[0]!, rev: 2 }];
    expect(pull(r.st, b2, c, T0 + HOUR, FRESH, OPTS).out).toEqual([]);
  });
});

describe('носій telegram', () => {
  const b = [
    beat('st_t_01', { arc: 'cat', order: 1, level: 3, carrier: 'telegram', payload: { telegramId: 'tg_x' }, trigger: { type: 'digitization_on_level', n: 1 } }),
    beat('st_t_02', { arc: 'cat', order: 2, level: 3, trigger: { type: 'beat_delivered', beat: 'st_t_01' } }),
  ];
  const c = ctx({ counts: { '3': 1 } });

  test('ставиться в чергу; доставленою вважається при отриманні, лише тоді відкривається наступний крок арки', () => {
    const r1 = pull(newStory(), b, c, T0, FRESH, OPTS);
    expect(r1.out.map((p) => [p.beat.id, p.dispatchOnly])).toEqual([['st_t_01', true]]);
    expect(pull(r1.st, b, c, T0 + HOUR, FRESH, OPTS).out).toEqual([]);
    const done = confirmTelegram(r1.st, b, c, 'tg_x', T0 + 2 * HOUR)!;
    expect(done.beat.id).toBe('st_t_01');
    expect(pull(done.st, b, c, T0 + 2 * HOUR, FRESH, OPTS).out.map((p) => p.beat.id)).toEqual(['st_t_02']);
    expect(confirmTelegram(done.st, b, c, 'tg_x', T0)).toBeNull();
  });

  test('непідтримуваний носій чекає в черзі й тримає арку (FR-28)', () => {
    const r = pull(newStory(), b, c, T0, FRESH, { supports: new Set<Carrier>(['note']), maxToasts: 2 });
    expect(r.out).toEqual([]);
  });
});
