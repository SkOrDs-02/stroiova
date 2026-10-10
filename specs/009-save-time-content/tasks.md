---
description: "Задачі: 009 Збереження, час і оновлення контенту — етап 1"
---

# Tasks: 009 — етап 1

**Input**: plan.md, spec.md, research.md, data-model.md, contracts/save-api.md, quickstart.md
**Tests**: обов'язкові (принцип III). Пам'ятний `KeyValue` у тестах.

| Історія | Зі spec.md | Пріоритет |
| --- | --- | --- |
| US1 | Прогрес не губиться, навіть якщо телефон вимкнувся | P1 |
| US2 | Пошкоджене збереження — відновитися з копії | P1 |
| US3 | Після оновлення гри справа на місці (міграції, новіша схема) | P1 |
| US4 | Переведений годинник — зрозуміти, чому офлайн не нараховано | P1 |
| US5 | Розробник міняє баланс для нових, не ламаючи старих (закріплення конфігу) | P2 |

## Phase 1: Setup

- [X] T001 `npx expo install react-native-mmkv react-native-nitro-modules expo-crypto zod`, `npx expo-doctor`; `package.json`
- [X] T002 [P] `src/save/storage.ts`: `KeyValue { getString, set, remove }`, `createStorage()` (MMKV `createMMKV()`; на web — `localStorage`, якщо MMKV недоступний), `memoryStorage()` для тестів
- [X] T003 [P] `src/save/checksum.ts`: `fnv1a(text)` → 8 hex; тест на відомі значення

## Phase 2: Foundational

- [X] T004 `src/save/schema.ts`: `CURRENT_SCHEMA = 1`; zod `gameSaveSchema` (`economy` — поля `EconomyState` з 001, `effects` — `Effect[]`), `saveFileSchema` (`schemaVersion` «ціле ≥ 1», `savedAt` мс, `appVersion`, `contentVersion`, `economyConfig` «`EconomyConfig` | null; null до першої покупки рівня», `checksum` «8 hex», `game`)
- [X] T005 `src/save/migrations.ts`: `type Migration`, `MIGRATIONS: Record<number, Migration> = {}` з коментарем-правилом (FR-9)

## Phase 3: US1 — прогрес не губиться (P1) 🎯

**Independent Test**: AC-1, AC-5; перезавантаження web-сторінки зберігає прогрес

- [X] T006 [P] [US1] `src/save/__tests__/repository-test.ts`: запис → читання дає той самий стан; AC-1 (12 с + фон = 3 записи, `savedAt` останнього = мить фону) через `createAutosave` з фейковими таймерами; AC-5 (3 сесії → рівно 2 знімки, bak1 = стан на початку 3-ї)
- [X] T007 [US1] `src/save/repository.ts`: `serialize` (порядок полів фіксований, checksum = fnv1a решти), `writeSave` (try/catch → false), `loadSave` (parse → schemaVersion → checksum → міграції → zod), `snapshot` (лише валідний `save`: bak1 → bak2, save → bak1), `installId(kv, uuid)`
- [X] T008 [US1] `src/features/boot/autosave.ts`: `createAutosave({ kv, getSave, intervalMs: 5000 })` → `start()`, `stop()`, `saveNow()`; AppState `background` → `saveNow()` (FR-2); повтор на наступному тіку, якщо запис не вдався
- [X] T009 [US1] `src/features/conveyor/store.ts`: `createConveyorStore` приймає початковий `EconomyState` і ефекти з запису; `toSave()` віддає `GameSave`; прострочені ефекти прибираються

## Phase 4: US2 — пошкоджене збереження (P1)

**Independent Test**: AC-3, AC-4, AC-6 (без RevenueCat); зіпсований `save` у web → `save-error` → відновлення

- [X] T010 [P] [US2] `src/save/__tests__/corrupt-test.ts`: AC-3 (обрізаний `save` + валідний знімок → `corrupt` з `backup`, `save` не перезаписано), AC-4 (`restoreFromBackup` пише знімок як `save`, офлайн від його `savedAt`), AC-6 (без валідних знімків → `backup: null`); причини `parse`, `checksum`, `schema`
- [X] T011 [US2] `src/save/repository.ts`: `latestBackup`, `restoreFromBackup` (FR-6)
- [X] T012 [US2] `src/save/report.ts`: `reportCorruptSave({ reason, schemaVersion, sizeBytes })` → `Sentry.captureMessage` з тегами, без тіла й позивного (FR-8, ВП-9); no-op без DSN
- [X] T013 [US2] `src/features/boot/SaveErrorScreen.tsx` + `texts.ts` (рядки `save.*` зі spec, «на вичитку»): стани «є резервна копія» (час знімка, рівень, підписи, бали) і «копії немає»; «Відновити з копії», «Почати заново» (новий стан, той самий `install_id`), «Надіслати звіт»; на SE текст скролиться, кнопки внизу

