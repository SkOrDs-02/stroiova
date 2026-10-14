// Міграції збереження (009 FR-9): чиста функція vN → vN+1 над полем `game`; ключ — версія «з».
// Правило: нова форма запису = CURRENT_SCHEMA + 1, міграція сюди, фікстура попередньої версії в тести (принцип III).
export type Migration = (game: unknown) => unknown;

export const MIGRATIONS: Record<number, Migration> = {
  // 1 → 2 (002): ігровий час і онбординг. Записи v1 — гравці, що вже на конвеєрі: онбординг пройдено,
  // позивний спитає «Рапорт на зміну позивного» (10).
  1: (game) => ({ ...(game as object), playtimeMs: 0, onboarding: onboardingDone() }),
};

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
