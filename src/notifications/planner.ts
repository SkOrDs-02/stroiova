// Планувальник сповіщень (010 FR-2…FR-6): що і коли надіслати, поки гравця немає. Чистий: стан і час приходять аргументами.
import { income, fuelBonusEndMs } from '@/economy/game/income';
import type { EconomyConfig, EconomyState, StoredEffect } from '@/economy/game/types';
import type { InspectionState } from '@/inspections/types';
import { readiness } from '@/inspections/lifecycle';
import { giftTime } from '@/race/schedule';
import type { RaceState } from '@/race/types';
import { dayKey, dayStart, DAY, HOUR, localMs } from '@/telegrams/clock';
import type { TelegramState } from '@/telegrams/types';

import { CATALOG, DAILY_LIMIT, def, DROP_IN_QUIET, FUEL_DAILY_LIMIT, QUIET_FROM_HOUR, QUIET_TO_HOUR } from './catalog';
import type { Candidate, NotificationsState, Settings } from './types';

export function newNotifications(): NotificationsState {
  return { planned: [], sent: { day: '', count: 0, fuel: 0 } };
}

export function newSettings(): Settings {
  return {
    sound: true,
    haptics: true,
    notif: { storage: true, telegrams: true, inspections: true, gifts: true, boosts: false },
    analytics: true,
    pushPermission: 'not_asked',
    testUser: false,
  };
}

export interface PlanInput {
  cfg: EconomyConfig;
  eco: EconomyState;
  effects: readonly StoredEffect[];
  telegrams: TelegramState;
  inspections: InspectionState;
  race: RaceState;
  settings: Settings;
  notifications: NotificationsState;
  tzOffsetMin: number;
  installMs: number;
}

/** Година місцевої доби 0-23 */
function localHourOf(ms: number, tz: number): number {
  return Math.floor((((localMs(ms, tz) % DAY) + DAY) % DAY) / HOUR);
}

const inQuiet = (ms: number, tz: number) => {
  const h = localHourOf(ms, tz);
  return h >= QUIET_FROM_HOUR || h < QUIET_TO_HOUR;
};

/** Найближча 08:00 не раніше ms (місцева) */
function morning(ms: number, tz: number): number {
  const start = dayStart(ms, tz) + QUIET_TO_HOUR * HOUR;
  return start >= ms ? start : start + DAY;
}

/** Кандидати з поточного стану (FR-2): кожен тип дає не більше одного найближчого сповіщення. */
export function candidates(inp: PlanInput, nowMs: number): Candidate[] {
  const { cfg, eco, effects, telegrams, inspections, race, tzOffsetMin: tz } = inp;
  const p = cfg.params;
  const out: Candidate[] = [];
  const add = (type: Candidate['type'], atMs: number, extra: Partial<Candidate> = {}) => {
    if (atMs > nowMs) out.push({ type, atMs, target: def(type).target, ...extra });
  };
  // № 1: склад заповниться, лише коли є що накопичувати
  if (income(eco, cfg, nowMs, effects, { idle: true }).flow.v > 0) add('storage_full', nowMs + eco.storageHours * HOUR * eco.museum.storage);
  // № 2: наступна телеграма за розкладом доби
  const day = telegrams.day;
  if (telegrams.startMs != null && day) {
    const next = day.slots[day.used];
    if (next != null) add('telegram_new', next);
  }
  // № 3, 4: комісія
  const insp = inspections.active;
  if (insp) {
    add('inspection', insp.arrMs - 2 * HOUR, { target: 'insp-prep' });
    if (insp.trigger === 'scheduled' && readiness(insp) >= 100) add('inspection_passed', insp.arrMs);
  }
  // № 5, 6: гонка
  const r = race.active;
  if (r) {
    const paused = r.pausedAtMs != null;
    if (!paused && r.actEndMs <= r.svcEndMs) add('race_won', r.actEndMs, { item: r.type });
    else if (r.actEndMs > r.svcEndMs - 2 * HOUR) add('race_reminder', r.svcEndMs - 2 * HOUR, { ref: r.id, item: r.type, place: placeAt(r, r.svcEndMs - 2 * HOUR) });
  }
  // № 7: кінець буста ×2
  const boostEnd = effects.filter((e) => e.source === 'ad_boost').reduce((m, e) => Math.max(m, e.endMs), -Infinity);
  add('boost_end', boostEnd);
  // № 8: бак опустився до порога
  add('fuel_bonus_end', fuelBonusEndMs(eco, cfg));
  // № 9: комбата знайшли
  const k = telegrams.kombat.active;
  if (k && !k.found) add('kombat_found', k.endMs);
  // № 10: подарунок
  const at = giftTime(race, p, nowMs, nowMs + 3 * DAY, tz, inp.installMs, (eco.streamLevels[1] ?? 0) > 0);
  if (at != null) add('gift_arrived', at, { item: p.giftOrder[race.giftIdx % p.giftOrder.length] });
  return out;
}

