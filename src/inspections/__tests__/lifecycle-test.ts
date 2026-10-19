// 004: розклад, чекліст, купівля, результат, позапланові (AC-1, 2, 5–8, 10–12, 15, 16, 19–21).
import { bundledConfig } from '@/economy/config';
import { baseIncomePerMin } from '@/economy/game/income';
import { newGame } from '@/economy/game/state';
import type { DomainEvent, EconomyState } from '@/economy/game/types';

import { baseChecklist } from '../checklist';
import { buyItem, fromTelegramEvent, newInspections, onSessionStart, readiness, shiftInspections, shortfall, tick } from '../lifecycle';
import { offlineLines } from '../offline';
import { arrWindow, firstDue, localHour, nextArrival } from '../schedule';
import type { InspectionState } from '../types';

const cfg = bundledConfig;
const p = cfg.params;
const MIN = 60_000;
const HOUR = 3_600_000;
// 2025-10-10 00:00 UTC; зсув зони 0 — місцевий час = UTC
const D0 = Date.UTC(2025, 9, 10);
const at = (h: number, m = 0, day = 0) => D0 + day * 24 * HOUR + h * HOUR + m * MIN;
const TZ = 0;

function eco(patch: Partial<EconomyState> = {}): EconomyState {
  // кілька рівнів, щоб базовий дохід був помітний
  const g = newGame(cfg, at(0));
  return { ...g, streamLevels: [40, 0, 0, 0], stageLevels: [40, 40, 40], ...patch };
}

const ctx = (fromMs: number, nowMs: number, offline = false) => ({ fromMs, nowMs, tzOffsetMin: TZ, offline, reputation: 50, digitizations: 0 });
const types = (evs: DomainEvent[]) => evs.map((e) => e.type);

/** Перша оголошена о 17:00 після встановлення о 09:00 */
function firstAnnounced(e = eco()): InspectionState {
  return onSessionStart(newInspections(at(9), 'seed-a'), e, cfg, at(17), TZ, 50).s;
}

describe('розклад (FR-2…FR-4)', () => {
  test('AC-1: сесія через 5 год — перевірки немає; о 17:00 — перша, попередження 2–3 год, call', () => {
    const s0 = newInspections(at(9), 'seed-a');
    expect(onSessionStart(s0, eco(), cfg, at(14), TZ, 50).s.active).toBeNull();
    const r = onSessionStart(s0, eco(), cfg, at(17), TZ, 50);
    const a = r.s.active!;
    expect(a.id).toBe('insp_0001');
    expect(a.trigger).toBe('scheduled');
    expect(a.boss).toBe('brigade_commission');
    expect(a.modal).toBe(true);
    expect(r.s.callPending).toBe(true);
    expect(a.arrMs - a.annMs).toBeGreaterThanOrEqual(2 * HOUR);
    expect(a.arrMs - a.annMs).toBeLessThanOrEqual(3 * HOUR);
    expect(types(r.events)).toEqual(['inspectionStart']);
    expect(r.events[0]).toMatchObject({ trigger: 'scheduled', no: 1, itemsTotal: 5 });
  });

  test('перша лише у вікні 08–18 (рішення 69)', () => {
    expect(firstDue(at(0), at(7, 59), p, TZ)).toBe(false);
    expect(firstDue(at(0), at(8), p, TZ)).toBe(true);
    expect(firstDue(at(0), at(17, 59), p, TZ)).toBe(true);
    expect(firstDue(at(0), at(18), p, TZ)).toBe(false);
    // зсув зони: 06:00 UTC = 09:00 у Києві влітку
    expect(firstDue(at(0) - 10 * HOUR, at(6), p, 180)).toBe(true);
  });

  test('приїзд лише 10:00–21:00, інакше 10:00 + 0–60 хв (FR-4)', () => {
    const r = () => 0.5;
    expect(arrWindow(at(12), p, TZ, r)).toBe(at(12));
    expect(arrWindow(at(22), p, TZ, r)).toBe(at(10, 30, 1));
    expect(arrWindow(at(3), p, TZ, r)).toBe(at(10, 30));
  });

  test('AC-2: наступна через 24–48 год у вікні, за будь-якої репутації', () => {
    for (let i = 0; i < 40; i++) {
      const v = i / 40;
      const n = nextArrival(at(12), p, TZ, () => v);
      expect(n - at(12)).toBeGreaterThanOrEqual(24 * HOUR);
      expect(n - at(12)).toBeLessThanOrEqual(48 * HOUR + 14 * HOUR);
      const h = localHour(n, TZ);
      expect(h >= 10 && h < 21).toBe(true);
    }
  });
});

