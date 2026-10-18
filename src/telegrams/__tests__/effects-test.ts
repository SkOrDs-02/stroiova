// 003 AC-7, AC-9, AC-11, AC-12, AC-13, AC-22; FR-9…FR-20 на рівні домену.
import { T0 } from '@/economy/test-fixtures';

import { answer, canChoose, openNotice, telegramOf } from '../effects';
import { tick } from '../schedule';
import { ctx, eco, HOUR, p, cfg, tgWith } from '../test-utils';
import type { TelegramState } from '../types';

const ok = <T,>(r: T | { error: string }): T => {
  if ((r as { error?: string }).error) throw new Error((r as { error: string }).error);
  return r as T;
};
const run = (tg: TelegramState, e: ReturnType<typeof eco>, toMs: number) => tick(tg, e, { cfg, fromMs: T0, nowMs: toMs, tzOffsetMin: 0, level: 1, digitizations: 0, raceActive: null, away: false });

describe('відповідь на телеграму', () => {
  test('AC-7: «сумлінно» на № 1 — Стройова ×0,5 рівно 1 год, «на виконанні», репутація 50 → 60, потім архів', () => {
    const tg0 = tgWith(['tg_0001_sergeants']);
    const r = ok(answer(tg0, eco(), 'tg_0001_sergeants#1', 'diligent', ctx()));
    expect(r.effects).toEqual([{ kind: 'factor', source: 'telegram_slow', value: 0.5, target: { type: 'stage', id: 'stroy' }, startMs: T0, endMs: T0 + HOUR }]);
    expect(r.item).toMatchObject({ status: 'work', workUntil: T0 + HOUR });
    expect(r.tg.reputation.value).toBe(60);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'telegramAnswer', repDelta: 10 }));
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'curio' }));
    const later = run(r.tg, r.eco, T0 + HOUR);
    expect(later.tg.inbox[0]!.status).toBe('archive');
  });

  test('AC-9: відписка до першої планової — шанс 0, без кидка', () => {
    const r = ok(answer(tgWith(['tg_0001_sergeants']), eco(), 'tg_0001_sergeants#1', 'formal_reply', ctx()));
    expect(r.item.result).toMatchObject({ chancePct: 0, inspHit: false, rep: -5 });
    expect(r.item).toMatchObject({ status: 'work', workUntil: T0 + 2 * 60_000 });
  });

  test('AC-8/AC-10 (шанс): після першої планової «норма» № 2 — 20%, «висока» — 10%, «низька» — 30%', () => {
    const base = { firstInspectionPassed: true };
    const at = (rep: number) => ok(answer(tgWith(['tg_0002_less_paper'], { ...base, reputation: { value: rep, history: [] } }), eco(), 'tg_0002_less_paper#1', 'formal_reply', ctx())).item.result!.chancePct;
    expect(at(50)).toBe(20);
    expect(at(80)).toBe(10);
    expect(at(20)).toBe(30);
  });

  test('AC-11: P_total ≥ 1 — відписка зі щитом на № 15 без штрафу й шансу', () => {
    const r = ok(answer(tgWith(['tg_0015_paper_copy'], { firstInspectionPassed: true }), eco({ prestigePoints: 2 }), 'tg_0015_paper_copy#1', 'formal_reply', ctx()));
    expect(r.tg.reputation.value).toBe(50);
    expect(r.item.result).toMatchObject({ chancePct: 0, shield: true });
  });

  test('AC-13: 4 аркуші — варіант на 5 неактивний з «бракує 1»', () => {
    const tg = tgWith(['tg_0002_less_paper']);
    const c = telegramOf(tg.inbox[0]!)!.choices.find((x) => x.id === 'diligent')!;
    expect(canChoose(tg, eco({ paper: 4 }), c)).toEqual({ ok: false, reason: 'paper', n: 1 });
    expect(answer(tg, eco({ paper: 4 }), 'tg_0002_less_paper#1', 'diligent', ctx())).toEqual({ error: 'paper' });
  });

  test('AC-12: шухляда № 16 — через 24 год −5; відповідь із шухляди через 3 год штраф скасовує', () => {
    const r = ok(answer(tgWith(['tg_0016_second_page']), eco(), 'tg_0016_second_page#1', 'drawer', ctx()));
    expect(r.item.status).toBe('drawer');
    expect(run(r.tg, r.eco, T0 + 24 * HOUR).tg.reputation.value).toBe(45);
    const again = ok(answer(r.tg, r.eco, 'tg_0016_second_page#1', 'diligent', ctx(T0 + 3 * HOUR)));
    expect(run(again.tg, again.eco, T0 + 25 * HOUR).tg.reputation.value).toBe(55);
    expect(answer(r.tg, r.eco, 'tg_0016_second_page#1', 'drawer', ctx(T0 + 3 * HOUR))).toEqual({ error: 'digital' });
  });

  test('FR-6: «вписати себе» на № 5 ставить № 22 і № 17 у чергу', () => {
    const r = ok(answer(tgWith(['tg_0005_pc_literacy']), eco(), 'tg_0005_pc_literacy#1', 'diligent', ctx()));
    expect(r.tg.queue).toEqual(['tg_0022_excel', 'tg_0017_stamp_print']);
  });

  test('FR-20: прапорець «флешка» з № 23 додає папір і шанс у № 28', () => {
    const r = ok(answer(tgWith(['tg_0023_reels']), eco(), 'tg_0023_reels#1', 'drawer', ctx()));
    expect(r.tg.flags).toEqual({ flash_unregistered: true });
    const tg28 = { ...r.tg, inbox: [...r.tg.inbox, { uid: 'tg_0028_media#9', id: 'tg_0028_media', kind: 'telegram' as const, receivedAt: T0, status: 'new' as const }] };
    const c = telegramOf(tg28.inbox[1]!)!.choices.find((x) => x.id === 'diligent')!;
    expect(canChoose(tg28, eco({ paper: 9 }), c)).toEqual({ ok: false, reason: 'paper', n: 1 });
  });

  test('FR-20: № 24 відписка — бак повний одразу; шухляда — заправка заблокована 1 год', () => {
    const fill = ok(answer(tgWith(['tg_0024_fuel_order']), eco(), 'tg_0024_fuel_order#1', 'formal_reply', ctx()));
    expect(fill.eco.fuelEndMs).toBe(T0 + fill.eco.fuelCapacityMs);
    const block = ok(answer(tgWith(['tg_0024_fuel_order']), eco(), 'tg_0024_fuel_order#1', 'drawer', ctx()));
    expect(block.tg.refuelBlockedUntil).toBe(T0 + HOUR);
  });

  test('AC-22: notice № 4581 — архів «до відома», журнал музею, запис курйозу', () => {
    const tg = tgWith(['tg_0025b_prize_cancelled'], {}, 'notice');
    const r = openNotice(tg, 'tg_0025b_prize_cancelled#1', T0);
    expect(r.tg.inbox[0]).toMatchObject({ status: 'archive', read: true });
    expect(r.events).toEqual(expect.arrayContaining([{ type: 'journal', id: 'prizes_gifts_book' }, expect.objectContaining({ type: 'curio' })]));
  });

  test('FR-15: позапланових ≤ unscheduledPerDay на добу', () => {
    let tg = tgWith(['tg_0001_sergeants', 'tg_0002_less_paper', 'tg_0007_briefing'], { firstInspectionPassed: true, reputation: { value: 0, history: [] } });
    let hits = 0;
    for (const uid of tg.inbox.map((x) => x.uid)) {
      const r = ok(answer(tg, eco(), uid, 'formal_reply', ctx()));
      tg = r.tg;
      hits += r.events.filter((e) => e.type === 'unscheduledInspection').length;
    }
    expect(hits).toBeLessThanOrEqual(p.unscheduledPerDay);
  });
});
