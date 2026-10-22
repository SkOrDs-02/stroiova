# Задачі: 013, етап 2b (Дублі)

**Фаза 1. Домен** (`src/dub/`)
- [ ] T201 `dub.ts`: `DubState`, `newDub`, `MODIFIERS`, `offered`, `dubConfig`, `accept`, `closeIfDue`, рекорд, `earned`
- [ ] T202 тести домену: паритет `dubConfig` з `dubParams` sim.js (множники, дільник, вихід), вибір модифікатора, рекорд

**Фаза 2. Збереження й телеграми**
- [ ] T203 схема 18: `dub` у `gameSaveSchema`, міграція 17 → 18, тест на фікстуру 17
- [ ] T204 типи `Telegram.schedule.requires.dubMin/dubModifier`, `trigger.dub_start`; мішок Дублів у `bag.ts` (`dub` у `BagCtx`), `planDay` для Дубля
- [ ] T205 ефекти модифікаторів: `two_copies` (`paperCost`, `rep`), `wet_seal` і `no_did` (через `dubConfig`)

**Фаза 3. Стор**
- [ ] T206 `dub` у сторі, `base`/`cfg`, `dubAccept`, `dubLater`, `closeIfDue` у підписці, `endless_offer` (№ 112), № 113, `unmute`
- [ ] T207 події `dubStart`, `personalRecordUpdate`; тост рекорду; `needsSaveNow`
- [ ] T208 тести стору: AC-17, AC-18, AC-19, AC-20, AC-21

**Фаза 4. Екрани**
- [ ] T209 `EndlessIntro` (утримання 1,2 с), банер «Наказ про Дубль чекає», чип модифікатора, `level-up` короткий, «Дубль N закрито», рядок рекорду на `digital` і в `profile`
- [ ] T210 тести екранів; `npm run check`; spec-guardian; PR