/** Де акт на мить t: крок маршруту за пройденим часом (для `{місце}` у № 5) */
function placeAt(r: NonNullable<RaceState['active']>, t: number): string {
  const doneSec = Math.max(0, r.actTotalSec - Math.max(0, r.actEndMs - t) / 1000);
  let cum = 0;
  for (const s of r.steps) {
    cum += s.sec;
    if (doneSec < cum) return s.unit;
  }
  return r.steps[r.steps.length - 1]!.unit;
}

/**
 * План сповіщень на мить виходу з гри (FR-3…FR-6): категорії, тихі години, ліміт доби за пріоритетом.
 * Повертає кандидатів із фінальним часом; текст підставляє сторі.
 */
export function plan(inp: PlanInput, nowMs: number): Candidate[] {
  const { settings, tzOffsetMin: tz, notifications } = inp;
  if (settings.pushPermission !== 'granted' && settings.pushPermission !== 'provisional') return [];
  const adjusted: Candidate[] = [];
  for (const c of candidates(inp, nowMs)) {
    const d = def(c.type);
    if (!settings.notif[d.category]) continue;
    let at = c.atMs;
    if (inQuiet(at, tz)) {
      if (DROP_IN_QUIET.includes(c.type)) continue;
      at = morning(at, tz);
    }
    adjusted.push({ ...c, atMs: at });
  }
  // ліміт за календарну добу часу надсилання: вищі за пріоритетом, за рівного - ранішi
  const byDay = new Map<string, Candidate[]>();
  for (const c of adjusted) {
    const k = dayKey(c.atMs, tz);
    byDay.set(k, [...(byDay.get(k) ?? []), c]);
  }
  const kept: Candidate[] = [];
  for (const [day, list] of byDay) {
    const sent = notifications.sent.day === day ? notifications.sent : { count: 0, fuel: 0 };
    let room = DAILY_LIMIT - sent.count;
    let fuel = FUEL_DAILY_LIMIT - sent.fuel;
    for (const c of list.sort((a, b) => def(a.type).priority - def(b.type).priority || a.atMs - b.atMs)) {
      if (room <= 0) break;
      if (c.type === 'fuel_bonus_end') {
        if (fuel <= 0) continue;
        fuel--;
      }
      kept.push(c);
      room--;
    }
  }
  return kept.sort((a, b) => a.atMs - b.atMs);
}

/** Повернення в гру (FR-5): те, що встигло спрацювати, лягає в лічильник доби; решта скасовується. */
export function settle(ns: NotificationsState, nowMs: number, tz: number): NotificationsState {
  let sent = ns.sent;
  for (const p of ns.planned) {
    if (p.atMs > nowMs) continue;
    const day = dayKey(p.atMs, tz);
    const base = sent.day === day ? sent : { day, count: 0, fuel: 0 };
    sent = { day, count: base.count + 1, fuel: base.fuel + (p.type === 'fuel_bonus_end' ? 1 : 0) };
  }
  return { planned: [], sent };
}

export { CATALOG };
