---
description: "Задачі: 001 Економіка ядра й офлайн"
---

# Tasks: 001 Економіка ядра й офлайн

**Input**: `specs/001-core-economy/` — plan.md, spec.md, research.md, data-model.md, contracts/economy-core.md, quickstart.md

**Tests**: обов'язкові (конституція, принцип III): кожен AC — `test('AC-n: …')`; фікстура — `balance/preset-v5.json` (рішення 52). Тести пишемо перед реалізацією й бачимо, що вони падають.

**Organization**: за історіями гравця зі spec.md. Пріоритет — порядок, у якому зріз «тап → покупка → діловод → офлайн» стає грабельним.

| Історія | Зі spec.md | Пріоритет |
| --- | --- | --- |
| US1 | Як розробник: гра й симулятор рахують одним модулем | P1 |
| US2 | Як новачок: бачити, яка ланка гальмує дохід | P1 |
| US3 | Купити рівні до віхи одним тапом | P1 |
| US4 | Найняти діловода, щоб конвеєр працював без мене | P1 |
| US5 | Тапати печатку будь-коли | P2 |
| US6 | Бачити всі множники в одному місці (+ пальне, папір, кіт) | P2 |
| US7 | Довідка повернення; без діловодів — зрозуміти чому | P1 |

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: залежності, скрипти, каталоги

- [X] T001 Встановити zustand (`npx expo install zustand`) і esbuild (`npm i -D esbuild`), прогнати `npx expo-doctor`; `package.json`
- [X] T002 Створити каталоги `src/economy/core/`, `src/economy/game/`, `src/economy/__tests__/`, `src/features/conveyor/`, `balance/golden/` згідно з plan.md
- [X] T003 [P] ESLint: для `src/economy/**` заборонити імпорти `react`, `react-native`, `react-native-mmkv`, `zustand` і виклики `Date.now`, `Math.random` (`no-restricted-imports`, `no-restricted-properties`) у `eslint.config.js`
- [X] T004 [P] Скрипти в `package.json`: `build:economy` (`node tools/build_economy.mjs`), `golden` (`node tools/golden.mjs`); `check` доповнити `npm run build:economy -- --check`

---

## Phase 2: Foundational

**Purpose**: відбитки симулятора ДО будь-яких змін sim.js; типи, без яких не почати жодну історію

**⚠️ CRITICAL**: T005–T006 виконати до першої правки `balance/sim.js`

- [X] T005 Скрипт `tools/golden.mjs`: для `preset-v5`, `preset-v6`, `preset-v7` × зерна 1–3 × `SCENARIOS` (3) запускає `simulate(withDefaults(P.params) з seed)` і пише SHA-1 від `JSON.stringify({ simulate, levelStats, eventStats })` у `balance/golden/fingerprints.json`; режим `--check` порівнює й виходить з 1 при розбіжності; заміряти час (ціль ≤ 60 с)
- [X] T006 Запустити `node tools/golden.mjs` на незміненому sim.js і закомітити `balance/golden/fingerprints.json`
- [X] T007 [P] `src/economy/core/big.ts`: `export type Big = number` з коментарем про рішення 53
- [X] T008 [P] `src/economy/game/types.ts`: `UnitDef`, `LevelDef`, `EconomyParams`, `EconomyConfig { version; source: 'bundled' | 'remote' | 'cached'; params }`, `EconomyState` (поля й правила з data-model.md: `streamLevels` «0 = замкнено. Новий цикл: [1, 0, 0, 0]», `stageLevels` «Новий цикл: усі 1», `signatures` «≥ 0», `prestigePoints` «ціле ≥ 0», `paper` «Дробове, на екрані ціле вниз»), `Effect { kind: 'mult' | 'factor'; source; value; target?; startMs; endMs }`, `UnitRef`, `DomainEvent`

**Checkpoint**: відбитки зафіксовано, типи є

---

## Phase 3: US1 — гра й симулятор рахують одним модулем (P1) 🎯

**Goal**: формули core у TS, sim.js бере їх із бандла, відбиток не змінився (принцип II, FR-1, FR-2, AC-1)

