---
description: "Задачі: 008 Реклама й покупки - етап 1"
---

# Tasks: 008 - етап 1

**Tests**: обов'язкові (принцип III).

- [X] T001 `defaults.ts`, `types.ts`: `adMult`, `adCapHours`; типи `starter*`
- [X] T002 `src/monetization/`: стан, ліміти, буст, права, товари, стартова пропозиція; тести AC-2, 5-7, 14, 15, 17, 18
- [X] T003 `race.ts` (`adSpeedup`), `lifecycle.ts` (`completeAll`), події в `types.ts`
- [X] T004 `src/save/schema.ts`, `migrations.ts`: схема 8, міграція 7 → 8 з фікстурою
- [X] T005 `src/services/ads.ts`, `purchases.ts`: заглушки; `test-services.ts`
- [X] T006 `store.ts`: `watchAd`, `purchase`, `restore`, `syncPurchases`, `claim(doubled)`, стартова пропозиція
- [X] T007 `features/monetization/`: `AdButton`, `ShopScreen`, `BoostsSheet`, `StarterOffer`, `IapSuccess`, `texts.ts`; кнопки в `offline-return`, `race-sheet`, `insp-prep`; `MainScreen`
- [X] T008 тести екранів: AC-2…AC-8, 12, 14-20
- [X] T009 `spec-guardian`, `content-reviewer`; CLAUDE.md; `npm run check`

## Поза етапом 1
AdMob, UMP, RevenueCat, ключі й development build; `ad-offer-first` (02); кнопка «Відновити покупки» в налаштуваннях (10); PostHog (етап 5); sim v6 (відкрите питання 7).

## Етап 2 (рішення 123)

- [X] T010 `npx expo install react-native-google-mobile-ads react-native-purchases`; плагін AdMob у `app.json` (тестові ID застосунку, `delayAppMeasurementInit`)
- [X] T011 `src/services/admob.ts`: UMP на запуску, форма першим тапом, один ролик напоготові, 10 с очікування, нагорода на EARNED_REWARD, без SDK з «Без реклами»; тести FR-10…FR-14, AC-12
- [X] T012 `src/services/revenuecat.ts`: configure з `$posthogUserId`, ціни й `priceInfo` з offering, покупка лише з entitlement, коди помилок, відновлення, права, `onChange`; тести FR-21, FR-23…FR-27, AC-13
- [X] T013 `useBoot.ts`: сервіси на пристрої, `start` і тихе звіряння прав на оновлення CustomerInfo; `ads_consent_update`; рядок «Налаштування реклами» (010 FR-17); стор: `busy` до видачі, «уже куплено» з entitlement, `ad_start` з OPENED
- [ ] T014 Справжні ID застосунку й блоків AdMob, ключі RevenueCat, товари в сторах, перевірка на development build (Дмитро)
- [ ] T015 Приглушення звуку на час ролика (FR-12) - етап 8, зі звуком
