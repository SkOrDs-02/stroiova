// Нескінченний режим «Дублювати на папері» (013 FR-23…FR-29): стан Дубля, пропозиція нового, масштаб конфігу, рекорд.
// Чистий домен: без годинника й React. Масштаб - той самий, що `dubParams` у balance/sim.js (рішення 111).
import { roller, seedFrom } from '@/telegrams/rng';
import type { EconomyConfig } from '@/economy/game/types';

/** Модифікатори Дубля (FR-27): рівно один на Дубль */
export const MODIFIERS = ['two_copies', 'wet_seal', 'no_did'] as const;
export type DubModifier = (typeof MODIFIERS)[number];

/** Пропозиція «Дублювати на папері»: Дубль `n` з модифікатором, що ще не прийнято */
export interface DubOffer {
  n: number;
  modifier: DubModifier;
  atMs: number;
}

/** Акт «Дубль N закрито» (FR-26): `seen` - акт показано, далі пропозиція наступного */
export interface DubClosed {
  n: number;
  atMs: number;
  cycleMs: number;
  seen: boolean;
}

/** Особистий рекорд (FR-29): найвищий прийнятий Дубль і log₁₀ підписів за весь час. Локально, без мережі */
export interface DubRecord {
  dub: number;
  lifetimeLog10: number;
}

export interface DubState {
  /** Зерно вибору модифікатора: з нього й номера Дубля, детерміновано (ВП-5) */
  seed: number;
  /** Номер поточного Дубля; 0 - Дублів ще не було */
  n: number;
  /** Модифікатор поточного Дубля; null, поки n = 0 */
  modifier: DubModifier | null;
  /** Мить прийняття поточного Дубля */
  startMs: number | null;
  offer: DubOffer | null;
  closed: DubClosed | null;
  /** Підписи завершених циклів (за весь час): живий цикл додається під час читання */
  earned: number;
  record: DubRecord;
}

export function newDub(seedText = 'dub'): DubState {
  return { seed: seedFrom(seedText), n: 0, modifier: null, startMs: null, offer: null, closed: null, earned: 0, record: { dub: 0, lifetimeLog10: 0 } };
}

/**
 * Модифікатор Дубля `n`: випадковий із зерна, не той самий, що в попередньому (ВП-5). Той самий вхід - той самий результат,
 * тож пропозиція не перекидається перезапуском.
 */
export function pickModifier(seed: number, n: number, previous: DubModifier | null): DubModifier {
  const pool = MODIFIERS.filter((m) => m !== previous);
  const r = roller(seedFrom(`${seed}:${n}`));
  return pool[Math.floor(r.next() * pool.length)]!;
}

/** Дубль можна прийняти: пропозиція є (FR-23) */
export function canAccept(d: DubState): boolean {
  return d.offer != null;
}

/** Поява пропозиції наступного Дубля (кінець тижня тиші чи закрито Дубль N). Повторно нічого не змінює */
export function makeOffer(d: DubState, nowMs: number): DubState {
  if (d.offer) return d;
  const n = d.n + 1;
  return { ...d, offer: { n, modifier: pickModifier(d.seed, n, d.modifier), atMs: nowMs } };
}

/** Живий цикл + завершені: log₁₀ підписів за весь час (FR-29), два знаки */
export function lifetimeLog10(d: DubState, cycleSignatures: number): number {
  return Math.round(Math.log10(Math.max(1, d.earned + cycleSignatures)) * 100) / 100;
}

export interface Accepted {
  d: DubState;
  /** Рекорд Дубля побито цим стартом: був рекорд ≥ 1 і Дубль вищий (FR-29, AC-20) */
  record: { value: number; previous: number } | null;
}

/**
 * «Прийняти до виконання» (FR-23, FR-24): Дубль стає поточним, модифікатор з пропозиції. Скидання економіки робить стор;
 * тут - лічильники: цикл, що закінчується, іде в `earned`, рекорд оновлюється.
 */
