// Рядки довідки повернення (004 FR-25): що сталося з перевіркою без гравця. Тексти — у features/inspections.
import type { EconomyParams } from '@/economy/core/types';

import type { InspectionOutcome } from './types';

const HOUR = 3_600_000;

export type OfflineInspLine =
  | { kind: 'passed'; remark: boolean; final: boolean }
  /** Лише після планової, поки ×3 діє (рішення 28) */
  | { kind: 'mult'; mult: number; leftMs: number }
  | { kind: 'failed'; factor: number; hours: number; final: boolean; retryH: number };

export function offlineLines(last: InspectionOutcome | null, p: EconomyParams, backAtMs: number): OfflineInspLine[] {
  if (!last || !last.offline || last.seen) return [];
  if (!last.passed) return [{ kind: 'failed', factor: p.inspFailMult, hours: p.inspFailHours, final: last.kind === 'final', retryH: p.boss.retryH }];
  const lines: OfflineInspLine[] = [{ kind: 'passed', remark: last.remark, final: last.kind === 'final' }];
  // ×3 ще діє — лише після планової (рішення 28); коли вже скінчився, рядка немає
  const leftMs = last.arrMs + p.inspHours * HOUR - backAtMs;
  if (last.trigger === 'scheduled' && leftMs > 0) lines.push({ kind: 'mult', mult: p.inspMult, leftMs });
  return lines;
}
