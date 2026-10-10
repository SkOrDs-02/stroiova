// Звіт про пошкоджене збереження (009 FR-8, ВП-9): коди й розміри, без тіла запису й позивного.
import * as Sentry from '@sentry/react-native';

import type { CorruptReason } from './repository';

export function reportCorruptSave(info: { reason: CorruptReason; schemaVersion: number | null; sizeBytes: number; hasBackup: boolean }): void {
  Sentry.captureMessage('save_corrupt', {
    level: 'error',
    tags: {
      error_code: info.reason,
      schema_version: String(info.schemaVersion ?? 'unknown'),
      has_backup: String(info.hasBackup),
    },
    extra: { size_bytes: info.sizeBytes },
  });
}
