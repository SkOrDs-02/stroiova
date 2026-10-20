// Гонка з часом (005): старт, таймери, фінал, «Послатися на цифру», телеграма № 20.
import { giftPaper } from '@/economy/game/actions';
import type { DomainEvent, EconomyConfig, EconomyState, StoredEffect } from '@/economy/game/types';
import { dayKey } from '@/telegrams/clock';
import { seedFrom } from '@/telegrams/rng';

import { giftTime } from './schedule';
import type { GiftType, Race, RaceOutcome, RaceState, RouteUnit } from './types';

const HOUR = 3_600_000;
const ROUTE: RouteUnit[] = ['akty', 'kombat', 'stroy', 'fin'];
/** Технічна межа, не баланс: стільки стартів і фіналів за один tick */
const MAX_PER_TICK = 30;

export function newRace(seedText: string): RaceState {
  return { rng: seedFrom(seedText), giftIdx: 0, lastGiftDayKey: null, lastRaceEndMs: null, active: null, last: null };
}

/** Журнали музею (07): № 6 — усі кроки, № 7 — Фінслужба, № 8 подвоює (FR-17). До 07 усі false. */
export interface Journals {
  j6: boolean;
  j7: boolean;
  j8: boolean;
  /** 016: множник кроку «Казначейство» від № 14 (разом із № 6); 1 без журналу */
  kazna?: number;
  /** 016: множник служби подарунка від № 20; 1 без журналу */
  service?: number;
}
export const NO_JOURNALS: Journals = { j6: false, j7: false, j8: false };

/** Маршрут і кроки на мить старту (FR-7, FR-9, FR-17): години конфігу, округлені до секунди. */
export function routeFor(type: GiftType, level: number, cfg: EconomyConfig, j: Journals = NO_JOURNALS): Race['steps'] {
  const p = cfg.params;
  const m = j.j8 ? 2 : 1;
  const k6 = j.j6 ? 1 - (p.museumRacePct / 100) * m : 1;
  const k7 = j.j7 ? 1 - (p.museumRacePct / 100) * m : 1;
  // Р2 додає крок «Казначейство», Р3 - «Нарада», Р4 - «Доповідь» тієї самої тривалості (011 ВП-8, рішення 94; 012 ВП-7)
  const hours = [...p.gifts[type].steps, ...(level >= 2 ? [p.giftL2StepH] : []), ...(level >= 3 ? [p.giftL2StepH] : []), ...(level >= 4 ? [p.giftL2StepH] : [])];
  const units: RouteUnit[] = [...ROUTE, ...(level >= 2 ? ['kazna' as const] : []), ...(level >= 3 ? ['narada' as const] : []), ...(level >= 4 ? ['dopovid' as const] : [])];
  return hours.map((h, i) => ({ unit: units[i]!, sec: Math.round(h * 3600 * k6 * (units[i] === 'fin' ? k7 : 1) * (units[i] === 'kazna' ? j.kazna ?? 1 : 1)) }));
}

export interface RaceView {
  actLeftMs: number;
  svcLeftMs: number;
  /** Поточний крок маршруту (індекс) */
  stepIdx: number;
  /** Залишок акта більший за залишок служби (FR-11) */
  late: boolean;
  /** svcLeft − actLeft: запас (+) чи нестача (−) */
  marginMs: number;
  paused: boolean;
}

export function view(r: Race, nowMs: number): RaceView {
  const at = r.pausedAtMs ?? nowMs;
  const actLeftMs = Math.max(0, r.actEndMs - at);
  const svcLeftMs = Math.max(0, r.svcEndMs - nowMs);
  // пройдено = загальний час − залишок: прискорення просуває акт маршрутом
  const done = r.actTotalSec * 1000 - actLeftMs;
  let cum = 0;
  let stepIdx = r.steps.length - 1;
  for (let i = 0; i < r.steps.length; i++) {
    cum += r.steps[i]!.sec * 1000;
    if (done < cum) {
      stepIdx = i;
      break;
    }
  }
  return { actLeftMs, svcLeftMs, stepIdx, late: actLeftMs > svcLeftMs, marginMs: svcLeftMs - actLeftMs, paused: r.pausedAtMs != null };
}

