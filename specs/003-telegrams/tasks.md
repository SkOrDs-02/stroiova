---
description: "Задачі: 003 Телеграми й репутація — етап 1"
---

# Tasks: 003 — етап 1

**Input**: plan.md, spec.md, research.md, data-model.md, contracts/telegrams-api.md, quickstart.md
**Tests**: обов'язкові (принцип III).

| Історія | Зі spec.md | Пріоритет |
| --- | --- | --- |
| US1 | Телеграми кілька разів на день (розклад, доставка, мішок) | P1 |
| US2 | Бачити ціну варіанта й відповісти (ефекти, папір, шухляда, результат) | P1 |
| US3 | Репутація словом і що вона дає | P1 |
| US4 | «Це не смішно» | P2 |
| US5 | «Комбата шукають» і override | P2 |
| US6 | Записки | P3 |

## Phase 1: Setup

- [X] T001 [P] `src/telegrams/types.ts`: `Telegram`, `Choice`, `Effects` (ключі з spec «Модель даних»), `InboxItem`, `TelegramState`, `Timer` (data-model.md)
- [X] T002 [P] `src/telegrams/rng.ts`: LCG зі станом (R1); тест: той самий seed — та сама послідовність, різні seed — різні
- [X] T003 [P] `src/telegrams/content.ts`: пули з `content/telegrams.json` і `content/tg/level1-2.json`, індекс за id, `poolFor(level)` (FR-7: Р2 бере й Р1); тест: № 1 сценарна, № 13 `repeatEveryDays`, override-шаблон окремо

## Phase 2: Foundational

- [X] T004 `src/telegrams/reputation.ts`: `applyDelta` (0–100), `repTier`, `replyChance` (p = 0 до `firstInspectionPassed`, ×`replyChanceLow`/1/`replyChanceHigh`, щит при P_total ≥ 1), історія ≤ 3; тести AC-9, AC-10, AC-11, AC-15 (домен)
- [X] T005 `src/save/schema.ts`, `migrations.ts`: `CURRENT_SCHEMA = 3`, zod `telegramStateSchema`, міграція 2 → 3 (порожній стан; № 1 в архіві, якщо онбординг уже відповів); тест на фікстуру v2
- [X] T006 `src/economy/game/types.ts`: `DomainEvent` + події 003 (data-model.md)

## Phase 3: US2 — відповідь і ефекти (P1) 🎯

**Independent Test**: AC-7, AC-12, AC-13, AC-14 (рядки), AC-22 (notice)

- [X] T007 [P] [US2] `src/telegrams/__tests__/effects-test.ts`: AC-7 (сумлінно на № 1: Стройова ×0,5 рівно 1 год, «на виконанні» до кінця, репутація 50 → 60, потім архів); AC-13 (4 аркуші → варіант на 5 неактивний, «Бракує 1 аркуша»); AC-12 (шухляда № 16 → через 24 год −5; відповідь з шухляди через 3 год скасовує); `roll`, `fuel` (№ 24), прапорці (№ 23 → № 28), `ifNoClerk`, `queueNext` (№ 5 → № 22, № 17); notice № 4581 → архів «до відома», подія `journal`
- [X] T008 [US2] `src/telegrams/effects.ts`: `canChoose`, `answer` (R4), атомарно: стан, економіка, ефекти, події, `result`
- [X] T009 [US2] `src/telegrams/timers.ts`: `delayed`, `returnsAfterHours`, `followUps` (`ifChoice`), «на виконанні» → архів; спрацьовують і за відсутності (FR-17)

## Phase 4: US1 — розклад і доставка (P1)

**Independent Test**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-23, AC-25

- [X] T010 [P] [US1] `src/telegrams/__tests__/schedule-test.ts`: AC-2 (3 доби: 2–4 на добу, 08–22, ≥ 2 год, «Нових» ≤ 5); AC-3 (10 год відсутності, 2 слоти → 2 телеграми з мітками слотів); AC-4 (жовтень, без гонки, 0 цифровізацій: № 4, 20, 25, 31–35 не приходять; № 13 знову через 7 діб); AC-5; AC-6; AC-23 (повтор архівних); AC-25 (30 слотів без повторів, два seed — різний порядок)
- [X] T011 [US1] `src/telegrams/schedule.ts`: план доби (R2), `tick` з доставкою слотів і таймерами, `tzOffsetMin`
- [X] T012 [US1] `src/telegrams/bag.ts`: мішок, умови `schedule`, черга, повтор архівних (R3)

