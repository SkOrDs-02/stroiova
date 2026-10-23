# Аналітика

Аналітика «Стройової» — 60 подій у PostHog EU Cloud. Краші йдуть у Sentry, реклама за винагороду в AdMob, покупки в RevenueCat. Акаунтів і персональних даних у грі немає, прогрес лежить на пристрої.

Приватність за замовчуванням (рішення 18, Журнал рішень):

- ATT не показуємо.
- Форму згоди Google UMP бачать лише гравці з ЄЕЗ, Британії й Швейцарії, перед першим роликом.
- Аналітика анонімна: `install_id`, IP не зберігаємо, вимикач у налаштуваннях.

Першим міряємо онбординг (ціль ≥ 80% до кроку 10), утримання D1 і D7 та темп економіки проти пісочниці: час до першого діловода й першої цифровізації.

Машинна версія плану — `tracking-plan.yaml`, ті самі події з типами й enum. Файл житиме в репозиторії гри, з нього генерується обгортка `track()`. План покриває повний реліз: рівні 1–5, фінал, нескінченний режим, сюжет і грамоти (специфікації 001–014 і 016).

## Принципи

1. **Назви.** Події — `object_action` у snake\_case, дієслово в теперішньому часі, як радить PostHog: `clerk_hire`, `ad_complete`. Властивості — `object_adjective`: булеві з `is_`/`has_`, тривалості в цілих секундах `_sec`. Великі суми підписів ідуть як `_log10` (186 400 → 5.27), бо числа break\_infinity не влазять у JSON.
2. **Жодних персональних даних.** Не шлемо текст позивного (лише `callsign_type`), IP, IDFA/GAID чи email. Стать протагоніста йде як `m` або `f`: це форма тексту, а не дані про гравця. У PostHog вмикаємо «Discard client IP data», у Sentry ставимо `sendDefaultPii: false`. Країну беремо з налаштувань пристрою (`device_region`), а не з IP.
3. **Анонімний ідентифікатор.** На першому запуску генеруємо `install_id` (UUID v4), кладемо в MMKV і викликаємо `identify(install_id)` з `personProfiles: 'identified_only'`. Той самий id іде в RevenueCat (атрибут `$posthogUserId`) і Sentry (`setUser({ id })`). Перевстановлення дає нового гравця. Прогрес при цьому теж втрачається, бо хмарних збережень немає.
4. **Згода на аналітику: варіант А.** Законний інтерес, анонімний `install_id`, без IP, опис у політиці приватності. Окремого екрана згоди немає, тож воронка онбордингу бачить усіх. Вимикач «Аналітика» в налаштуваннях шле `setting_change`, робить `flush()`, потім `optOut()`. Перед релізом у ЄС схему перевіряє юрист.
5. **Агрегація й вибірка.** Подія на кожен тап заборонена. Тапи, покупки рівнів, простої й час під бонусом пального сумуються в `session_end`. Вибірку має лише `upgrade_purchase`: на закритому тесті 100% пристроїв, після відкритого релізу 20% (віддалений ключ `econ_detail_sample_pct`). Пристрій обирається детерміновано, `hash(install_id) mod 100 < econ_detail_sample_pct`, тому історія гравця у вибірці лишається цілою.
6. **Офлайн.** PostHog RN тримає чергу у файлі (`persistence: 'file'`) і відправляє її, коли з'явиться мережа. Ліміт 1000 подій, найстаріші видаляються першими: за \~59 подій на день це \~17 днів без мережі. При переході у фон викликаємо `flush()`. Час події ставиться на пристрої в момент дії.
7. **Версії на кожній події.** `$app_version`, `$app_build`, `$os_name` і модель пристрою SDK додає сам. Ми додаємо `economy_config_version`, `content_version`, `save_schema_version` і стан гравця (глобальні властивості в розділі «Події»). Без цього дані до й після зміни балансу не розділити.
8. **Доба.** Денні ліміти (3 подвоєння офлайну, 3 прискорення гонки) скидаються опівночі за часом пристрою. Часовий пояс проєкту PostHog — Europe/Kyiv, від нього рахуються D1, D7 і D30.

### ATT і UMP (правила станом на жовтень 2026)

