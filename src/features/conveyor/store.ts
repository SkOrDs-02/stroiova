// Стан гри зрізу (zustand). Збереження в MMKV — 009: початковий стан приходить із запису, toSave() віддає його назад.
import { create } from 'zustand';

import { bundledConfig } from '@/economy/config';
import { advance, claimOffline, offline, type OfflineResult } from '@/economy/game/advance';
import { baseIncomePerMin } from '@/economy/game/income';
import { catTap, refuel, tap } from '@/economy/game/actions';
import { buy, hire, isOk } from '@/economy/game/purchase';
import { newGame } from '@/economy/game/state';
import { absence, shiftTimers } from '@/economy/game/time';
import type { BuyMode, DomainEvent, EconomyConfig, EconomyState, Effect, UnitRef } from '@/economy/game/types';
import { complete, isFullScreenStep, newOnboarding, receiveTg1, type CompleteExtra, type OnboardingState, type StepNo } from '@/features/onboarding/steps';

/** Ефекти, що потрапляють у запис: «Пташка» онбордингу живе лише в пам'яті (002 R3). */
export type StoredEffect = Effect & { source: Exclude<Effect['source'], 'onboarding_bird'> };

export type Toast =
  | { kind: 'offline'; amount: number }
  | { kind: 'clockBack' }
  | { kind: 'text'; text: string }
  | { kind: 'archive'; amount: number };

/** Підписів за перший акт: 8 тапів × tapValue, на 8-му тапі (рішення 57). */
export const ACT_TAPS = 8;

interface Store {
  cfg: EconomyConfig;
  /** Закріплений конфіг (009 FR-22): null до першої покупки рівня */
  pinned: EconomyConfig | null;
  state: EconomyState;
  effects: StoredEffect[];
  /** Ігровий час на передньому плані (002 FR-29) */
  playtimeMs: number;
  onboarding: OnboardingState;
  /** Тапи першого акта; лише в пам'яті: після вбивства «0 з 8» (002 R4) */
  actTaps: number;
  /** Модалка clerk-first після найму на кроці 7 */
  clerkFirstOpen: boolean;
  /** Результат першого акта («Пташка в небі», «До стройової») ще на екрані */
  actResultOpen: boolean;
  /** Остання мітка часу, до якої нараховано дохід (мс, годинник пристрою) */
  lastMs: number;
  mode: BuyMode;
  offline: OfflineResult | null;
  /** Коли гравець повернувся: ліміт ×2 рахується за датою повернення (крайовий випадок «через північ») */
  offlineBackAt: number | null;
  toast: Toast | null;
  /** Черга тостів: на екрані один, решта чекає (артборд Toasts) */
  toastQueue: Toast[];
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
  showToast: (toast: Toast) => void;
  /** Закрити крок онбордингу (002 FR-1); false — крок не поточний */
  onbComplete: (step: StepNo, extra?: CompleteExtra) => boolean;
  /** Тап «Підписати» на першому акті; повертає n з 8 */
  actSign: () => number;
  /** Кінець анімації ПОГОДЖЕНО: крок 5, «Пташка» злітає (FR-12) */
  stamp: () => void;
  /** «До стройової» з результату першого акта */
  toMain: () => void;
  /** Закрити clerk-first (крок 7 уже закрито наймом) */
  closeClerkFirst: () => void;
  receiveTg1: () => void;
  /** Відповідь на телеграму № 1 (крок 8); ефекти з контенту готує features/telegrams/first.ts */
  answerTg1: (choiceId: string, effects: StoredEffect[]) => void;
  /** Бонус архіву «Археолога» (крок 9, FR-20): archiveBonusMin × базовий дохід, один раз */
  claimArchive: () => number;
}

/** «Пташка» як тимчасовий множник від мітки a: діє ще birdLeftMs ігрового часу (002 R3). */
export function birdEffect(cfg: EconomyConfig, o: OnboardingState, a: number): Effect[] {
  if (o.birdLeftMs <= 0) return [];
  return [{ kind: 'mult', source: 'onboarding_bird', value: cfg.params.onboardingBirdMult, startMs: a, endMs: a + o.birdLeftMs }];
}

