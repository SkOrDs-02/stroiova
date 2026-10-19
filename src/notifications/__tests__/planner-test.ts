// 010: планувальник сповіщень - ліміт 2 на добу й пріоритети (AC-1), № 8 раз на добу (AC-2), категорії (AC-4),
// тихі години (рішення 86), повернення в гру (AC-3), доба за часом пристрою.
import { newInspections } from '@/inspections/lifecycle';
import type { Inspection } from '@/inspections/types';
import { newRace } from '@/race/race';
import { cfg, eco, HOUR, tgWith } from '@/telegrams/test-utils';

import { CATALOG, def } from '../catalog';
import { newNotifications, newSettings, plan, settle, type PlanInput } from '../planner';
import type { NotificationsState } from '../types';

const D = (h: number, m = 0, day = 10) => Date.UTC(2026, 9, day, h, m);

function input(patch: Partial<PlanInput> = {}): PlanInput {
  return {
    cfg,
    eco: { ...eco(), streamLevels: [40, 0, 0, 0], streamClerks: [true, false, false, false], stageClerks: [true, true, true], fuelEndMs: null },
    effects: [],
    telegrams: { ...tgWith([]), startMs: D(0), day: { key: '2026-10-10', slots: [], used: 0 } },
    inspections: newInspections(D(0), 'x'),
    race: newRace('x'),
    settings: { ...newSettings(), pushPermission: 'granted' },
    notifications: newNotifications(),
    tzOffsetMin: 0,
    installMs: D(0, 0, 9),
    ...patch,
  };
}

const insp = (arrMs: number, done = false): Inspection => ({
  id: 'insp_0002',
  no: 2,
  trigger: 'scheduled',
  boss: 'brigade_commission',
  level: 1,
  annMs: arrMs - 3 * HOUR,
  arrMs,
  items: [{ id: 'a', price: 1, done }],
  reason: null,
  remark: false,
  warned: true,
  modal: false,
});

describe('каталог (FR-2)', () => {
  test('10 типів із категорією, пріоритетом і ціллю', () => {
    expect(CATALOG).toHaveLength(10);
    expect(def('inspection').priority).toBe(0);
    expect(def('storage_full').priority).toBeGreaterThan(def('race_won').priority);
    expect(def('boost_end').category).toBe('boosts');
    expect(def('fuel_bonus_end').category).toBe('storage');
  });
});

