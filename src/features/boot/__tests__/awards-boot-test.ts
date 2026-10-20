// 016 FR-45: грамоти в записі - старий запис без поля дістає порожній стан, поточний переживає запис і читання; лічильники дають грамоту заднім числом.
import { newAwards } from '@/awards/awards';
import { T0 } from '@/economy/test-fixtures';
import { MIGRATIONS } from '@/save/migrations';
import { KEY_SAVE, loadSave, serialize } from '@/save/repository';
import { CURRENT_SCHEMA } from '@/save/schema';
import { memoryStorage } from '@/save/storage';
import { draft } from '@/save/test-saves';

import { draftOf, needsSaveNow, startGame } from '../useBoot';

jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000001' }));
jest.mock('@sentry/react-native', () => ({ captureMessage: jest.fn(), init: jest.fn(), wrap: (c: unknown) => c }));

const opts = { current: CURRENT_SCHEMA, migrations: MIGRATIONS };

describe('збереження грамот', () => {
  test('запис без поля awards завантажується з порожнім станом', () => {
    const d = draft({ savedAt: T0 });
    expect((d.game as { awards?: unknown }).awards).toBeUndefined();
    const kv = memoryStorage({ [KEY_SAVE]: serialize(d) });
    const r = loadSave(kv, opts);
    if (r.kind !== 'ok') throw new Error(r.kind);
    const store = startGame(kv, r.save, T0);
    expect(store.getState().awards).toEqual(newAwards());
    expect(store.getState().awardQueue).toEqual([]);
  });

  test('грамоти, лічильники й номер наказу переживають запис і читання', () => {
    const d = draft({ savedAt: T0 });
    const awards = { ...newAwards(), got: { aw_level_bryhada: { atMs: T0 - 5, orderNo: 1 } }, counters: { cat_sleep_taps: 3 }, sets: { race_gift_types_won: ['drone'] }, seen: ['aw_level_bryhada'], pendingPlatform: ['aw_level_bryhada'], lastOrderNo: 1 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, awards } as never }) });
    const r = loadSave(kv, opts);
    if (r.kind !== 'ok') throw new Error(r.kind);
    const store = startGame(kv, r.save, T0);
    expect(store.getState().awards).toEqual(awards);
    expect(draftOf(store)!.game.awards).toEqual(awards);
  });

  test('грамота, видана подією, пишеться одразу (FR-21)', () => {
    const d = draft({ savedAt: T0 });
    const kv = memoryStorage({ [KEY_SAVE]: serialize(d) });
    const r = loadSave(kv, opts);
    if (r.kind !== 'ok') throw new Error(r.kind);
    const store = startGame(kv, r.save, T0);
    const prev = store.getState();
    store.getState().awardsUi('cat_tap', { is_bonus: true });
    expect(needsSaveNow(store.getState(), prev)).toBe(true);
  });

  test('AC-20: лічильник із запису дає нову грамоту при запуску, один раз', () => {
    const d = draft({ savedAt: T0 });
    const awards = { ...newAwards(), counters: { tg_diligent: 120 } };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, awards } as never }) });
    const r = loadSave(kv, opts);
    if (r.kind !== 'ok') throw new Error(r.kind);
    const store = startGame(kv, r.save, T0);
    expect(store.getState().awardQueue).toEqual([{ id: 'aw_tg_diligent_25', atMs: expect.any(Number), retro: true, offline: false }]);
    expect(store.getState().awards.got.aw_tg_diligent_25!.retro).toBe(true);
  });
});
