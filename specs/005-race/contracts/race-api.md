# Contract: `src/race`

```ts
newRace(seedText): RaceState
tick(s, eco, cfg, { fromMs, nowMs, tzOffsetMin, installMs, offline, journals }): { s; eco; effects: StoredEffect[]; events }
digitalSpeedup(s, nowMs, prestigePoints, p): { s; events } | { error }
fromTelegram(s, ev: raceEffect, nowMs): { s; events }
resume(s, nowMs): RaceState              // № 20 вийшла з шухляди
view(race, nowMs): { actLeftMs, svcLeftMs, stepIdx, late, marginMs }
offlineLine(last): { won, type } | null
```
Стор: `race` у стані; `tick`/`away` → `race.tick` до доходу (після перевірок); `raceDigital()`, `ackGift()`, `closeRaceResult()`; `raceActive` для 003 = тип активної гонки.
