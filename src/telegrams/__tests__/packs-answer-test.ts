// 011 зведена відповідь пачки: числа (AC-13, AC-14), види (AC-12), ефекти й баф (FR-21, FR-22), одна відповідь на пачку (FR-24), окремі відповіді (ВП-7).
import { zpzInfo } from '@/economy/game/income';
import { itemsFor, newGame } from '@/economy/game/state';
import type { EconomyState } from '@/economy/game/types';

import { packDef } from '../content';
import { answer } from '../effects';
import { seedFrom } from '../rng';
import { answerPack, lastPack, mergeNumbers, packByNo, packForecast, resolvedSeparately } from '../packs';
import { cfg, p, tgWith } from '../test-utils';
import type { InboxItem, TelegramState } from '../types';

const NOW = Date.UTC(2025, 9, 11, 10);
const ctx = { cfg, nowMs: NOW, dayKey: '2025-10-11' };

function eco(patch: Partial<EconomyState> = {}): EconomyState {
  return { ...newGame(cfg, NOW), level: 3, paper: 30, prestigePoints: 5, ...patch };
}

/** Стан Р3 із пачкою № 1 (id пачки з контенту) */
function withPack(packId: string, patch: Partial<TelegramState> = {}): TelegramState {
  const d = packDef(packId)!;
  const inbox: InboxItem[] = d.telegrams.map((id, i) => ({ uid: `${id}#${i + 1}`, id, kind: 'telegram', receivedAt: NOW - 3_600_000, status: 'new', pack: { id: packId, no: 1, index: i + 1 } }));
  return { ...tgWith([]), startMs: NOW - 10 * 86_400_000, inbox, deliveries: 3, firstInspectionPassed: true, packs: { day: '2025-10-11', seq: 1 }, ...patch };
}

const ok = <T>(r: T): Exclude<T, { error: unknown }> => {
  if (typeof r === 'object' && r != null && 'error' in r) throw new Error(String((r as { error: unknown }).error));
  return r as Exclude<T, { error: unknown }>;
};

describe('числа зведеної відповіді (FR-21)', () => {
  test('AC-13: паперу 2, 1, 3 - мінус 4 аркуші; репутація +5, +10, +5 - +10', () => {
    expect(mergeNumbers([{ paper: 2, rep: 5, pct: 0 }, { paper: 1, rep: 10, pct: 0 }, { paper: 3, rep: 5, pct: 0 }], 2)).toEqual({ paper: 4, rep: 10, pct: 0 });
  });

  test('AC-14: шанси 10%, 20%, 15% - один кидок з 30%; репутація −5, −5, −3 - −6 (до нуля)', () => {
    const m = mergeNumbers([{ paper: 0, rep: -5, pct: 10 }, { paper: 0, rep: -5, pct: 20 }, { paper: 0, rep: -3, pct: 15 }], 2);
    expect(m).toEqual({ paper: 0, rep: -6, pct: 30 });
  });

  test('папір не стає від\'ємним; шанс не вище 100; без жодного шансу кидка немає', () => {
    expect(mergeNumbers([{ paper: 1, rep: 0, pct: 0 }, { paper: 0, rep: 0, pct: 0 }, { paper: 0, rep: 0, pct: 0 }], 2).paper).toBe(0);
    expect(mergeNumbers([{ paper: 0, rep: 0, pct: 95 }], 2).pct).toBe(100);
    expect(mergeNumbers([{ paper: 0, rep: 0, pct: 0 }], 2).pct).toBe(0);
  });
});

describe('прогноз і види (FR-20, AC-12)', () => {
  test('пачка без "шухляди" в одній телеграмі: вид неактивний (reason: kind), решта мають прогноз поруч із сумою окремих', () => {
    const f = packForecast(withPack('pack_05'), eco(), cfg, 1);
    const by = Object.fromEntries(f.map((x) => [x.kind, x]));
    expect(by.drawer).toMatchObject({ available: false, reason: 'kind' });
    expect(by.diligent!.available).toBe(true);
    expect(by.diligent!.separate).toMatchObject({ paper: 1, rep: 15, slows: 3 });
    expect(by.diligent).toMatchObject({ paper: 0, rep: 7 });
    expect(by.diligent!.slow).toEqual({ mult: p.pack.slowMult, hours: p.pack.slowHours });
    expect(by.formal_reply).toMatchObject({ rep: -7, slow: null });
    expect(by.formal_reply!.separate.chances.length).toBe(3);
  });

  test('бракує аркушів: вид неактивний (reason: paper) з тим, скільки бракує', () => {
    const f = packForecast(withPack('pack_06'), eco({ paper: 4 }), cfg, 1);
    expect(f.find((x) => x.kind === 'diligent')).toMatchObject({ available: false, reason: 'paper', paper: 10, lackPaper: 6 });
    expect(answerPack(withPack('pack_06'), eco({ paper: 4 }), 1, 'diligent', ctx)).toEqual({ error: 'paper' });
  });
});

