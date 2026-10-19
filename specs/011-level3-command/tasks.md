---
description: "Задачі: 011 Вихід з Бригади і рівень 3 - етап 1"
---

# Tasks: 011 - етап 1

**Tests**: обов'язкові (принцип III).

- [x] T001 `src/digitization/`: `PLAYABLE_LEVELS` = 3, `levelExitAllowed` у стані, `isLast` за станом рівня; тести AC-6, AC-7 (домен)
- [x] T002 `src/economy/core/defaults.ts`, `src/inspections/checklist.ts`: пункти Р3, `checklistLevel`; тест суми 51
- [x] T003 `src/inspections/final.ts`, `lifecycle.ts`, `types.ts`: підсумкова (оголошення, 5 + 1, ціна, реклама лише на базові, повтор, пункт механіки Р2); тести AC-1…AC-5
- [x] T004 `src/telegrams/`: пул Р3 без `pack`, «Нарада затягнулась» (`meeting`), відправники `cmd_hq`, `higher_hq`; тест AC-17
- [x] T005 `src/race/`: крок «Нарада» на Р3; тест
- [x] T006 `src/save/`: схема 10, міграція 9 → 10 з фікстурою; тест AC-19
- [x] T007 `store.ts`, `useBoot.ts`: оголошення підсумкової, `levelExitAllowed`, перехід, діловоди Р3, нарада, `needsSaveNow`
- [x] T008 UI: `BossBrief`, `InspPrep/Result/Warning`, `Digital`, `DigitConfirm`, `LevelUp` Р3, шапка Р3, `unit-unlock`, `KombatSheet` (нарада), `OfflineReturn`; тексти
- [x] T009 тести екранів: AC-1…AC-10, AC-17, AC-19
- [ ] T010 `spec-guardian`, `content-reviewer`; CLAUDE.md; `npm run check`; `golden.mjs --check`

## Поза етапом 1
Пачки й зведена відповідь (FR-17…FR-24, FR-30, AC-11…16, 18, 20), підсумкова Р3 (FR-27), перехід на Р4 (FR-28), журнал серії (016), арт Р3.
