# Перевірка: 009 (етап 1)

1. `npm test -- src/save src/economy/__tests__/time-test.ts` — AC-1, AC-3…AC-5, AC-7, AC-8, AC-10, AC-11 на пам'ятному `KeyValue` і фікстурах записів.
2. `npm run check` — типи, лінт, усі тести.
3. Web у Chromium 375×667 (`npx expo export --platform web`, `page.clock`):
   - тапи й покупка → перезавантаження сторінки → прогрес на місці (`save` у localStorage);
   - фон 10 год з діловодами → перезавантаження → `offline-return` з сумою за 8 год;
   - зіпсувати `save` у localStorage → перезавантаження → `save-error` «є резервна копія» → «Відновити з копії»;
   - годинник назад на 2 год → тост «Годинник переводили назад…», офлайн 0.
4. Пристрій (development build): `.maestro/save-restore.yaml` — покупка, вбивство застосунку, перезапуск, прогрес на місці (AC-2 аналог для покупки рівня).
