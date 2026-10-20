// Грамоти у сторі (016): доменні події → лічильники → видача; черга тостів. Стору не імпортує (лише типи станів).
import { applyFacts, count } from '@/awards/awards';
import { award } from '@/awards/content';
import { factsOf, levelId } from '@/awards/facts';
import type { AwardCtx, AwardsState, Fact, Grant } from '@/awards/types';
import { itemsFor } from '@/economy/game/state';
import { shareTenths, zpzInfo } from '@/economy/game/income';
import type { DomainEvent, EconomyConfig, EconomyState, Effect } from '@/economy/game/types';
import type { InspectionState } from '@/inspections/types';
import type { MuseumState } from '@/museum/types';
import type { RaceState } from '@/race/types';

export interface AwardsHost {
  awards: AwardsState;
  awardQueue: Grant[];
  events: DomainEvent[];
  state: EconomyState;
  cfg: EconomyConfig;
  effects: readonly Effect[];
  museum: MuseumState;
  lastMs: number;
  inspections: InspectionState;
  race: RaceState;
}

export function awardCtx(g: Pick<AwardsHost, 'state' | 'cfg' | 'effects' | 'museum' | 'lastMs'>): AwardCtx {
  const it = itemsFor(g.state, g.cfg);
  return {
    levelId: levelId(g.state.level),
    // частка рахується з десятих відсотка вниз, як показ і `zpz_level` (012)
    zpzSharePct: g.state.level >= 4 ? shareTenths(zpzInfo(g.state, g.cfg, g.lastMs, g.effects).share) / 10 : 0,
    curioEntries: g.museum.curios.length,
    unitsWithClerks: g.state.streamClerks.filter(Boolean).length + g.state.stageClerks.filter(Boolean).length,
    unitsTotal: it.streams.length + it.stages.length,
  };
}

/** Нові події з останнього знімка: `events` обрізається до 40, тож порівнюємо за посиланням на останню відому */
export function newEvents(prev: readonly DomainEvent[], next: readonly DomainEvent[]): DomainEvent[] {
  if (next === prev || !next.length) return [];
  const last = prev.at(-1);
  const i = last ? next.lastIndexOf(last) : -1;
  return i < 0 ? [...next] : next.slice(i + 1);
}

export function factsFrom(g: Pick<AwardsHost, 'inspections' | 'race'>, evs: readonly DomainEvent[]): Fact[] {
  return factsOf(evs, {
    inspAt: (id) => (g.inspections.last?.id === id ? g.inspections.last.arrMs : undefined),
    raceAt: (id) => (g.race.last?.id === id ? g.race.last.endMs : undefined),
  });
}

/** Застосувати факти: оновлений стан, черга тостів і події `award_unlock`; null - нічого не змінилось */
export function run(g: AwardsHost, facts: readonly Fact[], atMs: number, retro = false): Pick<AwardsHost, 'awards' | 'awardQueue' | 'events'> | null {
  const r = applyFacts(g.awards, facts, awardCtx(g), atMs, { retro });
  if (r.s === g.awards) return null;
  if (!r.grants.length) return { awards: r.s, awardQueue: g.awardQueue, events: g.events };
  return { awards: r.s, awardQueue: [...g.awardQueue, ...r.grants], events: [...g.events, ...unlockEvents(count(g.awards), r.grants)].slice(-40) };
}

/** `award_unlock` на кожну видачу, зокрема заднім числом (is_retroactive = true) */
export function unlockEvents(ownedBefore: number, grants: readonly Grant[]): DomainEvent[] {
  let owned = ownedBefore;
  return grants.map((gr) => {
    const a = award(gr.id)!;
    owned += 1;
    return { type: 'awardUnlock', awardId: a.id, category: a.category, awardType: a.type, isHidden: a.hidden, awardsOwnedAfter: owned, isRetroactive: gr.retro, isResolvedOffline: gr.offline, isMirrored: a.mirror.enabled };
  });
}

/** Тости: до 2 грамот по одному, решта згорнуто (FR-33); заднім числом - один тост (FR-23) */
export type AwardToast = { kind: 'award'; id: string } | { kind: 'awardMore'; count: number } | { kind: 'awardRetro'; count: number };

export function toastsOf(queue: readonly Grant[], shown = 0): AwardToast[] {
  const retro = queue.filter((q) => q.retro);
  const live = queue.filter((q) => !q.retro);
  // `shown` - грамоти, чиї тости вже на екрані чи в черзі: ліміт 2 рахується разом з ними (FR-33)
  const slots = Math.max(0, 2 - shown);
  const out: AwardToast[] = live.slice(0, slots).map((q) => ({ kind: 'award', id: q.id }));
  if (live.length > slots) out.push({ kind: 'awardMore', count: live.length - slots });
  if (retro.length) out.push({ kind: 'awardRetro', count: retro.length });
  return out;
}