/** Місцева дата пристрою РРРР-ММ-ДД: ліміти доби рахуються за нею (001 FR-26, 009 FR-15). */
export function localDate(ms: number): string {
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export interface Initial {
  state: EconomyState;
  effects: StoredEffect[];
  pinned: EconomyConfig | null;
  playtimeMs?: number;
  onboarding?: OnboardingState;
}

export function createConveyorStore(nowMs: number, cfg: EconomyConfig = bundledConfig, init?: Initial) {
  return create<Store>((set, get) => ({
    cfg,
    pinned: init?.pinned ?? null,
    state: init?.state ?? newGame(cfg, nowMs),
    effects: init?.effects ?? [],
    playtimeMs: init?.playtimeMs ?? 0,
    onboarding: init?.onboarding ?? newOnboarding(0),
    // крок 5 закривається кінцем анімації ПОГОДЖЕНО; якщо застосунок вбито під час неї, акт уже підписано (FR-28)
    actTaps: init?.onboarding?.step === 5 ? ACT_TAPS : 0,
    clerkFirstOpen: false,
    actResultOpen: false,
    lastMs: nowMs,
    mode: 'x1',
    offline: null,
    offlineBackAt: null,
    toast: null,
    toastQueue: [],
    events: [],
    tick: (now) => {
      const { state, cfg: c, effects, lastMs, onboarding: o, playtimeMs } = get();
      if (now <= lastMs) return;
      const dt = now - lastMs;
      // tick іде лише на передньому плані: ігровий час і «Пташка» не рахуються у фоні (FR-12, FR-29).
      // До кінця першого акта конвеєр стоїть (як у sim.js: дохід з onboardingBirdStartSec), іде лише ігровий час.
      const idleConveyor = isFullScreenStep(o.step);
      set({
        state: idleConveyor ? state : advance(state, c, lastMs, now, [...effects, ...birdEffect(c, o, lastMs)]).state,
        lastMs: now,
        playtimeMs: playtimeMs + dt,
        ...(o.birdLeftMs > 0 ? { onboarding: { ...o, birdLeftMs: Math.max(0, o.birdLeftMs - dt) } } : {}),
      });
    },
    tapSeal: (now) => {
      const { state, cfg: c, effects, onboarding: o, lastMs } = get();
      set({ state: tap(state, c, now, [...effects, ...birdEffect(c, o, Math.min(lastMs, now))]).state });
    },
    buy: (ref, now) => {
      const { state, cfg: c, effects, mode, pinned } = get();
      const r = buy(state, c, ref, mode, now, effects);
      if (!isOk(r)) return;
      // 009 FR-22: на першій покупці рівня конфіг закріплюється, далі його не змінює ні прапор, ні оновлення
      const purchased = r.events.some((e) => e.type === 'purchase');
      const firstUpgrade = pinned == null && purchased;
      set({ state: r.state, events: [...get().events, ...r.events].slice(-20), ...(firstUpgrade ? { pinned: c } : {}) });
      // 002 FR-16: крок 6 закриває перша покупка рівня
      if (purchased) get().onbComplete(6);
    },
    hire: (ref) => {
      const { state, cfg: c } = get();
      const r = hire(state, c, ref);
      if (!isOk(r)) return;
      set({ state: r.state, events: [...get().events, ...r.events].slice(-20) });
      // 002 FR-17: крок 7 — найм діловода «Стройової частини» (рішення 56), далі clerk-first
      if (ref.type === 'stage' && ref.id === 'stroy' && get().onbComplete(7)) set({ clerkFirstOpen: true });
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
        set({ state: sh.state, effects: sh.effects as StoredEffect[], lastMs: backAt, toast: { kind: 'clockBack' } });
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
    clearToast: () => {
      const [next, ...rest] = get().toastQueue;
      set({ toast: next ?? null, toastQueue: rest });
    },
    showToast: (toast) => (get().toast ? set({ toastQueue: [...get().toastQueue, toast] }) : set({ toast })),
    onbComplete: (step, extra) => {
      const o = get().onboarding;
      const n = complete(o, step, get().playtimeMs, extra);
      if (n === o) return false;
      set({ onboarding: n });
      return true;
    },
    actSign: () => {
      const { actTaps, onboarding: o, state, cfg: c } = get();
      if (o.step !== 4 || actTaps >= ACT_TAPS) return actTaps;
      const n = actTaps + 1;
      if (n < ACT_TAPS) {
        set({ actTaps: n });
        return n;
      }
      // рішення 57: 8 × tapValue разом, без множників («Пташка» ще не злетіла)
      const add = ACT_TAPS * c.params.tapValue;
      set({ actTaps: n, state: { ...state, signatures: state.signatures + add, lifetimeCycle: state.lifetimeCycle + add } });
      get().onbComplete(4);
      return n;
    },
    stamp: () => {
      if (!get().onbComplete(5)) return;
      const o = get().onboarding;
      set({ onboarding: { ...o, birdLeftMs: get().cfg.params.onboardingBirdMin * 60_000 }, actResultOpen: true });
    },
    toMain: () => set({ actResultOpen: false }),
    closeClerkFirst: () => set({ clerkFirstOpen: false }),
    receiveTg1: () => set({ onboarding: receiveTg1(get().onboarding, get().playtimeMs) }),
    answerTg1: (choiceId, eff) => {
      const o = get().onboarding;
      if (o.step !== 8) return;
      set({ effects: [...get().effects, ...eff], onboarding: { ...o, tg1: { choiceId, atPlayMs: get().playtimeMs } } });
      get().onbComplete(8);
    },
    claimArchive: () => {
      const { state, cfg: c, onboarding: o } = get();
      if (o.step !== 9) return 0;
      const amount = c.params.archiveBonusMin * baseIncomePerMin(state, c);
      set({
        state: { ...state, signatures: state.signatures + amount, lifetimeCycle: state.lifetimeCycle + amount },
        onboarding: { ...o, archiveBonus: amount },
      });
      get().showToast({ kind: 'archive', amount });
      get().onbComplete(9);
      return amount;
    },
  }));
}

export type ConveyorStore = ReturnType<typeof createConveyorStore>;

/** Ігрова частина запису (009 GameSave): прострочені ефекти не зберігаємо. */
export function gameSave(store: ConveyorStore): {
  economy: EconomyState;
  effects: StoredEffect[];
  pinned: EconomyConfig | null;
  playtimeMs: number;
  onboarding: OnboardingState;
} {
  const { state, effects, lastMs, pinned, playtimeMs, onboarding } = store.getState();
  return { economy: state, effects: effects.filter((e) => e.endMs > lastMs), pinned, playtimeMs, onboarding };
}
