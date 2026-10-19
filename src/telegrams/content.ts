// Пули телеграм (003 FR-7; 09 FR-35): вбудований контент, індекс за id, пул рівня.
import tgMain from '../../content/telegrams.json';
import tgL12 from '../../content/tg/level1-2.json';
import tgL3 from '../../content/tg/level3.json';

import type { Telegram } from './types';

// Р3 (011): до пачок (наступний PR) беремо лише окремі телеграми без `pack`; пачки лежать у файлі й чекають FR-17…FR-24
const L3_SINGLE = (tgL3.telegrams as unknown as (Telegram & { pack?: unknown })[]).filter((t) => !t.pack);
const ALL: Telegram[] = [...(tgMain as unknown as Telegram[]), ...(tgL12 as unknown as Telegram[]), ...L3_SINGLE];
const BY_ID = new Map(ALL.map((t) => [t.id, t]));

export const FIRST_TELEGRAM_ID = 'tg_0001_sergeants';
export const OVERRIDE_ID = 'tg_override_order';

export function telegram(id: string): Telegram | undefined {
  return BY_ID.get(id);
}

export function allTelegrams(): readonly Telegram[] {
  return ALL;
}

/** Звичайний мішок рівня: записи до цього рівня включно (Р2 бере й Р1), без сценарних, поза квотою, шаблонів і notice (FR-5, FR-7). */
export function poolFor(level: number): Telegram[] {
  return ALL.filter((t) => {
    const s = t.schedule ?? {};
    const kind = t.kind ?? 'standard';
    return (t.level ?? 1) <= level && kind === 'standard' && !s.scripted && !s.outsideQuota && !s.endless;
  });
}
