// Рядки особової справи й меню (010 FR-26, FR-30): чисті функції над станом гри.
import { prestigeMult } from '@/economy/core';
import type { EconomyParams } from '@/economy/core';
import { ddmmyyyy } from '@/features/museum/present';
import { gendered } from '@/features/onboarding/callsign';
import type { Gender } from '@/features/onboarding/steps';
import { plural } from '@/features/telegrams/texts';
import type { DigitizationState } from '@/digitization/types';
import type { InboxItem } from '@/telegrams/types';
import type { Stats } from '@/profile/stats';

import { setT } from './texts';

export function profileRows(inp: { level: number; digit: DigitizationState; installMs: number; points: number; params: EconomyParams;
  /** Скільки цифровізацій веде з рівня: `levels[рівень].exitDigitizations` конфігу */
  exit: number | null; inbox: readonly InboxItem[]; stats: Stats; gender: Gender | null }) {
  const pf = setT.pf;
  const closed = inp.inbox.filter((i) => i.status === 'archive' || i.status === 'drawer').length;
  const drawer = inp.inbox.filter((i) => i.status === 'drawer').length;
  const pct = Math.round((prestigeMult(inp.points, inp.params) - 1) * 100);
  return {
    form: inp.gender === 'f' ? pf.formF : pf.formM,
    level: `${inp.level} · ${pf.levels[inp.level - 1] ?? ''}`,
    digitizations: `${inp.digit.counts[String(inp.level)] ?? 0}${inp.exit != null ? ` з ${inp.exit}` : ''}`,
    arrival: ddmmyyyy(inp.installMs),
    points: String(Math.floor(inp.points)),
    pointsNote: inp.points > 0 ? pf.pointsNote(`+${pct}%`) : pf.pointsNone,
    telegrams: String(closed),
    telegramsNote: pf.telegramsNote(drawer),
    inspections: inp.stats.inspTotal > 0 ? pf.inspections(inp.stats.inspPassed, inp.stats.inspTotal) : '-',
    inspectionsLabel: inp.stats.inspTotal > 0 ? pf.inspectionsLabel : pf.inspectionsNone,
    drones: String(inp.stats.drones),
    dronesLabel: plural(inp.stats.drones, 'дрон введено', 'дрони введено', 'дронів введено'),
  };
}

/** Рядок щоденника у формі гравця: шаблон {m:…|f:…} (FR-26). */
export const diaryLine = (text: string, g: Gender | null) => gendered(text, g);
