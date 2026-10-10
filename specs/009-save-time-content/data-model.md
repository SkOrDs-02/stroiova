# Модель даних: 009 (етап 1)

## MMKV-ключі

| Ключ | Що | Пише |
| --- | --- | --- |
| `save` | `SaveFile` (JSON) | кожні 5 с, фон, `saveNow()` |
| `save.bak1`, `save.bak2` | знімки `SaveFile`, bak1 новіший | початок сесії, перед міграцією |
| `install_id` | UUID v4 | перший запуск; ніколи не перезаписується |

## SaveFile

| Поле | Тип | Правила |
| --- | --- | --- |
| `schemaVersion` | ціле ≥ 1 | `CURRENT_SCHEMA` застосунку на момент запису |
| `savedAt` | мс UTC | годинник пристрою |
| `appVersion` | рядок | `expo-constants` `expoConfig.version` |
| `contentVersion` | рядок | `content-РРРР.ММ.ДД`; до 003 — дата пакета контенту з репо |
| `economyConfig` | `EconomyConfig` \| null | null до першої покупки рівня (FR-22) |
| `checksum` | рядок, 8 hex | FNV-1a від решти полів |
| `game` | `GameSave` | див. нижче |

## GameSave (schemaVersion 1)

| Поле | Тип | Правила |
| --- | --- | --- |
| `economy` | `EconomyState` (001) | усі абсолютні мітки в мс UTC |
| `effects` | `Effect[]` (001) | діючі ефекти з абсолютними `startMs`/`endMs`; прострочені прибираються на записі |

Нові поля (бали, музей, телеграми, мішки 009 FR-37) з'являються з міграціями у своїх фічах.

## Результат завантаження

`LoadResult` = `{ kind: 'empty' }` (перший запуск) | `{ kind: 'ok', save, migratedFrom? }` | `{ kind: 'corrupt', reason, backup: SaveFile | null }` | `{ kind: 'newer', schemaVersion, appVersion }`.

`reason` — `parse` | `checksum` | `schema` | `migration`; іде в звіт Sentry (FR-8) і `app_error_log` (етап 5).

## Час повернення

`Absence` = `{ deltaMs, clockBack: boolean }`; при `clockBack` стан і ефекти зсунуто на `deltaMs` (FR-14), офлайн не рахується.
