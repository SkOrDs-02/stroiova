# Модель даних: 001 Економіка ядра й офлайн

Усі суми підписів — `Big` (рішення 53). Час — мілісекунди (ціле), швидкості — за хвилину, як у sim.js. Числа балансу лише з конфігу (FR-2).

## Конфіг

### EconomyParams
Формат `params` пресету пісочниці, пропущений через `withDefaults` (порт без змін). Поля, які читає 001:

| Поле | Тип | Опис |
| --- | --- | --- |
| `streams` | `UnitDef[]` | Потоки Р1 у порядку маршруту (raporty, akty, dovidky, nakladni) |
| `stages` | `UnitDef[]` | Ланки Р1 (kombat, stroy, fin) |
| `levels` | `LevelDef[]` | Блоки рівнів: множники й нові одиниці (Р2: nakazy, kazna) |
| `milestoneEvery`, `milestoneMult` | number | Віха кожні 25 рівнів, ×2 |
| `tapValue` | number | 2 підписи за тап × M |
| `storageHours`, `paidMult`, `prestigeBonus`, `prestigeExponent` | number | Сховище, «Без реклами», бонус бала, степінь балів |
| `fuelHours`, `fuelBonus`, `fuelBonusThreshold` | number | Бак 6 год, ×1,25, межа 0,2 |
| `offlineAdMult`, `offlineAdPerDay` | number | ×2, 3 на добу |
| `paperStart`, `paperPerMinPerLevel`, `paperGift` | number | Папір |
| `catBonusMin` | number | Кіт Сейф, хв базового доходу |
| `museum*` | number | Бонуси музею (07); ядро приймає готовий коефіцієнт одиниці |

Нове в конфігу (немає в sim.js): `tapRateMax` = 10 (FR-16), поріг екрана повернення 5 хв. Значення за замовчуванням додаються в `DEFAULTS` модуля, на віхи симулятора не впливають.

### UnitDef
`{ id, name, rate, cost, growth, manager, unlock? , share? }` — як у sim.js. `levelItems(p, level)` повертає масштабовані копії для рівня.

### EconomyConfig (обгортка гри)
`{ version: 'econ-v7.2', source: 'bundled' | 'remote' | 'cached', params: EconomyParams }`. Закріплення конфігу — 009.

## Стан

### EconomyState
Чистий об'єкт, серіалізується як є (збереження — 009).

| Поле | Тип | Правила |
| --- | --- | --- |
| `level` | 1 \| 2 | Рівень гри (перехід — 06) |
| `streamLevels` | number[] | 0 = замкнено. Новий цикл: `[1, 0, 0, 0]` (FR-12) |
| `stageLevels` | number[] | Новий цикл: усі 1 |
| `streamClerks`, `stageClerks` | boolean[] | Новий цикл: усі false (FR-14) |
| `signatures` | Big | Баланс; ≥ 0 |
| `lifetimeCycle` | Big | Зібрано за цикл (бали цифровізації, 06) |
| `prestigePoints` | number | P, ціле ≥ 0 (06 нараховує) |
| `hasNoAds` | boolean | «Без реклами» (08) |
| `fuelEndMs` | number \| null | Коли бак порожній; null = ніколи не заправляли |
| `fuelCapacityMs` | number | 6 год або 12 год зі «Стартовим набором» |
| `paper` | number | Дробове, на екрані ціле вниз (FR-22) |
| `storageHours` | number | 8 або 24 (08), × журнал № 2 |
| `seenUnlocks` | string[] | Одиниці, для яких уже показано `unit-unlock` за встановлення (FR-13) |
| `catBonusAtMs` | number \| null | Останній бонус кота (FR-32) |
| `tapWindow` | `{ startMs, count }` | Лічильник тапів поточної секунди (FR-16) |
| `offlineDoubles` | `{ date, count }` | Нагороди ×2 за місцеву добу пристрою; скидається, лише коли дата пізніша (FR-26, 09 FR-15) |

Переходи:
- **Покупка рівня** `buy(state, target, mode)`: атомарно `signatures -= ціна пакета`, `level += n`; дозволено, коли точний баланс ≥ точної ціни (FR-10). Режими `x1`, `x10`, `toMilestone` (FR-8).
- **Відкриття потоку** — покупка рівня 0 → 1 за `unlock`; лише коли попередній потік відкрито (FR-12).
- **Найм діловода** — `signatures -= manager`, прапорець true; повторно не можна (FR-14).
- **Новий цикл** `newCycle(state)` — як `reset()` у sim.js: рівні, діловоди, підписи, `lifetimeCycle` скидаються; бусти, бак, папір, `hasNoAds`, `seenUnlocks` лишаються (рішення 48).

## Ефекти (вхід від 03, 04, 05, 08)

### Effect
Кусково-сталий множник або фактор з абсолютними мітками; ядро їх не створює.

| Поле | Тип | Опис |
| --- | --- | --- |
| `kind` | `'mult' \| 'factor'` | `mult` входить у M (FR-17), `factor` — у виробіток однієї одиниці (FR-18) |
| `source` | string | `ad_boost`, `gift_drone`, `gift_shovel`, `gift_generator`, `inspection_pass`, `telegram_slow`, `kombat_away`, `inspection_fail`, … |
| `value` | number | ×2, ×1,5, ×3, ×0,5, ×0,25 |
| `target` | `{ type: 'stream' \| 'stage', id }` | Лише для `factor` |
| `startMs`, `endMs` | number | Інтервал дії |

`gift_generator` тримає M_fuel = ×1,25 незалежно від бака (FR-21).

## Похідні величини (функції, не стан)

- **Виробіток одиниці** `capAt(def, L, p) × museum × factor` (FR-5, FR-18).
- **Конвеєр** `flow(...)` → `{ sum, pipe, which, v }`; вузьке місце — «потоки», якщо `sum ≤ pipe`, інакше `which` (FR-6). Варіант `idle`: одиниці без діловода дають 0 (FR-15).
- **M** — добуток у фіксованому порядку: цифрові бали, «Без реклами», реклама, подарунок, перевірка, пальне (FR-17); `multStack()` повертає ще й список рядків для `boosts-sheet` (FR-19).
- **Базовий дохід** `baseIncomePerMin` (FR-31) — без тимчасових множників і факторів.
- **ETA** `nextPurchaseEtaSec` (FR-29) — найдешевша покупка, що піднімає дохід, при поточному доході.

## Доменні події (для аналітики етапу 5)

`streamUnlock { streamId, unlockIndex, cost }`, `purchase { targetType, targetId, levelFrom, levelTo, levelsBought, mode, cost, wasBottleneck, incomeBefore, incomeAfter }`, `clerkHire { targetType, targetId, cost, isFirstClerk, clerksCountAfter }`, `milestone { targetType, targetId, level, rateMultiplier }`. Повертаються з функцій переходу разом із новим станом.
