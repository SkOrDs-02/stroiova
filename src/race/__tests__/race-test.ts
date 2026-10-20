// 005: розклад подарунків, маршрут, таймери, фінал, прискорення, № 20 (AC-1, 2, 4–7, 12, 14–16, 19).
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import type { DomainEvent, EconomyState } from '@/economy/game/types';

import { digitalSpeedup, fromTelegram, newRace, resume, routeFor, shiftRace, tick, view } from '../race';
import { giftTime } from '../schedule';
import type { RaceState } from '../types';

const cfg = bundledConfig;
const p = cfg.params;
const MIN = 60_000;
const HOUR = 3_600_000;
const D0 = Date.UTC(2025, 9, 10);
const at = (h: number, m = 0, day = 0) => D0 + day * 24 * HOUR + h * HOUR + m * MIN;
const TZ = 0;

function eco(patch: Partial<EconomyState> = {}): EconomyState {
  // «Акти на майно» відкрито
  return { ...newGame(cfg, at(0)), streamLevels: [10, 1, 0, 0], ...patch };
}
const ctx = (fromMs: number, nowMs: number, offline = false) => ({ fromMs, nowMs, tzOffsetMin: TZ, installMs: at(15), offline });
const types = (evs: DomainEvent[]) => evs.map((e) => e.type);

/** Дрон прийшов о 08:00 другої доби */
function droneStarted(e = eco()) {
  return tick(newRace('x'), e, cfg, ctx(at(15), at(8, 0, 1)));
}

describe('розклад подарунків (FR-1…FR-3, рішення 30)', () => {
  test('AC-19: встановлення о 15:00 — у першу добу подарунка немає, на другу о 08:00 дрон', () => {
    expect(tick(newRace('x'), eco(), cfg, ctx(at(15), at(23, 59))).s.active).toBeNull();
    const r = droneStarted();
    expect(r.s.active).toMatchObject({ type: 'drone', startMs: at(8, 0, 1), id: 'race_0001' });
    expect(types(r.events)).toEqual(['raceStart']);
  });

  test('AC-1: Акти закрито або гонка йде — подарунка немає', () => {
    expect(tick(newRace('x'), eco({ streamLevels: [10, 0, 0, 0] }), cfg, ctx(at(15), at(12, 0, 1))).s.active).toBeNull();
    const s = droneStarted().s;
    expect(giftTime(s, p, at(9, 0, 1), at(12, 0, 2), TZ, at(15), true)).toBeNull();
  });

  test('AC-19: гонка скінчилась о 21:00 — наступний не раніше 17:00 наступної доби; на 22:30 — о 08:00', () => {
    const base: RaceState = { ...newRace('x'), giftIdx: 1, lastGiftDayKey: '2025-10-11', lastRaceEndMs: at(21, 0, 1) };
    expect(giftTime(base, p, at(21, 0, 1), at(23, 0, 3), TZ, at(15), true)).toBe(at(17, 0, 2));
    const late = { ...base, lastRaceEndMs: at(2, 30, 2) }; // + 20 год = 22:30
    expect(giftTime(late, p, at(3, 0, 2), at(23, 0, 3), TZ, at(15), true)).toBe(at(8, 0, 3));
  });

  test('AC-19: порядок дрон, лопати, дрон, генератор, далі знову дрон', () => {
    let s = newRace('x');
    const order: string[] = [];
    let now = at(15);
    for (let k = 0; k < 5; k++) {
      // кожна гонка відбувається без гравця, доки не прийде наступний подарунок
      const r = tick(s, eco(), cfg, ctx(now, now + 4 * 24 * HOUR, true));
      s = r.s;
      for (const e of r.events) if (e.type === 'raceStart') order.push(e.giftType);
      now += 4 * 24 * HOUR;
    }
    expect(order.slice(0, 5)).toEqual(['drone', 'shovel', 'drone', 'generator', 'drone']);
  });

  test('папір від подарунка в мить приходу (рішення 10)', () => {
    const e = eco();
    expect(droneStarted(e).eco.paper).toBe(e.paper + p.paperGift);
  });
});

