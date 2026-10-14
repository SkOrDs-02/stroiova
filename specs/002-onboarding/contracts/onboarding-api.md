# Contract: модуль онбордингу (етап 1)

## `src/features/onboarding/steps.ts` (чисті функції)

```ts
type Step = 1|2|3|4|5|6|7|8|9|10|11|'done';
newOnboarding(playMs: number): OnboardingState            // step 1
complete(o, step, playMs, extra?: { skipped?, callsign?, gender? }): OnboardingState
  // лише якщо o.step === step; інакше o без змін (повторний тап, FR-1, «Повторний тап»)
ready(o, ctx: { playMs, signatures, raportyPrice, stroyClerkPrice, archiveAtMs }): ReadyState
  // що показати: 'coachUpgrade' | 'coachHire' | 'telegram' | 'call' | null
TELEGRAM_AT_MS = 300_000                                    // FR-18
```

## `src/features/onboarding/callsign.ts`

```ts
validateCallsign(text, stopwords): { ok: true } | { ok: false; error: 'empty'|'tooShort'|'tooLong'|'chars'|'stopword' }
gendered(template: string, g: 'm'|'f'): string             // «{m:встиг|f:встигла}» → форма
```

Помилки → тексти: `empty` o3.err2, `tooShort` o3.err5, `tooLong` o3.err1, `chars` і `stopword` o3.err4.

## Стор (`src/features/conveyor/store.ts`)

| Дія | Що робить |
| --- | --- |
| `tick(now)` | + `playtimeMs`; «Пташка» як тимчасовий ефект; − `birdLeftMs` |
| `actSign(now)` | 8-й виклик: + 8 × `tapValue`; повертає n (1–8), далі ігнорує |
| `onbComplete(step, extra?)` | `complete` + позачерговий запис (009 `saveNow`) |
| `stamp()` | крок 5: `birdLeftMs` = `onboardingBirdMin` × 60 000 |
| `answerTg1(choiceId, now)` | ефект `slow` з телеграми № 1, `tg1` |
| `claimArchive()` | + `archiveBonusMin` × `baseIncomePerMin`, один раз |

## Екрани

`TitleScreen`, `IntroScreen`, `CallsignScreen` (+ `CallsignSheet`), `FirstActScreen` — проп `store`; `MainScreen` показує `Coach`, `ClerkFirst`, `TelegramDetail`, `TelegramResult`, `CallOverlay` за `ready(...)`.
