// Дублі у сторі (013 FR-23…FR-29): прийняття «Дублювати на папері», закриття Дубля. Чисті функції над знімком стору; повертають патч чи null.
import { accept, closeIfDue, dubConfig, type DubState } from '@/dub/dub';
import { newCycle } from '@/economy/game/state';
import type { DomainEvent, EconomyConfig, EconomyState, StoredEffect } from '@/economy/game/types';
import type { DigitizationState } from '@/digitization/types';
import { nextArrival } from '@/inspections/schedule';
import type { InspectionState } from '@/inspections/types';
import { resetCycle } from '@/stack/stack';
import { roller } from '@/telegrams/rng';
import { deliverScripted, releaseKept } from '@/telegrams/schedule';
import type { TelegramState } from '@/telegrams/types';

import { completeStep, type FinaleHost } from './finale';

/** Сценарна № 113 «Про відновлення розсилки» приходить на `dub_start` Дубля 1 (content/tg/level5.json) */
const MAILING_RESUMED = 'tg_0113_mailing_resumed';

export interface DubHost extends FinaleHost {
  digit: DigitizationState;
  inspections: InspectionState;
  effects: StoredEffect[];
}

export type DubPatch = Partial<Pick<DubHost, 'dub' | 'state' | 'digit' | 'inspections' | 'telegrams' | 'effects' | 'finale' | 'events'>> & {
  /** Конфіг Дубля N (`dubConfig`): стор підставляє його замість поточного */
  cfg?: EconomyConfig;
  /** Рекорд Дубля побито (тост «Новий особистий рекорд») */
  record?: { value: number; previous: number };
};

/**
 * «Прийняти до виконання» (FR-23, FR-24): атомарно скидає рівень на Р1, підписи, рівні, діловодів, цифрові ланки, лічильники
 * цифровізацій і `levelExitAllowed`; лишає P_total, музей, курйози, щоденник, особову справу, покупки й репутацію.
 */
export function acceptDub(g: DubHost, base: EconomyConfig, now: number, tzOffsetMin: number): DubPatch | null {
  const a = accept(g.dub, now, g.state.lifetimeCycle);
  if (!a) return null;
  const cfg = dubConfig(base, a.d);
  const state: EconomyState = newCycle({ ...g.state, level: 1, digital: [] }, cfg);
  const digit: DigitizationState = { ...g.digit, counts: {}, levelExitAllowed: false, ceremony: null, cycleStartMs: now, levelStartMs: now, lastCycleMs: null, stack: resetCycle(g.digit.stack) };
  // перевірка, що йшла на Р5, не переходить у Дубль: наступну планову ставимо від цієї миті
  let inspections = g.inspections;
  if (inspections.active) {
    const rng = roller(inspections.rng);
    inspections = { ...inspections, active: null, nextArrMs: nextArrival(now, cfg.params, tzOffsetMin, () => rng.next()), rng: rng.state };
  }
  // «Збій СЕДО» і його сповільнення прив'язані до цифрових ланок, яких тепер немає
  const effects = g.effects.filter((e) => e.source !== 'sedo_failure');
  let telegrams: TelegramState = releaseKept({ ...g.telegrams, sedo: { ...g.telegrams.sedo, active: null } }, now);
  const events: DomainEvent[] = [];
  let finale = g.finale;
  let acc = g.events;
  // Дубль 1 закриває крок `endless_offer` і відновлює розсилку: № 113
  const fin = g.finale.done.endless_offer == null ? completeStep({ ...g, telegrams, state, dub: a.d }, 'endless_offer', now) : null;
  if (fin) {
    finale = fin.finale ?? finale;
    telegrams = fin.telegrams ?? telegrams;
    acc = fin.events ?? acc;
  }
  if (a.d.n === 1) {
    const d = deliverScripted(telegrams, MAILING_RESUMED, now);
    telegrams = d.tg;
    events.push(...d.events);
  }
  events.push({
    type: 'dubStart',
    dubNumber: a.d.n,
    modifier: a.d.modifier!,
    pointsTotal: g.state.prestigePoints,
    secSinceFinale: g.finale.yMs == null ? 0 : Math.max(0, Math.round((now - g.finale.yMs) / 1000)),
    secSinceOffer: Math.max(0, Math.round((now - (g.dub.offer?.atMs ?? now)) / 1000)),
  });
  if (a.record) events.push({ type: 'personalRecordUpdate', recordType: 'dub', value: a.record.value, previous: a.record.previous });
  return { dub: a.d, cfg, state, digit, inspections, telegrams, effects, finale, events: [...acc, ...events].slice(-40), ...(a.record ? { record: a.record } : {}) };
}

/** Шоста конвертація в Дублі закриває його (FR-26): акт «Дубль N закрито» і пропозиція Дубля N+1 */
export function closeDubIfDue(g: Pick<DubHost, 'dub' | 'state' | 'cfg' | 'lastMs' | 'events'>): DubPatch | null {
  const d = closeIfDue(g.dub, g.state.digital.length, g.cfg.params.convert.order.length, g.lastMs);
  if (d === g.dub) return null;
  return { dub: d, events: [...g.events, { type: 'dubClosed' as const, dubNumber: d.closed!.n, cycleSec: Math.round(d.closed!.cycleMs / 1000) }].slice(-40) };
}
