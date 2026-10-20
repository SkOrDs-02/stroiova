// Пули телеграм (003 FR-7; 09 FR-35): вбудований контент, індекс за id, пул рівня.
import tgMain from '../../content/telegrams.json';
import tgL12 from '../../content/tg/level1-2.json';
import tgL3 from '../../content/tg/level3.json';
import tgL4 from '../../content/tg/level4.json';
import tgL5 from '../../content/tg/level5.json';

import type { Telegram } from './types';

// Р3 (011): окремі телеграми та телеграми пачок; пачки не входять у звичайний мішок (FR-18), їх видає `packs.ts`. Р4 (012): окремі телеграми, без пачок
const ALL: Telegram[] = [...(tgMain as unknown as Telegram[]), ...(tgL12 as unknown as Telegram[]), ...(tgL3.telegrams as unknown as Telegram[]), ...(tgL4 as unknown as Telegram[]), ...(tgL5 as unknown as Telegram[])];

export interface PackSummaryText {
  reply?: string;
  result?: string;
  note?: string;
}

/** Пачка Р3 з content/tg/level3.json (011 «Модель даних пачки») */
export interface PackDef {
  id: string;
  order: number;
  packDetail: string;
  telegrams: string[];
  summary: Partial<Record<'diligent' | 'formal_reply' | 'drawer', PackSummaryText>>;
}

const PACKS: PackDef[] = tgL3.packs as unknown as PackDef[];
const PACK_BY_ID = new Map(PACKS.map((p) => [p.id, p]));

export function allPacks(): readonly PackDef[] {
  return PACKS;
}

export function packDef(id: string): PackDef | undefined {
  return PACK_BY_ID.get(id);
}
const BY_ID = new Map(ALL.map((t) => [t.id, t]));

export const FIRST_TELEGRAM_ID = 'tg_0001_sergeants';
export const OVERRIDE_ID = 'tg_override_order';

export function telegram(id: string): Telegram | undefined {
  return BY_ID.get(id);
}

export function allTelegrams(): readonly Telegram[] {
  return ALL;
}

/**
 * Звичайний мішок рівня: записи до цього рівня включно (Р2 бере й Р1), без сценарних, поза квотою, шаблонів і notice (FR-5, FR-7).
 * Телеграми пачок у мішок не входять; на Р3 і Р4 окрема телеграма дня - лише з телеграм свого рівня (011 FR-18, рішення 99; 012 FR-25).
 */
export function poolFor(level: number): Telegram[] {
  return ALL.filter((t) => {
    const s = t.schedule ?? {};
    const kind = t.kind ?? 'standard';
    const lv = t.level ?? 1;
    if (t.pack) return false;
    // Р3-Р5 беруть лише телеграми свого рівня (011 рішення 99; 012 FR-25; 013 FR-14)
    if (level >= 3 && lv !== level) return false;
    return lv <= level && kind === 'standard' && !s.scripted && !s.outsideQuota && !s.endless;
  });
}
