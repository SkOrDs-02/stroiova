# Стройова (Stroiova) — інструкції для Claude Code

Мобільна idle-гра (iOS/Android, Expo + TypeScript): сатира на армійський документообіг. Автор — Дмитро, соло. Спілкуємося українською, коротко.

## Як тут працювати

Spec-driven development (GitHub Spec Kit). Правила — `.specify/memory/constitution.md`; читай її першою.

- Нова фіча: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
- Специфікації 001–010 уже готові (`specs/NNN-*/spec.md`): для них починай з `/speckit-plan`.
- Порядок реалізації: див. `docs/roadmap.md`.
- Не вигадуй механік і чисел. Немає в специфікації чи `docs/decisions.md` — спитай або запиши відкрите питання.

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
| `balance/` | Модель економіки `sim.js` (v6), пресети, пісочниця (`sandbox/build.py` → `sandbox/index.html`) |
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
- Код ще не створено: перший крок — `/speckit-plan` для `specs/001-core-economy`.
