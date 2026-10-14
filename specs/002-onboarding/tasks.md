---
description: "Задачі: 002 Онбординг і перша сесія — етап 1 (кроки 1–9)"
---

# Tasks: 002 — етап 1

**Input**: plan.md, spec.md, research.md, data-model.md, contracts/onboarding-api.md, quickstart.md
**Tests**: обов'язкові (принцип III).

| Історія | Зі spec.md | Пріоритет |
| --- | --- | --- |
| US1 | Почати одним тапом, пропустити вступ (кроки 1–2) | P1 |
| US2 | Позивний і форма «він / вона» (крок 3) | P1 |
| US3 | Підписати перший акт, дрон злітає (кроки 4–5) | P1 |
| US4 | Підказки по одній дії: покращення й перший діловод (кроки 6–7) | P1 |
| US5 | Перша телеграма й дзвінок «Археологу» (кроки 8–9) | P2 |

## Phase 1: Setup

- [X] T001 `npx expo install expo-haptics`, `npx expo-doctor`; `package.json`
- [X] T002 [P] `content/callsign-stopwords.json` (`{ "version": 1, "words": [...] }`: «упа», «зсу» з варіантами, базовий мат; нижній регістр, без дублікатів) + `content/schema/callsign-stopwords.schema.json`; перевірка в `tools/check_content.py` (рішення 58)
- [X] T003 [P] `src/features/onboarding/texts.ts`: рядки o1–o4, b6–b9, c7, o3.sheet_*, o3.err4–5, b9.status1–3, b9.end, b9.doc, b9.cta2 з texts.md розділ 5 і spec 002 «Тексти»; без «—» (рішення 55); b6.arrow «Покращ рапорти: їх піде більше.» (рішення 57); нові — коментар «на вичитку»

## Phase 2: Foundational

- [X] T004 `src/economy/game/types.ts`, `income.ts`: `Effect.source` + `'onboarding_bird'`, перший у порядку `multStack`; тест `src/economy/__tests__/bird-mult-test.ts` (×2 у `multStack` і в `tap`)
- [X] T005 `src/features/onboarding/steps.ts`: `OnboardingState`, `newOnboarding`, `complete` (лише поточний крок; запис у `completed` з `atPlayMs`, `durationMs`, `skipped`), `ready` (coachUpgrade / coachHire / telegram ≥ 300 000 мс / call ≥ `archiveBonusAtSec`), `TELEGRAM_AT_MS`; тести `src/features/onboarding/__tests__/steps-test.ts`
- [X] T006 `src/save/schema.ts`, `migrations.ts`: `CURRENT_SCHEMA = 2`; `game.playtimeMs` («≥ 0»), `game.onboarding` (поля data-model.md; `callsign.text` 2–16 знаків); міграція 1 → 2: `step: 'done'`, `playtimeMs: 0`, `callsign: null`; тест на фікстуру v1 у `src/save/__tests__/migration-test.ts`
- [X] T007 `src/features/conveyor/store.ts`: `playtimeMs` і `onboarding` у сторі; `tick` додає ігровий час і тимчасовий ефект «Пташки», зменшує `birdLeftMs`; `away` не чіпає ні того, ні іншого; `gameSave`/`draftOf` пишуть їх; тест AC-6 (друга частина: 20 хв онлайн знімають ×2, 2 год фону — ні) у `src/features/conveyor/__tests__/bird-test.ts`
- [X] T008 `src/features/boot/useBoot.ts`: новий гравець → `newOnboarding`; `saveNow` після кожного закритого кроку (FR-28)

## Phase 3: US1 — кроки 1–2 (P1) 🎯

**Independent Test**: AC-1 (без PostHog), AC-2

- [X] T009 [P] [US1] `src/features/onboarding/__tests__/intro-test.tsx`: титул без системних вікон → тап → `onb-intro`; «Пропустити» → крок 2 `skipped: true`; «Далі» ×4 → o2.l2–o2.l4 по черзі, `skipped: false`; повторний тап «Прибути» закриває крок один раз
- [X] T010 [US1] `src/features/onboarding/TitleScreen.tsx` (артборд `OnbTitle`: наказ № 1, ТЕРМІНОВО, лого, o1.cta, o1.note)
- [X] T011 [US1] `src/features/onboarding/IntroScreen.tsx` (артборд `OnbIntro`: 4 репліки, «Далі», «Пропустити» на кожній)
- [X] T012 [US1] `src/app/index.tsx`: маршрут гри за `onboarding.step` (1–5 → екрани онбордингу, далі `MainScreen`); таббар прихований на 1–5 (FR-13)

## Phase 4: US2 — крок 3 (P1)

**Independent Test**: AC-3, AC-4, AC-5 (Sentry-частина)

- [X] T013 [P] [US2] `src/features/onboarding/__tests__/callsign-test.ts`: `validateCallsign` (1 знак → tooShort, 17 → tooLong, порожньо → empty, «зсу-1», «ЗCУ» латиницею → stopword, «Ексель-на-папері» ok, емодзі → chars); `gendered`
- [X] T014 [US2] `src/features/onboarding/callsign.ts`: `validateCallsign`, `gendered` (contracts/onboarding-api.md)
- [X] T015 [P] [US2] `src/features/onboarding/__tests__/callsign-screen-test.tsx`: AC-3 (Ексель + o3.h1, стать порожня → o3.err3, крок не закрито); AC-4 (лічильник «17/16», o3.err5, o3.err4); AC-5 «Сисадмін» + «вона» → `callsign.type = custom`, `gender = f`; звіт Sentry (009 `report.ts`) не містить позивного
- [X] T016 [US2] `src/features/onboarding/CallsignScreen.tsx` + `CallsignSheet.tsx` (артборд `OnbCallsign`: книга обліку, 3 позивні з підказками, рядок «свій», перемикач статі, o3.cta; шторка з лічильником «n/16», кнопка над клавіатурою; SE без скролу)

