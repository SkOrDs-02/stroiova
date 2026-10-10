// Міграції збереження (009 FR-9): чиста функція vN → vN+1 над полем `game`; ключ — версія «з».
// Правило: нова форма запису = CURRENT_SCHEMA + 1, міграція сюди, фікстура попередньої версії в тести (принцип III).
export type Migration = (game: unknown) => unknown;

export const MIGRATIONS: Record<number, Migration> = {};
