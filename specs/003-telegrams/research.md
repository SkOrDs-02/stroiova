# Research: 003 — етап 1

## R1. Детермінована випадковість
- **Decision**: генератор LCG (як `lcg` у `sim.js`) зі станом `rngState` у записі. Кожен кидок (план доби, мішок, шанс перевірки, `roll`, override, комбат) бере наступне число й пише новий стан.
- **Rationale**: AC-25 (два seed — різний порядок, один seed — той самий), відновлення після вбивства не перекидає кубик, тести без моків `Math.random` (eslint забороняє його в домені).

## R2. Розклад доби (FR-2, FR-4)
- **Decision**: план доби будується ліниво при першому `tick` нової місцевої доби: N = 2 + rng·3 (2–4, `slowPerDayMin/Max`), слоти рівномірно у вікні `tgFromHour`–`tgToHour` з інтервалом ≥ `tgMinGapMin` (вибір відкиданням до 50 спроб; інакше рівний крок). Доба 1 починається з моменту закриття кроку 7; № 1 займає перший слот квоти (FR-1, FR-2).
- **Час доби**: застосунок передає `tzOffsetMin` (`Date.getTimezoneOffset`) — домен рахує місцеві межі доби без `Date`.
- **Доставка за відсутності (FR-3)**: при поверненні проходимо слоти між `lastMs` і `now` у хронологічному порядку; слот пропускається, якщо «Нових» уже `tgMaxNew` (FR-4).
- **Годинник назад** (крайовий випадок): доставлені слоти не відкочуються, план доби з меншою датою не перебудовується.

## R3. Мішок і повтор (FR-5, FR-31; 09 FR-36)
- **Decision**: кандидати = пул рівня (за `level` ≤ поточного: Р2 бере й неотримані Р1, FR-7), мінус `scripted`, `outsideQuota`, `endless`, `kind: override|event|notice`-шаблони, мінус отримані (крім № 13 з `repeatEveryDays`), з виконаними умовами `schedule` (`season` — місяць пристрою, `requires.digitizationsMin` — кількість цифровізацій, `raceActive` — 05, поки false). Вибір — рівномірно з кандидатів через rng. Порожньо → архівна з найдавнішою відповіддю, якщо минуло ≥ `tgRepeatMinDays`; інакше слот пропущено.
- **queueNext** (FR-6) — черга перед мішком; **followUps** — таймер `afterHours` після відповіді, поза квотою.
- `notice`-телеграми (№ 4581 тощо) приходять лише як followUps.

## R4. Ефекти (FR-12…FR-20)
- `slow` → `Effect` `telegram_slow` (factor ×mult, `slowHours` з контенту/конфігу, стінні мітки); кілька одній цілі перемножуються (вже в 001).
- `paper` → `economy.paper` (неактивний варіант при нестачі, FR-18; ніколи < 0).
- `rep` → репутація (R5); `digitalShield` при P_total ≥ 1 — без `rep` < 0 і без кидка.
- `durationMin` → «на виконанні» до кінця; для сумлінно — до кінця сповільнення.
- `inspPct` → кидок p (R5). Випадіння → доменна подія `unscheduledInspection` (≤ `unscheduledPerDay`), яку прийме 04; до 04 перша планова не пройдена → p = 0.
- `roll{pct,effects,text}` → кидок і вкладені ефекти; `delayed[{afterHours,effects}]` і `returnsAfterHours` → таймери (FR-17), скасовуються відповіддю з шухляди (FR-10); `fuel` → функції пального 001; `kombat{pct,maxMin}` → подія R6; `clerkAway`, `ifNoClerk` → фактор на ціль, якщо діловода немає; прапорці `setFlag/ifFlag/clearFlag` — у стані.
- Поза етапом як записи: `race`, `curio`, `arc`, `inspExtraItem`, `inspRemarkPct`, `inspRollAfterHours`, `journal`, `cancelInspRollOf`.

## R5. Репутація (рішення 61–63)
- Ціле 0–100, старт `repStart`, рівні за `repLow`/`repHigh`. p = min(1, inspPct/100 × k), k = `replyChanceLow` / 1 / `replyChanceHigh`. Історія — 3 останні зміни для шторки. Перетин межі → тост `rep.toast` і доменна подія.

## R6. Override і «Комбата шукають»
- Override займає слот з імовірністю `overrideChance` з доби `overrideFromDay`, не частіше ніж раз на `overrideMinGapDays`; номери {n} від `orderNoStart`.
- Комбат: на старті сесії (не першої), ≤ 1 на добу, шанс `kombatChance`; «Резолюції комбата» ×`kombatMult` (`Effect` `kombat_away`) на `kombatMinMin`–`kombatMaxMin`; посильний: `kombatRunnerMin` хв, ціна `kombatRunnerCostMin` × базовий дохід.

## R7. Онбординг (002)
- `features/telegrams/first.ts` переходить у домен: крок 8 — доставка № 1 через `deliverScripted`; відповідь іде через загальний `answer`, онбординг читає `inbox` і закриває крок. Тимчасові `onboarding.tg1*` лишаються в стані 002 (схема), але заповнюються з модуля.

## R8. Пули реплік (рішення 41, 45)
- `lines.ts`: мішок без повтору до вичерпання й ніколи двічі поспіль; ≤ 2 репліки персонажів за сесію (сесія — 009 `isNewSession`); порожні стани й статуси не рахуються.
