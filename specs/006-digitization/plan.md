# Implementation Plan: 006 Цифровізація й «Бригада» — етап 1

**Branch**: `006-digitization` (від `005-race`) | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: `specs/006-digitization/spec.md`; рішення 7, 26, 31, 48, 71–73; 001 (`newCycle`, `points`, `prestigeMult`, `nextPurchaseEtaSec`, `levelItems`), 003/004/005 (лічильник цифровізацій, рівень), 009 (запис).

## Summary

Цифровізація — престиж: підписи, рівні й діловоди обнуляються (`reset()` у `sim.js`), бали назавжди дають +2% до всіх підписів. Три цифровізації на Р1 переводять на Р2 «Бригада» з потоком «Накази по частині» й ланкою «Казначейство». Логіка — чистий модуль `src/digitization/` поверх економіки 001; запис — схема 6.

## Обсяг

| FR | Етап 1 | Що відкладено й куди |
| --- | --- | --- |
| FR-1…FR-4 | ✅ L за цикл (уже в економіці), P за дільником рівня, множник | — |
| FR-5…FR-11 | ✅ доступність, «замкнено» / «мало балів», підказка (банер, крапка, раз за сесію), прогноз | — |
| FR-12 | ✅ картка «Як це працює», (i) | — |
| FR-13 | ❌ | дзвінки «Археолога» — 02 |
| FR-14…FR-18 | ✅ `digit-confirm`, утримання 1,2 с з хаптикою, атомарно, скидання | — |
| FR-19 | журнали як перелік у `digit-result` + доменна подія; № 8 — 07 | бонуси й музей — 07 |
| FR-20 | ✅ акт, штамп, бали, множник, репліка `digit.line` | — |
| FR-21 | ❌ | `journal-new` — 07 |
| FR-22 | ✅ церемонія в записі: непоказані `digit-result` і `level-up` при запуску | — |
| FR-23 | ❌ | `unit-unlock` Р1 — немає екрана в жодній фічі |
| FR-24…FR-27 | ✅ перехід на Р2 після 3-ї, `level-up`, економіка Р2, шапка «Бригада · будинок культури» | `unit-unlock` і `coach` Казначейства замінює тост `k.tip` (рішення 71, 73) |
| FR-28 | ✅ Р2 без виходу з рівня; доріжка | вихід з Р2 — 011 |
| Лічильник цифровізацій | передається в 003 (`digitizations`) і 004 (№ 7) | журнал № 7 — 07 |

AC етапу: 1–2, 4–8, 10–12, 14, 15, 17–20 (без `journal-new`); AC-3 — у 005 (`race-screens-test`); AC-9 — картка «Як це працює» й (i) є, дзвінок — 02; AC-13, AC-16 — відкладено (07, 001).

## Technical Context

TypeScript 6 strict · zustand, zod 4, економіка 001 · MMKV, схема 6 (`game.digitization`), міграція 5 → 6 · Jest + Testing Library · числа лише з `DEFAULTS` (`levels[].prestigeDivisor`, `prestigeExponent`, `prestigeBonus`, `prestigeMinPoints`, `prestigeStallHours`, `prestigeStallShare`, `levels[0].exitDigitizations`, нове `digitJournals`) · максимум рівнів збірки — 2 (константа до 011)

## Constitution Check

| Принцип | Як | Стан |
| --- | --- | --- |
| I | Механіки зі spec 006 і рішень 71–73; журнали за цифровізацію — `digitJournals` у конфігу (sim.js, 016 FR-5) | ✅ |
| II | `src/digitization/` без React і годинника | ✅ |
| III | AC — тести; міграція 5 → 6 з фікстурою | ✅ |
| IV | Тексти зі spec, `docs/texts.md`, пул `digit.line`; нові — `text-review` | ✅ |
| VI | `@/theme`; червоного немає | ✅ |
| VII | Доменні записи `digitization_*`, `level_advance` | ✅ |
| VIII | Без бекенду | ✅ |

## Project Structure

```text
src/digitization/        types.ts · digitization.ts (бали, статус, підказка, цифровізація, перехід) · __tests__/
src/features/digitization/  DigitalScreen.tsx · DigitConfirm.tsx (HoldButton) · DigitResult.tsx · LevelUp.tsx · present.ts · texts.ts
src/features/conveyor/store.ts   зріз digit; лічильник у 003/004/005; хвилинна перевірка підказки
src/ui/TabBar.tsx               крапка на «Цифрі»
src/save/schema.ts, migrations.ts   схема 6
```

## Complexity Tracking

Порушень немає.
