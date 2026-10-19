// 010 FR-26: лічильники перевірок і дронів рахуються з доменних подій.
import type { DomainEvent } from '@/economy/game/types';

import { newStats, statsFromEvents } from '../stats';

const fin = (result: 'passed' | 'failed'): DomainEvent => ({ type: 'inspectionFinish', id: 'i', kind: 'regular', attempt: 1, mechDone: null, exitUnlocked: false, result, itemsDone: 1, itemsTotal: 1, offline: false, secFromStart: 1 });
const race = (giftType: 'drone' | 'shovel' | 'generator', result: 'success' | 'fail'): DomainEvent => ({ type: 'raceFinish', id: 'r', giftType, result, marginSec: 0, speedups: 0, offline: false });

describe('лічильники особової справи', () => {
  test('перевірки: усі й пройдені', () => {
    const s = statsFromEvents(newStats(), [fin('passed'), fin('failed'), fin('passed')]);
    expect(s).toEqual({ inspTotal: 3, inspPassed: 2, drones: 0 });
  });

  test('дрони: лише виграна гонка з дроном; лопати, генератор і програш не рахуються', () => {
    const s = statsFromEvents(newStats(), [race('drone', 'success'), race('drone', 'fail'), race('shovel', 'success'), race('generator', 'success'), race('drone', 'success')]);
    expect(s.drones).toBe(2);
  });

  test('без подій стан той самий об’єкт', () => {
    const s = newStats();
    expect(statsFromEvents(s, [])).toBe(s);
  });
});
