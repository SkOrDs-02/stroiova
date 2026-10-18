---
description: "Задачі: 006 Цифровізація й «Бригада» — етап 1"
---

# Tasks: 006 — етап 1

**Tests**: обов'язкові (принцип III).

- [X] T001 `src/economy/core/defaults.ts`, `types.ts`: `digitJournals` (Р1: 1-ша № 1–3, 2-га № 4–5; Р2: № 9, 10, 11); `balance/golden/core.json`; відбитки 27 без змін
- [X] T002 `src/digitization/types.ts`, події в `src/economy/game/types.ts`; ESLint-правило чистоти
- [X] T003 `src/digitization/digitization.ts`: `pointsNow`, `status` (замкнено / мало балів / доступно / рекомендовано), `digitize` (скидання, лічильники, перехід на Р2, церемонія); тести AC-1, 2, 4–8, 11, 12, 17–20
- [X] T004 `src/save/schema.ts`, `migrations.ts`: схема 6, міграція 5 → 6 з фікстурою v5
- [X] T005 `src/features/conveyor/store.ts`: зріз `digit`, `digitize`, закриття кроків церемонії, `digitizations` у 003/004, перевірка підказки раз на хвилину гри, подія раз за сесію; `useBoot`
- [X] T006 `src/features/digitization/texts.ts`, `present.ts`
- [X] T007 `DigitalScreen.tsx` (+ «Як це працює», доріжка), `DigitConfirm.tsx` (утримання 1,2 с), `DigitResult.tsx`, `LevelUp.tsx`; `MainScreen`: вкладка «Цифра», банер, крапка, церемонія в черзі, шапка Р2, тост `k.tip`
- [X] T008 тести екранів: AC-4…AC-6, AC-8, AC-10, AC-14, AC-15, AC-17, AC-19
- [ ] T009 `spec-guardian`, `content-reviewer`; CLAUDE.md (`src/digitization`); `npm run check`

## Поза етапом 1
Дзвінки (02), `journal-new` і бонуси журналів (07), `unit-unlock` і `coach` (тост замість них), пуші (10), PostHog (етап 5), вихід з Р2 (011).