describe('«сумлінно» (FR-21, FR-22, FR-24)', () => {
  test('один папір −0, репутація +7, одне сповільнення «Нарада», баф «Зведення б\'ється», один запис курйозів, жодного curio по телеграмах', () => {
    const tg0 = withPack('pack_06');
    const r = ok(answerPack(tg0, eco(), 1, 'diligent', ctx));
    expect(r.eco.paper).toBe(30 - 10);
    expect(r.tg.reputation.value).toBe(tg0.reputation.value + 10);
    const slows = r.effects.filter((e) => e.source === 'telegram_slow');
    expect(slows).toEqual([expect.objectContaining({ target: { type: 'stage', id: 'narada' }, value: p.pack.slowMult, endMs: NOW + p.pack.slowHours * 3_600_000 })]);
    const beats = r.effects.filter((e) => e.source === 'pack_beats');
    expect(beats).toEqual([expect.objectContaining({ kind: 'factor', value: p.pack.summaryBuff, target: { type: 'stream', id: 'zvedennia' }, endMs: NOW + p.pack.summaryBuffHours * 3_600_000 })]);
    expect(r.events.filter((e) => e.type === 'curio')).toHaveLength(0);
    expect(r.events.filter((e) => e.type === 'packCurio')).toEqual([expect.objectContaining({ packId: 'pack_06', no: 1, kind: 'diligent' })]);
    expect(r.events.filter((e) => e.type === 'telegramAnswer')).toHaveLength(3);
    expect(r.events.filter((e) => e.type === 'telegramAnswer').every((e) => e.type === 'telegramAnswer' && e.isPackSummary && e.packId === 'pack_06')).toBe(true);
    expect(r.events.find((e) => e.type === 'packResolve')).toMatchObject({ mode: 'summary', choiceKind: 'diligent', paperSpent: 10, repDelta: 10, isBeats: true });
    expect(r.events.find((e) => e.type === 'packBeats')).toEqual({ type: 'packBeats', mult: p.pack.summaryBuff, hours: p.pack.summaryBuffHours });
    const g = packByNo(r.tg, 1)!;
    expect(g).toMatchObject({ status: 'done', summary: 'diligent', diligent: true, mode: 'summary' });
    expect(g.items.every((i) => i.status === 'work' && i.pack!.summary === 'diligent')).toBe(true);
  });

  test('після окремої відповіді на будь-яку телеграму зведення недоступне (FR-19)', () => {
    const tg0 = withPack('pack_01');
    const one = ok(answer(tg0, eco(), tg0.inbox[1]!.uid, 'diligent', ctx));
    expect(answerPack(one.tg, one.eco, 1, 'diligent', ctx)).toEqual({ error: 'state' });
    expect(packByNo(one.tg, 1)!.status).toBe('partial');
  });
});

describe('відписка й шухляда', () => {
  test('«відписка»: один кидок з 30%, без сповільнень і бафу; репутація −7; хоч раз за 200 спроб випадає позапланова', () => {
    let hits = 0;
    for (let s = 0; s < 200; s++) {
      const tg0 = withPack('pack_01', { rng: seedFrom(`ac14-${s}`) });
      const r = ok(answerPack(tg0, eco(), 1, 'formal_reply', ctx));
      expect(r.effects.filter((e) => e.source === 'telegram_slow' || e.source === 'pack_beats')).toHaveLength(0);
      expect(r.tg.reputation.value).toBe(tg0.reputation.value - 7);
      expect(r.events.find((e) => e.type === 'packResolve')).toMatchObject({ isBeats: false, chancePct: expect.any(Number) });
      if (r.events.some((e) => e.type === 'unscheduledInspection')) hits++;
    }
    expect(hits).toBeGreaterThan(20);
    expect(hits).toBeLessThan(120);
  });

  test('«шухляда»: усі три в шухляді, без паперу й репутації; запис курйозів kind: drawer', () => {
    const tg0 = withPack('pack_01');
    const r = ok(answerPack(tg0, eco(), 1, 'drawer', ctx));
    expect(r.eco.paper).toBe(30);
    expect(r.tg.reputation.value).toBe(tg0.reputation.value);
    expect(packByNo(r.tg, 1)!.items.every((i) => i.status === 'drawer')).toBe(true);
    expect(r.events.find((e) => e.type === 'packCurio')).toMatchObject({ kind: 'drawer' });
  });
});

