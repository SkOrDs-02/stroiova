// Стан гри зрізу (zustand). Збереження в MMKV — 009: початковий стан приходить із запису, toSave() віддає його назад.
import { create } from 'zustand';

import { bundledConfig } from '@/economy/config';
import { advance, claimOffline, offline, type OfflineResult } from '@/economy/game/advance';
import { baseIncomePerMin } from '@/economy/game/income';
import { catTap, refuel, tap } from '@/economy/game/actions';
import { buy, hire, isOk } from '@/economy/game/purchase';
import { newGame } from '@/economy/game/state';
import { absence, isNewSession, shiftTimers } from '@/economy/game/time';
import type { BuyMode, DomainEvent, EconomyConfig, EconomyState, Effect, StoredEffect, UnitRef } from '@/economy/game/types';
import { complete, isFullScreenStep, newOnboarding, receiveTg1, type CompleteExtra, type OnboardingState, type StepNo } from '@/features/onboarding/steps';
import { dayKey } from '@/telegrams/clock';
import { FIRST_TELEGRAM_ID } from '@/telegrams/content';
import { answer as answerTg, openNotice as openNoticeTg, type AnswerResult } from '@/telegrams/effects';
import { fromTelegram, onSessionStart, sendRunner as sendRunnerTg } from '@/telegrams/events';
import { deliverFirst, newTelegrams, tick as tickTg } from '@/telegrams/schedule';
import type { TelegramState } from '@/telegrams/types';
import { lineAt } from '@/features/telegrams/lines';
export type { StoredEffect } from '@/economy/game/types';

/** Рішення 45: не більше 2 реплік персонажів за сесію (сюжет, онбординг, перевірки, телеграми й пуші — поза лімітом). */
const SESSION_LINES_MAX = 2;

/** Зсув місцевого часу пристрою, хв (= −getTimezoneOffset): розклад телеграм за годинником пристрою (003 FR-2). */
export function tzOffsetAt(ms: number): number {
  return -new Date(ms).getTimezoneOffset();
}

export type Toast =
  | { kind: 'offline'; amount: number }
  | { kind: 'clockBack' }
  | { kind: 'text'; text: string }
  | { kind: 'archive'; amount: number }
  | { kind: 'rep'; tier: 'low' | 'norm' | 'high' };

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
  /** Телеграми й репутація (003) */
  telegrams: TelegramState;
  /** Репліки персонажів цієї сесії (рішення 45: ≤ 2 за сесію); лише в пам'яті */
  sessionLines: { count: number; byUid: Record<string, string> };
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
  /** Крок 8: телеграма № 1 у вхідних (002 FR-18, 003 FR-1) */
  receiveTg1: () => void;
  /** Відповідь на телеграму (003 FR-12…FR-20); на № 1 закриває крок 8 онбордингу */
  answerTelegram: (uid: string, choiceId: string) => AnswerResult['item'] | { error: string };
  /** Відкрити телеграму без вибору чи записку (FR-11, FR-27) */
  openItem: (uid: string) => void;
  /** «Це не смішно» (FR-26): лише позначка, без впливу на гру */
  flagTelegram: (uid: string) => void;
  /** «Відправити посильного» (FR-28) */
  sendRunner: () => boolean;
  /** Репліка Кави над новою телеграмою: одна на телеграму, ≤ 2 реплік за сесію (рішення 41, 45) */
  kavaLineFor: (uid: string) => string | null;
  /** Бонус архіву «Археолога» (крок 9, FR-20): archiveBonusMin × базовий дохід, один раз */
  claimArchive: () => number;
}

/** Рішення 59: до закриття кроку 7 наймати можна лише діловода «Стройової частини». */
export function canHireNow(o: OnboardingState, ref: UnitRef): boolean {
  const before7 = o.step !== 'done' && o.step <= 7;
  return !before7 || (ref.type === 'stage' && ref.id === 'stroy');
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
  telegrams?: TelegramState;
}