describe('чекліст і ціни (FR-12…FR-14)', () => {
  test('AC-7, AC-21: ціна = ⌈хв × базовий дохід⌉, фіксується при оголошенні', () => {
    const e = eco();
    const inc = baseIncomePerMin(e, cfg);
    const s = firstAnnounced(e);
    const borders = s.active!.items.find((i) => i.id === 'paint_borders')!;
    expect(borders.price).toBe(Math.max(50, Math.ceil(19 * inc)));
    // дохід зріс — ціни оголошеної ті самі
    const t = tick(s, { ...e, stageLevels: [80, 80, 80] }, cfg, ctx(at(17), at(17, 30)));
    expect(t.s.active!.items.find((i) => i.id === 'paint_borders')!.price).toBe(borders.price);
  });

  test('Р1 — 5 пунктів, Р2 — 4 (FR-12)', () => {
    expect(baseChecklist(eco(), cfg, 1).map((i) => i.id)).toEqual(['paint_borders', 'lockers_cleanup', 'stove_open', 'font_check', 'journals_stitch']);
    expect(baseChecklist(eco({ level: 2 }), cfg, 2)).toHaveLength(4);
  });

  test('мінімум 50 підписів', () => {
    const items = baseChecklist(eco({ streamLevels: [1, 0, 0, 0], stageLevels: [1, 1, 1] }), cfg, 1);
    expect(Math.min(...items.map((i) => i.price))).toBeGreaterThanOrEqual(50);
  });

  test('AC-8: «бракує 62,9 тис. · ще 30 хв»; без грошей тап нічого не списує; позначку не зняти', () => {
    expect(shortfall({ id: 'journals_stitch', price: 186_900, done: false }, 124_000, 2_100)).toEqual({ lack: 62_900, etaSec: 1798 });
    const s = firstAnnounced();
    const poor = buyItem(s, eco({ signatures: 0 }), 'journals_stitch', at(17, 1));
    expect(poor).toEqual({ error: 'short' });
    const rich = eco({ signatures: 1e12 });
    const r = buyItem(s, rich, 'paint_borders', at(17, 1));
    if ('error' in r) throw new Error(r.error);
    expect(r.eco.signatures).toBe(1e12 - s.active!.items[0]!.price);
    expect(types(r.events)).toEqual(['inspectionItemComplete']);
    expect(buyItem(r.s, r.eco, 'paint_borders', at(17, 2))).toEqual({ error: 'done' });
    expect(readiness(r.s.active!)).toBe(20);
  });
});

function allBought(s: InspectionState): InspectionState {
  return { ...s, active: { ...s.active!, items: s.active!.items.map((i) => ({ ...i, done: true })) } };
}

