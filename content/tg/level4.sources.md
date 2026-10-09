# Телеграми Р4 «Генштаб»: деталі й джерела

Файл до `content/tg/level4.json` (9.10.2026). 60 телеграм: № 73–92 (план за `docs/levels-3-5.md` §2.2) і № 203–242 (додаткові за рішенням 41), плюс шаблон події «Доповідь тезово» (`tg_event_brief`). Усі записи мають `"review": true`. Номери на документах — 5201–5280, подія — 5290.

Кожна телеграма спирається на одну реальну деталь діловодства (анти-слоп). Джерело вказано лише для сторінок, відкритих під час роботи; сюжетні кроки — вигадка арки, джерела немає.

## № → деталь → джерело

| № | id | Реальна деталь | Джерело |
| --- | --- | --- | --- |
| 73 | `tg_0073_report_on_plan` | Звіт (донесення) — документ про виконання плану (п. 2.1.6) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 74 | `tg_0074_schedule` | План — перелік робіт із послідовністю й строками виконання (п. 2.1.6) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 75 | `tg_0075_slide` | Заборона ефекту «жалюзі» й фонів на слайдах штабних брифінгів | [WSJ, 26.04.2000, про слайди в армії США (копія)](https://www.robertgaskins.com/files/wall-street-journal-greg-jaffe-26-april-2000.htm) |
| 76 | `tg_0076_no_report` | Документ можна позначити виконаним із зазначенням обґрунтованих підстав (п. 104) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 77 | `tg_0077_audit_of_audit` | Акт перевірки подається командиру на затвердження (п. 1.12) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 78 | `tg_0078_page_one` | Першу сторінку не нумерують, але враховують; номер — посередині верхнього поля | [Kadroland: «Секрет 3,2,2,1», оформлення за ДСТУ](https://kadroland.com/news/6243-sekret-3221-yak-pravilno-oformiti-bud-yakii-dokument-za-dstu) |
| 79 | `tg_0079_meeting_date` | Дата протоколу — дата засідання; багатоденне — перша й остання дати через тире | [Kadroland: протокол за ДСТУ 4163:2020](https://kadroland.com/news/4261-skladajemo-protokol-za-dstu-41632020-pravila-ta-zrazki) |
| 80 | `tg_0080_sixteen` | Якщо присутніх понад 15, список додається до протоколу; склад можна вказати кількістю | [Kadroland: протокол за ДСТУ 4163:2020](https://kadroland.com/news/4261-skladajemo-protokol-za-dstu-41632020-pravila-ta-zrazki) |
| 81 | `tg_0081_zero_annex` | Реквізит 21 — відмітка про наявність додатків (п. 2.1.8); перевірка відмітки — п. 80 проєкту МОУ | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 82 | `tg_0082_title_dot` | Крапку після заголовка не ставлять; заголовок понад 150 знаків — до правого поля | [Kadroland: «Секрет 3,2,2,1», оформлення за ДСТУ](https://kadroland.com/news/6243-sekret-3221-yak-pravilno-oformiti-bud-yakii-dokument-za-dstu) |
| 83 | `tg_0083_resolution` | Неконкретні резолюції («прискорити», «звернути увагу») не допускаються (п. 96) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 84 | `tg_0084_approve_corner` | Гриф «ЗАТВЕРДЖУЮ» — у верхньому правому кутку першої сторінки (пп. 153–154) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 85 | `tg_0085_copies` | Кількість примірників має відповідати кількості адресатів (п. 80) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 86 | `tg_0086_signature_order` | Протокол підписують спочатку секретар, потім головуючий | [Kadroland: протокол за ДСТУ 4163:2020](https://kadroland.com/news/4261-skladajemo-protokol-za-dstu-41632020-pravila-ta-zrazki) |
| 87 | `tg_0087_two_parts` | Текст доповідної записки має дві частини: констатуючу й пропозиції (п. 2.1.6) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 88 | `tg_0088_kombat_example` | Сюжет «Рапорт комбата», крок Р4 (продовження телеграми № 18); story.json `st_kombat_leave_04` | — |
| 89 | `tg_0089_arrival_time` | Для кореспонденції з відмітками «Невідкладно», «Терміново» фіксують не лише дату, а й години та хвилини доставки (п. 54). Сюжет «Хто пише», Р4-1 | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 90 | `tg_0090_timely_review` | Сюжет «Хто пише», Р4-2: звіт про звіти розсилається всім, замовника немає (бриф docs/story-texts.md) | — |
| 91 | `tg_0091_computers` | Сюжет «Хто пише», Р4-3: інвентаризація ЕОМ, 1998, приміщення під залом (бриф docs/story-texts.md) | — |
| 92 | `tg_0092_hall_prep` | Сюжет «Хто пише», Р4-4; журнал № 19 — форма з розд. IX тез-роз'яснень МОУ (за levels-3-5 §2.4, сторінку не відкривав) | — |
| 203 | `tg_0203_protocol_journal` | Протоколи реєструють в окремих журналах (п. 68) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 204 | `tg_0204_new_year` | Номер протоколу — порядковий у межах діловодного року; з нового року нумерація поновлюється | [Kadroland: протокол за ДСТУ 4163:2020](https://kadroland.com/news/4261-skladajemo-protokol-za-dstu-41632020-pravila-ta-zrazki) |
| 205 | `tg_0205_blue_blank` | Бланки документів друкують фарбою синього кольору (п. 2.6.6) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 206 | `tg_0206_hundred_slides` | Типовий штабний брифінг — близько 100 слайдів | [WSJ, 26.04.2000, про слайди в армії США (копія)](https://www.robertgaskins.com/files/wall-street-journal-greg-jaffe-26-april-2000.htm) |
| 207 | `tg_0207_written_instead` | Замість слайдів вимагали письмові брифінги | [WSJ, 26.04.2000, про слайди в армії США (копія)](https://www.robertgaskins.com/files/wall-street-journal-greg-jaffe-26-april-2000.htm) |
| 208 | `tg_0208_talk` | Основний метод керівництва — спілкування посадових осіб (п. 1.5) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 209 | `tg_0209_necessity` | Службове листування — лише за необхідності (п. 1.6) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 210 | `tg_0210_read_mark` | Обов'язковому датуванню підлягають усі службові відмітки (п. 137) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 211 | `tg_0211_resolution_change` | Доповідну записку про зміну резолюції подають у триденний строк (п. 103) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 212 | `tg_0212_to_file` | Документ закривають «До справи» (п. 104); номенклатура справ — обов'язковий перелік справ (п. 40) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 213 | `tg_0213_visa_copy` | Перевіряють наявність віз на копії вихідного документа, що лишається у справах (п. 80) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 214 | `tg_0214_extract` | Витяг — копія, що відтворює частину документа (п. 1.3) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 215 | `tg_0215_decision_12` | Рішення в протоколі нумерують; у кожному — кому, що і в який термін | [Kadroland: протокол за ДСТУ 4163:2020](https://kadroland.com/news/4261-skladajemo-protokol-za-dstu-41632020-pravila-ta-zrazki) |
| 216 | `tg_0216_feb_march` | Стан діловодства перевіряє комісія раз на рік, у лютому — березні (п. 1.12) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 217 | `tg_0217_reconcile` | Перевірку наявності документів проводять звіркою реєстраційних та облікових форм (п. 1.12) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 218 | `tg_0218_blank_journal` | Журнал обліку бланків зберігають рік після річної перевірки наявності документів (п. 2.6.8) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 219 | `tg_0219_two_copies` | Акт складають у двох примірниках (п. 55) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 220 | `tg_0220_six_grifs` | Якщо грифів погодження кілька, другий друкують через 100 мм від лівого поля | [Kadroland: «Секрет 3,2,2,1», оформлення за ДСТУ](https://kadroland.com/news/6243-sekret-3221-yak-pravilno-oformiti-bud-yakii-dokument-za-dstu) |
| 221 | `tg_0221_four_lines` | Розшифрування підпису друкують на рівні останнього рядка найменування посади | [Kadroland: «Секрет 3,2,2,1», оформлення за ДСТУ](https://kadroland.com/news/6243-sekret-3221-yak-pravilno-oformiti-bud-yakii-dokument-za-dstu) |
| 222 | `tg_0222_interval` | Міжрядковий інтервал — 1–1,5 | [Kadroland: «Секрет 3,2,2,1», оформлення за ДСТУ](https://kadroland.com/news/6243-sekret-3221-yak-pravilno-oformiti-bud-yakii-dokument-za-dstu) |
| 223 | `tg_0223_dishes_book` | Серед скасованих паперових журналів — книга обліку посуду | [АрміяInform, 2.09.2024: скасовано 16 паперових журналів](https://armyinform.com.ua/2024/09/02/u-minoborony-poyasnyly-yak-sprostyvsya-proczes-obliku-majna-v-zsu/) |
| 224 | `tg_0224_old_forms` | Командирам скасували застарілі звіти разом із понад 30 старими наказами | [Цензор.НЕТ, англ.: скасовано понад 30 застарілих наказів](https://censor.net/en/news/4022656/drapatyi-cancels-more-than-30-outdated-armed-forces-orders) |
| 225 | `tg_0225_six_tables` | Одну й ту саму інформацію переписують у різних формах і табличках | [Тексти: кольорові чорнила й відступ за лінійкою](https://texty.org.ua/articles/109073/kolorovi-chornyla-i-vidstup-za-linijkoyu-yak-dopotopni-zvitnist-ta-oblik-shkodyat-ukrayinskij-armiyi/) |
| 226 | `tg_0226_too_short` | Командири вимагають писати більше, «а то скажуть, що мало написано» | [Тексти: погляд бійця на службу в тилу](https://texty.org.ua/articles/112678/zamist-zbroyi-i-navchannya-papirci-i-radyanski-rytualy-pohlyad-bijcya-na-sluzhbu-u-tylu/) |
| 227 | `tg_0227_rehearsal` | Про перевірки попереджають заздалегідь, до них прибирають і готуються напередодні | [Тексти: погляд бійця на службу в тилу](https://texty.org.ua/articles/112678/zamist-zbroyi-i-navchannya-papirci-i-radyanski-rytualy-pohlyad-bijcya-na-sluzhbu-u-tylu/) |
| 228 | `tg_0228_monitor` | Електронна резолюція — єдина допустима форма доручень в електронній формі (п. 1.3) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 229 | `tg_0229_one_thesis` | Доповідь — виклад питань з висновками та пропозиціями (п. 2.1.6) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 230 | `tg_0230_happened` | Довідка — документ, що підтверджує факти (п. 2.1.6) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 231 | `tg_0231_fewer_meetings` | План — перелік заходів, їх послідовність і строки (п. 2.1.6) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 232 | `tg_0232_on_control` | Контроль — комплекс заходів для перевірки й оцінки виконання завдань (п. 1.3) | [Інструкція з діловодства у ЗСУ, ред. 2023, PDF](https://turbota.mil.gov.ua/wp-content/uploads/2024/08/instrukcziya_z_dilovodstva_u_zs_2023_na_21.12.23.pdf) |
| 233 | `tg_0233_pie` | Обертові кругові діаграми на слайдах забивали службові канали | [WSJ, 26.04.2000, про слайди в армії США (копія)](https://www.robertgaskins.com/files/wall-street-journal-greg-jaffe-26-april-2000.htm) |
| 234 | `tg_0234_webinar` | Для діловодів і командирів проводять вебінари про скасування журналів | [АрміяInform, 2.09.2024: скасовано 16 паперових журналів](https://armyinform.com.ua/2024/09/02/u-minoborony-poyasnyly-yak-sprostyvsya-proczes-obliku-majna-v-zsu/) |
| 235 | `tg_0235_nomenclature` | Розроблення Зведеної номенклатури справ (п. 12) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 236 | `tg_0236_invited` | У протоколі запрошених вказують після присутніх членів | [Kadroland: протокол за ДСТУ 4163:2020](https://kadroland.com/news/4261-skladajemo-protokol-za-dstu-41632020-pravila-ta-zrazki) |
| 237 | `tg_0237_misc` | Розділи основної частини протоколу відповідають пунктам порядку денного | [Kadroland: протокол за ДСТУ 4163:2020](https://kadroland.com/news/4261-skladajemo-protokol-za-dstu-41632020-pravila-ta-zrazki) |
| 238 | `tg_0238_decided` | Структура протоколу: СЛУХАЛИ — ВИСТУПИЛИ — ВИРІШИЛИ | [Kadroland: протокол за ДСТУ 4163:2020](https://kadroland.com/news/4261-skladajemo-protokol-za-dstu-41632020-pravila-ta-zrazki) |
| 239 | `tg_0239_file_size` | Файли брифінгів важать мегабайти й навантажують службові канали | [WSJ, 26.04.2000, про слайди в армії США (копія)](https://www.robertgaskins.com/files/wall-street-journal-greg-jaffe-26-april-2000.htm) |
| 240 | `tg_0240_page_12` | Додатки мають окрему нумерацію сторінок | [Kadroland: «Секрет 3,2,2,1», оформлення за ДСТУ](https://kadroland.com/news/6243-sekret-3221-yak-pravilno-oformiti-bud-yakii-dokument-za-dstu) |
| 241 | `tg_0241_done_early` | Строк і позначка про виконання електронного документа (п. 64) | [Проєкт Інструкції з діловодства в МОУ, 2026, PDF](https://mod.gov.ua/assets/do_125_nm_Instrukcziya_2026_f11aef4f05.pdf) |
| 242 | `tg_0242_soap` | Серед скасованих паперових журналів — журнал обліку мила | [АрміяInform, 2.09.2024: скасовано 16 паперових журналів](https://armyinform.com.ua/2024/09/02/u-minoborony-poyasnyly-yak-sprostyvsya-proczes-obliku-majna-v-zsu/) |

Примітки до джерел:

- Kadroland описує цивільний ДСТУ 4163:2020, а не військову інструкцію. Правила протоколу (присутні понад 15, порядок підписів, дата, нумерація з нового року, запрошені, «СЛУХАЛИ — ВИСТУПИЛИ — ВИРІШИЛИ») і оформлення (перша сторінка, 150 знаків, 100 мм, інтервал 1–1,5, розшифрування підпису, окрема нумерація додатків) — звірити зі стройовиком, чи так само в частинах.
- WSJ (2000) — про армію США. Деталь про слайди («жалюзі», 100 слайдів, вага файлів, обертові діаграми, письмові брифінги замість слайдів) подано без країн і прізвищ.
- Цензор.НЕТ переказує пост у Facebook, без переліку звітів; у тексті гри — лише «звіти за формами минулих років».
- № 92: «Відомість обліку продовольства, отриманого від суб'єкта господарювання» — журнал № 19 музею; реальність форми підтверджено в `docs/levels-3-5.md` §2.4 (тези-роз'яснення МОУ, розд. IX), цю сторінку я не відкривав. Відомість під корпусом ПК — вигадка арки.

## Сюжетні телеграми (014)

Номери й id узгоджено з `content/story.json` і брифом у `docs/story-texts.md` (кроки `st_who_writes_07`–`10`, `st_kombat_leave_04`).

| № | id | Крок | Тригер |
| --- | --- | --- | --- |
| 88 | `tg_0088_kombat_example` | Рапорт комбата · Р4: рапорт як приклад вчасного розгляду | `digitization_on_level` 2 |
| 89 | `tg_0089_arrival_time` | Хто пише · Р4-1: час доставки всіх термінових — 03:00; надзаголовок «Передано 03:00» | `digitization_on_level` 1 |
| 90 | `tg_0090_timely_review` | Хто пише · Р4-2: звіт про звіти надходить усім, замовника немає | `digitization_on_level` 2 |
| 91 | `tg_0091_computers` | Хто пише · Р4-3: ЕОМ 1998 року під залом, відповідального немає, працює | `digitization_on_level` 3 |
| 92 | `tg_0092_hall_prep` | Хто пише · Р4-4: усі приміщення, крім того, що під залом («Не вимикати»); відомість продовольства з-під корпусу — в музей | `boss_announced`, журнал № 19 |

Сцену «знайдено» (бежевий ПК, наліпка «НЕ ВИМИКАТИ. 1998», скрипт розсилки) телеграми не показують, лише підводять.

## Нові поля в схемі

- `review: true` — на кожному записі.
- `story` — `{arc, order, beat, trigger{type, n?}, beatEffects?}` на 5 сюжетних. Довідкове поле: джерело правди — кроки в `content/story.json` (014), які посилаються на `telegramId`. Сюжетні мають `schedule.scripted: true`, тож пул за номером їх пропускає (012 FR-25).
- `kind: "event"`, `eventType: "brief_onepage"`, `schedule.outsideQuota`, `schedule.chanceParam`, `schedule.minGapDaysParam` — на `tg_event_brief`. Варіанти `rewrite` і `formal_reply` збігаються з `choice` у `random_event_resolve` (012 FR-18). Тексти — `ev.brief_title`, `ev.brief_body`, `ev.brief_rewrite` зі специфікації 012.
- Цілі `slow`: `zpz`, `dopovid` (012 FR-26) і `narada` (011). `tools/gen_tg.py` їх не знає (`STAGES`), тож його валідатор цей файл не пропустить без розширення; перевірено власним скриптом з тими самими правилами.

## На вичитку

Усі 61 запис — на вичитку носіями й стройовиком (анти-слоп, кроки 5–8). Окремо перевірити:

1. Панчлайни писала не людина. Найслабші, кандидати на переписування: № 208, 209, 230, 233 (жарт на рекурсії, схожий на № 13 «звіт про звіти»).
2. № 73, 76, 77, 216, 224, 232 — рекурсивні «звіт про звіт». Тема рівня, але шість на пул — ризик однаковості; можна лишити 3–4.
3. № 89–92 — сюжет: чи не забагато підказок до сцени «знайдено» (03:00, 1998, «Не вимикати»). Тексти Р4 читає стройовик (014, ризик 8).
4. № 88: рапорт комбата на Р4 — п'ята сюжетна телеграма в № 73–92 (014 і 012 FR-25 рахують чотири). Те саме питання — у `docs/story-texts.md`, п. 2.
5. № 85: «Тринадцятий примірник — у справу» — перевірити, чи примірник у справу рахують адресатом (п. 80 проєкту МОУ).
6. № 81: «Додаток: на 0 арк.» — гіпербола, такої норми немає.
7. № 211: строк 3 доби в рядках `deadline` — показ, не механіка.
8. Числа ефектів (rep, inspPct, durationMin, paper) — архетипи 03, заглушки до прогону; для події `rep +5 / −5`, `inspPct 15` — нові значення контенту за 012 FR-18, потрібне підтвердження.
9. Відправники `from` — лише наявний enum 03 (`higher_hq`, `bn_chief_of_staff`, `bde_support`, `info_security`); окремого відправника для Р4 немає. Решта рядків `deadline` — `"std"`.
10. Кнопки ≤ 22 знаків, примітки ≤ 60, результати ≤ 80 — перевірено скриптом.
