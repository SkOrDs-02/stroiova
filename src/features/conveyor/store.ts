// Стан зрізу 001 у пам'яті (zustand). Збереження в MMKV — 009.
import { create } from 'zustand';

import { bundledConfig } from '@/economy/config';
import { advance, claimOffline, offline, type OfflineResult } from '@/economy/game/advance';
import { catTap, refuel, tap } from '@/economy/game/actions';
import { buy, hire, isOk } from '@/economy/game/purchase';
import { newGame } from '@/economy/game/state';
import type { BuyMode, DomainEvent, EconomyConfig, EconomyState, Effect, UnitRef } from '@/economy/game/types';

interface Store {
  cfg: EconomyConfig;
  state: EconomyState;
  effects: Effect[];
  /** Остання мітка часу, до якої нараховано дохід (мс, годинник пристрою) */
  lastMs: number;
  mode: BuyMode;
  offline: OfflineResult | null;
  /** Сума короткої відсутності для тосту off.toast (FR-25) */
  toast: number | null;
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

const localDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function createConveyorStore(nowMs: number, cfg: EconomyConfig = bundledConfig) {
  return create<Store>((set, get) => ({
    cfg,
    state: newGame(cfg, nowMs),
    effects: [],
    lastMs: nowMs,
    mode: 'x1',
    offline: null,
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
      const { state, cfg: c, effects, mode } = get();
      const r = buy(state, c, ref, mode, now, effects);
      if (isOk(r)) set({ state: r.state, events: [...get().events, ...r.events].slice(-20) });
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
      const res = offline(state, c, leftAt, backAt, effects);
      if (res.short) {
        const r = claimOffline(state, c, res, false, localDate(backAt));
        if ('error' in r) return;
        set({ state: r.state, lastMs: backAt, toast: r.claimed > 0 ? r.claimed : null });
      } else {
        set({ offline: res, lastMs: backAt });
      }
    },
    claim: () => {
      const { state, cfg: c, offline: res } = get();
      if (!res) return;
      const r = claimOffline(state, c, res, false, localDate(Date.now()));
      if ('error' in r) return;
      set({ state: r.state, offline: null });
    },
    clearToast: () => set({ toast: null }),
  }));
}

export type ConveyorStore = ReturnType<typeof createConveyorStore>;
