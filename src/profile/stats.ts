// Лічильники особової справи (010 FR-26): перевірки й дрони. Чиста функція над доменними подіями, без годинника й React.
import type { DomainEvent } from '@/economy/game/types';

export interface Stats {
  inspTotal: number;
  inspPassed: number;
  /** Дрони, що пройшли гонку й введені в роботу */
  drones: number;
}

export function newStats(): Stats {
  return { inspTotal: 0, inspPassed: 0, drones: 0 };
}

export function statsFromEvents(s: Stats, evs: readonly DomainEvent[]): Stats {
  let r = s;
  for (const e of evs) {
    if (e.type === 'inspectionFinish') r = { ...r, inspTotal: r.inspTotal + 1, inspPassed: r.inspPassed + (e.result === 'passed' ? 1 : 0) };
    if (e.type === 'raceFinish' && e.result === 'success' && e.giftType === 'drone') r = { ...r, drones: r.drones + 1 };
  }
  return r;
}