function start(s0: RaceState, eco: EconomyState, cfg: EconomyConfig, atMs: number, tz: number, j: Journals): { s: RaceState; eco: EconomyState; events: DomainEvent[] } {
  const p = cfg.params;
  const type = p.giftOrder[s0.giftIdx % p.giftOrder.length]!;
  const steps = routeFor(type, eco.level, cfg, j);
  const total = steps.reduce((a, x) => a + x.sec, 0);
  const no = s0.giftIdx + 1;
  const race: Race = {
    id: `race_${String(no).padStart(4, '0')}`,
    no,
    type,
    level: eco.level,
    startMs: atMs,
    svcEndMs: atMs + p.gifts[type].serviceH * (j.service ?? 1) * HOUR,
    steps,
    actTotalSec: total,
    actEndMs: atMs + total * 1000,
    pausedAtMs: null,
    digUsed: false,
    sped: [],
    seen: false,
  };
  const resourceSec = Math.round(p.gifts[type].serviceH * (j.service ?? 1) * 3600);
  return {
    s: { ...s0, giftIdx: s0.giftIdx + 1, lastGiftDayKey: dayKey(atMs, tz), active: race },
    // рішення 10: папір від подарунка в мить приходу, хоч би який результат
    eco: giftPaper(eco, cfg),
    events: [{ type: 'raceStart', id: race.id, giftType: type, docSec: total, resourceSec, winnable: total <= resourceSec }],
  };
}

function finish(s0: RaceState, cfg: EconomyConfig, offline: boolean): { s: RaceState; effects: StoredEffect[]; events: DomainEvent[] } {
  const r = s0.active!;
  const p = cfg.params;
  const g = p.gifts[r.type];
  // пауза № 20 тримає акт: поки вона триває, акт не може дійти
  const actEnd = r.pausedAtMs != null ? Infinity : r.actEndMs;
  const won = actEnd <= r.svcEndMs; // рівність — теж встиг (FR-20)
  const endMs = won ? actEnd : r.svcEndMs;
  const v = view(r, endMs);
  const effects: StoredEffect[] = [];
  const events: DomainEvent[] = [];
  const speedups = r.sped.filter((x) => x.sec < 0).length;
  const marginSec = Math.round((won ? r.svcEndMs - endMs : v.actLeftMs) / 1000);
  if (won) {
    if (r.svcEndMs > endMs) {
      if (g.fuel) effects.push({ kind: 'mult', source: 'gift_generator', value: p.fuelBonus, startMs: endMs, endMs: r.svcEndMs });
      else effects.push({ kind: 'mult', source: r.type === 'drone' ? 'gift_drone' : 'gift_shovel', value: g.mult, startMs: endMs, endMs: r.svcEndMs });
    }
    const boostType = g.fuel ? 'generator_fuel_hold' : r.type === 'drone' ? 'drone_x2' : 'shovels_x1_5';
    events.push({ type: 'boostActivate', boostType, mult: g.fuel ? p.fuelBonus : g.mult, durationSec: marginSec });
  }
  events.unshift({ type: 'raceFinish', id: r.id, giftType: r.type, result: won ? 'success' : 'fail', marginSec, speedups, offline, level: r.level });
  const last: RaceOutcome = {
    id: r.id,
    no: r.no,
    type: r.type,
    level: r.level,
    won,
    endMs,
    tookSec: Math.round((endMs - r.startMs) / 1000),
    marginSec,
    steps: r.steps,
    stepsDone: won ? r.steps.length : v.stepIdx,
    stepsTotal: r.steps.length,
    speedups,
    offline,
    seen: false,
  };
  // запис курйозу несе дані гонки сам: за один tick може скінчитись кілька гонок, а `last` лишається лише остання
  if (!won) events.push({ type: 'raceCurio', id: r.id, giftType: r.type, raceNo: last.no, level: last.level, steps: last.steps, stepsDone: last.stepsDone, stepsTotal: last.stepsTotal, marginSec, endMs });
  return { s: { ...s0, active: null, last, lastRaceEndMs: endMs }, effects, events };
}

export interface TickCtx {
  fromMs: number;
  nowMs: number;
  tzOffsetMin: number;
  installMs: number;
  offline: boolean;
  journals?: Journals;
}

/** Усе, що настало в (fromMs, nowMs]: фінал активної й прихід нового подарунка (FR-1…FR-4, FR-20, FR-23, FR-26). */
export function tick(s0: RaceState, eco0: EconomyState, cfg: EconomyConfig, ctx: TickCtx): { s: RaceState; eco: EconomyState; effects: StoredEffect[]; events: DomainEvent[] } {
  let s = s0;
  let eco = eco0;
  const effects: StoredEffect[] = [];
  const events: DomainEvent[] = [];
  let from = ctx.fromMs;
  for (let i = 0; i < MAX_PER_TICK; i++) {
    const r = s.active;
    if (r) {
      const end = Math.min(r.pausedAtMs != null ? Infinity : r.actEndMs, r.svcEndMs);
      if (end > ctx.nowMs) break;
      const f = finish(s, cfg, ctx.offline);
      s = f.s;
      effects.push(...f.effects);
      events.push(...f.events);
      from = Math.max(from, end);
      continue;
    }
    // FR-2: подарунок лише з відкритими «Актами на майно»
    const at = giftTime(s, cfg.params, from, ctx.nowMs, ctx.tzOffsetMin, ctx.installMs, (eco.streamLevels[1] ?? 0) > 0);
    if (at == null) break;
    const st = start(s, eco, cfg, at, ctx.tzOffsetMin, ctx.journals ?? NO_JOURNALS);
    s = st.s;
    eco = st.eco;
    events.push(...st.events);
    from = at;
  }
  return { s, eco, effects, events };
}

