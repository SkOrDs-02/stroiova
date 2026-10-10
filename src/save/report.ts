// Звіт про пошкоджене збереження (009 FR-8, ВП-9): коди й розміри, без тіла запису й позивного.
import * as Sentry from '@sentry/react-native';

import type { CorruptReason } from './repository';

/** Які перевірки FR-3 пройдено до збою: parse → checksum → schema (міграція — після суми). */
const CHECKS: Record<CorruptReason, string> = { parse: 'none', checksum: 'parse', schema: 'parse,checksum', migration: 'parse,checksum' };

export function reportCorruptSave(info: { reason: CorruptReason; schemaVersion: number | null; sizeChars: number; hasBackup: boolean; from?: number; to?: number }): void {
  Sentry.captureMessage('save_corrupt', {
    level: 'error',
    tags: {
      error_code: info.reason,
      schema_version: String(info.schemaVersion ?? 'unknown'),
      has_backup: String(info.hasBackup),
      checks_passed: CHECKS[info.reason],
      ...(info.from != null ? { schema_from: String(info.from), schema_to: String(info.to) } : {}),
    },
    extra: { size_chars: info.sizeChars },
  });
}
