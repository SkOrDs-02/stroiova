# Контент

Тексти й дані гри у JSON. Гра читає їх як є, оновлюються через expo-updates (конституція, принцип VIII). Тексти проходять `docs/anti-slop.md` і червоні лінії (принцип IV).

## Файли

| Файл | Що там | Специфікація |
| --- | --- | --- |
| `telegrams.json` | 45 записів Р1–Р2: 40 телеграм, шаблон override, 4 без вибору. **Генерується** з `tools/gen_tg.py`, руками не правити | 03 |
| `tg/level1-2.json` | Додаткові телеграми Р1–Р2 (№ 41–48 і з № 114), масив | 03, рішення 41 |
| `tg/level3.json` | Р3: об'єкт `{level, schema, packs[], telegrams[]}`, 20 пачок по 3 телеграми | 011 |
| `tg/level4.json` | Р4: масив, зокрема подія `tg_event_brief` (`kind: event`) і сюжетні телеграми (`story`) | 012, 014 |
| `tg/level5.json` | Р5, фінал і Дублі: масив (`fading`, `conversionsMin`, `endless`, `dubMin`, `trigger`, `sign`) | 013 |
| `tg/*.sources.md` | Джерела реальних деталей і відкриті питання до пулів | — |
| `story.json` | Сюжетні кроки | 014 |
| `archive.json` | 12 аркушів «Таблиць Археолога» | 014 |
| `diary.json` | Рядки «Щоденника стройовика» | 014 |
| `museum.json` | Журнали № 9–24 і серії | 016 |
| `awards.json` | 62 грамоти й лічильники умов | 016 |
| `lines.json` | Пули реплік, тостів і пушів (рішення 41) | 09, 10 |
| `credits.json` | Титри фіналу | 013 |

## Схеми

`schema/telegram.schema.json` (JSON Schema draft 2020-12) описує телеграму, варіант, ефекти, пачку й файл пулу (масив або об'єкт з `packs[]`). Поля взято з фактичних даних; невідоме поле — помилка (`additionalProperties: false`). Нове поле чи значення спершу додати в специфікацію, потім у схему й `tools/gen_tg.py`.

Списки цілей сповільнень (`$defs.unit`) і відправників (`$defs.sender`, `$defs.recipient`) мають збігатися з `STAGES`, `SENDERS`, `RECIPIENTS` у `tools/gen_tg.py`, перевірка це контролює. `pack.size` береться з найновішого `balance/preset-v*.json`.

## Як перевіряти

```sh
python3 tools/check_content.py              # усе: дублі id/no, червоні лінії в усьому content/, пули телеграм
python3 tools/gen_tg.py --check             # лише пули телеграм: схема, id/no між файлами, посилання, пачки, note ≤ 60, червоні слова
python3 tools/gen_tg.py content/telegrams.json   # перегенерувати telegrams.json (git diff має бути порожнім, якщо gen_tg.py не змінювали)
```

Потрібен модуль `jsonschema` (`pip install jsonschema`). Кнопки довші за 22 знаки (03) — попередження, не помилка: частина наявних кнопок довша.