## Phase 5: US3 — після оновлення справа на місці (P1)

**Independent Test**: AC-7, AC-8

- [X] T014 [P] [US3] `src/save/__tests__/migration-test.ts`: фікстурні міграції 1 → 2 → 3: AC-7 (знімок перед міграцією, результат схеми 3, `onMigrating` викликано; зламана 2 → 3 → вихідний запис цілий, `corrupt` з `reason: 'migration'`, `from 1`, `to 3`); AC-8 (запис схеми 4 від 1.2.0 → `newer`, MMKV байт у байт той самий)
- [X] T015 [US3] `src/save/repository.ts`: ланцюжок міграцій зі знімком; при збої — спроба мігрувати знімки (FR-10); `newer` без читання й запису (FR-11)
- [X] T016 [US3] `src/features/boot/ForceUpdateScreen.tsx` (рядки `upd.*`, телеграма № 1100): «Встановлено {v}», «Потрібно щонайменше {v}», кнопка в стор (`Linking.openURL`; адреса сторінки стору — плейсхолдер до реєстрації в сторах)
- [X] T017 [US3] `src/features/boot/BootScreen.tsx`: «коротке» (лого), «довге» після 1 с з «неписаною істиною» (`boot.truth.*`, тап гортає), «міграція» (`boot.migr_*`)

## Phase 6: US4 — переведений годинник (P1)

**Independent Test**: AC-9, AC-10, AC-11

- [X] T018 [P] [US4] `src/economy/__tests__/time-test.ts`: AC-10 (вихід 14:00, буст ×2 на 3 год, повернення о 12:00 → Δ < 0, офлайн 0, буст «ще 3:00:00» після зсуву); AC-9 (онлайн за монотонним годинником: 1 хв при 1 000/хв = 1 000 незалежно від стрибка стінного годинника); AC-11 (ліміт ×2 3/3 на 10.10: 09.10 → 3/3, 11.10 → 0/3 — через `offlineDoublesLeft` з 001); `isNewSession` (холодний старт, 119 с, 120 с)
- [X] T019 [US4] `src/economy/game/time.ts`: `absence`, `shiftTimers` (`fuelEndMs`, `catBonusAtMs`, `tapTimes`, `startMs`/`endMs` ефектів), `isNewSession`
- [X] T020 [US4] `useBoot` і `useGameLoop`: при поверненні з Δ < 0 — зсув і тост `toast.clock`, без довідки; при Δ ≥ 0 — офлайн як у 001; при новій сесії — `snapshot`

## Phase 7: US5 — закріплення конфігу (P2)

**Independent Test**: AC-15 (без мережі → bundled закріплено на першій покупці)

- [X] T021 [P] [US5] `src/save/__tests__/config-test.ts`: до першої покупки `economyConfig` null; перша доменна подія `purchase` → закріплено `econ-v7.2`, `source: 'bundled'`; після перезапуску з іншим вбудованим конфігом гравець лишається на закріпленому з `source: 'cached'`
- [X] T022 [US5] стор і `useBoot`: закріплення на першій покупці рівня (FR-22); при завантаженні закріплений конфіг має пріоритет

## Phase 8: Запуск і маршрут

- [X] T023 `src/features/boot/useBoot.ts` + `src/app/index.tsx`: читання, `installId`, маршрут `force-update` → `save-error` → (онбординг 002) → `offline-return` → `main` (FR-29); автозапис; знімок на старті сесії; OTA не перезапускає гру (FR-30 — expo-updates не викликаємо в сесії)
- [X] T024 [P] `src/features/boot/__tests__/boot-test.tsx`: AC-19 без онбордингу (порожнє сховище → main; запис із відсутністю 3 год і діловодами → offline-return; обрізаний запис → save-error; новіша схема → force-update)

## Phase 9: Polish

- [X] T025 Web-сценарії quickstart § 3 у Chromium 375×667 (`page.clock`), скріншоти
- [X] T026 [P] `.maestro/save-restore.yaml` (покупка → `stopApp` → `launchApp` → рівень на місці)
- [ ] T027 Агенти `content-reviewer` (тексти boot/save-error/force-update) і `spec-guardian`; виправлення
- [X] T028 Документація: CLAUDE.md (`src/save`), `npm run check`

## Поза етапом 1

FR-16…FR-19, FR-34…FR-38 (003), FR-20/21/23/25 (етап 5), FR-26/27/39 (після вибору CDN, ВП-5), FR-31…FR-33 (002–005), AC-2 «Стартовий набір» (08), `app_error_log`/`session_start`/`force_update_show` — етап 5.

## Dependencies

Setup → Foundational → US1 → US2, US3 (паралельно) → US4 → US5 → запуск → Polish.
