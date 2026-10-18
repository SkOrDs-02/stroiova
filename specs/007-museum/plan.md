# Implementation Plan: 007 Музей, курйози й поширення - етап 1

**Branch**: `007-museum` (від `006-digitization`) | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: `specs/007-museum/spec.md`; рішення 20, 29, 44, 75-79; 001 (`state.museum`, `museum*Pct` у конфігу), 003 (події `journal`, `curio`), 004 (`inspectionJournal`), 005 (`raceCurio`, `Journals` у маршруті), 006 (`digitizationComplete.journalsCancelled`), 009 (запис).

## Summary

Музей - 8 журналів, скасованих реально: кожен дає вічний бонус до економіки, восьмий подвоює решту. Журнал курйозів зберігає відповіді на телеграми й програні подарунки. Економіка вже має місце для бонусів (`EconomyState.museum`, `museum*Pct`, `Journals` у `routeFor`): модуль `src/museum/` лише рахує їх із переліку отриманих журналів. Запис - схема 7.

## Обсяг

| FR | Етап 1 | Що відкладено й куди |
| --- | --- | --- |
| FR-1, FR-2 | ✅ 8 журналів у `content/museum.json`, «N з 8», сегменти | - |
| FR-3…FR-9 | ✅ джерела: цифровізація (№ 1-5), телеграма 25 (№ 6), перевірка без зауважень (№ 7), семеро інших (№ 8) | № 9-11 записуються без бонусів (рішення 76) |
| FR-10, FR-11 | ✅ `state.museum` перераховується при отриманні; гонка бере `Journals` | - |
| FR-12 | ✅ рядок «Музей журналів» у шторці множників (якщо шторка є) | шторки множників у збірці ще немає: рядок готовий у `present.ts`, вмикає фіча, що додасть шторку |
| FR-13…FR-17 | ✅ `museum`, фільтри, порожні стани, `journal-detail` | кнопка «Поділитися» - етап 2 |
| FR-18, FR-19 | ✅ `journal-new` після `digit-result`, блок в `insp-result`, після `offline-return`, після закриття телеграми | - |
| FR-20 | ✅ крапка на вкладці, `museum_open` | - |
| FR-21…FR-24 | ✅ запис, список, групи за днями, `curio-detail` | «Поділитися» - етап 2 |
| FR-25 | ✅ вхід з сегмента | меню - окрема фіча (рішення 75) |
| FR-26…FR-29 | ❌ | етап 2 (рішення 75) |
| FR-30 | ✅ збереження, «Скинути прогрес» | - |

AC етапу: 1-14, 17-19. AC-15, AC-16 - етап 2.

## Technical Context

TypeScript strict · zustand, zod 4 · MMKV, схема 7 (`game.museum`), міграція 6 → 7 · Jest + Testing Library · числа лише з `DEFAULTS` (`museum`, `museumUnitPct`, `museumStoragePct`, `museumPaperPct`, `museumRacePct`) · тексти журналів - `content/museum.json`.

## Constitution Check

| Принцип | Як | Стан |
| --- | --- | --- |
| I | Відсотки бонусів - з конфігу; джерела з spec | ✅ |
| II | `src/museum/` без React і годинника | ✅ |
| III | AC - тести; міграція 6 → 7 з фікстурою | ✅ |
| IV | Тексти зі spec/texts.md, рядки `j2/j3/j7` (рішення 29); `text-review` | ✅ |
| VI | `@/theme` | ✅ |
| VII | Події `museum_*` лишаються доменними; PostHog - етап 5 | ✅ |
| VIII | Без бекенду | ✅ |

## Project Structure

```text
src/museum/              types.ts · journals.ts (довідник з content) · museum.ts (отримання, бонуси, курйози) · __tests__/
src/features/museum/     MuseumScreen.tsx · JournalDetail.tsx · JournalNew.tsx · CuriosScreen.tsx · CurioDetail.tsx · present.ts · texts.ts
src/features/conveyor/store.ts   зріз museum; джерела подій; закриття розкриття
src/features/inspections/InspResult.tsx   блок «Новий експонат»
src/ui/TabBar.tsx       крапка на «Музей»
src/save/schema.ts, migrations.ts   схема 7
content/museum.json     № 1-8
```

## Complexity Tracking

Порушень немає.
