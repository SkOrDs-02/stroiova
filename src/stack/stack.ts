// Стос до наради (012 FR-13…FR-16, рішення 104): висота в сантиметрах росте від роботи «Звітів про звіти» за сесію. Чистий домен.
import { zpzShare } from '@/economy/core';
import { itemsFor } from '@/economy/game/state';
import type { DomainEvent, EconomyConfig, EconomyState } from '@/economy/game/types';

const MIN = 60_000;

export interface StackState {
  /** Мітка початку поточної сесії; null до першої */
  sessionStartMs: number | null;
  /** Висота за сесію, см (не обрізана: лічильник до `counterCm`, показ до `showCm`) */
  cm: number;
  /** Скільки з неї дав офлайн, зарахований на старті сесії (для `offline_share_pct`) */
  offlineCm: number;
  /** «Метр звітів» у цьому циклі цифровізації вже створено (FR-15) */
  reached: boolean;
}

export function newStack(): StackState {
  return { sessionStartMs: null, cm: 0, offlineCm: 0, reached: false };
}

/** Нова сесія: стос з нуля (FR-13); прапорець циклу лишається */
export function startSession(st: StackState, nowMs: number): StackState {
  return { ...st, sessionStartMs: nowMs, cm: 0, offlineCm: 0 };
}

/** Індекс потоку-частки (ЗпЗ) на рівні гравця і чи він відкритий */
function zpzOf(eco: EconomyState, cfg: EconomyConfig): { level: number; clerk: boolean } | null {
  const i = itemsFor(eco, cfg).streams.findIndex((u) => u.share);
  const level = i >= 0 ? (eco.streamLevels[i] ?? 0) : 0;
  return level > 0 ? { level, clerk: !!eco.streamClerks[i] } : null;
}

/** Сантиметрів за хвилину: s(n) / shareMinPerCm (FR-14); 0, якщо ЗпЗ не відкрито */
export function cmPerMin(eco: EconomyState, cfg: EconomyConfig): number {
  const z = zpzOf(eco, cfg);
  return z ? zpzShare(z.level, cfg.params) / cfg.params.stack.shareMinPerCm : 0;
}

export interface StackGrow {
  st: StackState;
  /** `stackReach`, якщо цього кроку h уперше в циклі досяг `reachCm` (FR-15) */
  events: DomainEvent[];
}

function reach(st: StackState, eco: EconomyState, cfg: EconomyConfig, nowMs: number): StackGrow {
  const p = cfg.params.stack;
  if (st.reached || st.cm < p.reachCm) return { st, events: [] };
  const z = zpzOf(eco, cfg);
  const s = z ? zpzShare(z.level, cfg.params) : 0;
  return {
    st: { ...st, reached: true },
    events: [
      {
        type: 'stackReach',
        cm: Math.floor(st.cm),
        zpzLevel: z?.level ?? 0,
        zpzSharePct: Math.round((s / (1 + s)) * 100),
        secSinceSessionStart: st.sessionStartMs == null ? 0 : Math.max(0, Math.round((nowMs - st.sessionStartMs) / 1000)),
        offlineSharePct: st.cm > 0 ? Math.round((st.offlineCm / st.cm) * 100) : 0,
      },
    ],
  };
}

/** Стос росте за час на передньому плані (з `fromMs` до `toMs`) */
export function grow(st: StackState, eco: EconomyState, cfg: EconomyConfig, fromMs: number, toMs: number): StackGrow {
  const rate = cmPerMin(eco, cfg);
  if (rate <= 0 || toMs <= fromMs) return { st, events: [] };
  return reach(({ ...st, cm: st.cm + ((toMs - fromMs) / MIN) * rate }), eco, cfg, toMs);
}

/** Зарахований офлайн (`creditedMs`) додає стос на старті сесії; ЗпЗ без діловода без гравця не працює (FR-13) */
export function growOffline(st: StackState, eco: EconomyState, cfg: EconomyConfig, creditedMs: number, nowMs: number): StackGrow {
  const z = zpzOf(eco, cfg);
  if (!z || !z.clerk || creditedMs <= 0) return { st, events: [] };
  const add = (creditedMs / MIN) * cmPerMin(eco, cfg);
  return reach({ ...st, cm: st.cm + add, offlineCm: st.offlineCm + add }, eco, cfg, nowMs);
}

/** Цифровізація: стос і прапорець циклу скидаються (крайовий випадок spec) */
export function resetCycle(st: StackState): StackState {
  return { ...st, cm: 0, offlineCm: 0, reached: false };
}

/** Показ: висота на картинці ≤ `showCm`, лічильник ≤ `counterCm` (FR-14, ВП-2) */
export function display(st: StackState, cfg: EconomyConfig): { shownCm: number; counterCm: number } {
  const p = cfg.params.stack;
  return { shownCm: Math.min(st.cm, p.showCm), counterCm: Math.min(Math.floor(st.cm), p.counterCm) };
}
