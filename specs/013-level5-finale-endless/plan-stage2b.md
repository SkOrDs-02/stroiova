# План: 013, етап 2b (нескінченний режим «Дублі»)

Рішення 112. Обсяг: FR-23…FR-30 (без `share-card`), FR-21 «Поділитися» лишається відкладеним; AC-17…AC-22. Числа `dup.*` підібрано в етапі 2b-0 (рішення 111, sim.js v7.4). Поза етапом: `share-card` «Особистий рекорд» (007 етап 2), `track()` для `dub_start` і `personal_record_update` (етап 5), FX/SFX, лідерборд (020).

| FR | Етап 2b |
| --- | --- |
| FR-24, FR-25 | `src/dub/dub.ts`: `dubConfig(base, dub)` - копія конфігу з `rateMult`/`costMult`/`clerkMult` × `dup.mult`^N, `prestigeDivisor` × `dup.divisorMult`^N, `exitDigitizations` = `dup.exitDigitizations` (як `dubParams` у sim.js); стор тримає `base` і віддає `cfg` = `dubConfig(base, dub)`; `dubAccept` скидає рівень на Р1 (`newGame` без P_total, покупок і музею), `digit.counts`/`levelExitAllowed`/`levelStartMs`, цифрові ланки, діловодів |
| FR-23, FR-19 | Крок `endless_offer`: після `quiet` доставка № 112 (`deliverScripted`), відкриття відкриває `endless-intro`; № 113 - на `dub_start` Дубля 1; розсилка знову йде (`mailingStopped` = Y і Дубль 0) |
| FR-26 | `closeIfDue`: у Дублі шоста конвертація ставить `dub.closed`; акт «Дубль N закрито» в `digit-result`, потім `endless-intro` Дубля N+1 |
| FR-27 | `MODIFIERS`, `offered(dub)` - детермінований вибір з `dub.seed`, не той самий, що в поточному; ефекти: `two_copies` - ціна паперу й репутація телеграм ×2 (`cfg.dub`), `wet_seal` - `inspIntervalMinH/MaxH` × `intervalMult`, `inspHours` × `boostMult`, `no_did` - `fuelBonus` = `fuelMult`; чип у шапці `main` |
| FR-28 | `poolFor`-аналог `endlessPool(dub)` у мішку Дублів: № 278-287 за `requires.dubMin`/`dubModifier`, ВП-9 (спільний мішок з архівними повторами) - за замовчуванням; онбординг, `unit-unlock`, `coach`, сюжет і журнали не повторюються (прапорці вже одноразові); `level-up` у Дублі - короткий стан |
| FR-29 | `dub.record` `{ dub, lifetimeLog10 }`, `recordUpdate` на старті Дубля, тост «Новий особистий рекорд», `digital` (стан «нескінченний») і `profile` показують `rec.line` |
| FR-30 | схема 18 (`dub`), міграція 17 → 18; глобальна властивість `dub_number` - у `DomainEvent` `dubStart` (передасть `track()`, етап 5) |

## Рішення за замовчуванням (на підтвердження)

- **Лічильник «за весь час».** `dub.earned` накопичує `lifetimeCycle` завершених циклів з моменту оновлення (до нього - недоступно), `record.lifetimeLog10` = log₁₀(`earned` + поточний цикл). Рекорд Дубля - найбільший прийнятий Дубль.
- **Модифікатор** обирається чистою функцією від `dub.seed` (з `install`-незалежного тексту `dub-seed`) і номера Дубля, не рівний модифікатору поточного Дубля (ВП-5).
- **ВП-9.** № 278-287 іде тим самим слотом доби, що й звичайні телеграми: коли в пулах рівнів нічого свіжого, випадково з неотриманих Дублів і однієї архівної кандидатки (спільний мішок); окремої частоти не вигадуємо.
- **«Пізніше».** Лишає гравця на Р5, на `main` - банер «Наказ про Дубль N чекає» (як банер фіналу), № 112 лежить у «Нових».