describe('планувальник (FR-3…FR-6)', () => {
  const now = D(9);

  test('AC-1: на одну дату № 2 о 10:00, № 3 о 14:00, № 1 о 17:00 - заплановано лише № 3 і № 1', () => {
    const inp = input({
      telegrams: { ...tgWith([]), startMs: D(0), day: { key: '2026-10-10', slots: [D(10)], used: 0 } },
      inspections: { ...newInspections(D(0), 'x'), active: insp(D(16)) },
    });
    const r = plan(inp, now);
    expect(r.map((c) => [c.type, c.atMs])).toEqual([['inspection', D(14)], ['storage_full', D(17)]]);
  });

  test('рівний пріоритет - лишається раніший за часом', () => {
    const inp = input({
      telegrams: { ...tgWith([]), startMs: D(0), day: { key: '2026-10-10', slots: [D(10), D(11), D(12)], used: 0 } },
      eco: { ...input().eco, streamClerks: [false, false, false, false] },
    });
    // склад не заповниться (немає діловодів), телеграми 3 - лишаються перші дві
    expect(plan(inp, now).map((c) => c.atMs)).toEqual([D(10)]);
  });

  test('AC-2: № 8 уже було о 09:00 цієї доби - удруге не планується', () => {
    const base = input({ eco: { ...input().eco, fuelEndMs: D(9) + 11 * HOUR, fuelCapacityMs: 6 * HOUR } });
    // поріг бонусу: fuelEnd − 20% бака = 20:00 + ..., перевіряємо через notifications.sent
    const first = plan(base, D(9));
    expect(first.some((c) => c.type === 'fuel_bonus_end')).toBe(true);
    const at = first.find((c) => c.type === 'fuel_bonus_end')!.atMs;
    const sent: NotificationsState = { planned: [], sent: { day: '2026-10-10', count: 1, fuel: 1 } };
    expect(plan({ ...base, notifications: sent }, D(9, 1)).some((c) => c.type === 'fuel_bonus_end' && c.atMs === at)).toBe(false);
  });

  test('AC-4: «Бусти й комбат» вимкнено за замовчуванням - № 7 не планується; ввімкнено - планується', () => {
    const boost = [{ kind: 'mult' as const, source: 'ad_boost' as const, value: 2, startMs: D(8), endMs: D(13) }];
    const off = plan(input({ effects: boost }), now);
    expect(off.some((c) => c.type === 'boost_end')).toBe(false);
    const s = newSettings();
    const on = plan(input({ effects: boost, settings: { ...s, pushPermission: 'granted', notif: { ...s.notif, boosts: true } } }), now);
    expect(on.some((c) => c.type === 'boost_end' && c.atMs === D(13))).toBe(true);
  });

  test('без дозволу ОС або з not_asked/denied нічого не планується; № 1 - лише коли офлайн-дохід > 0', () => {
    expect(plan(input({ settings: { ...newSettings(), pushPermission: 'denied' } }), now)).toEqual([]);
    expect(plan(input({ settings: { ...newSettings() } }), now)).toEqual([]);
    const noClerks = input({ eco: { ...input().eco, streamClerks: [false, false, false, false], stageClerks: [false, false, false] } });
    expect(plan(noClerks, now).some((c) => c.type === 'storage_full')).toBe(false);
  });

  test('№ 1 тримає сховище з бонусом журналу № 2 і розширеним сховищем', () => {
    const wide = input({ eco: { ...input().eco, storageHours: 24, museum: { unit: {}, storage: 1.05, paper: 1 } } });
    const t = plan(wide, now).find((c) => c.type === 'storage_full')!;
    // 24 год × 1,05 = 25,2 год → потрапляє на тихі години → 08:00
    expect(t.atMs).toBeGreaterThan(now + 24 * HOUR);
  });

  test('тихі години 22:00-08:00: № 1 переноситься на 08:00, № 3 не надсилається', () => {
    const q = input({ inspections: { ...newInspections(D(0), 'x'), active: insp(D(23, 30)) } });
    // № 3 о 21:30 - не в тихі години; приїзд о 23:30 → № 3 о 21:30 лишається
    expect(plan(q, now).some((c) => c.type === 'inspection' && c.atMs === D(21, 30))).toBe(true);
    // приїзд о 01:00 → № 3 о 23:00 - тиха година: відкинуто
    const late = input({ inspections: { ...newInspections(D(0), 'x'), active: insp(D(25)) } });
    expect(plan(late, now).some((c) => c.type === 'inspection')).toBe(false);
    // склад о 03:00 → 08:00 того ж дня
    const night = plan(input(), D(19));
    expect(night.find((c) => c.type === 'storage_full')!.atMs).toBe(D(8, 0, 11));
  });

  test('№ 3 не планується, якщо час уже минув', () => {
    const inp = input({ inspections: { ...newInspections(D(0), 'x'), active: insp(D(10)) } });
    expect(plan(inp, now).some((c) => c.type === 'inspection')).toBe(false);
  });

  test('гонка: акт встигає - № 6 о кінці акта; не встигає - № 5 за 2 год до кінця ресурсу з місцем акта', () => {
    const race = (actEndMs: number) => ({
      ...newRace('x'),
      active: { id: 'race_0001', no: 1, type: 'drone' as const, level: 1, startMs: D(8), svcEndMs: D(17), steps: [{ unit: 'akty' as const, sec: 3600 }, { unit: 'fin' as const, sec: 3600 }], actTotalSec: 7200, actEndMs, pausedAtMs: null, digUsed: false, sped: [], seen: true },
    });
    expect(plan(input({ race: race(D(12)) }), now).find((c) => c.type === 'race_won')?.atMs).toBe(D(12));
    const lost = plan(input({ race: race(D(18)) }), now).find((c) => c.type === 'race_reminder');
    expect(lost?.atMs).toBe(D(15));
    expect(lost?.place).toBeTruthy();
  });

  test('акт закінчується в останні 2 год таймера: йдуть і № 5 (акт ще на конвеєрі), і № 6', () => {
    const r = {
      ...newRace('x'),
      active: { id: 'race_0001', no: 1, type: 'drone' as const, level: 1, startMs: D(8), svcEndMs: D(17), steps: [{ unit: 'akty' as const, sec: 3600 }, { unit: 'fin' as const, sec: 3600 }], actTotalSec: 7200, actEndMs: D(16), pausedAtMs: null, digUsed: false, sped: [], seen: true },
    };
    const types = plan(input({ race: r }), now).map((c) => c.type);
    expect(types).toEqual(expect.arrayContaining(['race_reminder', 'race_won']));
  });

  test('№ 4 і № 6 у тихі години не надсилаються (текст має строк «ще 2 години», «поки служить»), а не переносяться на 08:00', () => {
    const race = {
      ...newRace('x'),
      active: { id: 'race_0001', no: 1, type: 'drone' as const, level: 1, startMs: D(8), svcEndMs: D(30), steps: [{ unit: 'akty' as const, sec: 3600 }], actTotalSec: 3600, actEndMs: D(23), pausedAtMs: null, digUsed: false, sped: [], seen: true },
    };
    const night = plan(input({ race, inspections: { ...newInspections(D(0), 'x'), active: insp(D(23, 30), true) } }), now);
    expect(night.some((c) => c.type === 'race_won' || c.type === 'inspection_passed')).toBe(false);
  });

  test('переведений часовий пояс: ліміт доби рахується за локальною датою', () => {
    // UTC+3: 22:30 UTC = 01:30 наступної місцевої доби (тихі години → 08:00 місцевої = 05:00 UTC)
    const inp = input({ tzOffsetMin: 180, telegrams: { ...tgWith([]), startMs: D(0), day: { key: '2026-10-10', slots: [D(22, 30)], used: 0 } } });
    const r = plan(inp, now).find((c) => c.type === 'telegram_new')!;
    expect(r.atMs).toBe(D(5, 0, 11));
  });
});