describe('результат (FR-17…FR-21)', () => {
  test('AC-10: 5 з 5 — пройшли, ×3 на 2 год від приїзду, boostActivate; наступна запланована', () => {
    const s = allBought(firstAnnounced());
    const arr = s.active!.arrMs;
    const r = tick(s, eco(), cfg, ctx(at(17), arr + MIN));
    expect(r.s.last).toMatchObject({ passed: true, remark: false, offline: false });
    expect(r.effects).toEqual([{ kind: 'mult', source: 'inspection_pass', value: 3, startMs: arr, endMs: arr + 2 * HOUR }]);
    expect(types(r.events)).toEqual(['inspectionFinish', 'boostActivate']);
    expect(r.scheduledArrived).toBe(true);
    expect(r.s.nextArrMs! - arr).toBeGreaterThanOrEqual(24 * HOUR);
  });

  test('AC-11: 4 з 5 — провалили, «Стройова частина» ×0,5 на 1 год', () => {
    const s0 = allBought(firstAnnounced());
    const s = { ...s0, active: { ...s0.active!, items: s0.active!.items.map((i, k) => (k === 0 ? { ...i, done: false } : i)) } };
    const arr = s.active!.arrMs;
    const r = tick(s, eco(), cfg, ctx(at(17), arr));
    expect(r.s.last!.passed).toBe(false);
    expect(r.effects).toEqual([{ kind: 'factor', source: 'inspection_fail', value: 0.5, target: { type: 'stage', id: 'stroy' }, startMs: arr, endMs: arr + HOUR }]);
  });

  test('AC-12: прапор № 16 спрацював — пройшли із зауваженням, ×3 є, журналу немає', () => {
    const base = newInspections(at(9), 'seed-a');
    const pend = fromTelegramEvent(base, eco(), cfg, { type: 'inspItem', telegramId: 'tg_0016', item: null, remarkPct: 100 }, at(10), TZ, 50).s;
    expect(pend.pendingRemarkPct).toBe(100);
    const s = allBought(onSessionStart(pend, eco(), cfg, at(17), TZ, 50).s);
    const r = tick(s, eco(), cfg, { ...ctx(at(17), s.active!.arrMs), digitizations: 1 });
    expect(r.s.last).toMatchObject({ passed: true, remark: true });
    expect(r.effects[0]!.source).toBe('inspection_pass');
    expect(types(r.events)).not.toContain('inspectionJournal');
  });

  test('№ 7 — перша без зауважень після першої цифровізації, один раз (FR-20)', () => {
    const s = allBought(firstAnnounced());
    const r = tick(s, eco(), cfg, { ...ctx(at(17), s.active!.arrMs), digitizations: 1 });
    expect(types(r.events)).toContain('inspectionJournal');
    expect(r.s.journalGiven).toBe(true);
  });

  test('AC-15, AC-16: без гравця — рядки довідки; планова дає ×3 ще T', () => {
    const s = allBought(firstAnnounced());
    const arr = s.active!.arrMs;
    const r = tick(s, eco(), cfg, ctx(at(17), arr + HOUR, true));
    expect(r.s.last!.offline).toBe(true);
    expect(offlineLines(r.s.last, p, arr + HOUR)).toEqual([
      { kind: 'passed', remark: false, final: false },
      { kind: 'mult', mult: 3, leftMs: HOUR },
    ]);
    const f = tick(firstAnnounced(), eco(), cfg, ctx(at(17), arr + HOUR, true));
    expect(offlineLines(f.s.last, p, arr + HOUR)).toEqual([{ kind: 'failed', factor: 0.5, hours: 1, final: false, retryH: 24 }]);
  });

  test('довга відсутність: оголошення й приїзди планових проходять по черзі', () => {
    const s = firstAnnounced();
    const r = tick(s, eco(), cfg, ctx(at(17), at(17, 0, 6), true));
    const finished = r.events.filter((e) => e.type === 'inspectionFinish');
    expect(finished.length).toBeGreaterThanOrEqual(3);
    expect(r.events.filter((e) => e.type === 'inspectionStart').length).toBe(finished.length - 1 + (r.s.active ? 1 : 0));
  });

  test('AC-19: стан переживає серіалізацію: пункти, id, приїзд ті самі', () => {
    const s = allBought(firstAnnounced());
    const back = JSON.parse(JSON.stringify(s)) as InspectionState;
    expect(back.active).toEqual(s.active);
  });
});

