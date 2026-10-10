# Контракт: модуль економіки

Два шари. **core** — чисті формули, спільні з `balance/sim.js` через бандл `balance/economy.js`. **game** — стан гри й переходи поверх core; симулятор їх не використовує. Обидва без React, React Native, сховища, мережі, `Date.now()` і `Math.random()` (FR-1, AC-1).

## core (`src/economy/core/`, бандл `StroiovaEconomy`)

Сигнатури й порядок операцій збігаються з sim.js, щоб відбиток не змінився (research § 2).

```ts
type Big = number;                                   // big.ts, рішення 53

DEFAULTS: EconomyParams                              // = DEFAULTS sim.js + tapRateMax
withDefaults(params: Partial<EconomyParams>): EconomyParams
reachableLevels(p): number
levelItems(p, level): { streams: UnitDef[]; stages: UnitDef[] }

capAt(def: UnitDef, L: number, p): number            // rate · L · milestoneMult^⌊L/milestoneEvery⌋, 0 при L ≤ 0
priceAt(def: UnitDef, L: number): Big                // L = 0 → unlock; інакше cost · growth^(L−1)
packPrice(def, L, n): Big                            // Σ priceAt(def, L..L+n−1), підсумовує по рівнях як sim.js
milestoneTarget(L, p): number                        // найближчий рівень, кратний milestoneEvery, > L

flow(input: {
  streams: { cap: number; on: boolean; share?: { base: number; factors: number[] } }[];
  stages:  { cap: number; on: boolean }[];
}): { sum: number; pipe: number; which: number; v: number }
// cap — уже з музеєм і фактором; on = відкрито і (не idle або є діловод);
// share: z = base · sum, далі z *= factors[k] по черзі (зберігає порядок sim.js)

prestigeMult(P, p): number                           // 1 + prestigeBonus · P
points(life, divisor, p): number                     // ⌊(life / divisor)^prestigeExponent⌋
integrate(cuts: number[], rateAt: (t: number) => number): number
// Σ rateAt(середина) · (x₁ − x₀) по відсортованих точках; кусково-стала функція
```

## game (`src/economy/game/`)

```ts
newGame(cfg: EconomyConfig, nowMs): EconomyState
newCycle(state): EconomyState                         // рішення 48

income(state, cfg, nowMs, effects, opts?: { idle?: boolean }): {
  perMin: Big; flow: FlowResult; bottleneck: 'streams' | UnitRef; M: number
}
multStack(state, cfg, nowMs, effects): { rows: { source, value, endsAtMs? }[]; total: number; museum: string } // FR-19
baseIncomePerMin(state, cfg): Big                     // FR-31

advance(state, cfg, fromMs, toMs, effects): { state; earned: Big }      // онлайн, FR-3
offline(state, cfg, leftAtMs, backAtMs, effects): {
  earned: Big; awayMs; creditedMs; cappedMs; fuelBonusMs; idle: boolean; paper: number
}                                                      // FR-23, FR-24, FR-28; ×2 застосовує 08

quote(state, cfg, target: UnitRef, mode: 'x1' | 'x10' | 'toMilestone'): {
  levels: number; price: Big; affordable: boolean; etaSec: number | null;
  rateBefore; rateAfter; incomeBefore; incomeAfter
}                                                      // FR-8, FR-9, FR-11
buy(state, cfg, target, mode, nowMs): { state; events: DomainEvent[] } | { error: 'insufficient' | 'locked' }
hire(state, cfg, target, nowMs): { state; events } | { error }
tap(state, cfg, nowMs, effects): { state; credited: boolean; gain: Big } // FR-16, ≤ tapRateMax/с
refuel(state, cfg, nowMs): state                       // FR-20
catTap(state, cfg, nowMs): { state; gain: Big }        // FR-32
nextPurchaseEtaSec(state, cfg, nowMs, effects): number | null           // FR-29
```

## format (`src/economy/format.ts`)

```ts
formatBig(x: Big, mode: 'balance' | 'price' | 'counter' | 'plain'): string   // FR-30, AC-18
formatRate(perMin: Big): string          // «+412/хв»
formatMult(m: number): string            // «×1,5»
formatDuration(sec: number): string      // «5 год 12 хв»
formatCountdown(sec: number): string     // «3:41:12»
```

## Бандл для симулятора

- `npm run build:economy` → `balance/economy.js` (esbuild, IIFE `StroiovaEconomy`, `module.exports` у Node); експортує лише core.
- `balance/sim.js`: `var E = typeof StroiovaEconomy !== 'undefined' ? StroiovaEconomy : require('./economy.js');`
- `balance/sandbox/build.py` вбудовує `economy.js` перед sim.js в обох місцях (worker і сторінка).
- `npm run build:economy -- --check` у CI: бандл збігається із джерелом.
