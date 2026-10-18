# Data Model: 005 — етап 1

## Race
| Поле | Тип | Правило |
| --- | --- | --- |
| `id` / `no` | `race_` + 4 цифри / int | наскрізний |
| `type` | `drone` \| `shovel` \| `generator` | `giftOrder` |
| `level` | int | на мить старту (FR-8) |
| `startMs`, `svcEndMs` | мс | служба = `gifts.<type>.serviceH` |
| `steps` | `{ unit, sec }[]` | Акти, Комбат, Стройова, Фін. (+ Казна на Р2) |
| `actTotalSec` | с | сума кроків + додане № 20 |
| `actEndMs` | мс | прогноз кінця акта |
| `pausedAtMs` | мс \| null | № 20 у шухляді |
| `digUsed` | bool | «Послатися на цифру» |
| `sped` | `{ method, sec }[]` | для «прискорено» |
| `seen` | bool | `gift-arrived` показано |

## RaceOutcome (`last`)
`{ id, no, type, level, won, endMs, tookSec, marginSec, stepsDone, stepsTotal, speedups, offline, seen }`

## RaceState (`game.race`, схема 5)
`{ rng, giftIdx, lastGiftDayKey, lastRaceEndMs, active, last }`

## Доменні події
`raceStart { id, giftType, docSec, resourceSec, winnable }`, `raceSpeedup { id, method: 'digital_bonus' | 'telegram', secSaved }`, `raceFinish { id, result, marginSec, speedups, offline }`, `boostActivate { boostType: drone_x2 | shovels_x1_5 | generator_fuel_hold }`, `raceCurio { id, giftType }`.
