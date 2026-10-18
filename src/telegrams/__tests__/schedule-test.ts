// 003 AC-1…AC-6, AC-23, AC-25; FR-1…FR-7, FR-31.
import { pick } from '../bag';
import { dayKey } from '../clock';
import { answer } from '../effects';
import { deliverFirst, newTelegrams, planDay, tick } from '../schedule';
import { cfg, DAY, eco, HOUR, p } from '../test-utils';
import type { TelegramState } from '../types';

// 2025-10-10 00:00 UTC, зона UTC: доба 1 починається о 08:00 (крок 7)
const D0 = Date.UTC(2025, 9, 10);
const START = D0 + 8 * HOUR;

function started(seed = 'a'): TelegramState {
  return deliverFirst(newTelegrams(p, seed), START).tg;
}
const ctxFor = (fromMs: number, nowMs: number, extra: Partial<Parameters<typeof tick>[2]> = {}) => ({ cfg, fromMs, nowMs, tzOffsetMin: 0, level: 1, digitizations: 0, raceActive: null, away: false, ...extra });

/** Відповідати на все шухлядою не можна (вона тримає в «Нових» шухляду), тож архівуємо відписками. */
function answerAll(tg: TelegramState, at: number): TelegramState {
  let t = tg;
  for (const x of t.inbox.filter((i) => i.status === 'new' && i.kind === 'telegram')) {
    const r = answer(t, eco({ paper: 999 }), x.uid, 'diligent', { cfg, nowMs: at, dayKey: dayKey(at, 0) });
    if (!('error' in r)) t = r.tg;
  }
  return t;
}

describe('розклад', () => {
  test('AC-1: № 1 — сценарна, доба 1 починається з неї, повторно не приходить', () => {
    const r = deliverFirst(newTelegrams(p, 'a'), START);
    expect(r.events).toEqual([expect.objectContaining({ type: 'telegramReceive', telegramId: 'tg_0001_sergeants', scripted: true })]);
    expect(deliverFirst(r.tg, START + HOUR).item).toBeNull();
  });

  test('AC-2: 3 доби без відповідей — 2–4 на добу у вікні 08–22, інтервал ≥ 2 год, «Нових» ≤ 5', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const days: number[][] = [];
      const rng = (() => { let s = seed.charCodeAt(0); return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); })();
      for (let d = 1; d <= 3; d++) days.push(planDay(p, D0 + d * DAY, D0 + d * DAY, 0, rng));
      for (const slots of days) {
        expect(slots.length).toBeGreaterThanOrEqual(p.slowPerDayMin);
        expect(slots.length).toBeLessThanOrEqual(p.slowPerDayMax);
        for (const s of slots) {
          const h = ((s % DAY) / HOUR);
          expect(h).toBeGreaterThanOrEqual(p.tgFromHour);
          expect(h).toBeLessThan(p.tgToHour);
        }
        for (let i = 1; i < slots.length; i++) expect(slots[i]! - slots[i - 1]!).toBeGreaterThanOrEqual(p.tgMinGapMin * 60_000);
      }
      const r = tick(started(seed), eco(), ctxFor(START, D0 + 3 * DAY + 23 * HOUR));
      expect(r.tg.inbox.filter((x) => x.status === 'new').length).toBeLessThanOrEqual(p.tgMaxNew);
    }
  });

  test('AC-3: гра закрита — кожен слот доставлено зі своєю міткою, по черзі, delivery: while_away', () => {
    const tg = answerAll(started('b'), START + 1000);
    const end = START + 30 * HOUR;
    const r = tick(tg, eco(), ctxFor(START + 1000, end, { away: true }));
    expect(r.delivered.length).toBeGreaterThanOrEqual(2);
    for (const it of r.delivered) expect(it.receivedAt).toBeLessThanOrEqual(end);
    expect(r.events.filter((e) => e.type === 'telegramReceive').every((e) => (e as { delivery: string }).delivery === 'while_away')).toBe(true);
    const times = r.delivered.map((x) => x.receivedAt);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  test('AC-4: Р1, жовтень, без гонки й цифровізацій — № 4, 20, 25, 31–35 не приходять; № 13 знову через 7 діб', () => {
    const banned = ['tg_0004_snow', 'tg_0020_gift_price', 'tg_0025_prize', 'tg_0031_no_duplicates', 'tg_0032_remarks', 'tg_0033_extra_words', 'tg_0034_qr_code', 'tg_0035_capitals'];
    let tg = started('c');
    let t = START;
    const seen: string[] = [];
    for (let d = 0; d < 20; d++) {
      const r = tick(tg, eco(), ctxFor(t, t + DAY));
      seen.push(...r.delivered.map((x) => x.id));
      tg = answerAll(r.tg, t + DAY);
      t += DAY;
    }
    for (const b of banned) expect(seen).not.toContain(b);
    const at13 = tg.inbox.filter((x) => x.id === 'tg_0013_report_reports').map((x) => x.receivedAt);
    for (let i = 1; i < at13.length; i++) expect(at13[i]! - at13[i - 1]!).toBeGreaterThanOrEqual(7 * DAY);
  });

  test('AC-5: черга № 5 — наступні два слоти № 22 і № 17', () => {
    const tg = { ...started('d'), queue: ['tg_0022_excel', 'tg_0017_stamp_print'] };
    const r = tick(answerAll(tg, START + 1), eco(), ctxFor(START + 1, START + 3 * DAY));
    const ids = r.delivered.filter((x) => x.kind === 'telegram').map((x) => x.id);
    expect(ids.slice(0, 2)).toEqual(['tg_0022_excel', 'tg_0017_stamp_print']);
  });

  test('AC-6: Р2 бере неотримані телеграми Р1 і свої', () => {
    const rnd = () => 0.999;
    const got = pick(started('e'), { nowMs: START, level: 2, digitizations: 0, month: 10, raceActive: null, repeatMinDays: 7 }, rnd);
    expect(got).not.toBeNull();
  });

  test('AC-23: усе отримано — повтор архівної з найдавнішою відповіддю, не частіше ніж раз на 7 діб; інакше слот пропущено', () => {
    const now = D0 + 30 * DAY;
    const tg0 = started('f');
    const all = ['tg_0007_briefing', 'tg_0002_less_paper', 'tg_0009_indent'];
    const answered: Record<string, number> = { tg_0007_briefing: now - 9 * DAY, tg_0002_less_paper: now - 8 * DAY, tg_0009_indent: now - 3 * DAY };
    // усі інші телеграми пулу отримані щойно (не підходять для повтору)
    const { poolFor } = jest.requireActual('../content') as typeof import('../content');
    const inbox = poolFor(1).map((t, i) => ({ uid: `${t.id}#${i}`, id: t.id, kind: 'telegram' as const, receivedAt: all.includes(t.id) ? answered[t.id]! : now - DAY, status: 'archive' as const, answeredAt: all.includes(t.id) ? answered[t.id]! : now - DAY }));
    const tg = { ...tg0, inbox };
    const c = { nowMs: now, level: 1, digitizations: 9, month: 7, raceActive: 'drone', repeatMinDays: p.tgRepeatMinDays };
    expect(pick(tg, c, () => 0)).toEqual({ id: 'tg_0007_briefing', fromQueue: false });
    const tg2 = { ...tg, inbox: [...tg.inbox, { uid: 'x', id: 'tg_0007_briefing', kind: 'telegram' as const, receivedAt: now, status: 'archive' as const, answeredAt: now }] };
    expect(pick(tg2, c, () => 0)).toEqual({ id: 'tg_0002_less_paper', fromQueue: false });
    const none = { ...tg, inbox: tg.inbox.map((x) => ({ ...x, answeredAt: now - DAY, receivedAt: now - DAY })) };
    expect(pick(none, c, () => 0)).toBeNull();
  });

  test('AC-25: 30 слотів без повторів; два seed — різний порядок; сценарні не потрапляють', () => {
    const order = (seed: string) => {
      let tg = { ...started(seed) };
      let t = START;
      const ids: string[] = [];
      for (let d = 0; d < 12 && ids.length < 30; d++) {
        const r = tick(tg, eco(), ctxFor(t, t + DAY, { digitizations: 1 }));
        ids.push(...r.delivered.filter((x) => x.kind === 'telegram').map((x) => x.id));
        tg = answerAll(r.tg, t + DAY);
        t += DAY;
      }
      return ids.slice(0, 30);
    };
    const a = order('seed-1');
    const b = order('seed-2');
    expect(new Set(a).size).toBe(a.length);
    expect(a).not.toContain('tg_0001_sergeants');
    expect(a).not.toEqual(b);
    expect(order('seed-1')).toEqual(a);
  });
});

