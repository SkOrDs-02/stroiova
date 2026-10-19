# План: 012, етап 1 (Р4 «Генштаб», «Звіти про звіти», «Аудит усього»)

Рішення 103. Обсяг: FR-1…12, FR-19…22, FR-24…26, AC-1…9, AC-14…16, AC-18, AC-19. Етап 2: стос, «Метр звітів», «Доповідь тезово», share-card (FR-13…18, AC-10…13).

| FR | Етап 1 |
| --- | --- |
| FR-2, FR-7…11 | `src/economy/game/income.ts`: потік-частка в `conveyor()`, `zpzInfo()`; `core/formulas.ts` `zpzShare`; тести AC-4…AC-8 |
| FR-1, FR-3, FR-4 | `PLAYABLE_LEVELS = 4`, `FINAL_LEVELS`, level-up «Наказ № 4», шапка, `digit-confirm`, доріжка |
| FR-12 | картка ЗпЗ на `main`: частка, виробіток, приріст, межа |
| FR-19…22 | пункти Р4 в `defaults.ts`, `FINALS[4]`, `zpz_level` наживо, `audit_acts`, `insp-prep` з часткою |
| FR-24…26 | телеграми Р4 (`content/tg/level4.json`) без пачок, цілі `zpz`/`dopovid`; маршрут гонки з кроком «Доповідь» |
| FR-27 | без нових полів; схема лишається 11 (нове значення `dopovid` у маршруті гонки) |