**Independent Test**: `node tools/golden.mjs --check` і `npm test -- golden` зелені; AC-1 на preset-v5

### Tests

- [X] T009 [P] [US1] `src/economy/__tests__/golden-test.ts`: (1) запускає `tools/golden.mjs --check` логікою в процесі й порівнює з `balance/golden/fingerprints.json`; (2) AC-1: preset-v5, сценарій `ads`, перший діловод 184 с (3,07 хв ±1%), перша цифровізація 3,13 дня ±1%, `level2At` 7 днів ±1%
- [X] T010 [P] [US1] `src/economy/core/__tests__/formulas-test.ts`: для всіх одиниць preset-v5 і preset-v7, рівнів 1–2 і L ∈ {0, 1, 24, 25, 50, 100}: `capAt`, `priceAt` з TS дорівнюють sim.js (`===`); контрольні значення spec: Рапорти 1→2 = 8, 24→25 = 108,42, ×10 з 1-го = 140,39, «до віхи» з 1-го = 945,24, Акти 10→11 = 360,49, виробіток 24/25/50 = 144/300/1 200
- [X] T011 [P] [US1] `src/economy/core/__tests__/defaults-test.ts`: `withDefaults` і `levelItems` з TS дають `toEqual` з sim.js для preset-v5/v6/v7 і рівнів 1…`reachableLevels`

### Implementation

- [X] T012 [P] [US1] `src/economy/core/defaults.ts`: дослівний порт `DEFAULTS`, `SCENARIOS`, `LEGACY`, `copyInto`, `withDefaults`, `reachableLevels`, `levelItems` з `balance/sim.js` (ті самі гілки й порядок полів); додати `tapRateMax: 10` у `DEFAULTS` (на бота не впливає)
- [X] T013 [P] [US1] `src/economy/core/formulas.ts`: `capAt`, `priceAt` (дослівно), `packPrice(def, L, n)` (сума `priceAt` по рівнях, як цикл у sim.js `options()`), `milestoneTarget(L, p)`, `prestigeMult(P, p)`, `points(life, divisor, p)`
- [X] T014 [P] [US1] `src/economy/core/flow.ts`: `flow({ streams: { cap, on, share? }[], stages: { cap, on }[] })` → `{ sum, pipe, which, v }`; share: `z = base · sum`, далі `z *= f` для кожного з `factors` по черзі; pipe з `Infinity`, `which` — перша мінімальна ланка (`<`, не `≤`)
- [X] T015 [P] [US1] `src/economy/core/integrate.ts`: `integrate(cuts, rateAt)` = Σ `rateAt((x₀+x₁)/2) · (x₁ − x₀)` по відсортованих точках, пропуск x₁ ≤ x₀
- [X] T016 [US1] `src/economy/core/index.ts` — реекспорт; `tools/build_economy.mjs`: esbuild IIFE `globalName: 'StroiovaEconomy'`, `target: 'es2015'`, футер `if (typeof module !== 'undefined') module.exports = StroiovaEconomy;`, вихід `balance/economy.js` з шапкою «Згенеровано … руками не правити»; `--check` порівнює з файлом
- [X] T017 [US1] `balance/sim.js`: на початку `var E = typeof StroiovaEconomy !== 'undefined' ? StroiovaEconomy : require('./economy.js');`; замінити тіла `DEFAULTS`/`SCENARIOS`/`LEGACY`/`withDefaults`/`reachableLevels`/`levelItems`/`capAt`/`priceAt` на `E.*`; усередині `simulate` — `flow` через `E.flow` (збираючи `cap` через `capU` і `sfac` так само, як зараз), `points` через `E.points`, `1 + p.prestigeBonus * prestigeTotal` через `E.prestigeMult`, офлайн-цикл по `cuts` через `E.integrate`; `module.exports` без змін
- [X] T018 [US1] Прогнати `node tools/golden.mjs --check`; при розбіжності знайти зміну порядку операцій і виправити в core, не в відбитках
- [X] T019 [US1] `balance/sandbox/build.py`: читати `../economy.js` і вбудовувати перед sim.js в обох місцях (worker-текст і `<script>`); перевірити `python3 balance/sandbox/build.py` і що сторінка відкривається в Chromium без помилок консолі
- [X] T020 [US1] CI: у `.github/workflows/app.yml` крок `npm run build:economy -- --check`; у `.github/workflows/content.yml` крок `node tools/golden.mjs --check` (paths `balance/**`, `src/economy/core/**`)

