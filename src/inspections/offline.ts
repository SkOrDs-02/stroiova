// Рядки довідки повернення (004 FR-25): що сталося з перевіркою без гравця. Тексти — у features/inspections.
import type { EconomyParams } from '@/economy/core/types';

import type { InspectionOutcome } from './types';

const HOUR = 3_600_000;

export type OfflineInspLine =
  | { kind: 'passed'; remark: boolean }
  /** Лише після планової (рішення 28): ×3 ще leftMs (0 — уже скінчився) */
  | { kind: 'mult'; mult: number; leftMs: number }
  | { kind: 'failed'; factor: number; hours: number };

export function offlineLines(last: InspectionOutcome | null, p: EconomyParams, backAtMs: number): OfflineInspLine[] {
  if (!last || !last.offline || last.seen) return [];
  if (!last.passed) return [{ kind: 'failed', factor: p.inspFailMult, hours: p.inspFailHours }];
  const lines: OfflineInspLine[] = [{ kind: 'passed', remark: last.remark }];
  if (last.trigger === 'scheduled') {
    lines.push({ kind: 'mult', mult: p.inspMult, leftMs: Math.max(0, last.arrMs + p.inspHours * HOUR - backAtMs) });
  }
  return lines;
}