- **ATT не показуємо.** Apple вимагає дозвіл ATT перед трекінгом або доступом до IDFA. Трекінг — це зв'язування даних застосунку з даними інших компаній для таргетованої реклами чи її вимірювання ([Apple, User privacy and data use](https://developer.apple.com/app-store/user-privacy-and-data-use/)). Без дозволу Google Mobile Ads SDK не передає IDFA, а рекламу запитуємо як звичайно ([AdMob, IDFA support](https://developers.google.com/admob/ios/privacy/idfa)). У маніфесті приватності GMA SDK 13.11.0 позначку tracking має лише Device ID, тобто IDFA.
- **Що для цього зробити.** Не ставити `expo-tracking-transparency` і не додавати `NSUserTrackingUsageDescription`. У плагіні `react-native-google-mobile-ads` не задавати `user_tracking_usage_description`. У App Privacy не позначати «Data Used to Track You».
- **Ціна.** Реклама без IDFA на iOS, імовірно, дешевша. Своєї оцінки не маємо, тож порівнюємо `ad_value_micros` на iOS і Android. App Review може спитати про Device ID з маніфесту SDK. Відповідь: ATT не викликається, тож IDFA застосунок не отримує.
- **Коли переглянути.** Якщо після софт-лончу реклама дає понад \~25% виторгу iOS, робимо A/B: запит ATT після першої завершеної реклами, не в онбордингу ([AdMob Help, iOS 14+](https://support.google.com/admob/answer/10115027)).
- **UMP лише в ЄЕЗ, Британії й Швейцарії.** Для персоналізованої реклами AdMob там потрібна сертифікована Google CMP з TCF: у ЄЕЗ і Британії з 16.01.2024, у Швейцарії з 31.07.2024 ([AdMob Help](https://support.google.com/admob/answer/13554020)). `requestInfoUpdate` тихо виконується при кожному запуску. Форма з'являється після першого тапу «Дивитися», до завантаження ролика, і лише там, де UMP її вимагає. Рекламу завантажуємо тільки після `canRequestAds = true`.
- **Кнопка приватності.** Якщо UMP вимагає точку входу до налаштувань приватності, кнопка є в налаштуваннях ([UMP SDK](https://developers.google.com/admob/ios/privacy)). Хто купив «Без реклами» до першого ролика, форми не побачить.
- **Android.** Аналога ATT немає, дозвіл `AD_ID` GMA SDK додає сам. У Play Console цільова аудиторія 18+ (поза програмою Families). У Data safety: ідентифікатори пристрою, взаємодія із застосунком, діагностика, історія покупок.
- **App Privacy на iOS.** Product Interaction (аналітика), Crash Data і Performance Data (аналітика), Device ID (аналітика й стороння реклама), Purchase History (аналітика). «Used to track you» — ні. Повний перелік разом із категоріями AdMob — у вкладці Стори.

### Налаштування SDK

| Параметр PostHog RN | Значення | Навіщо |
| --- | --- | --- |
| host | `https://eu.i.posthog.com` | Дані зберігаються в ЄС |
| `personProfiles` | `'identified_only'` + `identify(install_id)` на першому запуску | Властивості гравця й когорти |
| `captureAppLifecycleEvents` | `false` | Маємо свої `app_first_open` і `session_*` без дублів «Application Opened/Backgrounded» |
| Автозахоплення дотиків, `captureScreens`, session replay | вимкнено | Обсяг і приватність |
| `persistence`, `maxQueueSize` | `'file'`, 1000 | Офлайн-черга |
| `flushAt`, `flushInterval` | 20, 30 000 мс, плюс `flush()` при переході у фон | Менше запитів, нічого не губимо при вивантаженні |
| `before_send` | Відкидає події, яких немає в `tracking-plan.yaml` (пропускає лише `$identify` і `$set` для профілю) | Схема не розповзається |
| `disableGeoip` | `true` | Країна з `device_region`, а не з IP (010 FR-23) |
| `preloadFeatureFlags`, `disableRemoteFeatureFlags` | `false`, `true` | Флагів немає до віддаленого конфігу економіки (`economy-config`) |
| `disableSurveys` | `true` | Опитувань у грі немає |
| Створення клієнта | Лише коли «Аналітика» ввімкнена; ключ - `EXPO_PUBLIC_POSTHOG_KEY` | SDK на старті завжди тягне віддалений конфіг: із вимкненою статистикою клієнта й запитів немає (рішення 119) |
| Проєкт: Discard client IP data | увімкнено | Без IP. На закритому тесті перевірити, чи лишається `$geoip_country_code`; якщо ні, достатньо `device_region` |

Усі виклики йдуть через одну обгортку `track(name, props)`, згенеровану з YAML. Вона додає глобальні властивості, у dev-збірці перевіряє типи й enum і не відправляє подію не з плану.

### Обсяг подій

Оцінка на активного гравця на день за сценарієм пісочниці (5 сесій):

| Група | Подій на день |
| --- | --- |
| `session_start` + `session_end` (з короткими поверненнями) | \~11 |
| `offline_income_claim` | \~4 |
| `generator_refuel` | \~4 |
| Телеграми: отримано, відкрито, вибір | \~9 |
| Реклама: пропозиції, перегляди, нагороди | \~14 |
| Перевірки, гонки, бусти, віхи, діловоди, інше | \~12 |
| `upgrade_purchase` (\~25 на пристрій у вибірці × 20%) | \~5 |
| **Разом** | **\~59** |

Безкоштовний 1 млн подій на місяць ([PostHog pricing](https://posthog.com/pricing)) вистачає приблизно на 560 DAU у середньому за місяць. Далі платимо за кожну подію, тому в PostHog одразу ставимо ліміт витрат.

## Події

Події згруповані за частинами гри, номери наскрізні, 1–60. Події 47–60 додано версією 3, у YAML вони мають поле `spec`. `?` позначає необов'язкову властивість. Повні enum і описи — у `tracking-plan.yaml`.

Правки плану 9.10 (версія 2): нова подія `force_update_show`; скидання прогресу — `setting_change` з `progress_reset`, показ `starter-offer` — `shop_view` з `source` = starter\_offer, відновлення з копії — `app_error_log` з `recovery` = backup\_slot. `is_clock_skew_detected` переїхав у `session_start`, `digital_points_spent` прибрано. Enum доповнено за специфікаціями 02–10: 10 значень `push_type`, усі пункти чекліста в `item_id`, `slowdown_target_id` з потоками, лопати й генератор у `boost_type`, `gift_written_off` і `journal` у `curio_entry_share`, `reason` і `has_comment` у `telegram_flag`, `notif_*` у `setting_name`, `entry_point` для `income_boost`. Прибрано `shtamp`, `buy_mode` = max, метод гонки `clerk`, `archive_bonus`, `music`, `number_format`, джерело репутації `inspection`.

Правки плану 9.10 (версія 3): злито доповнення специфікацій 011–014 і 016, окремих файлів доповнень більше немає. 14 нових подій (47–60), глобальні `dub_number`, `is_finale_done`, `awards_owned`; `level_id` і `current_level_id` — п'ять рівнів. Enum доповнено: потоки `zvedennia`, `zpz` і ланки `narada`, `dopovid` у `stream_unlock`, `upgrade_purchase`, `clerk_hire`, `milestone_reach`, `session_end.bottleneck_id`, `slowdown_target_id`; нові комісії `boss_id`, пункти чекліста Р3–Р5 і `method` = condition; події `meeting_overrun`, `brief_onepage`, `sedo_failure` з виборами `send_note`, `rewrite`, `formal_reply`, `print`; переходи рівнів у `level_advance`; джерела журналів `final_inspection`, `conversion`, `story`, `finale`; `curio_entry_share.entry_type` — pack, stack\_meter, finale\_card, personal\_record, ptashka, award; `museum_open.source` — award\_toast, profile; `platform_awards` у `setting_name` і `app_error_log.source`. Нові властивості наявних подій: `inspection_kind`, `attempt_number`, `is_mechanic_item_done`, `is_level_exit_unlocked`, `zpz_share_pct`, `is_without_remarks`, `pack_id`, `is_pack_summary`, `final_attempts`, `stack_cm`, `digital_stages_count`, `cycle_sec_previous`, `series_id`, `series_owned_after`, `series_complete_count`, `segment`, `gift_type` у `race_finish`. `is_series_complete` тепер означає «цей журнал завершив свою серію».

### Глобальні властивості (на кожній події)

| Властивість | Тип | Приклад | Що означає |
| --- | --- | --- | --- |
| `economy_config_version` | str | econ-v7.2 | Версія параметрів економіки, з якою зіграна подія. Для A/B — з суфіксом варіанта, напр. econ-v5.1+b |
| `economy_config_source` | str | remote | Звідки взято конфіг. Значення: bundled, remote, cached |
| `content_version` | str | content-2026.10.08 | Версія JSON-пакета телеграм, документів і журналів (expo-updates) |
| `save_schema_version` | int | 3 | Версія схеми збереження в MMKV |
| `analytics_plan_version` | int | 3 | Версія цього плану |
| `game_session_id` | str | 9b2f6c1e-7d3a-4c1b-9a51-2f0f3e8d4a10 | Наш ідентифікатор сесії (див. session\_start); не плутати з $session\_id PostHog |
| `session_number` | int | 14 | Порядковий номер сесії з моменту встановлення |
| `playtime_sec` | int | 2730 | Сумарний час у грі на передньому плані з моменту встановлення |
| `days_since_install` | int | 2 | Календарні дні від встановлення за локальним часом пристрою |
| `level_id` | str | batalion | Поточний рівень гри. Значення: batalion, bryhada, komanduvannia, henshtab, bez\_paperu |
| `dub_number` | int | 0 | Номер Дубля нескінченного режиму; 0 до першого Дубля (013) |
| `is_finale_done` | bool | false | Гравець натиснув Y на finale-script (013) |
| `awards_owned` | int | 14 | Скільки грамот гравець має на мить події (016) |
| `digitization_count` | int | 1 | Скільки цифровізацій уже зроблено |
| `has_no_ads` | bool | false | Куплено «Без реклами» |
| `is_payer` | bool | false | Була хоча б одна успішна покупка |
| `is_econ_detail_sampled` | bool | true | Пристрій у вибірці детальних економічних подій |
| `build_channel` | str | production | Канал збірки EAS / expo-updates. Значення: development, preview, production |
| `is_test_user` | bool | false | Тестер або розробник; вмикається прихованим меню в налаштуваннях. Фільтруємо з усіх дашбордів |

### Кроки онбордингу

Онбординг — одна подія `onboarding_step_complete` з `step_id`. Воронку в PostHog будуємо з неї з фільтром за `step_index`. Крок 10 означає, що онбординг пройдено, окремої події для цього немає. Крок 11 у завершення не входить, бо може випасти на другу сесію.

| step\_index | step\_id | Час за GDD | Коли крок завершено |
| --- | --- | --- | --- |
| 1 | `title_arrive` | 0:00 | Тап «Прибути в частину» |
| 2 | `intro_finish` | 0:10 | Остання репліка Начштабу або «Пропустити» (`is_skipped = true`) |
| 3 | `callsign_choose` | 0:30 | Тап «Записати чорною пастою» з обраним позивним і формою «він / вона» (`protagonist_gender`: m або f) |
| 4 | `first_act_sign` | 0:50 | Восьмий тап «Підписати» на акті № 1 |
| 5 | `first_stamp` | 1:20 | Завершилась анімація «ПОГОДЖЕНО», дрон у небі |
| 6 | `conveyor_first_upgrade` | 2:00 | Перша покупка рівня на конвеєрі. Після неї версія конфігу економіки в збереженні більше не змінюється |
| 7 | `first_clerk_hire` | 3:30 | Найнято першого діловода |
| 8 | `first_telegram_answer` | 5:00 | Обрано реакцію на першу телеграму |
| 9 | `archaeologist_call` | 7:00 | Дзвінок «Археологу» завершено, бонус архіву зараховано (bonus\_signatures\_log10) |
| 10 | `first_ad_offer` | 9:00 | Показано першу пропозицію «×2 на 4 години». Онбординг пройдено |
| 11 | `push_prompt` | кінець сесії | Пройдено сценарій запиту пушів, з будь-якою відповіддю |

### Життєвий цикл (4)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 1 | `app_first_open` | Старт застосунку, коли в MMKV немає install\_id. Генеруємо install\_id, викликаємо identify(install\_id) з $set\_once, потім шлемо подію. Раз на встановлення. | `device_region`: str (UA); `device_locale`: str (uk-UA); `is_reinstall?`: bool (false) | Скільки встановлень і з якою версією економіки; точка відліку для когорт, утримання й усіх «часів до». |
| 2 | `session_start` | Холодний старт або повернення з фону після 120 с і більше. Генеруємо новий game\_session\_id і збільшуємо session\_number. Повернення раніше ніж за 120 с продовжує поточну сесію і цієї події не шле. | `is_cold_start`: bool (false); `sec_since_last_session?`: int (11520); `local_hour`: int (21); `entry_point`: str (icon); `is_clock_skew_detected`: bool (false) | Скільки сесій на день і в які години; основа DAU та утримання. |
| 3 | `session_end` | AppState переходить у background. Шлемо одразу й викликаємо flush(). Якщо гравець повернувся раніше ніж за 120 с, сесія триває, а наступний session\_end прийде з тим самим game\_session\_id і накопиченими значеннями. У звітах беремо останній (максимальний) запис на game\_session\_id. | `duration_sec`: int (236); `segment_count`: int (1); `taps_count`: int (58); `cat_taps_count`: int (1); `tap_signatures_share_pct`: num (12.5); `signatures_earned_log10`: num (5.27); `signatures_balance_log10`: num (4.91); `income_per_min_log10`: num (2.61); `idle_income_per_min_log10`: num (2.3); `purchases_count`: int (9); `levels_bought`: int (27); `clerks_hired_count`: int (0); `bottleneck_id`: str (kombat); `next_purchase_eta_sec`: int (5400); `digital_points_available`: int (0); `levels`: obj ({raporty: 31, akty: 12, …}); `paper_empty_sec`: int (0); `fuel_bonus_sec`: int (236); `zpz_share_pct?`: num (18.2); `stack_cm?`: int (64) | Тривалість сесії проти пісочниці (4 хв), скільки тапають, де вузьке місце, скільки до наступної покупки, стан економіки на кінець сесії. |
| 4 | `force_update_show` | boot показав force-update: встановлена версія нижча за мінімальну з CDN або з кешу, чи збереження новіше за застосунок. Раз на запуск. | `reason`: str (min\_version); `installed_version`: str (1.0.3); `required_version`: str (1.1.0); `is_from_cache`: bool (false) | Скільки гравців застрягли на старій версії і чи доходять вони до стору. |

### Онбординг (1)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 5 | `onboarding_step_complete` | Гравець виконав дію, що закриває крок (таблиця кроків у вкладці «Аналітика»). Кожен step\_id — не більше одного разу на встановлення. Крок 10 (first\_ad\_offer) = онбординг пройдено, окремої події немає; крок 11 (пуші) може випасти на другу сесію. | `step_id`: str (callsign\_choose); `step_index`: int (3); `sec_since_first_open`: int (41); `step_duration_sec`: int (12); `is_skipped`: bool (false); `protagonist_gender?`: str (f); `bonus_signatures_log10?`: num (3.08) | На якому кроці відпадають, чи тримаємо таймлайн GDD (0:00 → 9:00) і яка частка доходить до кроку 10 (ціль ≥ 80%). |

### Економіка (4)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 6 | `stream_unlock` | Рівень потоку змінився з 0 на 1. Для Рапортів, відкритих зі старту циклу, не шлемо. | `stream_id`: str (akty); `unlock_index`: int (2); `cost_log10`: num (2.48); `sec_since_cycle_start`: int (260); `is_all_streams_open`: bool (false) | Темп відкриття потоків у кожному циклі проти пісочниці; коли стає доступна цифровізація. |
| 7 | `upgrade_purchase` (вибірка) | Одна дія покупки — одна подія. Масова покупка (×10, «до віхи») — одна подія. Поодинокі тапи по тій самій цілі з інтервалом до 3 с зливаються в одну подію з сумою levels\_bought. Лише на пристроях з is\_econ\_detail\_sampled = true. | `target_type`: str (stage); `target_id`: str (kombat); `level_from`: int (18); `level_to`: int (25); `levels_bought`: int (7); `buy_mode`: str (to\_milestone); `cost_log10`: num (3.12); `was_bottleneck`: bool (true); `income_before_log10`: num (2.4); `income_after_log10`: num (2.71) | Що й коли купують гравці, чи б'ють у вузьке місце, як бот у пісочниці, і чи користуються покупкою до віхи. |
| 8 | `clerk_hire` | Успішна покупка діловода, зокрема повторний найм після цифровізації. | `target_type`: str (stream); `target_id`: str (raporty); `cost_log10`: num (1.9); `is_first_clerk`: bool (true); `clerks_count_after`: int (1); `sec_since_cycle_start`: int (177) | Час до першого діловода (ціль 3–4 хв гри) і порядок автоматизації. |
| 9 | `milestone_reach` | Після покупки рівень цілі став кратним 25 уперше в цьому циклі. | `target_type`: str (stream); `target_id`: str (raporty); `level`: int (25); `rate_multiplier`: int (2); `sec_since_cycle_start`: int (1430) | Як швидко гравці доходять до віх порівняно з пісочницею. |

### Офлайн-дохід і пальне (2)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 10 | `offline_income_claim` | Закрито екран повернення кнопкою «Забрати» або «Забрати ×2». Подію шлемо лише тоді, коли офлайн-дохід більший за нуль, тобто діловоди є на всіх ланках і хоча б на одному потоці. Стан «Стройова стояла» (сума 0) екран показує, але подію не шле. | `away_sec`: int (27720); `storage_cap_sec`: int (28800); `capped_sec`: int (0); `earned_log10`: num (5.27); `is_doubled`: bool (true); `double_source`: str (ad); `claimed_log10`: num (5.57); `offline_doubles_today`: int (2); `clerks_count`: int (3); `gifts_written_off`: int (1); `fuel_bonus_sec`: int (17280) | Скільки доходу губиться на ліміті сховища (ціль ≤ 15%), як часто подвоюють і скільки офлайну йде під бонусом пального. Переведений годинник — у session\_start. |
| 11 | `generator_refuel` | Тап «Заправити» в шторці ресурсів. Заправка безкоштовна, бак стає повним. Пальне — бонус: бак > 20% дає ×1,25 до доходу, порожній — звичайна швидкість. | `tank_pct_before`: int (12); `tank_capacity_sec`: int (21600); `bonus_off_sec`: int (5400) | Чи тягне бонус ×1,25 гравців назад: як часто заправляють, з яким залишком і скільки часу грають без бонусу. |

### Телеграми й журнал курйозів (5)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 12 | `telegram_receive` | Телеграма додана у вхідні за розкладом. Ті, що «прийшли» за відсутності гравця, додаються при поверненні: одна подія на кожну. | `telegram_id`: str (tg\_0001\_sergeants); `is_first_telegram`: bool (false); `delivery`: str (while\_away); `is_scripted`: bool (false); `is_repeat`: bool (false); `inbox_unread_after`: int (3) | Чи тримаємо частоту 2–4 на день і першу телеграму на 5–8 хв. |
| 13 | `telegram_open` | Відкрито екран телеграми. | `telegram_id`: str (tg\_0001\_sergeants); `sec_since_received`: int (3900); `source`: str (inbox) | Скільки телеграми лежать непрочитаними і звідки їх відкривають. |
| 14 | `telegram_choice_submit` | Тап по варіанту реакції, рішення застосовано. «Виконати сумлінно» не зупиняє одиницю, а сповільнює: ×0,5 на 1 год. Фактора ×0 немає. | `telegram_id`: str (tg\_0001\_sergeants); `choice_id`: str (diligent); `choice_kind`: str (diligent); `slowdown_target_id?`: str (stroy); `slowdown_mult`: num (0.5); `slowdown_sec`: int (3600); `reputation_delta`: int (5); `reputation_after`: int (65); `inspection_chance_pct`: num (0); `paper_spent`: int (2); `sec_since_open`: int (14); `pack_id?`: str (pack\_03); `is_pack_summary?`: bool (true) | Розподіл виборів по кожній телеграмі: чи вибір справжній, чи всі тиснуть одне й те саме; скільки доходу коштує «сумлінно». |
| 15 | `telegram_flag` | Тап по кнопці «це не смішно» біля телеграми. | `telegram_id`: str (tg\_0008\_morale); `is_after_choice`: bool (true); `reason`: str (none); `has_comment`: bool (false) | Які телеграми ображають або не смішать, щоб швидко замінити їх оновленням контенту. |
| 16 | `curio_entry_share` | Повернувся результат системного меню «Поділитися». | `entry_type`: str (telegram); `entry_id`: str (tg\_0006\_shovels); `gift_type?`: str (drone); `share_result`: str (shared); `activity_type?`: str (ph.telegra.Telegraph.Share) | Головний органічний канал: які записи й куди поширюють. |

### Перевірки (3)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 17 | `inspection_start` | Згенеровано попередження про комісію (за 2–3 год до приїзду), за розкладом або позапланово після відписки. | `inspection_id`: str (insp\_0004); `inspection_number`: int (4); `boss_id`: str (brigade\_commission); `trigger`: str (scheduled); `warning_sec`: int (8040); `reputation`: int (55); `items_total`: int (5); `inspection_kind`: str (final); `attempt_number?`: int (2) | Чи трапляється перша перевірка наприкінці першого дня і скільки позапланових дає відписка. Позапланова ×3 не дає, лише ризик провалу. |
| 18 | `inspection_item_complete` | Пункт чекліста позначено виконаним: за підписи або весь чекліст за рекламу чи «Забрати» (тоді подія на кожен пункт з method = ad або no\_ads\_pass). | `inspection_id`: str (insp\_0004); `item_id`: str (paint\_borders); `method`: str (signatures); `cost_log10?`: num (3.08); `sec_to_deadline`: int (5100) | Які пункти виконують, які пропускають через ціну. |
| 19 | `inspection_finish` | Таймер перевірки дійшов до нуля. Якщо це сталося без гравця, подія шлеться при поверненні з is\_resolved\_offline = true. | `inspection_id`: str (insp\_0004); `result`: str (passed); `items_done`: int (5); `items_total`: int (5); `is_completed_via_ad`: bool (false); `is_resolved_offline`: bool (true); `sec_from_start`: int (8040); `inspection_kind`: str (final); `is_mechanic_item_done?`: bool (true); `is_level_exit_unlocked?`: bool (true); `zpz_share_pct?`: num (42.5); `is_without_remarks`: bool (true) | Частка пройдених перевірок, чи по кишені чекліст без реклами. |

### Гонка з часом (3)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 20 | `race_start` | Волонтерка Ліна привезла подарунок, запущено обидва таймери: документ на конвеєрі й ресурс на фронті. | `race_id`: str (race\_0017); `gift_type`: str (drone); `doc_sec_required`: int (27000); `resource_sec_left`: int (32400); `is_winnable_without_speedup`: bool (false) | Скільки гонок можна виграти без прискорень і чи не задовгі документи. |
| 21 | `race_speedup_apply` | Застосовано прискорення: «Послатися на цифру» (−2 год, раз за гонку, при P\_total ≥ 1, бали не списуються), реклама або «Забрати» з «Без реклами» (після ad\_reward\_grant). Прискорення діловодом — поза MVP. | `race_id`: str (race\_0017); `method`: str (ad); `sec_saved`: int (9360); `speedups_count_after`: int (1) | Чим прискорюють гонку і чи потрібна для неї реклама. |
| 22 | `race_finish` | Документ пройшов конвеєр або ресурс скінчився раніше. Якщо без гравця, подія шлеться при поверненні. | `race_id`: str (race\_0017); `result`: str (success); `margin_sec`: int (43200); `speedups_count`: int (1); `is_ad_used`: bool (true); `is_resolved_offline`: bool (false); `gift_type`: str (drone) | Частка виграних гонок і запас часу. |

### Події й репутація (2)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 23 | `random_event_resolve` | Гравець обрав дію у випадковій події, або вона минула сама (choice = expired). «Комбата шукають» — Резолюції комбата ×0,25, не довше 30 хв; «Послатися на цифру» (cite\_digital) доступне при P\_total ≥ 1 і бали не списує. | `event_type`: str (kombat\_missing); `choice`: str (send\_runner); `sec_to_resolve`: int (35); `slowdown_sec`: int (600) | Як часто трапляються події, що обирають і скільки сповільнення вони дають. |
| 24 | `reputation_tier_change` | Значення репутації перетнуло межу low/normal/high (межі з конфігу економіки). Окремі зміни значення не шлемо: вони вже є в telegram\_choice\_submit. | `from_tier`: str (normal); `to_tier`: str (low); `reputation`: int (28); `source`: str (telegram) | Чи стає репутація важелем і скільки гравців сидить у низькій. |

### Цифровізація й рівні (4)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 25 | `digitization_hint_show` | Відкриті всі потоки, балів не менше мінімуму (30 для кожної цифровізації), а наступна покупка далі ніж за 4 год. Не частіше разу на сесію. | `next_purchase_eta_sec`: int (16200); `points_available`: int (38); `points_total`: int (0); `is_first_digitization`: bool (true); `sec_since_cycle_start`: int (201600) | Чи впираються гравці в стіну перед престижем і чи працює підказка. |
| 26 | `digitization_screen_open` | Показано екран «Цифровізація» з кнопкою «Оцифрувати батальйон». | `source`: str (hint); `points_available`: int (38); `is_eligible`: bool (true); `multiplier_after`: num (1.76) | Скільки гравців дивляться на престиж і не наважуються. |
| 27 | `digitization_complete` | Гравець підтвердив цифровізацію, прогрес обнулено, бали нараховано. | `digitization_number`: int (1); `points_gained`: int (38); `points_total`: int (38); `prestige_multiplier`: num (1.76); `lifetime_signatures_log10`: num (7.76); `sec_since_cycle_start`: int (259200); `sec_since_install`: int (259200); `journals_cancelled`: int (3); `is_from_hint`: bool (true); `digital_stages_count?`: int (2); `cycle_sec_previous?`: int (172800) | День першої цифровізації (ціль 3–5) і бали за цикл проти пісочниці. |
| 28 | `level_advance` | Третя цифровізація на рівні «Батальйон» завершена: відкрито «Бригаду» і показано її екран. Цифрові бали переходять. | `from_level_id`: str (batalion); `to_level_id`: str (bryhada); `digitization_count`: int (3); `points_total`: int (141); `sec_since_install`: int (648000); `final_attempts?`: int (1) | Коли гравці доходять до «Бригади» (пісочниця: 7–8 день) і чи вистачає контенту. |

### Музей (2)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 29 | `museum_journal_unlock` | Журнал отримано (цифровізація, телеграма, перевірка без зауважень або подія). | `journal_id`: str (soap\_log); `rarity`: str (common); `source`: str (digitization); `journals_owned_after`: int (3); `is_series_complete`: bool (false); `series_id`: str (personnel); `series_owned_after`: int (4); `series_complete_count`: int (2) | Як швидко збирається колекція і звідки йдуть журнали. |
| 30 | `museum_open` | Показано екран музею. | `source`: str (tab); `journals_owned`: int (3); `journals_unseen`: int (1); `segment`: str (journals) | Чи цікавить колекція гравців. |

### Бусти (1)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 31 | `boost_activate` | Почав діяти будь-який тимчасовий множник: буст за рекламу, ×3 планової перевірки (позапланова ×3 не дає; 7200 с, від репутації не залежить), подарунок після виграної гонки, онбордингова Пташка (1200 с ігрового часу). Бонус пального від бака сюди не входить: його видно з generator\_refuel і fuel\_bonus\_sec. | `boost_type`: str (income\_x2); `source`: str (ad); `multiplier`: num (2); `duration_sec`: int (14400); `stacked_remaining_sec`: int (25200); `is_capped`: bool (false) | Яку частку часу гравець проводить під бустами і чи впирається в накопичення 12 год. |

### Реклама й згода (6)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 32 | `ad_offer_show` | Кнопка «Дивитися» (або «Забрати» для власників «Без реклами») з'явилась на екрані, а ліміт місця не вичерпано. Ліміти однакові для обох кнопок. Не частіше разу на сесію для кожного місця; для offline\_double — на кожному екрані повернення. | `placement`: str (offline\_double); `ad_flow_id`: str (3f1c0e2a-8b4d-4f6e-9c7a-1d2e3f4a5b6c); `is_no_ads_claim`: bool (false); `is_ad_ready`: bool (true); `entry_point?`: str (boosts\_sheet); `uses_today`: int (1); `daily_limit`: int (3) | Скільки пропозицій бачать і яку частку приймають на кожному місці, окремо з рекламою й без. |
| 33 | `ad_start` | AdMob повідомив про відкриття оголошення після тапу «Дивитися». | `placement`: str (offline\_double); `ad_flow_id`: str (3f1c0e2a-8b4d-4f6e-9c7a-1d2e3f4a5b6c); `load_wait_ms`: int (350) | Скільки гравців тапає «Дивитися» і скільки чекають на завантаження. |
| 34 | `ad_complete` | AdMob надіслав подію заробленої нагороди (EARNED\_REWARD). | `placement`: str (offline\_double); `ad_flow_id`: str (3f1c0e2a-8b4d-4f6e-9c7a-1d2e3f4a5b6c); `watch_ms`: int (30500); `ad_value_micros?`: int (4200); `ad_value_currency?`: str (USD); `ad_value_precision?`: str (estimated) | Реальні перегляди на DAU (ціль ≥ 1,5) і дохід з реклами, якщо ввімкнено дохід за показ. |
| 35 | `ad_fail` | Реклама не готова, не завантажилась, не показалась, закрита до нагороди або заблокована відсутністю згоди. | `placement`: str (race\_speedup); `ad_flow_id`: str (3f1c0e2a-8b4d-4f6e-9c7a-1d2e3f4a5b6c); `stage`: str (load); `error_code?`: str (3); `error_domain?`: str (com.google.admob) | Fill rate і втрати на кожному місці. |
| 36 | `ad_reward_grant` | Після ad\_complete і закриття оголошення, або одразу після тапу «Забрати» для власників «Без реклами» (is\_no\_ads\_claim = true; ad\_start і ad\_complete тоді не шлемо). | `placement`: str (income\_boost); `ad_flow_id`: str (3f1c0e2a-8b4d-4f6e-9c7a-1d2e3f4a5b6c); `is_no_ads_claim`: bool (false); `reward_unit`: str (boost\_sec); `reward_amount`: num (14400) | Скільки нагород реально отримано і яку частку дає «Без реклами». |
| 37 | `ads_consent_update` | Показано й закрито форму UMP або змінився статус згоди: перед першим роликом (лише ЄЕЗ, Британія, Швейцарія), при запуску чи з налаштувань приватності. Якщо статус не змінився і форми не було — не шлемо. | `trigger`: str (first\_ad\_watch); `consent_status`: str (obtained); `is_form_shown`: bool (true); `is_ads_request_allowed`: bool (true); `is_privacy_options_required`: bool (true) | Яка частка гравців у регіонах зі згодою і скільки з них не можуть дивитися рекламу. |

Власники «Без реклами» мають ті самі місця й денні ліміти, але кнопку «Забрати» замість «Дивитися» (рішення 16). Їхній шлях — `ad_offer_show` → `ad_reward_grant` з `is_no_ads_claim = true`, без `ad_start` і `ad_complete`.

### Покупки (5)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 38 | `shop_view` | Показано екран «Магазин» з будь-якого входу або модалку starter-offer з черги модалок (source = starter\_offer, раз за встановлення). | `source`: str (tab); `is_starter_pack_available`: bool (true) | Звідки приходять у магазин і яка конверсія з перегляду в покупку. |
| 39 | `purchase_start` | Тап по ціні, викликано покупку в RevenueCat. | `product_id`: str (no\_ads); `price`: num (199); `currency`: str (UAH); `source`: str (tab) | Інтерес до кожного товару і частка тих, хто доходить до оплати. |
| 40 | `purchase_complete` | RevenueCat повернув успіх, товар видано. | `product_id`: str (no\_ads); `price`: num (199); `currency`: str (UAH); `source`: str (tab); `is_first_purchase`: bool (true); `purchase_number`: int (1); `sec_since_install`: int (190800); `store`: str (play\_store) | Конверсія в покупку (ціль ≥ 1,5%), мікс товарів, коли купують. |
| 41 | `purchase_fail` | RevenueCat повернув помилку чи скасування. | `product_id`: str (no\_ads); `price`: num (199); `currency`: str (UAH); `reason`: str (user\_cancelled); `error_code?`: str (PURCHASE\_CANCELLED\_ERROR) | Де ламається оплата: скасування гравцем чи збої магазину. |
| 42 | `purchase_restore` | Завершено виклик restorePurchases у RevenueCat. | `trigger`: str (settings\_button); `is_success`: bool (true); `restored_product_ids`: arr (\[no\_ads\]); `error_code?`: str (NETWORK\_ERROR) | Скільки гравців відновлюють «Без реклами» після перевстановлення. |

Товарів у MVP три (рішення 15): `no_ads` «Без реклами» 199 ₴, `starter_pack` «Стартовий набір» 79 ₴ (50 000 підписів і бак генератора на 12 год замість 6), `storage_24h` «Розширене сховище» 99 ₴ (офлайн до 24 год). Косметики в MVP немає. «Відновити покупки» є в магазині й налаштуваннях, тому `trigger` має значення shop\_button, settings\_button і auto\_check.

### Пуші (2)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 43 | `push_permission_request` | Гравець відповів на наш екран-пояснення («Скажемо, коли склад заповниться…») і, якщо погодився, на системний запит. Кількість подій = скільки разів запит показано, os\_result = відповідь. | `trigger`: str (onboarding\_session\_end); `pre_prompt_result`: str (accepted); `os_result`: str (granted) | Скільки гравців дозволяє пуші і чи не відштовхує їх наш екран. |
| 44 | `push_open` | Тап по сповіщенню відкрив застосунок. | `push_type`: str (storage\_full); `delay_sec`: int (1260) | Які пуші повертають гравців і як швидко. |

Пуш про генератор (`push_type = fuel_bonus_end`) йде не частіше разу на день. push\_type має 10 значень — по одному на кожне сповіщення каталогу специфікації 10.

### Налаштування й помилки (2)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 45 | `setting_change` | Гравець змінив перемикач у налаштуваннях або підписав скидання прогресу (progress\_reset, new\_value = done, до стирання; digitization\_count і playtime\_sec — з глобальних властивостей). Для analytics = off шлемо подію, робимо flush(), потім optOut(). | `setting_name`: str (haptics); `new_value`: str (off) | Які налаштування чіпають; скільки вимикають звук, вібрацію, категорії сповіщень і аналітику; скільки скидають прогрес. |
| 46 | `app_error_log` | Збій завантаження, запису чи міграції збереження, некоректний конфіг економіки, помилка SDK реклами, згоди, покупок, пушів, оновлень або рендеру картинки. Відновлення з копії на save-error — source = save\_load, recovery = backup\_slot. Деталі й стек — у Sentry, сюди лише код. | `source`: str (save\_load); `error_code`: str (parse\_error); `is_recovered`: bool (true); `recovery`: str (backup\_slot); `message_short?`: str (Unexpected token at 1043); `save_schema_from?`: int (2); `save_schema_to?`: int (3) | Скільки гравців втрачають прогрес і де ламаються SDK, у розрізі версій. |

### Пачки телеграм, стос (011, 012) (3)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 47 | `telegram_pack_receive` | Настала 03:00 за часом пристрою на Р3; якщо гравця не було — при поверненні. Окремо від неї надсилаються три telegram\_receive. | `pack_id`: str (pack\_03); `pack_number`: int (3); `is_repeat`: bool (false); `delivery`: str (while\_away) | Чи доходить одна пачка на добу і скільки пачок пропущено через ліміт «Нових». |
| 48 | `telegram_pack_resolve` | Остання з трьох відповідей застосована (зведена або окрема). | `pack_id`: str (pack\_03); `mode`: str (summary); `choice_kind?`: str (diligent); `paper_spent`: int (4); `reputation_delta`: int (10); `inspection_chance_pct`: num (0); `is_beats`: bool (true); `sec_since_received`: int (21600) | Чи справжній вибір між зведенням і окремими відповідями; скільки паперу й репутації він коштує. |
| 49 | `stack_meter_reach` | Висота стосу перетнула 100 см; раз на цикл цифровізації. Запис «Метр звітів» створено в Журналі курйозів. | `zpz_share_pct`: num (35.0); `zpz_level`: int (24); `sec_since_session_start`: int (180); `offline_share_pct`: num (80.0) | Чи досягають метра в типовій сесії і чи поширюють цей запис. |

### Р5, фінал і Дублі (013) (4)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 50 | `stage_convert` | Підтверджено «Оцифрувати ланку» в stage-convert, підписи списано, стан збережено. | `stage_id`: str (kombat); `convert_index`: int (1); `cost_log10`: num (14.2); `digitizations_on_level`: int (0); `sec_since_level_start`: int (5400); `sec_since_available`: int (3600) | Темп конвертацій на Р5 і чи не стала ціна стіною. |
| 51 | `finale_step_complete` | Крок стан-машини фіналу збережено як завершений. | `step_id`: str (script); `step_index`: int (2); `sec_since_finale_start`: int (240); `is_resumed`: bool (false); `declined_count?`: int (1) | Скільки гравців проходять фінал до кінця і де зупиняються (зокрема N на Y/N). |
| 52 | `dub_start` | Утримано «Прийняти до виконання» в endless-intro, стан скинуто й збережено. | `dub_number`: int (1); `modifier_id`: str (two\_copies); `points_total`: int (1840); `sec_since_finale`: int (640000); `sec_since_offer`: int (3600) | Скільки гравців ідуть у нескінченний режим, як швидко і з яким модифікатором. |
| 53 | `personal_record_update` | Новий найвищий Дубль або новий максимум log10 підписів за весь час (не частіше разу на сесію для lifetime\_signatures). | `record_type`: str (dub); `value`: num (3); `previous_value`: num (2) | Чи мотивує рекорд без лідерборду; база для рішення про 020. |

### Сюжет (014) (4)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 54 | `story_beat_deliver` | Рушій сюжету віддав крок із черги, і носій (записка, тост, дзвінок, сцена, телеграма тощо) став видимим. | `beat_id`: str (st\_who\_writes\_05); `arc`: str (who\_writes); `carrier`: str (note); `beat_order`: int (5); `delay_sec`: int (21600); `is_catch_up`: bool (false); `is_while_away`: bool (true) | Чи доходять арки, скільки кроків наздоганяють і як довго вони чекають у черзі. |
| 55 | `archive_sheet_unlock` | Аркуш додано в колекцію. | `sheet_id`: str (ar\_04); `sheet_number`: int (4); `source`: str (gift); `sheets_owned_after`: int (4) | Як швидко збирається колекція і з яких джерел. |
| 56 | `archive_open` | Показано шторку archive-sheets. | `source`: str (museum); `sheets_owned`: int (4) | Чи читають аркуші, а не лише збирають. |
| 57 | `diary_open` | Показано екран diary. | `lines_owned`: int (23); `lines_unseen`: int (2) | Чи цікавить щоденник окремо від рядка на довідці. |

### Грамоти (016) (3)

| # | Подія | Коли спрацьовує | Властивості (тип, приклад) | Питання |
| --- | --- | --- | --- | --- |
| 58 | `award_unlock` | Умова грамоти з content/awards.json виконалась, грамоту записано в збереження. Одна подія на грамоту. Грамоти, видані «заднім числом» після оновлення контенту, шлються при завантаженні з is\_retroactive = true. | `award_id`: str (aw\_tg\_50); `award_category`: str (telegrams); `award_type`: str (podyaka); `is_hidden`: bool (false); `awards_owned_after`: int (15); `is_retroactive`: bool (false); `is_resolved_offline`: bool (false); `is_mirrored`: bool (true); `sec_since_install`: int (1382400) | Чи тримається темп «одна грамота на 1–2 дні», які категорії не відкривають і які приховані знаходять. |
| 59 | `awards_wall_open` | Показано сегмент «Грамоти»: перемикачем сегментів, з тосту грамоти або з особової справи. Не частіше разу на 60 с для того самого джерела. | `source`: str (award\_toast); `awards_owned`: int (15); `awards_unseen`: int (1) | Чи дивляться на грамоти взагалі, чи працює тост як вхід. |
| 60 | `award_platform_sync` | Закінчилась спроба входу або звіту в Game Center / Google Play Ігри: на старті після онбордингу, при новій грамоті з дзеркалом, при ввімкненні перемикача. Не частіше разу на сесію з тим самим result, крім першого входу. | `platform`: str (game\_center); `result`: str (synced); `reported_count`: int (2); `pending_count`: int (0); `is_first_sign_in`: bool (false) | Скільки гравців мають дзеркало, скільки відмовляються від входу і скільки звітів зависає в черзі. |

## Властивості гравця

Властивостей гравця 30. `$set_once` передаємо разом з `identify(install_id, …)` на першому запуску. `$set` їде в тій події, що змінила значення: `purchase_complete` ставить `is_payer = true`, крок `callsign_choose` — `protagonist_gender`.

Частина значень навмисно дублює глобальні властивості подій. Глобальні показують стан у момент події, а властивості гравця потрібні для когорт: «усі, хто купив», «усі з конфігом v4.1».

| Властивість | Тип | Запис | Приклад | Що означає |
| --- | --- | --- | --- | --- |
| `install_date` | date | `$set_once` | 2026-11-20 | Дата першого запуску |
| `install_week` | str | `$set_once` | 2026-W47 | ISO-тиждень встановлення, для когорт |
| `install_app_version` | str | `$set_once` | 1.0.0 | Версія застосунку на першому запуску |
| `install_economy_config_version` | str | `$set_once` | econ-v7.2 | З яким конфігом гравець почав; таргетинг змін економіки лише на нові встановлення |
| `install_build_channel` | str | `$set_once` | production | Канал збірки на першому запуску. Значення: development, preview, production |
| `first_device_region` | str | `$set_once` | UA | Регіон пристрою на першому запуску |
| `callsign_type` | str | `$set` | excel | Лише тип. Текст свого позивного ніколи не відправляємо. Значення: excel, skrepka, drukar, custom |
| `protagonist_gender` | str | `$set` | f | Форма протагоніста з кроку позивного (він / вона). Не персональні дані гравця. Значення: m, f |
| `is_onboarding_complete` | bool | `$set` | true | Пройдено крок 10 онбордингу |
| `onboarding_last_step_index` | int | `$set` | 10 | Останній завершений крок онбордингу, 1–11 |
| `current_level_id` | str | `$set` | batalion | Поточний рівень гри. Значення: batalion, bryhada, komanduvannia, henshtab, bez\_paperu |
| `digitization_count` | int | `$set` | 2 | Скільки цифровізацій зроблено |
| `digital_points_total` | int | `$set` | 79 | Усі цифрові бали |
| `prestige_multiplier` | num | `$set` | 2.58 | 1 + 0,02 × усі бали |
| `reputation_tier` | str | `$set` | normal | Поточний рівень репутації. Значення: low, normal, high |
| `museum_journals_count` | int | `$set` | 5 | Журналів у колекції (у MVP до 8) |
| `has_no_ads` | bool | `$set` | false | Куплено «Без реклами» |
| `has_extended_storage` | bool | `$set` | false | Куплено «Розширене сховище» (24 год) |
| `has_starter_pack` | bool | `$set` | true | Куплено «Стартовий набір» (50 000 підписів, бак генератора на 12 год) |
| `is_payer` | bool | `$set` | true | Хоча б одна успішна покупка |
| `purchases_count` | int | `$set` | 1 | Усього успішних покупок |
| `first_purchase_date` | date | `$set_once` | 2026-11-22 | Дата першої покупки |
| `first_purchase_product_id` | str | `$set_once` | starter\_pack | Що купили першим. Значення: no\_ads, starter\_pack, storage\_24h |
| `ads_completed_total` | int | `$set` | 17 | Усього реклам, переглянутих до нагороди |
| `push_permission` | str | `$set` | granted | Стан дозволу на пуші. Значення: granted, denied, provisional, not\_asked |
| `ads_consent_status` | str | `$set` | not\_required | Статус згоди UMP. Значення: obtained, required, not\_required, unknown |
| `is_ads_regulated_region` | bool | `$set` | false | UMP вимагає згоду (ЄЕЗ, Велика Британія, Швейцарія) |
| `economy_config_version` | str | `$set` | econ-v7.2 | Поточна версія конфігу економіки |
| `is_econ_detail_sampled` | bool | `$set` | true | Пристрій у вибірці upgrade\_purchase |
| `is_test_user` | bool | `$set` | false | Тестер або розробник; виключаємо з дашбордів |

## KPI

Головні цілі: утримання D1 ≥ 35% і D7 ≥ 12%, онбординг ≥ 80%, реклам на DAU ≥ 1,5, конверсія в покупку ≥ 1,5%. DAU — унікальні `install_id` з хоча б одним `session_start` за добу (Europe/Kyiv). З усіх розрахунків виключаємо `is_test_user = true` і `build_channel != 'production'`.

| KPI | Ціль | Як рахуємо |
| --- | --- | --- |
| Утримання D1 / D7 / D30 | ≥ 35% / ≥ 12% / ціль у GDD не задана, базу фіксуємо на закритому тесті | Retention-інсайт: стартова подія `app_first_open` (first time), повторна `session_start`, інтервал «день». Розріз за `install_week` і `install_economy_config_version` |
| Сесій на день | ≥ 4 (GDD), у пісочниці 5 | `count(session_start) / DAU` за день, плюс медіана сесій на пристрій-день |
| Тривалість сесії | 2–5 хв (GDD), у пісочниці 4 хв, перша 10 хв | Медіана й p25/p75 від `max(duration_sec)` на `game_session_id` з `session_end`; окремо `session_number = 1` |
| Онбординг пройдено | ≥ 80% | Воронка `app_first_open` → `onboarding_step_complete` за `step_index` 1–10, вікно 3 доби. Крок 10 = пройдено |
| Час до першого діловода | 3–4 хв гри, у пісочниці 2,95 | Медіана `playtime_sec / 60` на `clerk_hire` з `is_first_clerk = true`, плюс частка ≤ 240 с |
| Час до першої цифровізації | 3–5 день, у пісочниці 3 день | Медіана `sec_since_install / 86400` на `digitization_complete` з `digitization_number = 1`. Розріз: `has_no_ads` / дивиться рекламу / без реклами й покупок |
| Реклам на DAU | ≥ 1,5 | `count(ad_complete) / DAU`. Нагороди через «Забрати» (`ad_reward_grant.is_no_ads_claim = true`) у переглядах не рахуємо |
| ARPDAU | ціль у GDD не задана | (виторг покупок + виторг реклами) / DAU. Покупки — події RevenueCat у PostHog (`rc_non_subscription_purchase_event`, USD, налаштовано «після комісії й податків»). Реклама — сума `ad_value_micros` з `ad_complete`, або щоденний звіт AdMob, поки дохід за показ не ввімкнено |
| Конверсія в покупку | ≥ 1,5% | Частка пристроїв когорти з хоча б одним `purchase_complete` до D7 і до D30; щоденна — платники за день / DAU |
| Втрати на ліміті сховища | ≤ 15% (ціль пісочниці) | `sum(capped_sec) / sum(away_sec)` з `offline_income_claim`, як у пісочниці (лише повернення з діловодами). Розріз `storage_cap_sec` 8 год / 24 год |

Приклади HogQL:

```sql
-- тривалість сесії: медіана й p75 у хвилинах
SELECT quantile(0.5)(d) / 60 AS median_min, quantile(0.75)(d) / 60 AS p75_min
FROM (
  SELECT properties.game_session_id AS sid, max(toFloat(properties.duration_sec)) AS d
  FROM events
  WHERE event = 'session_end' AND timestamp > now() - INTERVAL 7 DAY
  GROUP BY sid
)

-- частка доходу, втраченого на ліміті сховища
SELECT sum(toFloat(properties.capped_sec)) / sum(toFloat(properties.away_sec)) AS storage_loss_share
FROM events
WHERE event = 'offline_income_claim' AND toInt(properties.clerks_count) > 0
  AND timestamp > now() - INTERVAL 7 DAY

-- час до першого діловода
SELECT quantile(0.5)(toFloat(properties.playtime_sec)) / 60 AS median_min,
       countIf(toFloat(properties.playtime_sec) <= 240) / count() AS share_within_4_min
FROM events
WHERE event = 'clerk_hire' AND toString(properties.is_first_clerk) = 'true'

-- частка часу сесій під бонусом пального
SELECT sum(toFloat(properties.fuel_bonus_sec)) / sum(toFloat(properties.duration_sec)) AS fuel_bonus_share
FROM events
WHERE event = 'session_end' AND timestamp > now() - INTERVAL 7 DAY
```

### П'ять дашбордів на перший день

1. **Онбординг.** Воронка з 11 кроків, медіана `step_duration_sec` на кожному кроці проти таймлайну GDD, розріз за платформою й `$app_version`. Тут видно, де гравці відпадають.
2. **Утримання й сесії.** Таблиця D1/D7/D30 за `install_week`, сесії на DAU, розподіл тривалості сесії, гістограма `local_hour`, DAU/WAU.
3. **Економіка проти пісочниці.** Час до першого діловода, першої телеграми, першої перевірки, першої цифровізації й `level_advance`. Поруч втрати на сховищі, p50/p90 `next_purchase_eta_sec`, мікс `bottleneck_id`, тапи за сесію, частка часу під бонусом пального. Усе з розрізом за `economy_config_version`.
4. **Реклама й покупки.** Воронка реклами по кожному місцю (`ad_offer_show` → `ad_start` → `ad_complete` → `ad_reward_grant`) з розрізом за `is_no_ads_claim`, частка `ad_fail` за `stage`, реклам на DAU. Поруч воронка магазину (`shop_view` → `purchase_start` → `purchase_complete`) по трьох товарах, причини `purchase_fail`, ARPDAU, конверсія.
5. **Контент і здоров'я.** Розподіл виборів і кількість `telegram_flag` на кожну `telegram_id`, частка пройдених перевірок і виграних гонок, `app_error_log` за `source` на 1000 сесій, статуси згоди UMP, дозвіл на пуші і `push_open`.

## Цикл налаштування економіки

Раз на тиждень реальна поведінка гравців йде в [пісочницю економіки](https://claude.ai/artifact/WyhwmoemCkKREeq86pZitw) (`balance/sim.js`, v4), а нова версія конфігу — лише на нові встановлення. Аналітика перевіряє дві речі: чи правдиві припущення пісочниці і чи досягають гравці віх у ті самі строки.

### Припущення пісочниці проти реальних даних

| Параметр пісочниці (v4) | Значення | Реальна метрика | Звідки |
| --- | --- | --- | --- |
| `sessionsPerDay` | 5 | Сесій на пристрій-день, p25/p50/p75 | `session_start` |
| `sessionMin` / `firstSessionMin` | 4 / 10 хв | Тривалість сесії | `session_end.duration_sec` |
| Розклад (16 год неспання, рівні проміжки) | — | Години й паузи між сесіями | `session_start.local_hour`, `sec_since_last_session` |
| `tapsPerSession` | 60 | Тапи за сесію, частка доходу від тапів | `session_end.taps_count`, `tap_signatures_share_pct` |
| `adsPerDay` × `adHours` | 3 × 4 год | Бусти за рекламу або «Забрати» на день | `ad_reward_grant` з `placement = income_boost` |
| `offlineAdMult` | 1,5 | 1 + частка подвоєних повернень, зважена на дохід | `offline_income_claim.is_doubled`, `earned_log10` |
| `paidMult` | 1,5 | Частка гравців з «Без реклами» | `has_no_ads` |
| `storageHours` | 8 | Втрати на ліміті сховища, ціль ≤ 15% | `offline_income_claim` |
| `prestigeStallHours` | 4 | Як часто підказка веде до цифровізації | `digitization_hint_show` → `digitization_complete.is_from_hint` |
| `prestigeMinPoints` | 30 | Бали на першій цифровізації | `digitization_complete.points_gained` |
| Бот купує найвигіднішу покупку | — | Частка покупок у вузьке місце, використання «до віхи» | `upgrade_purchase.was_bottleneck`, `buy_mode` |
| Пальне (у v4 немає) | бак \~6 год, ×1,25 при баку > 20% | Частка часу сесій і офлайну під бонусом, частота заправок | `session_end.fuel_bonus_sec`, `offline_income_claim.fuel_bonus_sec`, `generator_refuel` |
| «Сумлінно» (у v4 немає) | ланка ×0,5 на 1 год | Частка вибору «сумлінно» і час ланок у сповільненні | `telegram_choice_submit.choice_kind`, `slowdown_sec` |

Пальне й «сумлінно» (рішення 9 і 13) позначені «перевірити в пісочниці». Їх додаємо в `simulate()` до першого тижневого циклу, інакше прогноз доходу занижений на бонус ×1,25.

### Віхи пісочниці проти факту

| Віха | Пісочниця v4 | Реальна метрика |
| --- | --- | --- |
| Перший діловод | 2,95 хв гри | `clerk_hire` з `is_first_clerk = true` |
| Перша цифровізація | 3 день | `digitization_complete` з `digitization_number = 1` |
| Найдовше очікування покупки до цифровізації | 11,2 год | p90 `next_purchase_eta_sec` |
| Перехід на «Бригаду» після 3-ї цифровізації | 7,5 день | `level_advance.sec_since_install` |
| Розрив «Без реклами» / без реклами | 2,6 раза (ліміт 3) | Темп цифровізацій за `has_no_ads` |
| Частка вузьких місць | `neck` | Мікс `bottleneck_id` |

### Цикл раз на тиждень

1. HogQL-запитом вивантажити реальні параметри поведінки для трьох персон (p25, p50, p75 за сесіями на день) і зберегти як `preset-real-<тиждень>.json` у форматі пісочниці.
2. Прогнати пісочницю з цими персонами. Для цього в `simulate()` треба додати вхід `schedule`: реальні старти й довжини сесій замість рівного розкладу `starts`.
3. Порівняти прогноз пісочниці з фактом для тих самих персон. Якщо прогноз не збігається з фактом, помилка в моделі (наприклад, гравці не купують оптимально), і правимо модель. Якщо модель точна, але цілей темпу не досягнуто, крутимо коефіцієнти.
4. Новий набір параметрів отримує нову версію (`econ-v5.1`) і йде через віддалений конфіг лише на нові встановлення: усім новим або A/B 50/50 серед них.
5. Через 7 днів порівняти когорти за `install_economy_config_version` у дашборді 3.

### Віддалений конфіг

- **Вбудована версія.** Базові параметри зашиті в застосунок (`economy.json`, `econ-v7.2`, рішення 52), тож гра працює офлайн і з першого запуску.
- **Флаг.** Зміни приходять через feature flag PostHog `economy-config` з JSON-payload `{ "version": "econ-v5.1", "params": { … } }`. Формат `params` збігається з експортом пісочниці (`preset-v5.json`), тож пресет йде в payload без перетворень. Мультиваріантний флаг дає A/B, а варіант стабільний для `install_id`.
- **Лише нові встановлення (рішення 23).** Флаг таргетуємо за `install_economy_config_version` або датою встановлення. Версія фіксується в збереженні до першої покупки рівня (крок онбордингу 6): флаг вже прийшов — remote, ще ні — вбудована. Далі почате збереження лишається на своїй версії, і нова крива цін на нього не падає.
- **Кеш і перевірка.** Закріплений конфіг лежить у MMKV поруч зі збереженням (`economy_config_source = cached`). Перед застосуванням його перевіряє zod-схема й межі: ріст ціни 1,05–1,25, ліміти не нульові. Якщо щось не так, лишаємо вбудовану версію і шлемо `app_error_log` з `source = economy_config`.
- **Версія на подіях.** На кожній події є `economy_config_version` і `economy_config_source`. Варіант A/B дописуємо в кінець версії: `econ-v5.1+b`.
- **Чому не лише expo-updates.** OTA-оновлення однакове для всіх, а флаг дає когорти й експерименти без релізу. expo-updates лишається для контенту й коду.

## Джерела

- [PostHog: best practices з назв подій](https://posthog.com/docs/product-analytics/best-practices)
- [PostHog: React Native SDK (офлайн-черга, lifecycle-події)](https://posthog.com/docs/libraries/react-native)
- [PostHog: ціни](https://posthog.com/pricing)
- [Apple: User privacy and data use](https://developer.apple.com/app-store/user-privacy-and-data-use/)
- [Google AdMob: IDFA support (iOS)](https://developers.google.com/admob/ios/privacy/idfa)
- [Google AdMob Help: підготовка до iOS 14+](https://support.google.com/admob/answer/10115027)
- [Google AdMob Help: вимоги до CMP в ЄЕЗ, Британії й Швейцарії](https://support.google.com/admob/answer/13554020)
- [Google UMP SDK: інтеграція](https://developers.google.com/admob/ios/privacy)
- [RevenueCat: інтеграція з PostHog](https://www.revenuecat.com/docs/integrations/third-party-integrations/posthog)
