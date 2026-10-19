# Implementation Plan: 011 Вихід з «Бригади» і рівень 3 «Командування» - етап 1

**Branch**: `011-level-3` (від `main` після PR #16) | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: `specs/011-level3-command/spec.md`; `docs/levels-3-5.md` §1, §2.1, §4.2; рішення 7, 25, 28, 71, 93-96; 001 (економіка), 004 (перевірки), 006 (цифровізація), 003 (телеграми, «Комбата шукають»), 009 (запис).

## Summary

Рівень 2 перестає бути кінцем: після N₂ цифровізацій оголошується підсумкова «Комісія командування» (перевірка 04 з іншими числами й пунктом механіки), після її проходу наступна цифровізація переводить на Р3 «Командування» (6-й потік «Зведення», 5-та ланка «Нарада», діловоди, «Нарада затягнулась», звичайні перевірки Р3). Економіка Р3 вже є в `src/economy/core` (порт `sim.js` v7): чисте ядро не змінюється, золоті відбитки лишаються.

## Обсяг етапу 1

| FR | Етап 1 | Відкладено й куди |
| --- | --- | --- |
| FR-1, FR-8 | ✅ лічильник = `digitization.counts[рівень]`, прапорець `levelExitAllowed` | - |
| FR-2…FR-7 | ✅ оголошення, `boss-brief`, чекліст 5 + 1, реклама лише на базові, пройдено/провалено/повтор, позапланова додає пункт | журнал серії № 12 - 016 |
| FR-9…FR-11 | ✅ `digital`, `digit-confirm`, `level-up` Р3, «що переходить» | доріжка Р4/Р5 «пізніше» |
| FR-12 | ✅ бос Р2 | - |
| FR-13…FR-16 | ✅ економіка Р3, шапка, `unit-unlock`, діловоди | арт LOC-04, CHR-20/21 - тимчасова графіка |
| FR-17…FR-24, FR-30 | ❌ пачки, зведена відповідь, баф | наступний PR 011 (пачки) |
| FR-25 | ✅ «Нарада затягнулась» (окремий стан) | - |
| FR-26 | ✅ звичайні перевірки Р3 | - |
| FR-27, FR-28 | ❌ підсумкова Р3, перехід на Р4 | з пачками / 012 |
| FR-29 | ✅ схема 10, міграція 9 → 10 | - |

AC етапу: 1-10, 17, 19; AC-11…16, 18, 20 - PR із пачками.

## Technical Context

TypeScript strict · zustand, zod 4 · MMKV, схема 10 (`digitization.levelExitAllowed`, `inspections.active.kind/attempt/mech`, `inspections.last.*`, `telegrams.meeting`) · Jest + Testing Library · числа з `DEFAULTS` (`boss.*`, `levels[].exitDigitizations`, `naradaChance` тощо) і `inspItems` (нові пункти Р3, рішення 95).

## Constitution Check

| Принцип | Як | Стан |
| --- | --- | --- |
| I | Лише механіки spec 011 і рішень 93-96; числа з конфігу | ✅ |
| II | `src/inspections`, `src/digitization`, `src/telegrams` лишаються чистими | ✅ |
| III | AC - тести; міграція 9 → 10 з фікстурою | ✅ |
| IV | Тексти з spec і `content/lines.json`; `text-review` | ✅ |
| VI | `@/theme`, `size.*` | ✅ |
| VII | Доменні події розширено (`inspectionStart.kind`, `attempt`); `track()` - етап 5 | ✅ |
| VIII | Без бекенду | ✅ |

## Project Structure

```text
src/digitization/        PLAYABLE_LEVELS = 3; levelExitAllowed; isLast за станом (boss 0 - N-та, boss 1 - після підсумкової)
src/inspections/         final.ts (оголошення, пункт механіки, ціна, повтор); lifecycle: kind/attempt; checklist: пункти Р3
src/telegrams/           content: level3.json (без pack); events: «Нарада затягнулась» (meeting)
src/race/                крок 'narada' на Р3 (ВП-8)
src/save/                схема 10 + міграція
src/features/inspections/ BossBrief; InspPrep/Result/Warning - стани підсумкової і механіки
src/features/digitization/ Digital (n з N, підсумкова, доріжка), DigitConfirm, LevelUp Р3
src/features/telegrams/   KombatSheet - стан «Нарада затягнулась»
src/features/main/        шапка Р3, unit-unlock, банер підсумкової
```

## Complexity Tracking

Порушень немає. Відхилення від sim.js: гонка Р3 має 6 кроків замість 5 (ВП-8, рішення 94).
