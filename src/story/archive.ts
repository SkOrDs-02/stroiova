// Таблиці Археолога (014 FR-16, FR-17): які аркуші видаються зараз. Чистий домен.
import archiveJson from '../../content/archive.json';

import type { Sheet, SheetSource, StoryCtx, StoryState } from './types';

export const SHEETS = (archiveJson as unknown as { sheets: Sheet[] }).sheets;

export const sheetById = (id: string): Sheet | undefined => SHEETS.find((s) => s.id === id);

export interface Grant {
  sheet: Sheet;
  source: SheetSource;
}

/**
 * Аркуші, які мають бути в гравця на мить `nowMs`. Джерела (таблиця «Аркуші й джерела»): подарунок Ліни (nth на рівні), підсумкова рівня,
 * конвертація Р5, «Переїзд» (017: `ctx.moves`; без нього - перший подарунок рівня, AC-12). Аркуші пройдених рівнів,
 * яких не видано, видаються разом (наздоганяння, `catch_up`, FR-29).
 */
export function grantSheets(st: StoryState, ctx: StoryCtx, nowMs: number, sheets: readonly Sheet[] = SHEETS): { st: StoryState; grants: Grant[] } {
  const grants: Grant[] = [];
  for (const sh of sheets) {
    if (st.sheets[sh.id] != null) continue;
    const src = sh.source;
    let source: SheetSource | null = null;
    if (sh.level < ctx.level) source = 'catch_up';
    else if (sh.level === ctx.level) {
      const gifts = st.counters.gifts[String(sh.level)] ?? 0;
      if (src.kind === 'gift' && gifts >= src.nth) source = 'gift';
      // з 017 аркуш слота «Переїзд» дає сам переїзд; без нього (контекст без `moves`) - перший подарунок рівня (014 AC-12)
      else if (src.kind === 'move' && (ctx.moves ? ctx.moves.includes(sh.level) : gifts >= 1)) source = 'move';
      else if (src.kind === 'boss' && (st.bosses.includes(src.level) || ctx.exitAllowed)) source = 'boss';
    }
    if (src.kind === 'conversion' && ctx.conversions >= src.k) source = 'conversion';
    if (source) grants.push({ sheet: sh, source });
  }
  if (!grants.length) return { st, grants };
  const owned = { ...st.sheets };
  for (const g of grants) owned[g.sheet.id] = nowMs;
  return { st: { ...st, sheets: owned }, grants };
}

/** Звідки аркуш (для слота «Не знайдено · …») */
export function sourceKey(sh: Sheet): { kind: Sheet['source']['kind']; level: number; nth?: number; k?: number } {
  const s = sh.source;
  return s.kind === 'conversion' ? { kind: s.kind, level: sh.level, k: s.k } : s.kind === 'gift' ? { kind: s.kind, level: s.level, nth: s.nth } : { kind: s.kind, level: s.level };
}