**Checkpoint**: один код формул для гри й симулятора, відбиток незмінний

---

## Phase 4: US2 — бачити, яка ланка гальмує дохід (P1)

**Goal**: стан гри, дохід, вузьке місце, рядок «Потоки → Погодження» (FR-4, FR-5, FR-6, FR-12, FR-31)

**Independent Test**: AC-2, AC-3, AC-19 зелені; на екрані «Конвеєр» видно дохід і рядок вузького місця

### Tests

- [ ] T021 [P] [US2] `src/economy/__tests__/ac-income-test.ts`: AC-2 (потоки 4 392, ланки 2 880/3 600/4 464, M ×2,5 → 7 200/хв, вузько «kombat»), AC-3 (виробіток 144/300/1 200 і доменна подія `milestone` з `level` 25, `rateMultiplier` 2), AC-19 (Р2: Рапорти 1-го рівня 60/хв, ціна 40; Казначейство 210/хв, діловод 400; відкриття Наказів 15 млн), сума потоків = ланці → вузько «потоки»

### Implementation

- [ ] T022 [US2] `src/economy/game/state.ts`: `newGame(cfg, nowMs)` («Новий цикл: [1, 0, 0, 0]», ланки 1, без діловодів, `paper` = `paperStart`, `fuelEndMs` null), `itemsFor(state, cfg)` через `levelItems`, `newCycle(state)` за `reset()` sim.js із рішенням 48 (бусти, бак, папір, `hasNoAds`, `seenUnlocks` лишаються)
- [ ] T023 [US2] `src/economy/game/income.ts`: `income(state, cfg, nowMs, effects, { idle })` через `E.flow` (cap = `capAt` × музей × добуток `factor`-ефектів одиниці), `bottleneck` ('streams' або UnitRef), M у порядку FR-17; `baseIncomePerMin` (FR-31: без тимчасових множників і факторів)
- [ ] T024 [US2] `src/economy/config.ts`: вбудований конфіг з `balance/preset-v7.json` → `{ version: 'econ-v7.2', source: 'bundled', params: withDefaults(P.params) }` (рішення 52)
- [ ] T025 [P] [US2] `src/features/conveyor/store.ts`: zustand-стор `{ state, cfg, effects }` + дії, що викликають game; `src/features/conveyor/useGameLoop.ts`: монотонний годинник `performance.now()`, `advance` раз на кадр (requestAnimationFrame), пауза у фоні
- [ ] T026 [US2] `src/features/conveyor/ConveyorScreen.tsx`: шапка з балансом і доходом, блоки «Потоки» й «Погодження» (рівень, виробіток, замкнено/відкрито), рядок `main.flow` / `main.flow_s` зі специфікації; лише `@/theme`, цілі дотику ≥ `size.touchMin`; `src/app/index.tsx` показує екран

**Checkpoint**: дохід і вузьке місце видно

---

## Phase 5: US3 — купити рівні до віхи одним тапом (P1)

**Goal**: ×1 / ×10 / до віхи, округлення, «не вистачає», «до → після», відкриття потоків (FR-7…FR-13, FR-29)

**Independent Test**: AC-4, AC-5, AC-6 (покупки), AC-17 зелені; на екрані купуються рівні всіма режимами

### Tests

