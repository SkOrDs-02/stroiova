# Implementation Plan: 010 Сповіщення, налаштування й приватність - етап 1

**Branch**: `010-settings-notifications` (від `main`) | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: `specs/010-notifications-settings/spec.md`; рішення 5, 9, 15, 17, 18, 85-90; 003/004/005/008 (події, що породжують сповіщення), 007 (курйози), 009 (запис, `install_id`).

## Summary

Меню, налаштування (звук, вібрація, 5 категорій сповіщень, статистика, відновлення покупок, скидання), особова справа, «Про гру», звіти фонду, ліцензії й планувальник 10 локальних сповіщень (не частіше 2 на добу). Планувальник - чистий модуль `src/notifications/`; доставку ОС робить `NotificationService` (заглушка до етапу 2). Запис - схема 9.

## Обсяг

| FR | Етап 1 | Що відкладено й куди |
| --- | --- | --- |
| FR-1…FR-8 | ✅ каталог, ліміт, пріоритет, категорії, тихі години, скасування при поверненні, тексти з пулів `push.*` | справжній `expo-notifications`, тап по сповіщенню (`push_open`, FR-8) - етап 2 |
| FR-9…FR-12 | ✅ `push-preprompt` з налаштувань, стани дозволу, «Відкрити налаштування телефону» через сервіс | вхід з кроку 11 онбордингу - 02; системні запити - етап 2 |
| FR-13…FR-16 | ✅ розділи, звук, вібрація (хаптика гасне), категорії, статистика як прапор | звуків ще немає; `optOut` PostHog - етап 5 |
| FR-17, FR-22 | ❌ | UMP - етап 2 |
| FR-18 | ✅ «Відновити покупки» (`restore('settings_button')`) | - |
| FR-19, FR-20 | ✅ `reset-confirm` у два кроки, стирання з урахуванням покупок | - |
| FR-21 | ✅ у збірці немає ATT-залежностей (перевіряє тест `package.json`) | перевірка Info.plist архіву - етап 2 |
| FR-23 | ❌ | PostHog/Sentry - етап 5 |
| FR-24 | ❌ | системне вікно оцінки - етап 2 |
| FR-25 | ✅ посилання через сервіс `Links` (заглушка) | відкриття в зовнішньому браузері - етап 2 |
| FR-26 | ✅ `profile`, «Рапорт на зміну позивного» | - |
| FR-27, FR-28 | ✅ `about`, `fund-reports` (порожній стан), ID з копіюванням через сервіс | CDN зі звітами - окремо |
| FR-29 | ✅ `licenses`: шрифти, бібліотеки з `package.json` | звуки - коли з'являться (art.md) |
| FR-30 | ✅ `menu` з бейджем курйозів | - |

AC етапу: 1-6 (на сервісах-підставках), 8-10, 13, 14, 17 (не робиться), 18-21 частково; AC-7, 11, 12, 15, 16, 17 - етап 2/5.

## Technical Context

TypeScript strict · zustand, zod 4 · MMKV, схема 9 (`game.settings`, `game.notifications`, `museum.curiosSeen`), міграція 8 → 9 · Jest + Testing Library · числа з `DEFAULTS` (`storageHours`, `fuelBonusThreshold`, `adHours`) і `content/lines.json` (`push.*`).

## Constitution Check

| Принцип | Як | Стан |
| --- | --- | --- |
| I | Механіки зі spec 010 і рішень 85-90; числа з конфігу | ✅ |
| II | `src/notifications/` без React і годинника; ОС - інтерфейс | ✅ |
| III | AC - тести; міграція 8 → 9 з фікстурою | ✅ |
| IV | Тексти з артбордів і stores.md, пули `push.*`; `text-review` | ✅ |
| VI | `@/theme` | ✅ |
| VII | Доменні `settingChange`; PostHog - етап 5 | ✅ |
| VIII | Без бекенду; локальні сповіщення | ✅ |

## Project Structure

```text
src/notifications/        types.ts · catalog.ts · planner.ts · __tests__/
src/services/             notifications.ts (заглушка NotificationService), links.ts
src/features/settings/    MenuSheet · SettingsScreen · ResetConfirm · ProfileScreen · AboutScreen · FundReportsScreen · LicensesScreen · PushPreprompt · texts.ts
src/features/conveyor/store.ts   зріз settings, notifications; goBackground, comeForeground, resetProgress
src/features/boot/useBoot.ts     AppState → планування
content/about.json        плейсхолдери [N], [ФОНД], посилання, пошта, ілюстратор
```

## Complexity Tracking

Порушень немає.
