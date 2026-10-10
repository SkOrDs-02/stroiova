# Implementation Plan: 001 Економіка ядра й офлайн

**Branch**: `001-core-economy` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-core-economy/spec.md`; рішення 48–53.

## Summary

Чистий модуль економіки `src/economy` у двох шарах. **core** — формули (ціни, виробіток, конвеєр, бали, інтеграл), які esbuild збирає в `balance/economy.js`, і `balance/sim.js` бере їх замість своїх копій: гра й симулятор рахують одним кодом (принцип II). Доказ — побітовий відбиток симулятора до й після рефакторингу. **game** — стан, покупки, діловоди, тапи, пальне, папір, офлайн із відрізками, поверх core. Плюс `formatBig` і мінімальний вертикальний зріз «тап → покупка → діловод → офлайн» на тимчасовій графіці. Повні екрани — 002, збереження — 009, ×2 за рекламу — 008, `track()` — етап 5.

## Technical Context

**Language/Version**: TypeScript 6 (strict, `noUncheckedIndexedAccess`), ES5-сумісний вихід бандла для sim.js (sim.js — ES5)

**Primary Dependencies**: Expo SDK 57, React 19.2, React Native 0.86, expo-router; нові: zustand (стан зрізу), esbuild (dev, бандл core)

**Storage**: немає (стан у пам'яті); MMKV — 009

**Testing**: Jest (`jest-expo`) + Testing Library; golden-тест запускає `balance/sim.js` у Node

**Target Platform**: iOS і Android (Expo), web — для перевірки в Chromium

**Project Type**: mobile-app (один застосунок) + Node-скрипт симулятора

**Performance Goals**: `advance` на кадр ≤ 0,1 мс (7 одиниць); golden-тест ≤ 60 с у CI; онлайн-цикл UI раз на кадр без помітних втрат FPS на iPhone SE

**Constraints**: core без React/RN/I-O/`Date.now`/`Math.random` (FR-1); порядок операцій із плаваючою комою як у sim.js (побітовий відбиток); числа лише з конфігу (принцип I)

**Scale/Scope**: Р1–Р2: 5 потоків, 4 ланки; ~15 функцій core, ~15 game, 1 екран зрізу

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Як дотримано | Стан |
| --- | --- | --- |
| I. Специфікація — джерело правди | Кожна функція game прив'язана до FR; числа лише з `preset-v7.json` (рішення 52); нових механік немає; `tapRateMax` і поріг 5 хв — зі специфікації | ✅ |
| II. Чиста економіка, спільна із симулятором | core — чистий TS, sim.js імпортує його бандл; час і seed — параметри; дохід від різниці міток | ✅ |
| III. Тести перед злиттям | Кожен AC 001 — `test('AC-n …')`; golden-відбитки sim.js; UI-зріз — тест рендеру й ручний сценарій quickstart § 5. Maestro e2e — з 002 (онбординг) | ✅ |
| IV. Червоні лінії | Нових текстів, крім службових підписів зрізу, немає; підписи з `texts.md`/001 | ✅ |
| V. Стори й приватність | Реклами, покупок і аналітики в цьому етапі немає | ✅ (н/з) |
| VI. Дизайн-система | Зріз лише на `@/theme`; ціль дотику ≥ 44 px | ✅ |
| VII. Аналітика за планом | Ядро повертає доменні події, відправки немає (research § 8) | ✅ |
| VIII. Простота | Без порту бота (research § 1), без MMKV, без break_infinity (рішення 53) | ✅ |

Повторна перевірка після Phase 1: без змін, порушень немає.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-economy/
├── spec.md
├── plan.md              # цей файл
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── economy-core.md  # API core, game, format і бандла
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── economy/
│   ├── core/                 # спільне з sim.js (бандл balance/economy.js)
│   │   ├── big.ts            # type Big = number (рішення 53)
│   │   ├── defaults.ts       # DEFAULTS, LEGACY, withDefaults, reachableLevels, levelItems
│   │   ├── formulas.ts       # capAt, priceAt, packPrice, milestoneTarget, prestigeMult, points
│   │   ├── flow.ts           # flow()
│   │   ├── integrate.ts      # integrate()
│   │   └── index.ts
│   ├── game/                 # стан і переходи гри
│   │   ├── types.ts          # EconomyConfig, EconomyState, Effect, DomainEvent, UnitRef
│   │   ├── state.ts          # newGame, newCycle, items for level
│   │   ├── income.ts         # income, multStack, baseIncomePerMin, fuel
│   │   ├── advance.ts        # advance (онлайн), offline (відрізки, сховище, папір)
│   │   ├── purchase.ts       # quote, buy, hire, nextPurchaseEtaSec
│   │   ├── actions.ts        # tap (ліміт), refuel, catTap
│   │   └── index.ts
│   ├── format.ts             # formatBig, formatRate, formatMult, formatDuration, formatCountdown
│   ├── config.ts             # вбудований конфіг: preset-v7.json → EconomyConfig econ-v7.2
│   ├── index.ts
│   └── __tests__/            # golden-test.ts, ac-*.test.ts, format-test.ts
├── features/conveyor/        # тимчасовий зріз: store (zustand), useGameLoop, ConveyorScreen, OfflineReturn
└── app/index.tsx             # показує ConveyorScreen

balance/
├── economy.js               # згенеровано esbuild з src/economy/core (руками не правити)
├── golden/fingerprints.json # відбитки sim.js до рефакторингу
├── sim.js                   # бере формули з economy.js
└── sandbox/build.py         # вбудовує economy.js перед sim.js

tools/
└── build_economy.mjs        # esbuild + --check
```

**Structure Decision**: один застосунок Expo; економіка — каталог `src/economy` з двома шарами, щоб core можна було зібрати окремо для симулятора без коду гри. Тести поруч із кодом у `__tests__/` (CLAUDE.md).

## Phases (для /speckit-tasks)

1. **Golden до змін.** Скрипт знімає відбитки поточного sim.js → `balance/golden/fingerprints.json`; тест AC-1 на preset-v5.
2. **core.** Порт `withDefaults`/`levelItems`/`capAt`/`priceAt`/`flow`/`points`/`integrate` у TS дослівно; бандл esbuild; sim.js переходить на `E.*`; golden-тест зелений; build.py вбудовує бандл; CI-перевірка свіжості бандла; ESLint-обмеження для `src/economy/core`.
3. **game.** Типи й стан → income/multStack/baseIncome → покупки й діловоди → тапи, пальне, папір, кіт → advance і offline з відрізками → ETA. AC-2…AC-21 як тести (preset-v5).
4. **format.** `formatBig` і друзі, AC-18.
5. **Зріз UI.** zustand-стор, ігровий цикл на монотонному годиннику, екран «Конвеєр», довідка повернення через AppState; тест рендеру; ручний сценарій quickstart § 5.
6. **Документація.** `balance/README.md` (бандл, відбиток), CLAUDE.md (команди), скіл `balance-change` (бандл замість окремих правок формул).

## Complexity Tracking

Порушень конституції немає.