export function createConveyorStore(nowMs: number, cfg: EconomyConfig = bundledConfig, init?: Initial) {
  return create<Store>((set, get) => {
  /** Доменні події телеграм → ефекти, тости, журнал подій (003). */
  const handleEvents = (evs: DomainEvent[], nowMs: number) => {
    if (!evs.length) return;
    let effects = get().effects;
    let tg = get().telegrams;
    for (const e of evs) {
      if (e.type === 'kombatRequest') {
        const k = fromTelegram(tg, get().cfg, nowMs, tzOffsetAt(nowMs), e.maxMin);
        tg = k.tg;
        if (k.effect) effects = [...effects.filter((x) => x.source !== 'kombat_away' || x.endMs <= nowMs), k.effect];
      }
    }
    set({ telegrams: tg, effects, events: [...get().events, ...evs].slice(-40) });
    for (const e of evs) if (e.type === 'reputationTierChange') get().showToast({ kind: 'rep', tier: e.to });
  };
  /** Розклад і таймери телеграм у (from, to] (003 FR-2, FR-3, FR-17): лише після № 1. */
  const runTelegrams = (from: number, to: number, away: boolean) => {
    const g = get();
    if (g.telegrams.startMs == null || to <= from) return;
    const r = tickTg(g.telegrams, g.state, {
      cfg: g.cfg,
      fromMs: from,
      nowMs: to,
      tzOffsetMin: tzOffsetAt(to),
      level: g.state.level,
      digitizations: 0, // лічильник цифровізацій з'явиться з 06
      raceActive: null, // гонка — 05
      away,
    });
    set({ telegrams: r.tg, state: r.eco });
    handleEvents(r.events, to);
  };
  /** Повернення з фону чи холодний старт (001 FR-13, FR-25; 009 FR-14). */
  const awayInner = (leftAt: number, backAt: number) => {
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
    };
  return {
    cfg,
    pinned: init?.pinned ?? null,
    state: init?.state ?? newGame(cfg, nowMs),
    effects: init?.effects ?? [],
    playtimeMs: init?.playtimeMs ?? 0,
    onboarding: init?.onboarding ?? newOnboarding(0),
    telegrams: init?.telegrams ?? newTelegrams(cfg.params, `game-${nowMs}`),
    sessionLines: { count: 0, byUid: {} },
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
      runTelegrams(lastMs, now, false);
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
      if (!canHireNow(get().onboarding, ref)) return;
      const { state, cfg: c } = get();
      const r = hire(state, c, ref);
      if (!isOk(r)) return;
      set({ state: r.state, events: [...get().events, ...r.events].slice(-20) });
      // 002 FR-17: крок 7 — найм діловода «Стройової частини» (рішення 56), далі clerk-first
      if (ref.type === 'stage' && ref.id === 'stroy' && get().onbComplete(7)) set({ clerkFirstOpen: true });
    },
    refuel: (now) => {
      // № 24 «у шухляду»: заправку заблоковано на годину (003 FR-20)
      if (now < get().telegrams.refuelBlockedUntil) return;
      set({ state: refuel(get().state, get().cfg, now).state });
    },
    cat: (now) => set({ state: catTap(get().state, get().cfg, now).state }),
    setMode: (mode) => set({ mode }),
    away: (leftAt, backAt) => {
      awayInner(leftAt, backAt);
      // 003: телеграми, що прийшли без гравця (FR-3); нова сесія — шанс «Комбата шукають» (FR-29)
      runTelegrams(leftAt, Math.max(leftAt, backAt), true);
      if (isNewSession(leftAt, backAt)) {
        set({ sessionLines: { count: 0, byUid: {} } });
        const g = get();
        const k = onSessionStart(g.telegrams, g.cfg, backAt, tzOffsetAt(backAt), false);
        set({ telegrams: k.tg, ...(k.effect ? { effects: [...g.effects, k.effect] } : {}) });
        handleEvents(k.events, backAt);
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
    receiveTg1: () => {
      const g = get();
      const r = deliverFirst(g.telegrams, g.lastMs);
      set({ onboarding: receiveTg1(g.onboarding, g.playtimeMs), telegrams: r.tg });
      handleEvents(r.events, g.lastMs);
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
      // 003 FR-27: підсумок дзвінка лягає в «Записки»
      const tg = get().telegrams;
      const note = { uid: `note_call#${tg.deliveries + 1}`, id: 'note_call', kind: 'note' as const, receivedAt: get().lastMs, status: 'archive' as const, read: false };
      set({ telegrams: { ...tg, inbox: [...tg.inbox, note], deliveries: tg.deliveries + 1 } });
      get().onbComplete(9);
      return amount;
    },
    answerTelegram: (uid, choiceId) => {
      const g = get();
      const now = g.lastMs;
      const r = answerTg(g.telegrams, g.state, uid, choiceId, { cfg: g.cfg, nowMs: now, dayKey: dayKey(now, tzOffsetAt(now)) });
      if ('error' in r) return r;
      set({ telegrams: r.tg, state: r.eco, effects: [...g.effects, ...r.effects] });
      handleEvents(r.events, now);
      // 002 FR-19: відповідь на № 1 закриває крок 8
      if (r.item.id === FIRST_TELEGRAM_ID && get().onboarding.step === 8) {
        set({ onboarding: { ...get().onboarding, tg1: { choiceId, atPlayMs: get().playtimeMs } } });
        get().onbComplete(8);
      }
      return r.item;
    },
    openItem: (uid) => {
      const g = get();
      const item = g.telegrams.inbox.find((x) => x.uid === uid);
      if (!item) return;
      if (item.kind === 'notice') {
        const r = openNoticeTg(g.telegrams, uid, g.lastMs);
        set({ telegrams: r.tg });
        handleEvents(r.events, g.lastMs);
      } else if (item.kind === 'note' && !item.read) {
        set({ telegrams: { ...g.telegrams, inbox: g.telegrams.inbox.map((x) => (x.uid === uid ? { ...x, read: true } : x)) } });
      }
    },
    flagTelegram: (uid) => {
      const tg = get().telegrams;
      set({ telegrams: { ...tg, inbox: tg.inbox.map((x) => (x.uid === uid ? { ...x, flagged: true } : x)) } });
    },
    kavaLineFor: (uid) => {
      const sl = get().sessionLines;
      if (sl.byUid[uid] != null) return sl.byUid[uid]!;
      if (sl.count >= SESSION_LINES_MAX) return null;
      const text = lineAt('kava.tg_new', get().telegrams.deliveries + sl.count);
      if (!text) return null;
      set({ sessionLines: { count: sl.count + 1, byUid: { ...sl.byUid, [uid]: text } } });
      return text;
    },
    sendRunner: () => {
      const g = get();
      const r = sendRunnerTg(g.telegrams, g.state, g.cfg, g.lastMs);
      if ('error' in r) return false;
      // посильний знайде комбата раніше: кінець ефекту ×0,25 зсувається на мить знаходження
      set({ telegrams: r.tg, state: r.eco, effects: g.effects.map((e) => (e.source === 'kombat_away' && e.endMs > g.lastMs ? { ...e, endMs: r.endMs } : e)) });
      return true;
    },
  };
  });
}

export type ConveyorStore = ReturnType<typeof createConveyorStore>;

/** Ігрова частина запису (009 GameSave): прострочені ефекти не зберігаємо. */
export function gameSave(store: ConveyorStore): {
  economy: EconomyState;
  effects: StoredEffect[];
  pinned: EconomyConfig | null;
  playtimeMs: number;
  onboarding: OnboardingState;
  telegrams: TelegramState;
} {
  const { state, effects, lastMs, pinned, playtimeMs, onboarding, telegrams } = store.getState();
  return { economy: state, effects: effects.filter((e) => e.endMs > lastMs), pinned, playtimeMs, onboarding, telegrams };
}
