# План: 014, етап 1 (рушій сюжету, щоденник)

Рішення 106. Обсяг: FR-1…FR-13, FR-24, FR-25, FR-29; AC-1…AC-9, AC-14, AC-17…AC-20. Аркуші Археолога, `finale-script`, титри, репліки «Перехід» - наступні етапи.

| FR | Етап 1 |
| --- | --- |
| FR-1 | `src/story/schema.ts` (zod; унікальні id, носії, `payload` за носієм, цикли, існування `telegramId`), тест `content-test.ts` |
| FR-2…FR-5 | `src/story/engine.ts`: `sync`, `onEvent`, `ready`, `pull`, `confirmTelegram`; стан `story` у збереженні (схема 14) |
| FR-6 | `MainScreen`: `storyFree` = `calm` без оферт; `storyRun` у ефекті |
| FR-7 | `SessionBudget` (перебивні, тости), `storyMaxToasts` |
| FR-8 | `away` у `fired.away`; кроки віддаються після `offline-return` |
| FR-9 | телеграма кроку - у `telegrams.queue` (займає слот), `notice` з черги |
| FR-10, FR-29 | `lapsed`, `required`, `storyForLevel` у міграції 13 → 14 |
| FR-12 | `src/story/text.ts` |
| FR-13 | `signOf` у `TelegramDetail` |
| FR-24, FR-25 | `src/story/diary.ts`, `DiaryScreen`, `OfflineReturn`, `ProfileScreen` |