describe('маршрут і таймери (FR-7…FR-12)', () => {
  test('AC-4: Р1 — 4 кроки, разом 7 год 30 хв; Р2 — 5 кроків з Казначейством, 9 год 30 хв', () => {
    const r1 = routeFor('drone', 1, cfg);
    expect(r1.map((x) => x.unit)).toEqual(['akty', 'kombat', 'stroy', 'fin']);
    expect(r1.reduce((a, x) => a + x.sec, 0)).toBe(7.5 * 3600);
    const r2 = routeFor('drone', 2, cfg);
    expect(r2.map((x) => x.unit)).toEqual(['akty', 'kombat', 'stroy', 'fin', 'kazna']);
    expect(r2.reduce((a, x) => a + x.sec, 0)).toBe(9.5 * 3600);
    // 011 (ВП-8, рішення 94): Р3 додає крок «Нарада» тієї самої тривалості, що Казначейство
    const r3 = routeFor('drone', 3, cfg);
    expect(r3.map((x) => x.unit)).toEqual(['akty', 'kombat', 'stroy', 'fin', 'kazna', 'narada']);
    expect(r3.at(-1)!.sec).toBe(Math.round(p.giftL2StepH * 3600));
    expect(r3.reduce((a, x) => a + x.sec, 0)).toBe(11.5 * 3600);
    // 012 (ВП-7): Р4 додає крок «Доповідь» тієї самої тривалості
    const r4 = routeFor('drone', 4, cfg);
    expect(r4.map((x) => x.unit)).toEqual(['akty', 'kombat', 'stroy', 'fin', 'kazna', 'narada', 'dopovid']);
    expect(r4.at(-1)!.sec).toBe(Math.round(p.giftL2StepH * 3600));
    expect(r4.reduce((a, x) => a + x.sec, 0)).toBe(13.5 * 3600);
    expect(routeFor('shovel', 1, cfg).reduce((a, x) => a + x.sec, 0)).toBe((6 * 60 + 40) * 60);
    expect(routeFor('generator', 1, cfg).reduce((a, x) => a + x.sec, 0)).toBe((11 * 60 + 20) * 60);
  });

  test('AC-2: старт — служба 9 год, акт 7 год 30 хв, встигає; через 10 хв обидва таймери менші на 10 хв', () => {
    const r = droneStarted();
    expect(r.events[0]).toMatchObject({ type: 'raceStart', giftType: 'drone', docSec: 27000, resourceSec: 32400, winnable: true });
    const a = view(r.s.active!, at(8, 0, 1));
    const b = view(r.s.active!, at(8, 10, 1));
    expect(a.svcLeftMs - b.svcLeftMs).toBe(10 * MIN);
    expect(a.actLeftMs - b.actLeftMs).toBe(10 * MIN);
    expect(b.late).toBe(false);
    expect(b.stepIdx).toBe(0);
  });

  test('AC-5: маршрут зафіксовано на старті — перехід на Р2 його не змінює', () => {
    const s = droneStarted().s;
    const t = tick(s, eco({ level: 2 }), cfg, ctx(at(8, 0, 1), at(9, 0, 1)));
    expect(t.s.active!.steps).toHaveLength(4);
  });

  test('AC-6: залишок акта йде й без гравця; поточний крок рухається маршрутом', () => {
    const s = droneStarted().s;
    const v = view(s.active!, at(11, 0, 1));
    expect(v.actLeftMs).toBe(4.5 * HOUR);
    expect(v.stepIdx).toBe(1); // 1 год 30 хв Актів пройдено, 1 год 50 хв Комбата ще ні
  });

  test('AC-7: залишок акта більший за ресурс — «не встигаєш» і нестача', () => {
    const s = droneStarted(eco({ level: 2 })).s; // 9 год 30 хв акта проти 9 год служби
    const v = view(s.active!, at(8, 0, 1));
    expect(v.late).toBe(true);
    expect(v.marginMs).toBe(-30 * MIN);
  });
});