export type SpeedError = 'no_race' | 'used' | 'no_points' | 'done';

/** «Послатися на цифру» (FR-16, рішення 31): −raceDigitalCutH, раз за гонку, при P_total ≥ 1; бали не витрачаються. */
export function digitalSpeedup(s: RaceState, nowMs: number, prestigePoints: number, cfg: EconomyConfig): { s: RaceState; events: DomainEvent[] } | { error: SpeedError } {
  const r = s.active;
  if (!r) return { error: 'no_race' };
  if (r.digUsed) return { error: 'used' };
  if (prestigePoints < 1) return { error: 'no_points' };
  const at = r.pausedAtMs ?? nowMs;
  if (r.actEndMs <= at) return { error: 'done' };
  const actEndMs = Math.max(at, r.actEndMs - cfg.params.raceDigitalCutH * HOUR);
  const saved = r.actEndMs - actEndMs;
  return {
    s: { ...s, active: { ...r, actEndMs, digUsed: true, sped: [...r.sped, { method: 'digital_bonus', sec: -Math.round(saved / 1000) }] } },
    events: [{ type: 'raceSpeedup', id: r.id, method: 'digital_bonus', secSaved: Math.round(saved / 1000) }],
  };
}

/** Ролик (чи «Забрати» з «Без реклами») у гонці (008 FR-5): −raceAdCut залишку часу акта; ліміт на добу веде монетизація. */
export function adSpeedup(s: RaceState, nowMs: number, cfg: EconomyConfig, method: 'ad' | 'no_ads_pass' = 'ad'): { s: RaceState; events: DomainEvent[] } | { error: SpeedError } {
  const r = s.active;
  if (!r) return { error: 'no_race' };
  const at = r.pausedAtMs ?? nowMs;
  if (r.actEndMs <= at) return { error: 'done' };
  const actEndMs = at + Math.round((r.actEndMs - at) * (1 - cfg.params.raceAdCut));
  const saved = r.actEndMs - actEndMs;
  return {
    s: { ...s, active: { ...r, actEndMs, sped: [...r.sped, { method: 'ad', sec: -Math.round(saved / 1000) }] } },
    events: [{ type: 'raceSpeedup', id: r.id, method, secSaved: Math.round(saved / 1000) }],
  };
}

/** Телеграма № 20 (FR-18): docHours — акт довший; pauseDoc — акт стоїть, поки вона в шухляді. */
export function fromTelegram(s: RaceState, effect: Record<string, unknown>, nowMs: number, receivedAtMs: number = nowMs): RaceState {
  const r = s.active;
  // № 20 приходить лише під час гонки за дрон; відповідь на телеграму попередньої гонки поточну не змінює
  if (!r || r.type !== 'drone' || receivedAtMs < r.startMs) return s;
  if (typeof effect.docHours === 'number' && effect.docHours > 0) {
    const sec = Math.round(effect.docHours * 3600);
    return { ...s, active: { ...r, actEndMs: r.actEndMs + sec * 1000, actTotalSec: r.actTotalSec + sec, sped: [...r.sped, { method: 'telegram', sec }] } };
  }
  if (effect.pauseDoc === true && r.pausedAtMs == null) return { ...s, active: { ...r, pausedAtMs: nowMs } };
  return s;
}

/** № 20 вийшла з шухляди: акт іде далі, кінець зсувається на тривалість паузи. */
export function resume(s: RaceState, nowMs: number): RaceState {
  const r = s.active;
  if (!r || r.pausedAtMs == null) return s;
  return { ...s, active: { ...r, actEndMs: r.actEndMs + Math.max(0, nowMs - r.pausedAtMs), pausedAtMs: null } };
}

/** Годинник назад (009 FR-14): мітки зсуваються, залишки ті самі. */
export function shiftRace(s: RaceState, rawMs: number): RaceState {
  if (rawMs >= 0) return s;
  const sh = (t: number) => t + rawMs;
  const r = s.active;
  return {
    ...s,
    lastRaceEndMs: s.lastRaceEndMs == null ? null : sh(s.lastRaceEndMs),
    last: s.last && { ...s.last, endMs: sh(s.last.endMs) },
    active: r && { ...r, startMs: sh(r.startMs), svcEndMs: sh(r.svcEndMs), actEndMs: sh(r.actEndMs), pausedAtMs: r.pausedAtMs == null ? null : sh(r.pausedAtMs) },
  };
}
