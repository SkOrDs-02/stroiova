// Стан гри зрізу (zustand). Збереження в MMKV — 009: початковий стан приходить із запису, toSave() віддає його назад.
import { create } from 'zustand';

import { bundledConfig } from '@/economy/config';
import { advance, claimOffline, offline, type OfflineResult } from '@/economy/game/advance';
import { catTap, refuel, tap } from '@/economy/game/actions';
import { buy, hire, isOk } from '@/economy/game/purchase';
import { newGame } from '@/economy/game/state';
import { absence, shiftTimers } from '@/economy/game/time';
import type { BuyMode, DomainEvent, EconomyConfig, EconomyState, Effect, UnitRef } from '@/economy/game/types';

export type Toast = { kind: 'offline'; amount: number } | { kind: 'clockBack' };

interface Store {
  cfg: EconomyConfig;
  /** Закріплений конфіг (009 FR-22): null до першої покупки рівня */
  pinned: EconomyConfig | null;
  state: EconomyState;
  effects: Effect[];
  /** Остання мітка часу, до якої нараховано дохід (мс, годинник пристрою) */
  lastMs: number;
  mode: BuyMode;
  offline: OfflineResult | null;
  /** Коли гравець повернувся: ліміт ×2 рахується за датою повернення (крайовий випадок «через північ») */
  offlineBackAt: number | null;
  toast: Toast | null;
  events: DomainEvent[];
  tick: (nowMs: number) => void;
  tapSeal: (nowMs: number) => void;
  buy: (ref: UnitRef, nowMs: number) => void;
  hire: (ref: UnitRef) => void;
  refuel: (nowMs: number) => void;
  cat: (nowMs: number) => void;
  setMode: (mode: BuyMode) => void;
  away: (leftAtMs: number, backAtMs: number) => void;
  claim: () => void;
  clearToast: () => void;
}

/** Місцева дата пристрою РРРР-ММ-ДД: ліміти доби рахуються за нею (001 FR-26, 009 FR-15). */
export function localDate(ms: number): string {
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export interface Initial {
  state: EconomyState;
  effects: Effect[];
  pinned: EconomyConfig | null;
}

export function createConveyorStore(nowMs: number, cfg: EconomyConfig = bundledConfig, init?: Initial) {
  return create<Store>((set, get) => ({
    cfg,
    pinned: init?.pinned ?? null,
    state: init?.state ?? newGame(cfg, nowMs),
    effects: init?.effects ?? [],
    lastMs: nowMs,
    mode: 'x1',
    offline: null,
    offlineBackAt: null,
    toast: null,
    events: [],
    tick: (now) => {
      const { state, cfg: c, effects, lastMs } = get();
      if (now <= lastMs) return;
      set({ state: advance(state, c, lastMs, now, effects).state, lastMs: now });
    },
    tapSeal: (now) => {
      const { state, cfg: c, effects } = get();
      set({ state: tap(state, c, now, effects).state });
    },
    buy: (ref, now) => {
      const { state, cfg: c, effects, mode, pinned } = get();
      const r = buy(state, c, ref, mode, now, effects);
      if (!isOk(r)) return;
      // 009 FR-22: на першій покупці рівня конфіг закріплюється, далі його не змінює ні прапор, ні оновлення
      const firstUpgrade = pinned == null && r.events.some((e) => e.type === 'purchase');
      set({ state: r.state, events: [...get().events, ...r.events].slice(-20), ...(firstUpgrade ? { pinned: c } : {}) });
    },
    hire: (ref) => {
      const { state, cfg: c } = get();
      const r = hire(state, c, ref);
      if (isOk(r)) set({ state: r.state, events: [...get().events, ...r.events].slice(-20) });
    },
    refuel: (now) => set({ state: refuel(get().state, get().cfg, now).state }),
    cat: (now) => set({ state: catTap(get().state, get().cfg, now).state }),
    setMode: (mode) => set({ mode }),
    away: (leftAt, backAt) => {
      const { state, cfg: c, effects } = get();
      const a = absence(leftAt, backAt);
      if (a.clockBack) {
        // 009 FR-14: офлайн 0, таймери зсунуто так, щоб залишок дорівнював залишку на момент запису
        const sh = shiftTimers(state, effects, a.rawMs);
        set({ state: sh.state, effects: sh.effects, lastMs: backAt, toast: { kind: 'clockBack' } });
        return;
      }
      const res = offline(state, c, leftAt, backAt, effects);
      if (res.short) {
        const r = claimOffline(state, c, res, false, localDate(backAt));
        if ('error' in r) return;
        set({ state: r.state, lastMs: backAt, toast: r.claimed > 0 ? { kind: 'offline', amount: r.claimed } : null });
      } else {
        set({ offline: res, offlineBackAt: backAt, lastMs: backAt });
      }
    },
    claim: () => {
      const { state, cfg: c, offline: res, offlineBackAt } = get();
      if (!res || offlineBackAt == null) return;
      const r = claimOffline(state, c, res, false, localDate(offlineBackAt));
      if ('error' in r) return;
      set({ state: r.state, offline: null, offlineBackAt: null });
    },
    clearToast: () => set({ toast: null }),
  }));
}

export type ConveyorStore = ReturnType<typeof createConveyorStore>;

/** Ігрова частина запису (009 GameSave): прострочені ефекти не зберігаємо. */
export function gameSave(store: ConveyorStore): { economy: EconomyState; effects: Effect[]; pinned: EconomyConfig | null } {
  const { state, effects, lastMs, pinned } = store.getState();
  return { economy: state, effects: effects.filter((e) => e.endMs > lastMs), pinned };
}
