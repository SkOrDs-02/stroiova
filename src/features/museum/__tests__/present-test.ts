// 007: підписи музею - рядок шторки множників (AC-9), групи курйозів за днями (FR-22), флейвор з позивним.
import { journal } from '@/museum/journals';
import { grant, newMuseum } from '@/museum/museum';
import type { MuseumState } from '@/museum/types';
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import { onboardingDone } from '@/save/migrations';
import { newTelegrams } from '@/telegrams/schedule';

import { curioGroups, flavorOf, multRow, slots } from '../present';

const D = (day: number, h = 12) => new Date(2026, 9, day, h).getTime();

describe('музей: підписи', () => {
  test('AC-9: рядок «Музей журналів» - «3 з 8», перелік цілей бонусів, «окремо»', () => {
    const g = grant(newMuseum(), newGame(bundledConfig, D(9)), bundledConfig, [1, 2, 3], D(9), 'digitization');
    const row = multRow(g.ms);
    expect(row.count).toBe('3 з 8');
    expect(row.note).toBe('окремо');
    expect(row.targets).toEqual(['+5% до швидкості Стройової частини', '+5% до місткості сховища офлайну', '+10% паперу з будь-якого джерела']);
  });

  test('фільтр категорії показує лише знайдені журнали цієї категорії; «Усі» - 8 слотів', () => {
    const g = grant(newMuseum(), newGame(bundledConfig, D(9)), bundledConfig, [1, 2, 5], D(9), 'digitization');
    expect(slots(g.ms, 'all')).toHaveLength(8);
    expect(slots(g.ms, 'personnel').map((x) => x.no)).toEqual([5]);
    expect(slots(g.ms, 'property').map((x) => x.no)).toEqual([1, 2]);
    expect(slots(newMuseum(), 'property')).toEqual([]);
  });

  test('флейвор № 5 підставляє позивний гравця', () => {
    const o = { ...onboardingDone(), callsign: { type: 'custom' as const, text: 'Ексель' }, gender: 'f' as const };
    expect(flavorOf(journal(5)!, o)).toBe("Арк. 47: позивний Ексель, навички «з комп'ютерами».");
  });

  test('FR-22: групи «Сьогодні · дата», «Учора · дата», далі дата; всередині нові зверху за номером', () => {
    const tg = { ...newTelegrams(bundledConfig.params, 'x'), inbox: [] };
    const race = (n: number, at: number) => ({
      seq: n,
      kind: 'gift' as const,
      atMs: at,
      gift: { raceId: `race_000${n}`, raceNo: n, type: 'drone' as const, level: 1, steps: [{ unit: 'akty' as const, sec: 60 }], stepsDone: 0, stepsTotal: 1, marginSec: 60 },
    });
    const ms: MuseumState = { ...newMuseum(), curioSeq: 3, curios: [race(1, D(7)), race(2, D(8, 9)), race(3, D(9, 10))] };
    const groups = curioGroups(ms, tg, null, D(9, 18));
    expect(groups.map((g) => g.day)).toEqual(['Сьогодні · 09.10.2026', 'Учора · 08.10.2026', '07.10.2026']);
    expect(groups.map((g) => g.items.map((i) => i.entry.seq))).toEqual([[3], [2], [1]]);
    expect(groups[0]!.items[0]!.num).toBe('АКТ № 3 · 10:00');
  });
});
