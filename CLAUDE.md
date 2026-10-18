# Стройова (Stroiova) — інструкції для Claude Code

Мобільна idle-гра (iOS/Android, Expo + TypeScript): сатира на армійський документообіг. Автор — Дмитро, соло. Спілкуємося українською, коротко.

## Як тут працювати

Spec-driven development (GitHub Spec Kit). Правила — `.specify/memory/constitution.md`; читай її першою.

- Нова фіча: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
- Специфікації 001–010 уже готові (`specs/NNN-*/spec.md`): для них починай з `/speckit-plan`.
- Порядок реалізації: див. `docs/roadmap.md`.
- Не вигадуй механік і чисел. Немає в специфікації чи `docs/decisions.md` — спитай або запиши відкрите питання.

## Інструменти Claude в репо

- Скіли: `/feature-start NNN` (старт сесії над фічею), `/decision` (нове рішення → decisions + специфікації), `/balance-change` (формула чи число → sim.js, пресет, золоті тести), `/text-review` (червоні лінії й анти-слоп).
- Агенти (`.claude/agents/`, лише читають): `spec-guardian` (дифф проти специфікації й конституції, перед кожним PR), `content-reviewer` (тексти), `balance-analyst` (прогони sim.js «було / стало»), `analytics-auditor` (tracking-plan проти коду й PostHog), `crash-triage` (Sentry, EAS, TestFlight, Play).
- Хуки (`.claude/settings.json`): старт хмарної сесії ставить залежності; правка `content/` запускає `check_content.py`; `content/telegrams.json` руками не правиться.
- CI: `.github/workflows/content.yml` (контент, генератор телеграм, симулятор), `.github/workflows/app.yml` (типи, лінтер, тести, тема, expo-doctor).

## Де що лежить

| Шлях | Що там |
| --- | --- |
| `specs/` | Специфікації фіч 001–010 (FR, AC, екрани, події) |
| `docs/gdd.md` | Дизайн-документ гри |
| `docs/decisions.md`, `docs/decisions-log.md` | Усі рішення (нумеровані, з датами). Мають пріоритет над GDD |
| `docs/roadmap.md` | Обсяг продакшн-релізу й порядок робіт |
| `docs/anti-slop.md` | Обов'язкові правила для текстів і візуалу |
| `docs/texts.md`, `content/` | Тексти гри; `content/telegrams.json` — 40 телеграм (генератор `tools/gen_tg.py`) |
| `docs/screens.md`, `design/screens/` | Карта екранів і 53 артборди (`.dc.html`, стани в `data-props`) |
| `design/system/` | Дизайн-система: `tokens.json`, `README.md`, компоненти, `components/index.d.ts` (контракт пропсів), шрифт TT2020 |
| `balance/` | Бот і події симулятора `sim.js` (формули — з `economy.js`), пресети, відбитки `golden/`, пісочниця (`sandbox/build.py` → `sandbox/index.html`) |
| `src/save/` | Збереження (009): MMKV (`mmkv.ts`), схема й міграції, знімки, контрольна сума; запуск і екрани — `src/features/boot/` |
| `src/telegrams/` | Телеграми й репутація (003): чистий домен — розклад, мішок, ефекти, репутація, комбат; екрани — `src/features/telegrams/` |
| `src/economy/` | Модуль економіки: `core` (спільний із симулятором), `game` (стан і дії гри), `format.ts`; вбудований конфіг `econ-v7.2` |
| `analytics/tracking-plan.yaml` | 60 подій аналітики; `docs/analytics.md` — пояснення |
| `docs/art-and-sound.md`, `docs/stores.md`, `docs/playtest-and-launch.md` | Арт і звук, сторінки сторів, тестування й запуск |
| `docs/research/` | Рев'ю й дослідження |

Онлайн-версії (джерело правди тепер — репо): дизайн-документ https://claude.ai/code/artifact/fb2b97ab-5ea0-492a-a4af-314d056053e3 · екрани https://claude.ai/artifact/4LCbkAzNVHzfKmVvDKyNqh · дизайн-система https://claude.ai/artifact/GLBf39Zn3EeC9LsstwFGNU · пісочниця https://claude.ai/artifact/WyhwmoemCkKREeq86pZitw

## Термінологія

- «MVP» у специфікаціях 001–010 означає **ядро гри (рівні 1–2)**. Ціль — повний продакшн-реліз (рівні 1–5 і фінал), див. `docs/roadmap.md`.
- Р1 «Батальйон», Р2 «Бригада». Потоки (Рапорти, Акти на майно, Довідки, Накладні, на Р2 + Накази по частині) → труба погоджень (Резолюції комбата, Стройова частина, Фінслужба, на Р2 + Казначейство). Дохід = min(сума потоків, найвужча ланка) × множники.
- Діловоди, цифровізація (престиж), музей скасованих журналів, Журнал курйозів.

## Червоні лінії (коротко)

Без смертей, поранень, полону, СЗЧ, ВЛК, виплат, ТЦК; без реальних частин, імен, символіки ЗСУ; без «УПА», мату, куріння, зброї-жарту, слова «станція». Штампи #4A3D9E, червоний лише з текстом. Деталі — конституція, принцип IV.

## Команди

- Пісочниця балансу: `python3 balance/sandbox/build.py` і відкрити `balance/sandbox/index.html`.
- Телеграми: `python3 tools/gen_tg.py content/telegrams.json` (перегенерувати й перевірити JSON).
- Перевірка контенту: `python3 tools/check_content.py` (усе) або `python3 tools/gen_tg.py --check` (пули телеграм за `content/schema/telegram.schema.json`); див. `content/README.md`.
- Застосунок: `npm start` (Expo), `npm run check` (типи, лінтер, тести, тема, контент — перед кожним PR).
- Економіка: формули й параметри — у `src/economy/core`; `npm run build:economy` збирає `balance/economy.js` для `sim.js` і пісочниці; `node tools/golden.mjs --check` — відбитки симулятора (27) не змінились.
- Тема: `python3 tools/gen_theme.py` (`design/system/tokens.json` → `src/theme/tokens.ts`, руками не правити).

## Код

Expo SDK 57, Expo Router (маршрути в `src/app/`, решта коду поза ним), TypeScript strict, імпорт `@/…` = `src/…`.

- Expo змінюється з кожним SDK: перед кодом з API Expo/EAS/RN читай документацію (Expo MCP, Context7), не пиши з пам'яті.
- Пакети лише через `npx expo install <пакет>` (сумісні версії); після — `npx expo-doctor`.
- `ios/` і `android/` не створюємо (CNG): нативне — через `app.json` і config plugins.
- Кольори, відступи, шрифти — лише з `@/theme` (принцип VI). Числа балансу — лише з `balance/` (принцип I).
- Збереження: нова форма запису = `CURRENT_SCHEMA` + 1 і міграція в `src/save/migrations.ts` з тестом на фікстуру попередньої версії (принцип III). MMKV — лише через `src/save/mmkv.ts` (нативний модуль; потрібна development build).
- Sentry вмикається змінною `EXPO_PUBLIC_SENTRY_DSN`; без неї вимкнений. `sendDefaultPii: false`.
- Тести: `*-test.ts(x)` у `__tests__/` поруч із кодом, Jest + Testing Library.