export function accept(d: DubState, nowMs: number, cycleSignatures: number): Accepted | null {
  const o = d.offer;
  if (!o) return null;
  const earned = d.earned + cycleSignatures;
  const previous = d.record.dub;
  const next: DubState = {
    ...d,
    n: o.n,
    modifier: o.modifier,
    startMs: nowMs,
    offer: null,
    closed: null,
    earned,
    record: { dub: Math.max(previous, o.n), lifetimeLog10: Math.max(d.record.lifetimeLog10, Math.round(Math.log10(Math.max(1, earned)) * 100) / 100) },
  };
  return { d: next, record: previous >= 1 && o.n > previous ? { value: o.n, previous } : null };
}

/**
 * Шоста конвертація в Дублі закриває його (FR-26): фінал не повторюється, є акт «Дубль N закрито» і пропозиція Дубля N+1.
 * Спрацьовує один раз на Дубль.
 */
export function closeIfDue(d: DubState, conversions: number, total: number, nowMs: number): DubState {
  if (d.n < 1 || d.offer || d.closed || conversions < total) return d;
  const closed: DubClosed = { n: d.n, atMs: nowMs, cycleMs: Math.max(0, nowMs - (d.startMs ?? nowMs)), seen: false };
  return makeOffer({ ...d, closed }, nowMs);
}

/** Акт «Дубль N закрито» показано */
export function ackClosed(d: DubState): DubState {
  return d.closed && !d.closed.seen ? { ...d, closed: { ...d.closed, seen: true } } : d;
}

/** Рекорд на екранах: найвищий Дубль і log₁₀ за весь час (живий цикл враховано) */
export function recordNow(d: DubState, cycleSignatures: number): DubRecord {
  return { dub: Math.max(d.record.dub, d.n), lifetimeLog10: Math.max(d.record.lifetimeLog10, lifetimeLog10(d, cycleSignatures)) };
}

/** Годинник назад (009 FR-14): мітки Дубля зсуваються разом з годинником */
export function shiftDub(d: DubState, rawMs: number): DubState {
  if (rawMs >= 0) return d;
  return {
    ...d,
    startMs: d.startMs == null ? null : d.startMs + rawMs,
    offer: d.offer && { ...d.offer, atMs: d.offer.atMs + rawMs },
    closed: d.closed && { ...d.closed, atMs: d.closed.atMs + rawMs },
  };
}

/**
 * Конфіг Дубля N (FR-25, FR-27). `rateMult`/`costMult`/`clerkMult` рівнів × `dup.mult`^N, `prestigeDivisor` × `dup.divisorMult`^N,
 * вихід з рівнів, що його мають, - `dup.exitDigitizations`; модифікатор міняє пальне, перевірки або (у `dub`) телеграми.
 * Без Дубля - той самий об'єкт.
 */
export function dubConfig(base: EconomyConfig, d: DubState): EconomyConfig {
  if (d.n < 1) return base;
  const p = base.params;
  const D = p.dup;
  const pw = D.mult ** d.n;
  const dw = D.divisorMult ** d.n;
  const params = {
    ...p,
    levels: p.levels.map((L) => ({
      ...L,
      rateMult: L.rateMult * pw,
      costMult: L.costMult * pw,
      ...(L.clerkMult != null ? { clerkMult: L.clerkMult * pw } : {}),
      prestigeDivisor: L.prestigeDivisor * dw,
      ...(L.exitDigitizations > 0 ? { exitDigitizations: D.exitDigitizations } : {}),
    })),
  };
  if (d.modifier === 'no_did') params.fuelBonus = D.noDid.fuelMult;
  if (d.modifier === 'wet_seal') {
    params.inspIntervalMinH = p.inspIntervalMinH * D.wetSeal.intervalMult;
    params.inspIntervalMaxH = p.inspIntervalMaxH * D.wetSeal.intervalMult;
    params.inspHours = p.inspHours * D.wetSeal.boostMult;
  }
  return { ...base, params, dub: { n: d.n, modifier: d.modifier } };
}
