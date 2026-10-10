# Data Model: 002 — етап 1

## GameSave v2 (`src/save/schema.ts`)

```ts
game: {
  economy: EconomyState;        // 001, без змін
  effects: Effect[];            // + source 'onboarding_bird' НЕ зберігається (R3)
  playtimeMs: number;           // ≥ 0, ігровий час на передньому плані від першого запуску (FR-29)
  onboarding: OnboardingState;
}
```

## OnboardingState

| Поле | Тип | Правила |
| --- | --- | --- |
| `step` | `1…11 \| 'done'` | поточний незакритий крок; `'done'` — пройдено (або запис v1) |
| `introLine` | `0…3` | не зберігається між запусками: після вбивства вступ з репліки 1 (крайовий випадок) |
| `callsign` | `{ type: 'excel' \| 'skrepka' \| 'drukar' \| 'custom'; text: string } \| null` | записується лише разом із закриттям кроку 3; `text` 2–16 знаків (рішення 58) |
| `gender` | `'m' \| 'f' \| null` | разом із кроком 3 (FR-8) |
| `birdLeftMs` | `number` | ≥ 0; ставиться на кроці 5 = `onboardingBirdMin` × 60 000; зменшується лише онлайн |
| `completed` | `{ step: number; atPlayMs: number; durationMs: number; skipped: boolean }[]` | один запис на крок за встановлення; дані для `onboarding_step_complete` (етап 5) |
| `stepStartedAtPlayMs` | `number` | для `step_duration_sec` |
| `tg1` | `{ choiceId: string; atPlayMs: number } \| null` | вибір у телеграмі № 1 (крок 8) для 03 |
| `tg1ReceivedAtPlayMs` | `number \| null` | телеграма прийшла (бейдж «1», коуч на вкладці) |
| `archiveBonus` | `number \| null` | скільки зараховано на кроці 9 (для `bonus_signatures_log10`) |

Акт (`actTaps`, 0–8) живе лише в пам'яті екрана: після вбивства «0 з 8» (R4).

## Переходи

```text
1 title ─tap─▶ 2 intro ─next×4|skip─▶ 3 callsign ─cta(valid)─▶ 4 act ─8 taps─▶ 5 stamp ─anim end─▶
6 main+coach(upgrade) ─purchase─▶ 7 coach(hire stroy) ─hire→clerk-first→Далі─▶
8 tg #1 (≥ 300 с гри) ─choice─▶ tg-result ─close─▶ 9 call (≥ archiveBonusAtSec) ─bonus─▶ 10 (чекає 08)
```

- Крок 6 активний, коли `signatures ≥ priceAt(raporty, L)`; крок 7 — коли `signatures ≥ manager(stroy)`.
- Повтор після вбивства: `step` лишається незакритим, екран кроку з початку; закриті кроки не повторюються (FR-28).
- `step` 10 у етапі 1 — кінцевий: `main` без коуча; 08 додасть перехід.

## Effect.source (001)

`'onboarding_bird'` додається в `Effect['source']` і в порядок `multStack` першим (рядок чипа «Пташка»). Схема запису його не приймає (R3).

## Контент

`content/callsign-stopwords.json`: `{ "version": 1, "words": string[] }`, нижній регістр, без дублікатів; схема `content/schema/callsign-stopwords.schema.json`, перевірка в `tools/check_content.py`.
