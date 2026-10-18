# Implementation Plan: 004 Перевірки — етап 1

**Branch**: `004-inspections` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: `specs/004-inspections/spec.md`; рішення 25, 28, 45, 61, 65–67; 001 (ефекти, офлайн), 002 (`call`), 003 (позапланові, пункти й зауваження з телеграм), 009 (запис, час).

## Summary

Комісія Тумбочкіна стає системою: перша перевірка на сесії ≥ 8 год після встановлення, далі планові кожні 24–48 год, позапланові з відписок 003. Попередження за 2–3 год, підготовка за підписи (ціни фіксуються при оголошенні), результат у грі (`insp-result`) і без гравця (рядки `offline-return`), ×3 на 2 год за пройдену планову, «Стройова частина» ×0,5 на 1 год за провал. Логіка — чистий модуль `src/inspections/` поверх економіки 001 і подій 003; запис — схема 4.

## Обсяг

| FR | Етап 1 | Що відкладено й куди |
| --- | --- | --- |
| FR-1…FR-4 | ✅ розклад, перша, інтервал, вікно приїзду, таймери від міток UTC | — |
| FR-5…FR-7 | ✅ позапланова з події `unscheduledInspection` 003, пункт з телеграми, тост | — |
| FR-8, FR-9 | ✅ `insp-warning` (перший раз, позапланова, Р2), банер на `main` | — |
| FR-10 | ✅ банер і модалка після `offline-return` | пуш № 3 — 10 |
| FR-11…FR-14 | ✅ | — |
| FR-15, FR-16 | ❌ | «Усе за рекламу», «Забрати все», стани кнопки — 08 |
| FR-17…FR-19, FR-21 | ✅ поріг 100% (рішення 65), зауваження № 16 (рішення 66) | — |
| FR-20 | доменна подія `inspectionJournal` при P_total-умові | журнал № 7 і блок «Новий експонат» — 07 (до 06 цифровізацій 0, умова не справджується) |
| FR-22 | ✅ акт, рядки, висновок, підпис | блок № 7 — 07 |
| FR-23 | ❌ | вікно оцінки й `starter-offer` — 08 |
| FR-24, FR-25 | ✅ | `journal-new` — 07 |
| FR-26 | ❌ | пуш № 4 — 10 |
| FR-27, FR-28 | ✅ дані Р1 і Р2 (Р2 стане досяжним з 06) | — |
| Пули `tumb.*` | ✅ мішок, поза лімітом сесії (рішення 45) | `push.*` — 10 |
| Події аналітики | доменні записи | PostHog — етап 5 |

AC етапу: 1–3, 5–8, 10–12, 15 (без пуша), 16, 18–21; AC-4 — без пуша; AC-9, AC-13, AC-14, AC-17 — відкладено разом із 07/08.

## Technical Context

**Language/Version**: TypeScript 6 strict

**Primary Dependencies**: zustand, zod 4, економіка 001 (`Effect` `inspection_pass`/`inspection_fail`, `baseIncomePerMin`), телеграми 003 (події `unscheduledInspection`, `inspItem`, `inspectionPrepare`; `firstInspectionPassed`; мішок реплік), збереження 009

**Storage**: MMKV, схема 4 (`game.inspections`), міграція 3 → 4

**Testing**: Jest + Testing Library; чисті функції розкладу, оголошення, купівлі, результату й офлайну на фіксованому seed; екрани з мокнутим стором; web-сценарій 375×667 з `page.clock`

**Target Platform**: iOS, Android, web для перевірки

**Constraints**: числа лише з `DEFAULTS` (`insp*`, нові `inspItems`, вікна годин, мінімальна ціна — R2); тексти — `content/lines.json` (`tumb.*`) і таблиці 004; випадковість — seed у записі; час доби — зсув зони від застосунку (як 003)

**Scale/Scope**: ~6 модулів домену, 4 екрани/шторки, банер, міграція

## Constitution Check

| Принцип | Як | Стан |
| --- | --- | --- |
| I | Механіки зі spec 004 і рішень 25, 28, 61, 65–67; хвилини пунктів і вікна годин — у `DEFAULTS`, `sim.js` читає ті самі параметри (відбитки без змін) | ✅ |
| II | `src/inspections/` без React і годинника; економіку змінює лише через `Effect` і її функції | ✅ |
| III | AC — тести; міграція 3 → 4 з фікстурою v3; web-сценарій | ✅ |
| IV | Тексти з артбордів і spec; нові рядки — `text-review` | ✅ |
| V | Без персональних даних | ✅ |
| VI | Екрани на `@/theme`, `@/ui`; червоний лише зі словом («Провалили») | ✅ |
| VII | Подій не шлемо (етап 5); доменні записи `inspection_*`, `boost_activate` | ✅ |
| VIII | Без бекенду | ✅ |

## Project Structure

```text
src/inspections/               # чистий домен
├── types.ts                   # Inspection, ChecklistItem, InspectionState, InspectionOutcome
├── checklist.ts               # пункти рівня й з телеграм, ціни (FR-12, FR-13)
├── schedule.ts                # перша, наступна, вікно приїзду, попередження (FR-1…FR-4)
├── lifecycle.ts               # announce, fromTelegram (FR-5…FR-7), buy (FR-14), resolve (FR-17…FR-21), tick
├── offline.ts                 # рядки довідки (FR-24, FR-25)
└── __tests__/
src/features/inspections/      # екрани
├── InspCall.tsx · InspWarning.tsx · InspPrep.tsx · InspResult.tsx · present.ts · texts.ts · useTumbLine.ts
src/features/main/MainScreen.tsx  # черга модалок перевірки, банер
src/features/conveyor/store.ts # зріз inspections, tick/away → перевірки перед доходом
src/features/conveyor/OfflineReturn.tsx  # рядки перевірки
src/save/schema.ts, migrations.ts        # схема 4
```

## Phases (для /speckit-tasks)

1. Конфіг: `inspItems`, вікна годин, мінімальна ціна в `DEFAULTS` і `sim.js` (відбитки ті самі).
2. Домен: типи, чекліст і ціни, розклад, оголошення, купівля, результат; міграція 3 → 4.
3. Стор: перевірки в `tick`/`away` перед доходом, події 003, `firstInspectionPassed`.
4. Екрани: `call` перед першою, `insp-warning`, банер, `insp-prep`, `insp-result`, рядки `offline-return`.
5. Перевірка: web-сценарій, `spec-guardian`, `content-reviewer`, документація.

## Complexity Tracking

Порушень немає.
