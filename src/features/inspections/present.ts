// Підписи екранів перевірок (004): причина, пункти, рядки акта й довідки.
import { formatDuration } from '@/economy/format';
import type { EconomyParams } from '@/economy/core/types';
import { offlineLines } from '@/inspections/offline';
import type { ChecklistItem, InspectionOutcome } from '@/inspections/types';
import { telegram } from '@/telegrams/content';

import { inspT } from './texts';

export function reasonText(telegramId: string): string {
  const tel = telegram(telegramId);
  return inspT.reason(tel?.no ?? '', tel?.title ?? '');
}

export function itemTitle(id: string): string {
  return inspT.item[id]?.title ?? id;
}

/** Підпис пункту: з артборда, а для доданого з телеграми — «Додано після відписки на № N» (insp.added). */
export function itemMeta(it: Pick<ChecklistItem, 'id' | 'fromTelegram'>): string {
  if (it.fromTelegram) return inspT.added(telegram(it.fromTelegram)?.no ?? '');
  return inspT.item[it.id]?.meta ?? '';
}

/** Рядки акта (FR-22): пункт і значення; зауваження — на кеглі (№ 16). */
export function actRows(o: InspectionOutcome): { k: string; v: string; bad: boolean }[] {
  const rows = o.items.map((i) => {
    const x = inspT.item[i.id];
    return { k: x?.short ?? i.id, v: i.done ? (x?.ok ?? '') : (x?.no ?? inspT.notDone), bad: !i.done };
  });
  if (o.remark) rows.push({ k: inspT.item.font_check!.short, v: inspT.remarkV, bad: true });
  return rows;
}

/** Рядки довідки повернення (FR-25). */
export function offlineRows(last: InspectionOutcome | null, p: EconomyParams, backAtMs: number): { k: string; v: string; bad: boolean }[] {
  return offlineLines(last, p, backAtMs).map((l) => {
    if (l.kind === 'passed') return { k: inspT.offInsp, v: l.remark ? inspT.offRemark : inspT.offPassed, bad: false };
    if (l.kind === 'mult') return { k: inspT.offMult, v: l.leftMs > 0 ? inspT.offMultV(l.mult, formatDuration(l.leftMs / 1000)) : inspT.offMultOver(l.mult), bad: false };
    return { k: inspT.offFail, v: inspT.offFailV, bad: true };
  });
}
