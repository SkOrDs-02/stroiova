// Міграції збереження (009 FR-9): чиста функція vN → vN+1 над полем `game`; ключ — версія «з».
// Правило: нова форма запису = CURRENT_SCHEMA + 1, міграція сюди, фікстура попередньої версії в тести (принцип III).
import { DEFAULTS } from '@/economy/core';
import { OVERRIDE_ID, telegram } from '@/telegrams/content';

export type Migration = (game: unknown) => unknown;

export const MIGRATIONS: Record<number, Migration> = {
  // 1 → 2 (002): ігровий час і онбординг. Записи v1 — гравці, що вже на конвеєрі: онбординг пройдено,
  // позивний спитає «Рапорт на зміну позивного» (10).
  1: (game) => ({ ...(game as object), playtimeMs: 0, onboarding: onboardingDone() }),
  // 2 → 3 (003): телеграми й репутація. Якщо онбординг уже відповів на № 1, вона лежить в архіві з тим самим вибором,
  // а розклад стартує з наступного запуску; репутацію не відновлюємо заднім числом.
  2: (game) => {
    const g = game as { onboarding?: { tg1?: { choiceId: string; atPlayMs: number } | null; tg1ReceivedAtPlayMs?: number | null } };
    const tg = telegramsV3();
    const tg1 = g.onboarding?.tg1;
    if (tg1) {
      tg.inbox.push({ uid: 'tg_0001_sergeants#1', id: 'tg_0001_sergeants', kind: 'telegram', receivedAt: 0, status: 'archive', choiceId: tg1.choiceId, answeredAt: 0 });
      tg.deliveries = 1;
    }
    return { ...(game as object), telegrams: tg };
  },
};

/** Порожній стан телеграм схеми 3: старт репутації — `DEFAULTS.repStart`, перший номер override — з контенту. */
export function telegramsV3() {
  return {
    rng: 1,
    day: null,
    startMs: null,
    inbox: [] as { uid: string; id: string; kind: 'telegram'; receivedAt: number; status: 'archive'; choiceId: string; answeredAt: number }[],
    queue: [],
    timers: [],
    flags: {},
    reputation: { value: DEFAULTS.repStart, history: [] },
    firstInspectionPassed: false,
    unscheduledDays: [],
    refuelBlockedUntil: 0,
    override: { lastDayKey: null, nextNo: telegram(OVERRIDE_ID)?.schedule?.orderNoStart ?? 1 },
    kombat: { lastDayKey: null, active: null },
    deliveries: 0,
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
