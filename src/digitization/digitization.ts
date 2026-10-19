// Цифровізація (006): бали, доступність, підказка, скидання, перехід на Р2.
import { points as calcPoints, prestigeMult } from '@/economy/core/formulas';
import { nextPurchaseEtaSec } from '@/economy/game/purchase';
import { itemsFor, newCycle } from '@/economy/game/state';
import type { DomainEvent, EconomyConfig, EconomyState, Effect } from '@/economy/game/types';

import type { Ceremony, DigitizationState } from './types';

/** Рівні, які можна пройти в цій збірці: Р3 відкрито 011 (етап 1, рішення 93); Р4-Р5 - 012, 013. На Р3 виходу ще немає. */
export const PLAYABLE_LEVELS = 3;

/** Рівні, де підсумкова вже реалізована: Р2 (011 етап 1) і Р3 (етап 2); збігається з `FINALS` перевірок. Перехід на Р4 дасть 012 */
export const FINAL_LEVELS = [2, 3];

export function newDigitization(nowMs: number): DigitizationState {
  return { counts: {}, total: 0, howSeen: false, ceremony: null, cycleStartMs: nowMs, levelExitAllowed: false };
}

/** Скільки цифровізацій уже зроблено на рівні. */
export function countOn(ds: DigitizationState, level: number): number {
  return ds.counts[String(level)] ?? 0;
}

/** FR-2: P = ⌊(L / D)^0,5⌋, D — дільник поточного рівня. */
export function pointsNow(state: EconomyState, cfg: EconomyConfig): number {
  const D = cfg.params.levels[state.level - 1]!.prestigeDivisor;
  return calcPoints(state.lifetimeCycle, D, cfg.params);
}

export type DigitKind = 'locked' | 'few' | 'available';

export interface DigitStatus {
  kind: DigitKind;
  /** Бали, які дасть цифровізація зараз */
  points: number;
  /** «мало балів»: скільки бракує до мінімуму */
  lack: number;
  /** «замкнено»: id потоків, які ще закриті */
  lockedStreams: string[];
  multBefore: number;
  multAfter: number;
  /** Скільки цифровізацій уже на рівні і чи ця остання на рівні (3-тя на Р1) */
  levelCount: number;
  isLast: boolean;
  /** Підказка «Час цифровізуватися» (FR-9) */
  recommended: boolean;
  /** Секунд до наступної покупки, що піднімає дохід */
  etaSec: number | null;
  /** Журнали, які скасує ця цифровізація */
  journals: number[];
}

/** Журнали, які скасує наступна цифровізація на рівні (FR-19); № 8 додасть музей (007). */
export function journalsFor(cfg: EconomyConfig, level: number, nth: number): number[] {
  return cfg.params.digitJournals[String(level)]?.[String(nth)] ?? [];
}

/**
 * Остання на рівні, тобто з переходом: на рівні без боса (Р1) - `exitDigitizations`-та (06 FR-24); на рівні з босом
 * (Р2) - перша після пройденої підсумкової (011 FR-9). Рівнів без виходу в збірці (Р3) немає.
 */
export function isLastOnLevel(cfg: EconomyConfig, ds: DigitizationState, level: number, nth: number): boolean {
  const L = cfg.params.levels[level - 1];
  if (!L || level >= PLAYABLE_LEVELS || L.exitDigitizations <= 0) return false;
  return L.boss ? ds.levelExitAllowed : nth >= L.exitDigitizations;
}

/**
 * Пора оголошувати підсумкову (011 FR-2): рівень з босом, виконано `exitDigitizations` цифровізацій на рівні, перехід ще не
 * дозволено. Чи відкрито потоки й чи немає активної перевірки - справа перевірок (004).
 */
export function finalDue(cfg: EconomyConfig, ds: DigitizationState, level: number): boolean {
  const L = cfg.params.levels[level - 1];
  if (!L || !L.boss || !FINAL_LEVELS.includes(level) || L.exitDigitizations <= 0) return false;
  return countOn(ds, level) >= L.exitDigitizations && !ds.levelExitAllowed;
}

