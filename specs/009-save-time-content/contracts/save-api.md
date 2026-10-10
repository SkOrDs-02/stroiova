# Контракт: збереження й час (009, етап 1)

```ts
// src/save/storage.ts
interface KeyValue { getString(key: string): string | undefined; set(key: string, value: string): void; remove(key: string): void }
createStorage(): KeyValue                 // MMKV (на web — localStorage)

// src/save/checksum.ts
fnv1a(text: string): string               // 8 hex

// src/save/schema.ts
CURRENT_SCHEMA: number
saveFileSchema, gameSaveSchema            // zod

// src/save/migrations.ts
type Migration = (game: unknown) => unknown
MIGRATIONS: Record<number, Migration>     // ключ — версія «з»

// src/save/repository.ts
serialize(save: Omit<SaveFile, 'checksum'>): string
loadSave(kv, opts: { current: number; migrations: Record<number, Migration>; onMigrating?(): void }): LoadResult
writeSave(kv, save: Omit<SaveFile, 'checksum'>): boolean        // false — запис не вдався (FR-2, повтор)
snapshot(kv): void                                              // save → bak1 → bak2, лише валідний
latestBackup(kv, opts): SaveFile | null
restoreFromBackup(kv, opts): SaveFile | null                    // FR-6
installId(kv, uuid: () => string): { id: string; isNew: boolean }

// src/economy/game/time.ts (чисте)
absence(savedAt: number, now: number): Absence
shiftTimers(state: EconomyState, effects: Effect[], deltaMs: number): { state; effects }   // FR-14
isNewSession(lastActiveAt: number | null, now: number): boolean // ≥ 120 с або холодний старт
```

Залежності: `src/save` знає про `src/economy` (типи стану), але не навпаки; React — лише в `src/features/boot`.
