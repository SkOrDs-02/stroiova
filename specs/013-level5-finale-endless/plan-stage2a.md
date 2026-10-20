# План: 013, етап 2a (фінал)

Рішення 110. Обсяг: FR-15…FR-22, FR-30 (поля фіналу); AC-11…AC-16, AC-22. Поза етапом: Дублі, нескінченний режим, `endless-intro`, «Особистий рекорд», `share-card` (FR-23…FR-29, FR-21 «Поділитися») - етап 2b після підбору чисел `dup.*` у `balance-change`.

| FR | Етап 2a |
| --- | --- |
| FR-15, FR-16 | `src/finale/finale.ts`, `features/conveyor/finale.ts` (`startIfDue`, `completeStep`, `autoSteps`), банер `finale-banner` на `main` |
| FR-17 | `FinaleOrder`: 8 тапів, штамп, «Дід друкує» |
| FR-18, FR-19 | `FinaleShutdown` (Y/N), `deliverScripted` № 108-111, `muted` у `tick` |
| FR-20 | `LastBook`, `finaleOpenLastBook` (`grant` № 24, `source: finale`), запис про кота з `st_cat_03` |
| FR-21 | `Credits` з `content/credits.json`, повторно з `about`; тригери `finale_step` для `call` і `credits_line` |
| FR-22 | `finaleQuietDays`, `quiet` за часом від Y |
| FR-30 | схема 17, міграція 16 → 17 |