- [ ] T027 [P] [US3] `src/economy/__tests__/ac-purchase-test.ts`: AC-4 (ціна 8,96 → кнопка «9», баланс 8,99 → «8», покупка проходить; Акти закриті 300, 10→11 «361»), AC-5 (900 підписів: «до віхи» 946 неактивна з ETA; ×10 «141», 6 → 66/хв, після покупки рівень 11 і одна подія `purchase` з `mode` x10, `levelsBought` 10), AC-6 частина покупок (новий цикл: Довідки недоступні до Актів; повторне відкриття Актів без `unit-unlock`, `streamUnlock.unlockIndex` 2), AC-17 (дохід 1 000/хв, баланс 0, покупка 60 000 → `nextPurchaseEtaSec` 3 600)

### Implementation

- [ ] T028 [US3] `src/economy/game/purchase.ts`: `quote(state, cfg, target, mode)` (`levels`, `price` через `packPrice`, `affordable` за точним порівнянням, `etaSec`, «до → після» для одиниці й доходу), `buy(...)` атомарно (новий стан або `{ error }`; потік відкривається лише після попереднього, FR-12), доменні події `purchase`, `streamUnlock`, `milestone`, `unitUnlockSeen` (FR-13 через `seenUnlocks`), `nextPurchaseEtaSec` (FR-29)
- [ ] T029 [US3] `src/features/conveyor/UnitRow.tsx`: перемикач ×1 / ×10 / до віхи, ціна (`formatBig` price), неактивна кнопка з `unit.wait`, «до → після»; підключити до `ConveyorScreen.tsx`

**Checkpoint**: покупки працюють

---

## Phase 6: US4 — найняти діловода (P1)

**Goal**: діловоди й ручний режим (FR-14, FR-15)

**Independent Test**: AC-6 (найм) зелений; кнопка «Найняти діловода» на кожній одиниці

### Tests

- [ ] T030 [P] [US4] `src/economy/__tests__/ac-clerk-test.ts`: найм списує `manager`, повторно не можна; `clerkHire.isFirstClerk` true лише першого разу за встановлення (AC-6: після нового циклу false); `income(idle)` = 0, поки немає діловода хоча б на одній ланці; діловоди на Рапортах і трьох ланках коштують 710 (preset-v5)

### Implementation

- [ ] T031 [US4] `src/economy/game/purchase.ts`: `hire(state, cfg, target, nowMs)` з подією `clerkHire { isFirstClerk, clerksCountAfter }`; стан «ручної» одиниці для UI
- [ ] T032 [US4] `src/features/conveyor/UnitRow.tsx`: кнопка «Найняти діловода · ціна», позначка «вручну» на одиниці без діловода

**Checkpoint**: діловоди наймаються

---

## Phase 7: US7 — довідка повернення (P1)

**Goal**: офлайн із відрізками, сховище, «Стройова стояла», поріг 5 хв (FR-15, FR-23…FR-28)

**Independent Test**: AC-7, AC-8, AC-14, AC-16 зелені; фон ≥ 5 хв → довідка з сумою

### Tests

- [ ] T033 [P] [US7] `src/economy/__tests__/ac-offline-test.ts`: AC-7 (10 год, 6/хв, M 1, порожній бак → 2 880, «8 год з 10», `cappedMs` 7 200 000), AC-8 (діловод лише на Стройовій → 0, `idle: true`), AC-14 (1 000/хв, буст ×2 ще 1 год, 3 год → 240 000; онлайн `advance` кроками 1/60 с і 1/15 с дає те саме число ±1e-9 відносно), AC-16 (13 год 5 хв, сховище 8 год → `cappedMs` 5 год 5 хв), відрізок ділиться в момент, коли бак доходить до 20% (бак на 6 год, повний на виході, відсутність 6 год → 4 год 48 хв з ×1,25)

### Implementation

