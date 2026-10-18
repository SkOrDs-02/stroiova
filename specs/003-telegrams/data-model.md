# Data Model: 003 — етап 1

## GameSave v3

`game.telegrams: TelegramState` (міграція 2 → 3: порожній стан, репутація `repStart`; якщо онбординг уже відповів на № 1 — запис № 1 в архіві з вибором `onboarding.tg1`).

## TelegramState

| Поле | Тип | Правила |
| --- | --- | --- |
| `rng` | `number` | стан генератора (R1) |
| `day` | `{ key: string; slots: number[]; used: number } \| null` | план поточної місцевої доби; `key` РРРР-ММ-ДД |
| `inbox` | `InboxItem[]` | усі отримані телеграми й записки |
| `queue` | `string[]` | `queueNext` перед мішком |
| `timers` | `Timer[]` | `{ atMs, kind: 'delayed' \| 'return' \| 'followUp' \| 'work', itemId, payload }` |
| `flags` | `Record<string, true>` | `setFlag` |
| `reputation` | `{ value: number; history: { delta: number; atMs: number; itemId: string }[] }` | 0–100; історія ≤ 3 |
| `firstInspectionPassed` | `boolean` | ставить 04; до того p = 0 |
| `unscheduledDays` | `string[]` | дні з позаплановою (≤ `unscheduledPerDay`) |
| `override` | `{ lastDayKey: string \| null; nextNo: number }` | FR-24 |
| `kombat` | `{ lastDayKey: string \| null; active: { startMs; endMs; runnerAtMs: number \| null } \| null }` | FR-28, FR-29 |
| `firstDayStartMs` | `number \| null` | початок доби 1 (крок 7) |

## InboxItem

| Поле | Тип |
| --- | --- |
| `uid` | рядок: `id` + номер доставки |
| `id` | id телеграми або записки |
| `kind` | `'telegram' \| 'notice' \| 'override' \| 'note'` |
| `receivedAt` | мс |
| `status` | `'new' \| 'work' \| 'drawer' \| 'archive'` |
| `choiceId`, `answeredAt` | після відповіді |
| `workUntil` | мс, для «на виконанні» |
| `read` | для записок і notice |
| `flagged` | «Це не смішно» |
| `vars` | `{ n, n1 }` для override |
| `result` | `{ rep, repAfter, tierAfter, paper, slow, chancePct, inspHit }` для `tg-result` і курйозів |

## DomainEvent (+ до 001)

`telegramReceive`, `telegramAnswer`, `reputationTierChange`, `unscheduledInspection`, `kombatStart`, `kombatFound`, `curio`, `journal`, `arc`, `inspItem` — для 04, 07, 014 і аналітики етапу 5.
