---
description: "Задачі: 004 Перевірки — етап 1"
---

# Tasks: 004 — етап 1

**Input**: plan.md, spec.md, research.md, data-model.md, contracts/inspections-api.md, quickstart.md
**Tests**: обов'язкові (принцип III).

| Історія | Зі spec.md | Пріоритет |
| --- | --- | --- |
| US1 | Знати про комісію заздалегідь (розклад, попередження, перша з Тумбочкіним) | P1 |
| US2 | Ціна пункту й скільки чекати (підготовка) | P1 |
| US3 | Результат у грі й без гравця (×3, провал, довідка) | P1 |
| US4 | Позапланова через відписку | P2 |
| US5 | «Бригада»: нова комісія | P3 |

## Phase 1: Setup

- [ ] T001 `src/economy/core/defaults.ts`, `types.ts`: `inspItems` (id, level, min, fromTelegram), `inspFirstFromHour` 8, `inspFirstToHour` 19, `inspArriveFromHour` 10, `inspArriveToHour` 21, `inspArriveJitterMin` 60, `inspMinPrice` 50; тест: сума хвилин базових пунктів рівня = `inspChecklistMin` (129, 51); `balance/sim.js` читає вікна й мінімум з параметрів; `npm run build:economy`, `balance/golden/core.json`, `node tools/golden.mjs --check` — 27 без змін
- [ ] T002 [P] `src/inspections/types.ts`: `ChecklistItem`, `Inspection`, `InspectionOutcome`, `InspectionState` (data-model.md)
- [ ] T003 [P] `src/economy/game/types.ts`: події `inspectionStart`, `inspectionItemComplete`, `inspectionItemAdded`, `inspectionFinish`, `boostActivate`, `inspectionJournal`; ESLint-правило чистоти на `src/inspections`

## Phase 2: Foundational

- [ ] T004 `src/inspections/checklist.ts`: пункти рівня, пункт з телеграми, ціна max(`inspMinPrice`, ⌈m × `baseIncomePerMin`⌉) (FR-12, FR-13); тести AC-7, AC-21 (ціни ті самі під ×2 і сповільненням)
- [ ] T005 `src/inspections/schedule.ts`: вікно приїзду, warn у цілих хвилинах, перша (≥ 8 год, 08–19), наступна (24–48 год від приїзду) (FR-2…FR-4); тести AC-1 (5 год — немає), AC-2
- [ ] T006 `src/save/schema.ts`, `migrations.ts`: `CURRENT_SCHEMA = 4`, `inspectionStateSchema`, міграція 3 → 4 (`installMs` = `telegrams.startMs` ?? `savedAt`); тест на фікстуру v3

## Phase 3: US1 + US3 — домен (P1) 🎯

**Independent Test**: AC-1, AC-2, AC-10, AC-11, AC-12, AC-15, AC-16, AC-19, AC-21

- [ ] T007 [P] [US3] `src/inspections/__tests__/lifecycle-test.ts`: оголошення (номер `insp_0001`, комісія, warn 2–3 год, приїзд у вікні); результат 100% → «пройшли» і `inspection_pass` ×3 [arr, arr + 2 год] (AC-10), 4 з 5 → провал і `inspection_fail` ×0,5 на `stroy` 1 год (AC-11), зауваження з `pendingRemarkPct` (AC-12, рішення 66), репутація не змінюється (AC-21); офлайн: приїзд у проміжку → `last.offline` (AC-15, AC-16); `firstScheduledArrived`
- [ ] T008 [US3] `src/inspections/lifecycle.ts`: `newInspections`, `onSessionStart`, `tick`, `buyItem`, `readiness`, `shortfall`
- [ ] T009 [US3] `src/inspections/offline.ts`: рядки довідки (FR-25); тест

## Phase 4: US4 — позапланові (P2)

**Independent Test**: AC-5, AC-6, AC-20

- [ ] T010 [P] [US4] тести в `lifecycle-test.ts`: `unscheduledInspection` без активної → позапланова з причиною, `nextArrMs` від її приїзду (AC-5, AC-20); з активною → пункт `sergeants_count` і тост, другої немає (AC-6); пройдена позапланова — без ×3 (AC-20)
- [ ] T011 [US4] `fromTelegramEvent` у `src/inspections/lifecycle.ts`

## Phase 5: Стор (P1)

**Independent Test**: AC-1 (стор), AC-19; онбординг 002 і телеграми 003 не ламаються

- [ ] T012 `src/features/conveyor/store.ts`: зріз `inspections`, `tick`/`away` → `inspections.tick` перед `advance`/`offline`, ефекти в `effects`, `handleEvents` → `fromTelegramEvent`, `firstInspectionPassed` після першої планової (003 FR-15), `buyInspItem`, `ackInspCall`, `ackInspWarning`, `closeInspResult`, репліки `tumb.*` поза лімітом (рішення 45); `src/features/boot/useBoot.ts` — запис після оголошення, купівлі й приїзду
- [ ] T013 [P] `src/features/conveyor/__tests__/inspections-store-test.ts`: AC-1 зі стором (call → warning), AC-15 (офлайн 14:00–15:00 з ×3), AC-19 (вбивство: пункти, відлік, id ті самі)

## Phase 6: Екрани (P1–P3)

**Independent Test**: AC-3, AC-8, AC-10, AC-11, AC-18 на екрані; quickstart 1–6

- [ ] T014 [P] [US1] `src/features/inspections/texts.ts`: рядки з артбордів і spec «Тексти» (префікси `insp.`, `off.`, `call.insp1`), позначка на вичитку
- [ ] T015 [US1] `InspWarning.tsx` (артборд `InspWarning`: перший раз, позапланова, Р2), `call` перед першою (артборд `Call`, «виклик», `call.insp1`), `InspBanner.tsx` на `main` (FR-9)
- [ ] T016 [US2] `InspPrep.tsx` (артборд `InspPrep`: частково, 0%, 100%, не вистачає; без кнопки реклами — 08): відлік, готовність, чекліст, «бракує N · ще T», позначку не зняти
- [ ] T017 [US3] `InspResult.tsx` (артборд `InspResult`: пройшли ×3, позапланова без ×3, провалили, Р2), черга після інших модалок; рядки перевірки в `OfflineReturn.tsx`
- [ ] T018 [P] `src/features/inspections/__tests__/insp-screens-test.tsx`: AC-3, AC-8, AC-10, AC-11, AC-18 (Р2: «Комісія командування», 4 пункти)

## Phase 7: Polish

- [ ] T019 Web-сценарій quickstart у Chromium 375×667
- [ ] T020 Агенти `spec-guardian` і `content-reviewer`; виправлення
- [ ] T021 Документація: CLAUDE.md (`src/inspections`), spec 004 «Що виправити на артбордах» 1, 4–6 (артборди), `npm run check`

## Поза етапом 1

Реклама й «Забрати все», вікно оцінки, `starter-offer` (08); пуші № 3, № 4 (10); журнал № 7 і `journal-new` (07); PostHog (етап 5).

## Dependencies

Setup → Foundational → US1/US3 (домен) → US4 → Стор → Екрани → Polish.
