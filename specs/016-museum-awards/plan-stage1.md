# План: 016, етап 1 (музей на 24 журнали)

Рішення 108. Обсяг: FR-1…FR-13, FR-15, FR-16; AC-1…AC-8 (журнали, серії, бонуси). Грамоти (FR-17…45) і сегмент «Грамоти» - наступні етапи.

| FR | Етап 1 |
| --- | --- |
| FR-1, FR-3 | `MUSEUM_SIZE` = 24, серії з `content/museum.json`, `museumSeries()`, `seriesOf()` |
| FR-2, FR-15, FR-16 | `MuseumScreen`: «N з 24», 24 сегменти, секції серій (`sections`), замкнені серії, банер «Музей укомплектовано» |
| FR-4…FR-7 | `grant` (лише `museum` >= 2), `digitJournals` Р2-Р4, `fromEvents`: `finalPassed`, `stageConvert` |
| FR-9, FR-10 | `bonuses`: unit, `slowCut`, `checklist`, `kazna`, `service`, `convert`, `digital`, `k24` |
| FR-11 | `bonusLevel`, `jd-later` у `JournalDetail` |
| FR-12, FR-13 | `series` у `multStack`/`baseIncomePerMin`, рядок «Серії музею» у `boosts-sheet` |
