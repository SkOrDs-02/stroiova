# Implementation Plan: 002 Онбординг і перша сесія — етап 1

**Branch**: `002-onboarding` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: `specs/002-onboarding/spec.md`; рішення 18, 19, 45, 52, 55, 56, 57, 58.

## Summary

Новий гравець проходить кроки 1–9: титул, вступ, позивний і форма «він / вона», перший акт з 8 тапів (16 підписів, рішення 57), ПОГОДЖЕНО й «Пташка» ×2 на 20 хв ігрового часу, головний екран першої сесії з коучем (покращення Рапортів, найм Олі), телеграма № 1 і дзвінок «Археологу» з бонусом архіву. Стан онбордингу й ігровий час зберігаються в записі (схема 2, міграція 1 → 2). Кроки 10–11 (перша реклама, запит сповіщень) приходять з 08 і 10; стан кроків уже під них.

## Обсяг

| FR | Етап 1 | Чому відкладено |
| --- | --- | --- |
| FR-1, FR-2, FR-4…FR-9, FR-11…FR-17, FR-28, FR-29 | ✅ | — |
| FR-3 | ✅ системних вікон немає взагалі | UMP — 08, сповіщення — 10 |
| FR-10 | ✅ позивний лише в записі; у звіті Sentry його немає | події PostHog — етап 5 |
| FR-12 | ✅ ×2, хаптика, тремтіння, Reduce Motion | звуки SFX-01/03/21 — етап 8 (арт і звук); хук `play()` готовий, зараз без звуку |
| FR-18, FR-19 | ✅ телеграма № 1 з `content/telegrams.json`, мінімальні `tg-detail` і `tg-result` (стан «перший раз»), ефект `slow` | вхідні, репутація як система, перевірки (`inspPct`), `durationMin` — 03, 04; вибір зберігається для 03 |
| FR-20 | ✅ | — |
| FR-21…FR-27 | — | 08 (реклама, UMP) і 10 (сповіщення); крок 10 починається, коли з'явиться 08 |
| FR-30 | доменні записи кроків (час, `is_skipped`) | відправлення подій — етап 5 (PostHog) |

AC етапу: 1 (без PostHog), 2, 3, 4, 5 (Sentry-частина), 6 (без звуку), 7 (без звуку), 8, 9, 10, 11 (без PostHog), 12, 13, 19 (перша частина). AC-14…AC-18 — у 08 і 10.

## Technical Context

**Language/Version**: TypeScript 6 strict

**Primary Dependencies**: zustand, expo-haptics (нове), react-native `Animated` і `AccessibilityInfo` (Reduce Motion), zod; модуль економіки 001, збереження 009

**Storage**: MMKV через `src/save` (схема 2: `game.onboarding`, `game.playtimeMs`)

**Testing**: Jest + Testing Library; чисті функції кроків; екрани з мокнутим `useGameLoop`; web-сценарій у Chromium 375×667 з `page.clock`

**Target Platform**: iOS, Android (development build), web для перевірки

**Project Type**: mobile-app

**Performance Goals**: тап акта ≤ 1 кадр; коуч не перемальовує головний екран частіше за кадр гри

**Constraints**: числа лише з конфігу економіки (`tapValue`, `onboardingBirdMin`, `onboardingBirdMult`, `archiveBonusMin`, ціни); поріг 420 с — `archiveBonusAtSec` з конфігу, 300 с — зі специфікації (FR-18; константа в `steps.ts`); позивний не виходить у звіти

**Scale/Scope**: ~6 екранів і оверлеїв, модуль кроків, міграція схеми

## Constitution Check

| Принцип | Як | Стан |
| --- | --- | --- |
| I | Механіки зі spec 002 і рішень 56–58; числа з `bundledConfig.params` (поріг 420 с = `archiveBonusAtSec`); 300 с з FR-18 | ✅ |
| II | Кроки, ігровий час, «Пташка» — чисті функції (`steps.ts`, економіка); годинник лише в застосунку | ✅ |
| III | AC — тести; міграція 1 → 2 з фікстурою v1; web-сценарій кроків 1–9 | ✅ |
| IV | Тексти з texts.md, розділ 5, без «—» (рішення 55); нові рядки на вичитку; `text-review` | ✅ |
| V | Позивний лише в MMKV; `sendDefaultPii: false`; звіт Sentry без `game` | ✅ |
| VI | Екрани на `@/theme`; кнопки ≥ 44 px; SE 375×667; масштаб шрифту до ×1,3 | ✅ |
| VII | Подій не шлемо (етап 5); дані кроків для `onboarding_step_complete` зберігаються | ✅ |
| VIII | Без бекенду; стоп-слова — вбудований контент | ✅ |

## Project Structure

```text
specs/002-onboarding/
├── plan.md · research.md · data-model.md · quickstart.md · contracts/onboarding-api.md · tasks.md

content/
├── callsign-stopwords.json          # рішення 58
└── schema/callsign-stopwords.schema.json

src/
├── economy/game/types.ts            # Effect.source + 'onboarding_bird'
├── economy/game/income.ts           # multStack: onboarding_bird
├── save/schema.ts, migrations.ts    # схема 2, міграція 1 → 2
├── features/onboarding/
│   ├── steps.ts                     # чистий стан кроків: start/complete/ready, пороги
│   ├── callsign.ts                  # перевірка позивного, шаблони {m:…|f:…}
│   ├── texts.ts                     # o1–o4, b6–b9, c7
│   ├── TitleScreen.tsx · IntroScreen.tsx · CallsignScreen.tsx · CallsignSheet.tsx · FirstActScreen.tsx
│   ├── OnboardingScreen.tsx         # екран за кроком 1–5
│   ├── ClerkFirst.tsx · CallOverlay.tsx
│   ├── haptics.ts                   # expo-haptics + Reduce Motion + налаштування (10) пізніше
│   └── __tests__/
├── features/telegrams/              # мінімум для кроку 8; 03 розширює
│   ├── TelegramDetail.tsx · TelegramResult.tsx · first.ts
├── features/main/                   # головний екран: коуч (R6), таббар, оверлеї кроків 7–9
│   └── MainScreen.tsx
├── ui/                              # Button, TabBar, type(), рядки компонентів
├── features/conveyor/store.ts       # ігровий час, «Пташка», актові тапи, онбординг у сторі
└── app/index.tsx                    # game → онбординг (кроки 1–5) або main
```

## Phases (для /speckit-tasks)

1. Рішення й контент: стоп-слова (схема, `check_content.py`), тексти без «—».
2. Фундамент: `onboarding_bird` в економіці, схема 2 + міграція, `steps.ts`, ігровий час і «Пташка» в сторі.
3. Кроки 1–3: титул, вступ, позивний, шторка (AC-1…AC-5).
4. Кроки 4–5: акт, ПОГОДЖЕНО, хаптика, Reduce Motion (AC-6, AC-7).
5. Кроки 6–7: `main` першої сесії, таббар, коуч, `clerk-first` (AC-8…AC-10).
6. Кроки 8–9: телеграма № 1, `tg-detail`/`tg-result`, дзвінок і бонус (AC-11…AC-13).
7. Відновлення після вбивства (AC-19), web-сценарій, `spec-guardian`, `content-reviewer`.

## Complexity Tracking

Порушень немає.