export function status(state: EconomyState, ds: DigitizationState, cfg: EconomyConfig, nowMs: number, effects: readonly Effect[] = []): DigitStatus {
  const p = cfg.params;
  const it = itemsFor(state, cfg);
  const lockedStreams = it.streams.filter((_, i) => (state.streamLevels[i] ?? 0) <= 0).map((u) => u.id);
  const P = pointsNow(state, cfg);
  const levelCount = countOn(ds, state.level);
  const nth = levelCount + 1;
  const multBefore = prestigeMult(state.prestigePoints, p);
  const multAfter = prestigeMult(state.prestigePoints + P, p);
  const kind: DigitKind = lockedStreams.length > 0 ? 'locked' : P < p.prestigeMinPoints ? 'few' : 'available';
  let recommended = false;
  let etaSec: number | null = null;
  if (kind === 'available') {
    // FR-9: P ≥ max(30; 0,2 · P_total) і наступна покупка не раніше ніж за prestigeStallHours
    etaSec = nextPurchaseEtaSec(state, cfg, nowMs, effects);
    const enough = P >= Math.max(p.prestigeMinPoints, p.prestigeStallShare * state.prestigePoints);
    recommended = enough && (etaSec == null || etaSec >= p.prestigeStallHours * 3600);
  }
  return {
    kind,
    points: P,
    lack: Math.max(0, p.prestigeMinPoints - P),
    lockedStreams,
    multBefore,
    multAfter,
    levelCount,
    isLast: isLastOnLevel(cfg, ds, state.level, nth),
    recommended,
    etaSec,
    journals: journalsFor(cfg, state.level, nth),
  };
}

export type DigitizeError = 'locked' | 'few' | 'busy';

/**
 * Цифровізація (FR-16, FR-17): атомарно. Підписи й L у нуль, «Рапорти» на 1-й рівень, решта потоків закрита, ланки на 1-му,
 * діловодів немає (`newCycle`); бали додаються назавжди; 3-тя на Р1 переводить на Р2. Решта станів лишається (рішення 48).
 * Поки є непоказана церемонія, нова цифровізація не починається (подвійний тап, FR-22).
 */
export function digitize(
  state: EconomyState,
  ds: DigitizationState,
  cfg: EconomyConfig,
  nowMs: number,
  fromHint: boolean,
): { state: EconomyState; ds: DigitizationState; events: DomainEvent[] } | { error: DigitizeError } {
  if (ds.ceremony) return { error: 'busy' };
  const st = status(state, ds, cfg, nowMs);
  if (st.kind === 'locked') return { error: 'locked' };
  if (st.kind === 'few') return { error: 'few' };
  const nth = st.levelCount + 1;
  const level = state.level;
  const lifetime = state.lifetimeCycle;
  const pointsTotal = state.prestigePoints + st.points;
  const up = st.isLast;
  const next: EconomyState = newCycle({ ...state, prestigePoints: pointsTotal, level: up ? level + 1 : level }, cfg);
  const no = ds.total + 1;
  const ceremony: Ceremony = {
    no,
    level,
    levelCount: nth,
    atMs: nowMs,
    lifetime,
    points: st.points,
    pointsTotal,
    multBefore: st.multBefore,
    multAfter: st.multAfter,
    journals: st.journals,
    levelUp: up,
    step: 'result',
  };
  const events: DomainEvent[] = [
    { type: 'digitizationComplete', no, level, points: st.points, pointsTotal, multiplier: st.multAfter, lifetimeLog10: Math.log10(Math.max(1, lifetime)), journalsCancelled: st.journals, fromHint },
  ];
  if (up) events.push({ type: 'levelAdvance', from: level, to: level + 1, digitizationCount: nth, pointsTotal });
  return {
    state: next,
    ds: { ...ds, counts: { ...ds.counts, [String(level)]: nth }, total: no, ceremony, cycleStartMs: nowMs, levelExitAllowed: up ? false : ds.levelExitAllowed },
    events,
  };
}

/** Закрити крок церемонії: акт → наказ про переведення (якщо є) → кінець (FR-21, FR-25). */
export function closeCeremonyStep(ds: DigitizationState): DigitizationState {
  const c = ds.ceremony;
  if (!c) return ds;
  if (c.step === 'result' && c.levelUp) return { ...ds, ceremony: { ...c, step: 'levelUp' } };
  return { ...ds, ceremony: null };
}

/** Годинник назад (009 FR-14): мітка початку циклу зсувається. */
export function shiftDigitization(ds: DigitizationState, rawMs: number): DigitizationState {
  if (rawMs >= 0) return ds;
  return { ...ds, cycleStartMs: ds.cycleStartMs + rawMs, ceremony: ds.ceremony && { ...ds.ceremony, atMs: ds.ceremony.atMs + rawMs } };
}
