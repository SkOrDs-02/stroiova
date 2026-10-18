---
description: "Задачі: 005 Гонка з часом і подарунки — етап 1"
---

# Tasks: 005 — етап 1

**Tests**: обов'язкові (принцип III).

## Phase 1: Setup
- [X] T001 [P] `src/race/types.ts` (data-model.md); події в `src/economy/game/types.ts`; ESLint-правило чистоти на `src/race`
- [X] T002 [P] `src/save/schema.ts`, `migrations.ts`: схема 5, міграція 4 → 5 з тестом на фікстуру v4

## Phase 2: Домен
- [X] T003 `src/race/schedule.ts`: найраніший подарунок у (from, to] (R1); тести AC-1, AC-19
- [X] T004 `src/race/race.ts`: старт (маршрут, служба, папір), `view`, фінал (ефекти, курйоз), «Послатися на цифру», № 20, пауза; тести AC-2, AC-4…AC-7, AC-12, AC-14…AC-17
- [X] T005 `src/race/offline.ts`: рядок довідки (FR-26)

## Phase 3: Стор
- [X] T006 `src/features/conveyor/store.ts`: зріз `race`, тік до доходу, `raceActive` для 003, `raceEffect`, зняття паузи, дії; `useBoot` — запис після старту, прискорення, фіналу; тести стору (AC-17 офлайн ×2 лише 3 год)

## Phase 4: Екрани
- [X] T007 [P] `src/features/race/texts.ts` (артборди + spec «Тексти»)
- [X] T008 `GiftArrived.tsx`, `RaceCard.tsx` на `main`, `RaceSheet.tsx`, `RaceResult.tsx` (won/lost), рядок у `OfflineReturn`; черга модалок у `MainScreen`
- [X] T009 [P] тести екранів: AC-2, AC-7, AC-11, AC-12, AC-15, AC-16

## Phase 5: Polish
- [ ] T010 `spec-guardian`, `content-reviewer`; виправлення
- [ ] T011 CLAUDE.md (`src/race`), `npm run check`, сторінка огляду

## Поза етапом 1
Реклама й «Забрати» (08), журнали № 6–8, «Поділитися» (07), пуші № 5, 6, 10 (10), PostHog (етап 5).
