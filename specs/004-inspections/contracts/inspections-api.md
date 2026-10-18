# Contract: `src/inspections`

Чисті функції без React і годинника: час (`nowMs`), зсув зони (`tzOffsetMin`) і конфіг — аргументи.

```ts
newInspections(p: EconomyParams, installMs: number, seedText: string): InspectionState

/** Старт сесії: перша перевірка (FR-2). */
onSessionStart(s, eco, cfg, nowMs, tzOffsetMin, reputation): { s; events }

/** Усе, що настало в (fromMs, nowMs]: планові оголошення й приїзди (FR-3, FR-4, FR-17…FR-21, FR-24). */
tick(s, eco, cfg, { fromMs, nowMs, tzOffsetMin, offline, reputation, digitizations }): { s; effects: Effect[]; events; firstScheduledArrived: boolean }

/** Події 003: unscheduledInspection, inspItem (FR-5…FR-7, FR-18). */
fromTelegramEvent(s, eco, cfg, ev, nowMs, tzOffsetMin, reputation): { s; events; toast: string | null }

/** Тап по пункту (FR-14): списує ціну, без підтвердження; помилки — 'no_active' | 'done' | 'short'. */
buyItem(s, eco, itemId, nowMs): { s; eco; events } | { error }

/** Для insp-prep: готовність %, бракує N, ще T (FR-11, FR-14). */
readiness(s): number
shortfall(item, eco, incomePerMin): { lack: Big; etaSec: number } | null

/** Рядки offline-return (FR-25). */
offlineLines(last): { title; value }[]
```

Стор (`src/features/conveyor/store.ts`): `inspections` у стані; `tick` і `away` викликають `inspections.tick` **до** `advance`/`offline`; `buyInspItem(itemId)`, `ackInspWarning()`, `ackInspCall()`, `closeInspResult()`; `handleEvents` передає `unscheduledInspection`/`inspItem` у `fromTelegramEvent`, `inspectionPrepare` відкриває `insp-prep`.