describe('повернення в гру (FR-5, AC-3)', () => {
  test('спрацьовані потрапляють у лічильник доби, решта скасовується', () => {
    const ns: NotificationsState = {
      planned: [
        { type: 'telegram_new', atMs: D(10), title: 't', body: 'b', target: 'tg-detail' },
        { type: 'storage_full', atMs: D(18), title: 't', body: 'b', target: 'offline-return' },
      ],
      sent: { day: '', count: 0, fuel: 0 },
    };
    const back = settle(ns, D(17), 0);
    expect(back.planned).toEqual([]);
    expect(back.sent).toEqual({ day: '2026-10-10', count: 1, fuel: 0 });
    // наступного планування того ж дня лишається місце на одне сповіщення
    const inp = input({ notifications: back, telegrams: { ...tgWith([]), startMs: D(0), day: { key: '2026-10-10', slots: [D(18), D(19)], used: 0 } } });
    expect(plan(inp, D(17)).filter((c) => c.atMs < D(22))).toHaveLength(1);
  });

  test('fuel_bonus_end у лічильнику доби', () => {
    const ns: NotificationsState = { planned: [{ type: 'fuel_bonus_end', atMs: D(9), title: 't', body: 'b', target: 'resource-sheet' }], sent: { day: '', count: 0, fuel: 0 } };
    expect(settle(ns, D(10), 0).sent).toEqual({ day: '2026-10-10', count: 1, fuel: 1 });
  });
});
