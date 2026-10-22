# Задачі: 013, етап 2b (Дублі)

**Фаза 1. Домен** (`src/dub/`)
- [x] T201 `dub.ts`: `DubState`, `newDub`, `MODIFIERS`, `offered`, `dubConfig`, `accept`, `closeIfDue`, рекорд, `earned`
- [x] T202 тести домену: паритет `dubConfig` з `dubParams` sim.js (множники, дільник, вихід), вибір модифікатора, рекорд

**Фаза 2. Збереження й телеграми**
- [x] T203 схема 18: `dub` у `gameSaveSchema`, міграція 17 → 18, тест на фікстуру 17
- [x] T204 типи `Telegram.schedule.requires.dubMin/dubModifier`, `trigger.dub_start`; мішок Дублів у `bag.ts` (`dub` у `BagCtx`), `planDay` для Дубля
- [x] T205 ефекти модифікаторів: `two_copies` (`paperCost`, `rep`), `wet_seal` і `no_did` (через `dubConfig`)

**Фаза 3. Стор**
- [x] T206 `dub` у сторі, `base`/`cfg`, `dubAccept`, `dubLater`, `closeIfDue` у підписці, `endless_offer` (№ 112), № 113, `unmute`
- [x] T207 події `dubStart`, `personalRecordUpdate`; тост рекорду; `needsSaveNow`
- [x] T208 тести стору: AC-17, AC-18, AC-19, AC-20, AC-21

**Фаза 4. Екрани**
- [x] T209 `EndlessIntro` (утримання 1,2 с), банер «Наказ про Дубль чекає», чип модифікатора, `level-up` короткий, «Дубль N закрито», рядок рекорду на `digital` і в `profile`
- [x] T210 тести екранів; `npm run check`; spec-guardian; PR
