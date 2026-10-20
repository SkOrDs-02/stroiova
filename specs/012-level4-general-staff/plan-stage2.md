# План: 012, етап 2 (стос, «Метр звітів», «Доповідь тезово»)

Рішення 104. Обсяг: FR-13…18, FR-27, AC-10…13. `share-card` і «Поділитися» - з 007 етапу 2.

| FR | Етап 2 |
| --- | --- |
| FR-13, FR-14 | `src/stack/stack.ts`: `cmPerMin`, `grow`, `growOffline`, `startSession`, `display`; стан у `digitization.stack` (схема 12); `StackTower` на `main` |
| FR-15 | `stackReach` раз на цикл: курйоз `kind: 'stack'`, тост із пулу `stack.meter`, подія |
| FR-16 | стос не впливає на економіку й перевірки (`stack_meter` купується завжди) |
| FR-17, FR-18 | `briefOnSessionStart` (`events.ts`), `telegrams.brief`, документ `tg_event_brief` з пулу `ev.brief_body`, варіанти з контенту |
| FR-27 | міграція 11 → 12 |