describe('позапланові (FR-5…FR-7)', () => {
  const unsched = (telegramId: string, extraItem: string | null) => ({ type: 'unscheduledInspection' as const, telegramId, warnSec: p.unscheduledWarnH * 3600, extraItem });

  test('AC-5, AC-20: без активної — позапланова з причиною й пунктом; пройдена без ×3; наступна планова від її приїзду', () => {
    const s0 = { ...newInspections(at(0), 'x'), nextNo: 2, nextArrMs: at(12, 0, 1), nextWarnMin: 150 };
    const r = fromTelegramEvent(s0, eco(), cfg, unsched('tg_0001_sergeants', 'sergeants_count'), at(12), TZ, 40);
    const a = r.s.active!;
    expect(a).toMatchObject({ trigger: 'unscheduled', reason: { telegramId: 'tg_0001_sergeants' }, modal: true });
    expect(a.items.map((i) => i.id)).toContain('sergeants_count');
    expect(a.arrMs).toBe(at(14));
    expect(r.events[0]).toMatchObject({ type: 'inspectionStart', trigger: 'unscheduled', reputation: 40 });
    const t = tick(allBought(r.s), eco(), cfg, ctx(at(12), at(14)));
    expect(t.effects).toEqual([]);
    expect(types(t.events)).toEqual(['inspectionFinish']);
    expect(t.scheduledArrived).toBe(false);
    expect(t.s.nextArrMs! - at(14)).toBeGreaterThanOrEqual(24 * HOUR);
  });

  test('AC-6: під час активної — другої немає, пункт додається раз', () => {
    const s = firstAnnounced();
    const r = fromTelegramEvent(s, eco(), cfg, unsched('tg_0001_sergeants', 'sergeants_count'), at(17, 30), TZ, 50);
    expect(r.s.active!.id).toBe(s.active!.id);
    expect(r.s.active!.items).toHaveLength(6);
    expect(r.addedItem).toBe('sergeants_count');
    const again = fromTelegramEvent(r.s, eco(), cfg, { type: 'inspItem', telegramId: 'tg_0001_sergeants', item: 'sergeants_count', remarkPct: 0 }, at(17, 31), TZ, 50);
    expect(again.s.active!.items).toHaveLength(6);
    expect(again.addedItem).toBeNull();
  });

  test('пункт іншого рівня не додається (where_journal — Р2)', () => {
    const r = fromTelegramEvent(firstAnnounced(), eco(), cfg, { type: 'inspItem', telegramId: 'tg_0029_rewrite_order', item: 'where_journal', remarkPct: 0 }, at(17, 30), TZ, 50);
    expect(r.s.active!.items).toHaveLength(5);
  });

  test('AC-18: на Р2 — «Комісія командування», 4 пункти; перша на комісії з модалкою', () => {
    const s0 = { ...newInspections(at(0), 'x'), nextNo: 5, bossesSeen: ['brigade_commission' as const], nextArrMs: at(15), nextWarnMin: 150 };
    const r = tick(s0, eco({ level: 2 }), cfg, ctx(at(12), at(12, 30)));
    expect(r.s.active).toMatchObject({ boss: 'command_commission', modal: true, level: 2 });
    expect(r.s.active!.items).toHaveLength(4);
    // друга на тій самій комісії — без модалки (FR-9)
    const r2 = tick({ ...s0, bossesSeen: ['brigade_commission', 'command_commission'] }, eco({ level: 2 }), cfg, ctx(at(12), at(12, 30)));
    expect(r2.s.active!.modal).toBe(false);
  });
});

describe('крайові випадки', () => {
  test('AC-20: позапланова 3 з 5 — провалили, Стройова ×0,5 на 1 год', () => {
    const s0 = { ...newInspections(at(0), 'x'), nextNo: 2 };
    const r = fromTelegramEvent(s0, eco(), cfg, { type: 'unscheduledInspection', telegramId: 'tg_0002_less_paper', warnSec: 7200, extraItem: null }, at(12), TZ, 50);
    const a = r.s.active!;
    const part = { ...r.s, active: { ...a, items: a.items.map((i, k) => ({ ...i, done: k < 3 })) } };
    const t = tick(part, eco(), cfg, ctx(at(12), a.arrMs));
    expect(t.s.last).toMatchObject({ passed: false, trigger: 'unscheduled' });
    expect(t.effects).toEqual([{ kind: 'factor', source: 'inspection_fail', value: 0.5, target: { type: 'stage', id: 'stroy' }, startMs: a.arrMs, endMs: a.arrMs + HOUR }]);
  });

  test('годинник назад (009 FR-14): мітки зсуваються, залишок відліку той самий', () => {
    const s = firstAnnounced();
    const sh = shiftInspections(s, -2 * HOUR);
    expect(sh.active!.arrMs).toBe(s.active!.arrMs - 2 * HOUR);
    expect(sh.active!.annMs).toBe(s.active!.annMs - 2 * HOUR);
    expect(shiftInspections(s, 5000)).toBe(s);
  });

  test('№ 16 двічі до перевірки — шанс не сумується (рішення 66: +20%)', () => {
    const ev = { type: 'inspItem' as const, telegramId: 'tg_0016', item: null, remarkPct: 20 };
    const a = fromTelegramEvent(newInspections(at(0), 'x'), eco(), cfg, ev, at(10), TZ, 50).s;
    expect(fromTelegramEvent(a, eco(), cfg, ev, at(11), TZ, 50).s.pendingRemarkPct).toBe(20);
  });
});