- [ ] T034 [US7] `src/economy/game/advance.ts`: `advance(state, cfg, fromMs, toMs, effects)` (онлайн: інтеграл через `E.integrate` по точках зміни ефектів і бака, без проміжного округлення); `offline(state, cfg, leftAtMs, backAtMs, effects)` → `{ earned, awayMs, creditedMs, cappedMs, fuelBonusMs, idle, paper }` за FR-23/FR-24 (idle-flow, сховище × журнал № 2 якщо є, точки: ефекти, 20% бака, кінець сховища)
- [ ] T034a [US7] `src/economy/game/advance.ts`: `claimOffline(state, cfg, result, k, localDate)` — зараховує `earned × k` (k = 1 або `offlineAdMult`); лічильник ×2 за місцевою датою пристрою (`offlineDoubles { date, count }` у стані), ×2 доступне, поки `count < offlineAdPerDay`; повернення з ×1 лічильник не змінює (FR-26). Тест AC-15 (без реклами: 3 нагороди ×2 → стан «ліміт 3 з 3»; ×1 і новий день) у `src/economy/__tests__/ac-offline-test.ts`. Ролик і «Без реклами» — 008
- [ ] T035 [US7] `src/features/conveyor/OfflineReturn.tsx` + AppState у `useGameLoop.ts`: при поверненні після ≥ 5 хв — модалка з сумою, «зараховано 8 год з N», «Забрати»; стан «Стройова стояла» з `off.idle`; < 5 хв — тост `off.toast` і зарахування без модалки

**Checkpoint**: зріз «тап → покупка → діловод → офлайн» закрито (разом з US5)

---

## Phase 8: US5 — тапати печатку (P2)

**Goal**: печатка з лімітом 10/с, той самий M (FR-16)

**Independent Test**: AC-9 зелений; швидкі тапи обрізаються

- [ ] T036 [P] [US5] `src/economy/__tests__/ac-tap-test.ts`: AC-9 (M ×2,5 → +5 за тап; при «Комбата шукають» так само +5; 14 дотиків за 1 с → 10 тапів, +50)
- [ ] T037 [US5] `src/economy/game/actions.ts`: `tap(state, cfg, nowMs, effects)` з вікном `tapWindow { startMs, count }` і `tapRateMax`; лічильники сесії `tapsCount`, `tapSignatures` для `session_end`
- [ ] T038 [US5] `src/features/conveyor/Seal.tsx`: печатка на картці «Стройова частина» (колір `color.stamp`, ціль ≥ 44 px), haptics не підключаємо до 002

---

## Phase 9: US6 — усі множники в одному місці + пальне, папір, кіт (P2)

**Goal**: стос множників, факторів подій, бак, папір, кіт (FR-17…FR-22, FR-32)

**Independent Test**: AC-10, AC-11, AC-12, AC-13, AC-20, AC-21 зелені

- [ ] T039 [P] [US6] `src/economy/__tests__/ac-mult-test.ts`: AC-10 (38 балів, «Без реклами», буст ×2, бак 82% → рядки ×1,76, ×1,3, ×2, ×1,25, «Разом ×5,72», музей окремо), AC-11 (сумлінно на Фін → 2 232 і вузько, через 1 год 4 464; «Комбата шукають» → 720/хв, не 0; провалена перевірка → Стройова 1 800 на 1 год)
- [ ] T040 [P] [US6] `src/economy/__tests__/ac-fuel-paper-test.ts`: AC-12 (заправка порожнього: бак 6 год, ×1,25 діє 4 год 48 хв; `tank_capacity_sec` 21 600 / 43 200), AC-13 (папір 0 не впливає на дохід, тапи, офлайн), AC-20 (базовий 2 880, буст, бак 90%, «Комбата шукають» → посильний 4 хв = 11 520; кіт 14 400, потім 60 хв нічого), AC-21 (новий цикл: папір 30; Накладні 20-го рівня з діловодом, журнал № 3, 24 год → +5; подарунок Ліни +22)
- [ ] T041 [US6] `src/economy/game/income.ts`: `multStack(...)` (рядки з джерелом, значенням, кінцем; «Разом»; музей окремо, FR-19); пальне `fuelMult(state, nowMs, effects)` за FR-21 (поріг `fuelBonusThreshold`, `gift_generator`)
- [ ] T042 [US6] `src/economy/game/actions.ts`: `refuel` (FR-20, повертає `{ tankPctBefore, tankCapacitySec, bonusOffSec }` для `generator_refuel`), `catTap` (FR-32, раз на годину від `baseIncomePerMin`); папір у `advance`/`offline` (FR-22: Накладні × `paperPerMinPerLevel`, поза грою лише з діловодом і в межах сховища, журнал № 3 ×1,1, `paperGift`)
- [ ] T043 [US6] `src/features/conveyor/ConveyorScreen.tsx`: чип M із добутком і плитка бака з «Заправити» (тимчасово, без `boosts-sheet`)

