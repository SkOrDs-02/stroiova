# Implementation Plan: 008 Реклама й покупки - етап 1

**Branch**: `008-ads-iap` (від `main` після 007) | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: `specs/008-monetization/spec.md`; рішення 9, 15-18, 80-84; 001 (`hasNoAds`, `storageHours`, `offlineDoubles`, `claimOffline`), 004 (чекліст), 005 (гонка), 007 (рядок «Музей журналів»), 009 (запис).

## Summary

П'ять місць реклами з добовими лімітами, буст ×2 з накопиченням до 12 год, «Без реклами» ×1,3 з кнопками «Забрати», три товари, кеш прав офлайн, відновлення, стартова пропозиція. Логіка - чистий модуль `src/monetization/` поверх економіки; ролик і оплата йдуть через інтерфейси `AdService` і `PurchaseService`. У збірці стоять заглушки (ролика немає, покупка недоступна): AdMob, UMP і RevenueCat - етап 2 (рішення 80). Запис - схема 8.

## Обсяг

| FR | Етап 1 | Що відкладено й куди |
| --- | --- | --- |
| FR-1 | ✅ показ лише з обробника тапу (`watchAd`) | AdMob-блоки, перегляд конфігу (AC-1) - етап 2 |
| FR-2…FR-9 | ✅ буст з накопиченням, офлайн ×2, гонка −50%, чекліст, ліміти, стани кнопки | - |
| FR-10…FR-13 | ✅ стани «вантажиться», «ролика немає», закрито раніше, запис нагороди в мить нагороди | таймаут 10 с, звук, UMP - етап 2 (потрібен SDK) |
| FR-14 | ✅ «Забрати» на всіх місцях | не ініціалізувати AdMob - етап 2 |
| FR-15…FR-18 | ✅ три товари, права, ефекти | RevenueCat - етап 2 |
| FR-19, FR-20 | ✅ `starter-offer` після першого побаченого результату перевірки | порядок черги модалок 09: поки в `MainScreen` |
| FR-21…FR-27 | ✅ ціни зі стору, одна покупка за раз, успіх, скасування, помилка, pending, кеш прав, відновлення | кнопка в налаштуваннях - 010 |
| FR-28, FR-29 | ✅ без згадок фонду, банер без мережі | - |
| `ad-offer-first` | ❌ | крок 10 онбордингу - 002 |

AC етапу: 2-8, 12-20 (на сервісах-підставках); AC-1, AC-9 (таймаут 10 с), AC-11 (UMP) - етап 2.

## Technical Context

TypeScript strict · zustand, zod 4 · MMKV, схема 8 (`game.monetization`), міграція 7 → 8 · Jest + Testing Library · числа лише з `DEFAULTS` (`adsPerDay`, `adHours`, `adMult`, `adCapHours`, `offlineAdMult`, `offlineAdPerDay`, `raceAdPerDay`, `raceAdCut`, `paidMult`, `starterSignatures`, `starterFuelHours`, `storageHours`, `fuelHours`).

## Constitution Check

| Принцип | Як | Стан |
| --- | --- | --- |
| I | Механіки зі spec 008 і рішень 80-84; нові параметри `adMult`, `adCapHours` у конфігу | ✅ |
| II | `src/monetization/` без React і годинника; сервіси - інтерфейси | ✅ |
| III | AC - тести; міграція 7 → 8 з фікстурою | ✅ |
| IV | Тексти зі spec/артбордів, «ти»; `text-review` | ✅ |
| VI | `@/theme` | ✅ |
| VII | Доменні події `ad*`, `purchase*`, `offlineIncomeClaim` | ✅ |
| VIII | Без власного бекенду: права зі стору | ✅ |

## Project Structure

```text
src/monetization/        types.ts (стан, AdService, PurchaseService) · monetization.ts · test-services.ts · __tests__/
src/services/            ads.ts, purchases.ts - заглушки до етапу 2
src/features/monetization/  AdButton · ShopScreen · BoostsSheet · StarterOffer · IapSuccess · texts.ts
src/features/conveyor/store.ts   зріз monetization; watchAd, purchase, restore, syncPurchases
src/race/race.ts, src/inspections/lifecycle.ts   adSpeedup, completeAll
```

## Complexity Tracking

Порушень немає.
