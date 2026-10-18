---
description: "Задачі: 007 Музей, курйози й поширення - етап 1"
---

# Tasks: 007 - етап 1

**Tests**: обов'язкові (принцип III).

- [ ] T001 `content/museum.json`: журнали № 1-8 (назви, голова/назва обкладинки, категорія, рідкість, бонус, джерело, підказка, флейвор, історія); рядки `j2/j3/j7`
- [ ] T002 `src/museum/types.ts`, `journals.ts`, `museum.ts`: отримання, джерела, № 8, бонуси в `state.museum` і `Journals`, курйози; ESLint-правило чистоти; тести AC-1, 3-5, 7, 8, 13, 19
- [ ] T003 `src/save/schema.ts`, `migrations.ts`: схема 7, міграція 6 → 7 з фікстурою v6; тест AC-17
- [ ] T004 `store.ts`: зріз `museum`, подача подій у музей (цифровізація, телеграми, перевірка, гонка), закриття розкриття, перегляд вкладки; бонуси в гонку; тости після вбивства (AC-18)
- [ ] T005 `src/features/museum/texts.ts`, `present.ts`
- [ ] T006 `MuseumScreen`, `JournalDetail`, `JournalNew`, `CuriosScreen`, `CurioDetail`; `InspResult` (блок експоната); `TabBar` (крапка); `MainScreen` (вкладка, черга розкриття, тости)
- [ ] T007 тести екранів: AC-2, 6, 9-12, 14, 18
- [ ] T008 `spec-guardian`, `content-reviewer`; CLAUDE.md (`src/museum`); `npm run check`

## Поза етапом 1
Поширення (`share-card`, PNG, системне меню, FR-26…FR-29, AC-15, AC-16), меню з бейджем (FR-25), сторіз, 16 журналів і «з 24» (016), PostHog (етап 5), шторка множників (рядок FR-12 готовий у `present.ts`).