---

## Phase 10: Polish

- [ ] T044 [P] `src/economy/format.ts` + `src/economy/__tests__/format-test.ts`: AC-18 (`formatBig` 9 999 → «9 999», 186 400 → «186 тис.», 2 412 000 → «2,41 млн», 999 990 000 000 → «1 aa», 1,23·10¹⁶ → «12,3 ab»; counter 1 248 360 → «1 248 360», 12 480 000 → «12,48 млн»; price угору, balance униз; U+00A0), `formatRate`, `formatMult`, `formatDuration`, `formatCountdown`; замінити тимчасове форматування в зрізі
- [ ] T045 [P] `src/features/conveyor/__tests__/conveyor-test.tsx`: рендер екрана, тап печатки збільшує баланс, покупка Рапортів ×1
- [ ] T046 Документація: `balance/README.md` (бандл `economy.js`, `tools/golden.mjs`, правило «формули правимо в `src/economy/core`»), `CLAUDE.md` (команди `build:economy`, `golden`), `.claude/skills/balance-change/SKILL.md` (крок бандла й відбитків)
- [ ] T046a [P] Maestro e2e (принцип III): `testID` на печатці, кнопках покупки й найму, «Забрати»; сценарії `.maestro/purchase.yaml` (тап печатки → покупка Рапортів ×1 → найм діловода) і `.maestro/offline-return.yaml` (фон ≥ 5 хв через `stopApp`/`launchApp` неможливий без збереження 009 — тут перевіряємо модалку через тестовий deeplink `stroiova://debug/offline?min=10`, лише в `__DEV__`); запуск — EAS Workflows або пристрій, у хмарній сесії симулятора немає. Інструкція в `quickstart.md`
- [ ] T047 Агент `spec-guardian` по `git diff main...HEAD`; виправити знахідки
- [ ] T048 `npm run check`, `node tools/golden.mjs --check`, `npx expo export --platform web` і ручний сценарій quickstart § 5 у Chromium 375×667 зі скріншотом

---

## Поза зрізом 001 (свідомо)

- Екрани `unit-unlock`, `clerk-first`, `boosts-sheet`, `resource-sheet` і повний `main`/`offline-return` зі станами й текстами — 002 (у 001 лише доменна логіка: `seenUnlocks`, `multStack`, `refuel`).
- «Розширити до 24 год» → `shop` і `shop_view` (AC-16, друга половина) — 008; у 001 перевіряємо `cappedMs`.
- Ролик і «Без реклами» для ×2 — 008; ліміт ×2 — T034a.
- Відправка подій у PostHog — етап 5; ядро повертає доменні події.

## Dependencies & Execution Order

- Phase 1 → Phase 2 (T005–T006 до будь-якої правки sim.js) → US1.
- US1 → усі інші (game стоїть на core).
- US2 → US3 → US4 → US7 (зріз нарощується на одному екрані й сторі).
- US5 і US6 — після US2; між собою незалежні; US6 доповнює `advance` з US7 папером, тож після US7.
- Polish — після всіх.

## Parallel Example: US1

```text
T009, T010, T011 (тести) — паралельно
T012, T013, T014, T015 (core-файли) — паралельно
далі T016 → T017 → T018 → T019 → T020 послідовно
```

## Implementation Strategy

1. **MVP = US1**: спільний модуль + відбитки. Уже цінний сам по собі: пісочниця й гра на одному коді.
2. Далі US2 → US3 → US4 → US7: грабельний зріз «тап → покупка → діловод → офлайн».
3. US5, US6, Polish.
4. Кожна фаза — окремий коміт у PR #4 з зеленим `npm run check`.