## Phase 5: US3 — репутація в інтерфейсі й стор (P1)

**Independent Test**: AC-1 (стор), AC-15, AC-16; онбординг 002 AC-11…AC-13 не ламаються

- [X] T013 [US3] `src/features/conveyor/store.ts`: зріз `telegrams`, `tick` викликає `telegrams.tick` (`tzOffsetMin` від застосунку), дії `answerTelegram`, `openTelegram`, `flagTelegram`; тост `rep.toast`; онбординг: № 1 через `deliverScripted`, крок 8 закриває `answer` (R7); `features/telegrams/first.ts` прибрати
- [X] T014 [P] [US3] `src/features/telegrams/__tests__/reputation-ui-test.tsx`: AC-15 (36 → відписка −5 → плитка «низька», тост), AC-16 (шторка з поточним рівнем і 3 змінами)
- [X] T015 [US3] `src/features/telegrams/ReputationTile.tsx`, `ReputationSheet.tsx` (артборд `ReputationSheet`); плитка в шапці `main` (FR-22)

## Phase 6: US2 — екрани вхідних (P1)

**Independent Test**: AC-7…AC-14 на екрані; quickstart 1–6

- [X] T016 [P] [US2] `src/features/telegrams/__tests__/inbox-test.tsx`: розділи «Нові», «На виконанні» з таймером, «Шухляда · N», «Архів · N», «Записки»; бейдж вкладки; деталь з рядками ефектів ≤ 60 знаків і причиною неактивності; результат «Рішення», «Репутація ±N · рівень», «Шанс перевірки N%» (AC-14)
- [X] T017 [US2] `src/features/telegrams/TelegramList.tsx` (артборд `TgList`, порожні стани з пулів `tg.empty_*`), вкладка «Телеграми» в `MainScreen`
- [X] T018 [US2] `src/features/telegrams/TelegramDetail.tsx` (усі стани `TgDetail` етапу), `TelegramResult.tsx` (усі стани `TgResult`; «Готуватися» — доменна подія для 04), `texts.ts` (нові рядки spec «Тексти» з позначкою на вичитку)

## Phase 7: US4–US6 — позначка, події, записки

**Independent Test**: AC-17, AC-18, AC-19, AC-20, AC-21

- [X] T019 [P] [US5] `src/telegrams/__tests__/events-test.ts`: AC-17 (override при P_total 0 і 2), AC-20 (комбат: ×0,25 ≤ 30 хв, посильний = 4 хв базового доходу, «знайшли» через 3 хв), AC-21 (≤ 1 на добу; № 18 «на стіл» 50%)
- [X] T020 [US5] `src/telegrams/events.ts`: override у слоті (R6), комбат на старті сесії й з № 18, посильний
- [X] T021 [US5] `src/features/telegrams/KombatSheet.tsx` (артборд `KombatSheet`), стан «комбата шукають» на `main`
- [X] T022 [P] [US4] `src/features/telegrams/TelegramFlag.tsx` (артборд `TgFlag`): 4 причини, коментар ≤ 280, «Позначено», без впливу на гру; тест AC-18
- [X] T023 [P] [US6] `src/features/telegrams/NoteDetail.tsx` (артборд `NoteDetail`, «підсумок дзвінка» з 002); тест AC-19
- [X] T024 [US1] `src/telegrams/lines.ts`: мішок реплік, ліміт 2 за сесію (рішення 41, 45); репліки Кави на `tg-list`/`tg-result`, Граніта в `kombat-sheet`; тест

## Phase 8: Polish

- [ ] T025 Web-сценарій quickstart у Chromium 375×667
- [ ] T026 Агенти `spec-guardian` і `content-reviewer`; виправлення
- [ ] T027 Документація: CLAUDE.md (`src/telegrams`), `npm run check`

## Поза етапом 1

Перебіг перевірок (04), гонка (05), курйози й «Поділитися» (07), сюжет (014), пуші № 2 і № 9 (10), PostHog (етап 5).

## Dependencies

Setup → Foundational → US2 (домен) → US1 → US3 (стор) → US2 (екрани) → US4–US6 → Polish.
