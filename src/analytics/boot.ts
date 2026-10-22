// Події аналітики до створення стору: збій збереження на запуску (`app_error_log`). Деталі й стек - у Sentry (`reportCorruptSave`), сюди лише код.
import type { EventProps } from './plan.generated';

/** Причина пошкодження збереження (`CorruptReason` у `save/repository`) */
export type SaveFailure = { reason: 'parse' | 'checksum' | 'schema' | 'migration'; from?: number; to?: number };

/** `app_error_log` після вибору гравця на save-error: відновлено з копії (`backup_slot`) чи почато заново (`defaults`) */
export function saveErrorEvent(c: SaveFailure, recovery: 'backup_slot' | 'defaults'): { name: 'app_error_log'; props: EventProps['app_error_log'] } {
  const migration = c.reason === 'migration';
  return {
    name: 'app_error_log',
    props: {
      source: migration ? 'save_migration' : 'save_load',
      error_code: c.reason,
      is_recovered: recovery === 'backup_slot',
      recovery,
      ...(migration && c.from != null && c.to != null ? { save_schema_from: c.from, save_schema_to: c.to } : {}),
    },
  };
}