## Phase 5: US3 — кроки 4–5 (P1)

**Independent Test**: AC-6 (без звуку), AC-7 (без звуку)

- [X] T017 [P] [US3] `src/features/onboarding/__tests__/first-act-test.tsx`: 7 з 8 + 3 тапи → рівно 8, + 8 × `tapValue` підписів, ПОГОДЖЕНО раз, кроки 4 і 5 по разу, `birdLeftMs` = `onboardingBirdMin` × 60 000; o4.comment у формі «вона»; Reduce Motion → без тремтіння й хаптики (мок `expo-haptics`, `AccessibilityInfo`)
- [X] T018 [US3] `src/features/onboarding/haptics.ts`: `tapHaptic` (не частіше 70 мс), `stampHaptic`, `successHaptic` (+300 мс), `useReduceMotion`; `sfx(id)` без звуку до етапу 8
- [X] T019 [US3] `src/features/onboarding/FirstActScreen.tsx` (артборд `OnbFirstAct`: Ліна, Акт № 1, смужка «n з 8», «Підписати», ПОГОДЖЕНО з тремтінням, дрон, «Пташка в небі», o4.comment, «До стройової»)

## Phase 6: US4 — кроки 6–7 (P1)

**Independent Test**: AC-8, AC-9, AC-10

- [X] T020 [P] [US4] `src/features/main/__tests__/main-first-session-test.tsx`: AC-8 (лише Рапорти й 3 ланки, таббар видно); AC-9 (коуч кроку 6: тап поза ціллю нічого не робить, по цілі — покупка, крок 6 закрито, конфіг закріплено); AC-10 (150 → 200+ підписів → коуч найму Стройової → `clerk-first` → «Далі» → тост b7.toast, `clerkHire.isFirstClerk`)
- [X] T021 [US4] Коуч (FR-15) вбудовано в `UnitRow` і `MainScreen`: решта приглушена токеном `scrim` і не тапається (`pointerEvents`), ціль обведено, текст ≤ 2 рядків поруч із ціллю; на вкладці — у `TabBar` (див. research R6)
- [X] T022 [US4] `src/features/main/MainScreen.tsx`: стан «перша сесія» артборда `Main` (потоки, крім Рапортів, замкнені; ланки; печатка; чип множників з «Пташкою»; таббар `TabBar`; тости b6.toast1 на віху Рапортів і b6.toast2, коли вузьким місцем стали резолюції комбата; підсвітка одиниць без діловода після кроку 7, FR-17), замінює `ConveyorScreen` у `app/index.tsx`; offline-return 009 перед коучем
- [X] T023 [US4] `src/features/onboarding/ClerkFirst.tsx` (артборд `ClerkFirst`: Оля, c7.role, c7.change, c7.offline, «Далі»)

## Phase 7: US5 — кроки 8–9 (P2)

**Independent Test**: AC-11 (без PostHog), AC-12, AC-13

- [X] T024 [P] [US5] `src/features/onboarding/__tests__/telegram-call-test.tsx`: AC-11 (крок 7 на 3:40 гри → телеграма о 5:00 гри; +1 год годинника пристрою о 4:00 не прискорює); AC-12 (вкладка → `tg-detail` з b8.tip, вибір → `tg-result` «перший раз», крок 8, ефект `telegram_slow` на stroy для «сумлінно»); AC-13 (`tg-result` закрито на 6:10 → `call` о 7:00 гри, бонус = `archiveBonusMin` × базовий дохід один раз, b9.toast, екрана архіву немає)
- [X] T025 [US5] `src/features/telegrams/first.ts`: телеграма № 1 з `content/telegrams.json`, застосування `slow` як `Effect`
- [X] T026 [US5] `src/features/telegrams/TelegramDetail.tsx`, `TelegramResult.tsx` (артборди `TgDetail`, `TgResult`, стан «перший раз: що таке репутація»)
- [X] T027 [US5] `src/features/onboarding/CallOverlay.tsx` (артборд `Call`: виклик → репліки → бонус отримано; b9.*)

## Phase 8: Polish

- [X] T028 `src/features/onboarding/__tests__/resume-test.tsx`: AC-19 (вбивство на кроці 4 з 5 тапами → «0 з 8», позивний і форма на місці, закриті кроки не повторюються)
- [X] T029 Web-сценарій quickstart у Chromium 375×667 (`page.clock`), скріншоти
- [ ] T030 Агенти `content-reviewer` (тексти онбордингу) і `spec-guardian`; виправлення
- [ ] T031 Документація: CLAUDE.md (`src/features/onboarding`), `npm run check`

## Поза етапом 1

FR-21…FR-27, AC-14…AC-18 (08, 10); події PostHog (етап 5); звуки (етап 8); `rep`, `inspPct`, `durationMin` телеграми № 1 (03, 04).

## Dependencies

Setup → Foundational → US1 → US2 → US3 → US4 → US5 → Polish. Усередині фази тест [P] іде перед кодом.
