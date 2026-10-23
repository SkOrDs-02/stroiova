# 017. «Переїзд» - план реалізації

Специфікація - `spec.md`; рішення 121 (правила й числа), 122 (поведінка в грі). Обсяг невеликий, тож план і задачі зведено в один файл.

## Структура

| Шар | Файл | Що |
| --- | --- | --- |
| Баланс | `src/economy/core` (`moveBoxes`, `moveLossPerBox`, `moveLevels`), `balance/sim.js` v7.5, пресет v7 rev 7.2.1 | Числа (рішення 121), PR з числами |
| Домен | `src/move/move.ts` | `moveDue`, `boxAt`, `paperLost`, `finishMove`; `MOVE_MS` = 20 с (GDD) |
| Стор | `src/features/conveyor/store.ts` | `move` у стані й записі, дія `moveFinish`, доменна подія `moveFinish` |
| Запис | `src/save/schema.ts`, `migrations.ts` | Схема 20, міграція 19 → 20 (`move.done = []`) |
| Сюжет | `src/story/archive.ts`, `src/features/conveyor/story.ts` | Аркуш слота «Переїзд» за `ctx.moves` (FR-9) |
| Аналітика | `analytics/tracking-plan.yaml`, `src/analytics/mapping.ts` | `move_finish` (FR-12) |
| Екрани | `src/features/move/` (`MoveIntro`, `MoveGame`, `MoveResult`, `texts.ts`), `MainScreen.tsx` | Черга модалок (FR-1), пауза у фоні й під довідкою (FR-5) |

## Задачі

- [X] T001 Домен і тести (`src/move/__tests__/move-test.ts`): FR-1, FR-2, FR-4, FR-8, FR-10, AC-4
- [X] T002 Стор, схема 20, міграція й тести (`src/save/__tests__/migration-test.ts`): FR-11, AC-6
- [X] T003 Аркуш слота за переїздом (`src/story/__tests__/archive-test.ts`): FR-9
- [X] T004 Подія `move_finish` у плані й мапінгу: FR-12
- [X] T005 Екрани й черга модалок (`src/features/move/__tests__/move-screens-test.tsx`): AC-1…AC-5
- [X] T006 Рішення 122, CLAUDE.md, `docs/analytics.md`