describe('доповнення за рев\'ю', () => {
  test('AC-3: 10 год відсутності, у вікні 2 слоти — 2 телеграми з мітками цих слотів', () => {
    const tg0 = answerAll(started('ac3'), START + 1000);
    const slots = [START + 3 * HOUR, START + 6 * HOUR];
    const tg = { ...tg0, day: { key: dayKey(START, 0), slots, used: 0 } };
    const r = tick(tg, eco(), ctxFor(START + 1000, START + 10 * HOUR, { away: true }));
    expect(r.delivered.map((x) => x.receivedAt)).toEqual(slots);
    expect(r.events.filter((e) => e.type === 'telegramReceive')).toHaveLength(2);
  });

  test('AC-6: Р2 бере неотримані № 7 і № 9 разом із пулом Р2; вхідні Р1 лишаються', () => {
    const tg0 = started('ac6');
    const { poolFor } = jest.requireActual('../content') as typeof import('../content');
    const p2 = poolFor(2).map((t) => t.id);
    expect(p2).toEqual(expect.arrayContaining(['tg_0007_briefing', 'tg_0009_indent', 'tg_0026_kopiyka']));
    const r = tick(tg0, eco(), ctxFor(START, START + 2 * DAY, { level: 2 }));
    expect(r.tg.inbox.find((x) => x.id === 'tg_0001_sergeants')).toBeTruthy();
  });

  test('міграція: startMs = 0 (зріз 001/009) — слоти йдуть з першого tick', () => {
    const tg = { ...newTelegrams(p, 'm'), startMs: 0 };
    const r = tick(tg, eco(), ctxFor(D0, D0 + DAY));
    expect(r.delivered.length).toBeGreaterThanOrEqual(p.slowPerDayMin);
  });
});
