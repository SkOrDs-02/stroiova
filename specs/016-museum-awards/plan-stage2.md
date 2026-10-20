# План: 016, етап 2 (грамоти)

Рішення 109. Обсяг: FR-17…FR-35, FR-45; AC-9…AC-20. Поза етапом: `share-card` (FR-36, FR-37, AC-18), платформа (FR-38…FR-44, AC-21…AC-23), `track()` (етап 5).

| FR | Етап 2 |
| --- | --- |
| FR-17, FR-19, AC-9 | `src/awards/content.ts` читає `content/awards.json`; `awards.ts` - інтерпретатор лічильників і умов; `facts.ts` - доменні події -> факти з назвами tracking-plan |
| FR-18 | домен приймає події й `AwardCtx`, повертає лише `AwardsState`; тест AC-13 (стан економіки не змінюється) |
| FR-20 | `telegramFlag` не дає факту; тест AC-11 |
| FR-21, FR-45 | `applyFacts` видає раз, `got` у записі (`awards`, необов'язкове поле), `needsSaveNow` |
| FR-22 | `resetProgress` обнуляє лічильники, грамоти й номер наказу лишаються |
| FR-23 | `retroactive` при створенні стору, один тост |
| FR-24 | `lastOrderNo`, `orderNo` у `GotAward`, `award-detail` показує «ВИТЯГ З НАКАЗУ № N» |
| FR-25…FR-28 | `AwardsScreen` (шапка, фільтри, секції, плитки, `AwardDetail`) у третьому сегменті музею |
| FR-29, FR-30 | `unseen`/`markSeen`, крапка сегмента й вкладки, рядок «Грамоти: N з 62» в особовій справі |
| FR-31…FR-35 | `awardQueue`, `toastsOf`, `flushAwardToasts` з `MainScreen` у `calm`; мітка події й `offline` у `Grant` |
