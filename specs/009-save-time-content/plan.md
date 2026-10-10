# Implementation Plan: 009 Збереження, час і оновлення контенту — етап 1

**Branch**: `009-save-time-content` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: `specs/009-save-time-content/spec.md`; рішення 23, 41, 45, 49, 50, 52.

## Summary

Прогрес переживає закриття застосунку: стан гри (001) зберігається в MMKV кожні 5 с і при переході у фон, із контрольною сумою, zod-схемою, двома знімками й ланцюжком міграцій. Пошкоджений запис веде на `save-error` з відновленням із копії; запис новішої схеми — на `force-update`. Між сесіями Δ рахується від `savedAt`; годинник назад зсуває таймери й не дає офлайну. `boot` маршрутизує save-error → offline-return → main. Вбудований конфіг закріплюється на першій покупці рівня.

## Обсяг

| FR | Етап 1 | Чому відкладено |
| --- | --- | --- |
| FR-1…FR-15 | ✅ | — |
| FR-22 | ✅ вбудований конфіг; прапор — етап 5 | PostHog (етап 5) |
| FR-28…FR-30 | ✅ без онбордингу | онбординг — 002 |
| FR-16…FR-19, FR-34…FR-38 | — | контент, OTA, мішки й ліміт реплік потрібні з 003 (телеграми) |
| FR-20, FR-21, FR-23, FR-25 | частково (FR-20 вбудований конфіг уже є з 001) | віддалений конфіг і глобальні властивості — етап 5 |
| FR-26, FR-27, FR-39 | — | адреса CDN не вирішена (ВП-5); `force-update` з'являється для FR-11 |
| FR-31…FR-33 | — | черга модалок, коли з'являться модалки 002–005 |

AC етапу: 1, 3, 4, 5, 6 (без RevenueCat — 08), 7, 8, 9, 10, 11, 19 (без онбордингу). Решта — у фічах-власниках.

## Technical Context

**Language/Version**: TypeScript 6 strict

**Primary Dependencies**: react-native-mmkv 4 + react-native-nitro-modules, zod 4, expo-crypto (UUID), zustand, @sentry/react-native (уже є)

**Storage**: MMKV (`save`, `save.bak1`, `save.bak2`, `install_id`); web — localStorage

**Testing**: Jest + Testing Library; пам'ятний `KeyValue`; фікстури записів і фікстурні міграції

**Target Platform**: iOS, Android (development build — MMKV нативний), web для перевірки

**Project Type**: mobile-app

**Performance Goals**: запис ≤ 5 мс (стан ~2 КБ); `boot` із синхронним читанням < 1 с

**Constraints**: стан економіки чистий (001), годинник лише в шарі застосунку; `install_id` поза `save`; без персональних даних у звіті Sentry

**Scale/Scope**: ~8 модулів `src/save` і `src/features/boot`, 3 екрани (`boot`, `save-error`, `force-update`)

## Constitution Check

| Принцип | Як | Стан |
| --- | --- | --- |
| I | Кожна функція — FR 009; тексти екранів — зі специфікації (на вичитку); нових чисел немає (5 с, 120 с, 1 с, 2 знімки — зі специфікації) | ✅ |
| II | Зсув таймерів і Δ — чисті функції в `src/economy/game/time.ts`; годинник читає лише застосунок | ✅ |
| III | AC — тести на пам'ятному сховищі; міграції — тест на кожну попередню схему (зараз фікстурні 1 → 3); Maestro `save-restore.yaml` | ✅ |
| IV | Тексти `save-error`/`force-update`/`boot` зі специфікації, позначка «на вичитку»; `text-review` перед PR | ✅ |
| V | Звіт Sentry без позивного й тіла запису (`sendDefaultPii: false`) | ✅ |
| VI | Екрани на `@/theme`; кнопки ≥ 44 px; на SE текст скролиться, кнопки внизу | ✅ |
| VII | Подій не шлемо (етап 5); доменні результати (`LoadResult.reason`, `Absence`) готові до `app_error_log`/`session_start` | ✅ |
| VIII | zustand + MMKV, без бекенду; CDN-частину не будуємо без адреси | ✅ |

## Project Structure

```text
specs/009-save-time-content/
├── plan.md · research.md · data-model.md · quickstart.md · contracts/save-api.md · tasks.md

src/
├── save/
│   ├── storage.ts        # KeyValue: MMKV / localStorage
│   ├── checksum.ts       # FNV-1a
│   ├── schema.ts         # zod: SaveFile, GameSave v1; CURRENT_SCHEMA
│   ├── migrations.ts     # MIGRATIONS (зараз порожній)
│   ├── repository.ts     # serialize, loadSave, writeSave, snapshot, restoreFromBackup, installId
│   ├── report.ts         # звіт Sentry (FR-8)
│   └── __tests__/
├── economy/game/time.ts  # absence, shiftTimers, isNewSession
├── features/boot/
│   ├── useBoot.ts        # читання, маршрут, автозапис, сесії
│   ├── BootScreen.tsx    # коротке / довге / міграція
│   ├── SaveErrorScreen.tsx
│   ├── ForceUpdateScreen.tsx
│   └── texts.ts
├── features/conveyor/    # стор отримує початковий стан і конфіг із запису; тост годинника
└── app/index.tsx         # boot → маршрут
```

## Phases (для /speckit-tasks)

1. Залежності, `KeyValue`, checksum, zod-схема.
2. Репозиторій: запис, читання, перевірки, міграції, знімки, відновлення, install_id (AC-1, 3, 5, 7, 8).
3. Час: `absence`, `shiftTimers`, `isNewSession` (AC-9, 10, 11).
4. Конфіг: закріплення на першій покупці (FR-22).
5. Запуск і екрани: `useBoot`, `boot`, `save-error`, `force-update`, автозапис, тост годинника (AC-4, 6, 19).
6. Перевірка: web-сценарії quickstart, Maestro `save-restore.yaml`, `spec-guardian`, `text-review`.

## Complexity Tracking

Порушень немає.
