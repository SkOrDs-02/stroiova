# План: 013, етап 1 (Р5, конвертації, «Збій СЕДО», перевірки Р5)

Рішення 105. Обсяг: FR-1…FR-14, AC-1…AC-10, AC-22. Фінал, Дублі, рекорд - наступні етапи (014, 016).

| FR | Етап 1 |
| --- | --- |
| FR-1…FR-4 | `PLAYABLE_LEVELS` = 5, `digitize` -> `level-up` Р5, шапка й тексти `byLevel` |
| FR-5…FR-8 | `src/economy/game/convert.ts` (`convertInfo`, `convertStage`), `income.ts` (цифрова ланка), `StageConvert`, `UnitRow` |
| FR-9, FR-10 | фактори цифрової ланки (`DIGITAL_FACTOR_SOURCES`), відсутність «Комбата шукають» після № 1 |
| FR-11 | `levelStartMs`, `cycleMs`/`prevCycleMs` у `digitization`, рядок у `digit-result` |
| FR-12 | `telegrams.sedo`, `sedoOnSessionStart`, `printSedo`, `SedoSheet` |
| FR-13 | `inspItems` Р5, `bossFor(5)` = `digital_commission` |
| FR-14 | `level5.json`, `conversionsMin`, `schedule.fading`, `slowPerDayLate*` |
| AC-22 | схема 13, міграція 12 -> 13 |
