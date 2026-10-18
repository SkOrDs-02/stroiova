# Data Model: 004 — етап 1

## Конфіг (`DEFAULTS`, R2)

| Поле | Тип | Значення |
| --- | --- | --- |
| `inspItems` | `{ id, level, min, fromTelegram? }[]` | таблиця «Пункти чекліста»: Р1 19, 6, 4, 11, 89 і `sergeants_count` 15 (№ 1); Р2 13, 6, 4, 28 і `where_journal` 21 (№ 29) |
| `inspFirstFromHour` / `inspFirstToHour` | год | 8 / 18 (рішення 69) |
| `inspArriveFromHour` / `inspArriveToHour` | год | 10 / 21 |
| `inspArriveJitterMin` | хв | 60 |
| `inspMinPrice` | підписи | 50 |

Наявні: `inspFirstAfterHours`, `inspIntervalMinH/MaxH`, `inspWarnMinH/MaxH`, `inspMult`, `inspHours`, `inspFailMult`, `inspFailHours`, `levels[].inspChecklistMin`, `unscheduledWarnH`.

## ChecklistItem

| Поле | Тип | Правило |
| --- | --- | --- |
| `id` | string | з `inspItems` (enum `item_id` у tracking-plan) |
| `price` | Big | ⌈m × базовий дохід⌉, ≥ `inspMinPrice`; фіксується при оголошенні чи додаванні |
| `done` | boolean | лише `false → true` (FR-14) |
| `fromTelegram` | string? | телеграма, що додала пункт (рядок `insp.added`) |
| `doneAtMs` | number? | для `sec_to_deadline` |

## Inspection

| Поле | Тип | Правило |
| --- | --- | --- |
| `id` | string | `insp_` + 4 цифри номера (FR-28) |
| `no` | int | наскрізний на встановлення |
| `trigger` | `'scheduled' \| 'unscheduled'` | |
| `boss` | `'brigade_commission' \| 'command_commission'` | за рівнем на мить оголошення (FR-27) |
| `level` | 1 \| 2 | чекліст і репліки |
| `annMs`, `arrMs` | number | мітки UTC; `arrMs` у вікні приїзду |
| `items` | ChecklistItem[] | 5 (Р1) чи 4 (Р2) базових + додані |
| `reason` | `{ telegramId }` \| null | позапланова (FR-6) |
| `remark` | boolean | кидок `remarkPct` при оголошенні (FR-18) |
| `warned` | boolean | `insp-warning` уже показано |
| `firstOfBoss` | boolean | перша на цій комісії (модалка FR-8) |

## InspectionOutcome (останній результат)

`{ id, no, trigger, boss, level, arrMs, passed, remark, items: { id, done }[], offline: boolean, seen: boolean }` — для `insp-result` (у грі) чи рядків довідки (без гравця).

## InspectionState (`game.inspections`, схема 4)

| Поле | Тип | Правило |
| --- | --- | --- |
| `rng` | number | LCG 003 |
| `installMs` | number | мітка встановлення (міграція: `telegrams.startMs` ?? `savedAt`) |
| `nextNo` | int ≥ 1 | |
| `nextArrMs` | number \| null | наступна планова; null до першої |
| `active` | Inspection \| null | ≤ 1 (FR-1) |
| `last` | InspectionOutcome \| null | |
| `pendingRemarkPct` | number | № 16 до найближчого оголошення |
| `bossesSeen` | string[] | комісії, що вже приїжджали з модалкою |
| `firstAnnounced` | boolean | перша оголошена (не оголошувати повторно) |
| `callPending` | boolean | `call` перед першою ще не показано |

## Переходи

```text
(немає) --старт сесії ≥ 8 год, 08–18, після кроку 9--> active(scheduled, перша) + callPending
(немає) --now ≥ nextArrMs − warn--> active(scheduled)
(немає) --unscheduledInspection--> active(unscheduled), nextArrMs = вікно(arr + інтервал)
active --inspItem(item)--> active + пункт (тост)
active --buy(item), баланс ≥ ціна--> item.done
active --now ≥ arrMs--> last(passed | failed) + Effect; nextArrMs (для планової) = вікно(arr + інтервал)
```

## Доменні події (`DomainEvent`)

`inspectionStart { id, no, boss, trigger, warnSec, reputation, itemsTotal }`, `inspectionItemComplete { id, itemId, method: 'signatures', cost, secToDeadline }`, `inspectionItemAdded { id, itemId, telegramId }`, `inspectionFinish { id, result, itemsDone, itemsTotal, offline, secFromStart }`, `boostActivate { type: 'inspection_x3', mult, durationSec }`, `inspectionJournal { id }` (для 07).
