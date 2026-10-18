// Міграції збереження (009 FR-9): чиста функція vN → vN+1 над полем `game`; ключ — версія «з».
// Правило: нова форма запису = CURRENT_SCHEMA + 1, міграція сюди, фікстура попередньої версії в тести (принцип III).
import { DEFAULTS } from '@/economy/core';
import { overrideStartNo } from '@/telegrams/schedule';

export type Migration = (game: unknown) => unknown;

export const MIGRATIONS: Record<number, Migration> = {
  // 1 → 2 (002): ігровий час і онбординг. Записи v1 — гравці, що вже на конвеєрі: онбординг пройдено,
  // позивний спитає «Рапорт на зміну позивного» (10).
  1: (game) => ({ ...(game as object), playtimeMs: 0, onboarding: onboardingDone() }),
  // 2 → 3 (003): телеграми й репутація. Гравець, що вже пройшов крок 8 (чи весь зріз 001/009), отримує розклад одразу:
  // startMs = 0 означає «доба 1 давно минула», слоти підуть з наступного tick. № 1 з відповіддю — в архіві з тим самим
  // вибором; прийшла без відповіді (крок 8) — у «Нових», щоб онбординг не застряг. Репутацію заднім числом не рахуємо.
  2: (game) => {
    const g = game as { onboarding?: { step?: number | 'done'; tg1?: { choiceId: string; atPlayMs: number } | null; tg1ReceivedAtPlayMs?: number | null } };
    const tg = telegramsV3();
    const o = g.onboarding ?? {};
    const pastStep8 = o.step === 'done' || (typeof o.step === 'number' && o.step > 8);
    if (o.tg1) {
      tg.inbox.push({ uid: 'tg_0001_sergeants#1', id: 'tg_0001_sergeants', kind: 'telegram', receivedAt: 0, status: 'archive', choiceId: o.tg1.choiceId, answeredAt: 0 });
      tg.deliveries = 1;
    } else if (o.step === 8 && o.tg1ReceivedAtPlayMs != null) {
      tg.inbox.push({ uid: 'tg_0001_sergeants#1', id: 'tg_0001_sergeants', kind: 'telegram', receivedAt: 0, status: 'new' } as never);
      tg.deliveries = 1;
    }
    if (pastStep8 || tg.deliveries > 0) tg.startMs = 0;
    return { ...(game as object), telegrams: tg };
  },
};

/** Порожній стан телеграм схеми 3: старт репутації — `DEFAULTS.repStart`, перший номер override — з контенту. */
export function telegramsV3() {
  return {
    rng: 1,
    day: null,
    startMs: null as number | null,
    inbox: [] as { uid: string; id: string; kind: 'telegram'; receivedAt: number; status: 'archive'; choiceId: string; answeredAt: number }[],
    queue: [],
    timers: [],
    flags: {},
    reputation: { value: DEFAULTS.repStart, history: [] },
    firstInspectionPassed: false,
    unscheduledDays: [],
    refuelBlockedUntil: 0,
    override: { lastDayKey: null, nextNo: overrideStartNo() },
    kombat: { lastDayKey: null, active: null },
    deliveries: 0,
    lineBags: {},
  };
}

/** Онбординг, якого гравець уже не проходить (міграція 1 → 2). */
export function onboardingDone() {
  return {
    step: 'done' as const,
    callsign: null,
    gender: null,
    birdLeftMs: 0,
    completed: [],
    stepStartedAtPlayMs: 0,
    tg1ReceivedAtPlayMs: null,
    tg1: null,
    archiveBonus: null,
  };
}