describe('прогноз «Окремо» і цифровий щит', () => {
  test('щит гасить мінус репутації в сумі окремих відповідей (як у answer), без балів - ні', () => {
    const tg = withPack('pack_06');
    const withShield = packForecast(tg, eco({ prestigePoints: 5 }), cfg, 1).find((f) => f.kind === 'formal_reply')!;
    const noShield = packForecast(tg, eco({ prestigePoints: 0 }), cfg, 1).find((f) => f.kind === 'formal_reply')!;
    expect(withShield.separate.rep).toBeGreaterThan(noShield.separate.rep);
    // фактичні окремі відповіді збігаються з прогнозом
    let state = tg;
    let e = eco({ prestigePoints: 5 });
    for (const item of tg.inbox) {
      const r = ok(answer(state, e, item.uid, 'formal_reply', ctx));
      state = r.tg;
      e = r.eco;
    }
    expect(state.reputation.value - tg.reputation.value).toBe(withShield.separate.rep);
  });
});

describe('окремі відповіді (ВП-7, рішення 100)', () => {
  const answerAll = (tg: TelegramState, kinds: ('diligent' | 'formal_reply' | 'drawer')[]) => {
    let e = eco();
    let state = tg;
    let last: ReturnType<typeof resolvedSeparately> = null;
    packDef('pack_01')!.telegrams.forEach((_id, i) => {
      const item = state.inbox[i]!;
      const r = ok(answer(state, e, item.uid, kinds[i]!, ctx));
      state = r.tg;
      e = r.eco;
      last = resolvedSeparately(state, item.uid, NOW);
    });
    return { tg: state, last };
  };

  test('три окремі diligent - закрито сумлінно (summary_beats ок), packResolve separate; різні види - mixed, не сумлінно', () => {
    const a = answerAll(withPack('pack_01'), ['diligent', 'diligent', 'diligent']);
    expect(a.last).toMatchObject({ type: 'packResolve', mode: 'separate', isBeats: true, secSinceReceived: 3600 });
    expect(a.last).not.toHaveProperty('choiceKind');
    expect(lastPack(a.tg)).toEqual({ no: 1, closed: true, diligent: true });
    const b = answerAll(withPack('pack_01'), ['diligent', 'formal_reply', 'diligent']);
    expect(b.last).toMatchObject({ mode: 'mixed', isBeats: false });
    expect(lastPack(b.tg)).toEqual({ no: 1, closed: true, diligent: false });
  });

  test('не закрито - lastPack.closed = false; зведена formal_reply не сумлінна', () => {
    expect(lastPack(withPack('pack_01'))).toEqual({ no: 1, closed: false, diligent: false });
    const r = ok(answerPack(withPack('pack_01'), eco(), 1, 'formal_reply', ctx));
    expect(lastPack(r.tg)).toEqual({ no: 1, closed: true, diligent: false });
    const d = ok(answerPack(withPack('pack_01'), eco(), 1, 'diligent', ctx));
    expect(lastPack(d.tg)).toEqual({ no: 1, closed: true, diligent: true });
    expect(lastPack(tgWith([]))).toBeNull();
  });
});

describe('Р4: зведена «сумлінно» і ЗпЗ (012 AC-18, FR-8)', () => {
  test('пачка Р3 у вхідних на Р4 зводиться; «Зведення б\'ється» піднімає потік «Зведення» і rate_ЗпЗ разом з ним', () => {
    const it = itemsFor({ ...eco(), level: 4 }, cfg);
    const e4 = eco({ level: 4, streamLevels: it.streams.map((u) => (u.share ? 8 : 20)), stageLevels: it.stages.map(() => 20), prestigePoints: 5 });
    const before = zpzInfo(e4, cfg, NOW, []);
    const r = ok(answerPack(withPack('pack_01'), e4, 1, 'diligent', ctx));
    const beats = r.effects.filter((x) => x.source === 'pack_beats');
    expect(beats).toHaveLength(1);
    expect(beats[0]).toMatchObject({ target: { type: 'stream', id: 'zvedennia' }, value: p.pack.summaryBuff });
    const after = zpzInfo(r.eco, cfg, NOW, r.effects as never);
    expect(after.rate).toBeGreaterThan(before.rate);
  });
});
