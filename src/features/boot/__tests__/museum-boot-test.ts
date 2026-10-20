// 016 M06: бонуси журналів виводяться з музею й перераховуються при завантаженні (збереження без нових полів economy.museum).
import { grant, newMuseum } from '@/museum/museum';
import { bundledConfig, withBundled } from '@/economy/config';
import { T0 } from '@/economy/test-fixtures';
import { MIGRATIONS } from '@/save/migrations';
import { KEY_SAVE, loadSave, serialize } from '@/save/repository';
import { CURRENT_SCHEMA } from '@/save/schema';
import { memoryStorage } from '@/save/storage';
import { draft } from '@/save/test-saves';

import { startGame } from '../useBoot';

jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000001' }));
jest.mock('@sentry/react-native', () => ({ captureMessage: jest.fn(), init: jest.fn(), wrap: (c: unknown) => c }));

describe('перерахунок бонусів музею при завантаженні', () => {
  test('збереження з журналами № 9-12, але з нейтральним economy.museum: після запуску діють бонуси й серія', () => {
    const d = draft({ savedAt: T0 });
    const owned = grant(newMuseum(), d.game.economy as never, bundledConfig, [9, 10, 11, 12], T0, 'digitization').ms;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, museum: owned } as never }) });
    const r = loadSave(kv, { current: CURRENT_SCHEMA, migrations: MIGRATIONS });
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.save.game.economy.museum.series).toBeUndefined();
    const store = startGame(kv, r.save, T0);
    const m = store.getState().state.museum;
    expect(m.unit.nakazy).toBeCloseTo(1.05, 10);
    expect(m.unit.kazna).toBeCloseTo(1.05, 10);
    expect(m.slowCut).toBeCloseTo(0.9, 10);
    expect(m.checklist).toBeCloseTo(0.9, 10);
    expect(m.series).toBeCloseTo(1.01, 10);
  });

  test('закріплений конфіг епохи Р2 (digitJournals без Р3 і Р4): журнали Р3/Р4 допоповнюються з вбудованого', () => {
    const pinned = { ...bundledConfig, version: 'econ-old', params: { ...bundledConfig.params, digitJournals: { '1': { '1': [1, 2, 3], '2': [4, 5] }, '2': { '1': [9], '2': [10], '3': [11] } } } };
    const cfg = withBundled(pinned);
    expect(cfg.params.digitJournals['3']).toEqual({ '1': [13], '2': [14], '4': [15] });
    expect(cfg.params.digitJournals['4']).toEqual({ '1': [17], '3': [18] });
    expect(cfg.params.digitJournals['2']).toEqual({ '1': [9], '2': [10], '3': [11] });
  });

  test('карта цифровізацій: Р2 - 1, 2, 3 (4-та не дає), Р3 - 1, 2, 4, Р4 - 1, 3 (016 FR-5, FR-7)', () => {
    const dj = bundledConfig.params.digitJournals;
    expect(Object.keys(dj['2']!).sort()).toEqual(['1', '2', '3']);
    expect(dj['2']!['4']).toBeUndefined();
    expect([dj['3']!['1'], dj['3']!['2'], dj['3']!['3'], dj['3']!['4']]).toEqual([[13], [14], undefined, [15]]);
    expect([dj['4']!['1'], dj['4']!['2'], dj['4']!['3']]).toEqual([[17], undefined, [18]]);
  });
});
