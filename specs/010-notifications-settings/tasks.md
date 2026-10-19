---
description: "Задачі: 010 Сповіщення, налаштування й приватність - етап 1"
---

# Tasks: 010 - етап 1

**Tests**: обов'язкові (принцип III).

- [ ] T001 `src/notifications/`: каталог, планувальник (кандидати, категорії, тихі години, ліміт 2 на добу, № 8 раз на добу); тести AC-1…AC-5
- [ ] T002 `src/save/schema.ts`, `migrations.ts`: схема 9 (`settings`, `notifications`, `museum.curiosSeen`), міграція 8 → 9 з фікстурою
- [ ] T003 `src/services/notifications.ts`, `links.ts`: заглушки; `test-services`
- [ ] T004 `store.ts`: налаштування, `goBackground`, `comeForeground`, `resetProgress`, `changeCallsign`, видача набору після скидання; `useBoot` (AppState)
- [ ] T005 хаптика й звук за налаштуваннями
- [ ] T006 `features/settings/`: меню, налаштування, `push-preprompt`, `reset-confirm`, профіль, «Про гру», звіти, ліцензії; `content/about.json`
- [ ] T007 тести екранів: AC-9, 10, 13, 14, 18-20; `release-gate`
- [ ] T008 `spec-guardian`, `content-reviewer`; CLAUDE.md; `npm run check`

## Поза етапом 1
Справжні `expo-notifications`, UMP, оцінка, буфер, браузер, `optOut` PostHog; крок 11 онбордингу (02); звуки; CDN зі звітами.
