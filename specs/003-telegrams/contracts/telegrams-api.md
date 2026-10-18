# Contract: `src/telegrams` (етап 1)

```ts
newTelegrams(cfg, seed): TelegramState
tick(tg, ctx: { cfg, nowMs, tzOffsetMin, level, digitizations, inboxNewLimit }): { tg, delivered: InboxItem[] }
   // план доби, слоти до nowMs (за відсутності — по черзі), таймери, «на виконанні» → архів
deliverScripted(tg, id, nowMs): { tg, item }                // № 1 (002 крок 8)
canChoose(tg, eco, item, choiceId): { ok: true } | { ok: false; reason: 'paper' | 'digital'; n?: number }
answer(tg, eco, cfg, uid, choiceId, nowMs): { tg, eco, effects: StoredEffect[], events: DomainEvent[], result }
openNotice(tg, uid, nowMs): { tg, events }
flag(tg, uid, reason?, comment?): tg
repTier(value, cfg): 'low' | 'norm' | 'high'
replyChance(tg, cfg, inspPct, shield, pTotal): number      // 0…1; 0 до першої планової
kombatOnSessionStart(tg, cfg, nowMs, tz, isFirstSession): { tg, effects, started }
sendRunner(tg, eco, cfg, nowMs): { tg, eco, effects } | { error: 'money' }
```

Усе чисте: економіку (`EconomyState`) змінює лише через повернений `eco`.