describe('прискорення й № 20 (FR-16, FR-18)', () => {
  test('AC-12: P_total 0 — недоступно; P_total 38 — −2 год, раз за гонку, бали ті самі', () => {
    const s = droneStarted().s;
    expect(digitalSpeedup(s, at(9, 0, 1), 0, cfg)).toEqual({ error: 'no_points' });
    const r = digitalSpeedup(s, at(9, 0, 1), 38, cfg);
    if ('error' in r) throw new Error(r.error);
    expect(view(r.s.active!, at(9, 0, 1)).actLeftMs).toBe(4.5 * HOUR);
    expect(r.events).toEqual([{ type: 'raceSpeedup', id: 'race_0001', method: 'digital_bonus', secSaved: 7200 }]);
    expect(digitalSpeedup(r.s, at(9, 1, 1), 38, cfg)).toEqual({ error: 'used' });
  });

  test('залишок менший за 2 год — акт проходить маршрут одразу', () => {
    const s = droneStarted().s;
    const r = digitalSpeedup(s, at(14, 30, 1), 5, cfg);
    if ('error' in r) throw new Error(r.error);
    expect(view(r.s.active!, at(14, 30, 1)).actLeftMs).toBe(0);
  });

  test('AC-14: № 20 «сумлінно» — акт +4 год; «у шухляду» — акт стоїть, ресурс іде', () => {
    const s = droneStarted().s;
    const plus = fromTelegram(s, { docHours: 4 }, at(9, 0, 1));
    expect(view(plus.active!, at(9, 0, 1)).actLeftMs).toBe(10.5 * HOUR);
    const paused = fromTelegram(s, { pauseDoc: true }, at(9, 0, 1));
    const v = view(paused.active!, at(11, 0, 1));
    expect(v.actLeftMs).toBe(6.5 * HOUR);
    expect(v.svcLeftMs).toBe(6 * HOUR);
    const back = resume(paused, at(11, 0, 1));
    expect(view(back.active!, at(11, 0, 1)).actLeftMs).toBe(6.5 * HOUR);
  });
});

describe('фінал (FR-20…FR-24, FR-26)', () => {
  test('AC-15: дрон пройшов маршрут — ×2 на залишок служби, boostActivate drone_x2', () => {
    const s = droneStarted().s;
    const r = tick(s, eco(), cfg, ctx(at(8, 0, 1), at(16, 0, 1)));
    expect(r.s.last).toMatchObject({ won: true, endMs: at(15, 30, 1), marginSec: 5400, offline: false });
    expect(r.effects).toEqual([{ kind: 'mult', source: 'gift_drone', value: 2, startMs: at(15, 30, 1), endMs: at(17, 0, 1) }]);
    expect(r.events).toEqual([
      { type: 'raceFinish', id: 'race_0001', giftType: expect.any(String), result: 'success', marginSec: 5400, speedups: 0, offline: false, level: 1 },
      { type: 'boostActivate', boostType: 'drone_x2', mult: 2, durationSec: 5400 },
    ]);
  });

  test('генератор встиг — тримає пальне (gift_generator) на решту служби', () => {
    // генератор: 11 год 20 хв акта проти 10 год служби — без прискорення не встигає; з цифрою (−2 год) встигає
    const s: RaceState = { ...newRace('x'), giftIdx: 3 };
    const st = tick(s, eco(), cfg, ctx(at(15), at(8, 0, 1))).s;
    expect(st.active!.type).toBe('generator');
    const sp = digitalSpeedup(st, at(8, 0, 1), 1, cfg);
    if ('error' in sp) throw new Error(sp.error);
    const r = tick(sp.s, eco(), cfg, ctx(at(8, 0, 1), at(20, 0, 1)));
    expect(r.s.last!.won).toBe(true);
    expect(r.effects[0]).toMatchObject({ kind: 'mult', source: 'gift_generator', value: p.fuelBonus });
  });

  test('AC-16: ресурс скінчився раніше — поразка, курйоз, без штрафу', () => {
    const e = eco({ level: 2 });
    const st = droneStarted(e);
    const r = tick(st.s, st.eco, cfg, ctx(at(8, 0, 1), at(18, 0, 1), true));
    expect(r.s.last).toMatchObject({ won: false, endMs: at(17, 0, 1), marginSec: 1800, stepsDone: 4, stepsTotal: 5, offline: true });
    expect(r.effects).toEqual([]);
    expect(types(r.events)).toEqual(['raceFinish', 'raceCurio']);
    expect(r.eco).toEqual(st.eco);
  });

  test('№ 20 у шухляді до кінця служби — поразка звичайним порядком', () => {
    const s = fromTelegram(droneStarted().s, { pauseDoc: true }, at(9, 0, 1));
    const r = tick(s, eco(), cfg, ctx(at(9, 0, 1), at(18, 0, 1)));
    expect(r.s.last!.won).toBe(false);
  });

  test('годинник назад: залишки ті самі', () => {
    const s = droneStarted().s;
    const sh = shiftRace(s, -HOUR);
    expect(view(sh.active!, at(9, 0, 1) - HOUR)).toEqual(view(s.active!, at(9, 0, 1)));
  });
});
