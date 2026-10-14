// 009 AC-7, AC-8; FR-9…FR-11. Фікстурні міграції 1 → 2 → 3 до появи справжніх.
import { MIGRATIONS, onboardingDone } from '../migrations';
import { KEY_BAK1, KEY_SAVE, loadSave, serialize, type SaveDraft } from '../repository';
import { memoryStorage } from '../storage';
import { draft } from '../test-saves';

// схема 1 «у минулому»: гра без effects і з полем `sigs` замість economy.signatures
function v1(): SaveDraft {
  const d = draft({ schemaVersion: 1, savedAt: 5000 }, { signatures: 42 });
  const { economy } = d.game;
  const { signatures, ...rest } = economy;
  return { ...d, game: { economy: rest, sigs: signatures } as never };
}

const migrations = {
  1: (g: unknown) => { const x = g as { economy: object; sigs: number }; return { economy: { ...x.economy, signatures: x.sigs } }; },
  2: (g: unknown) => ({ ...(g as object), effects: [], playtimeMs: 0, onboarding: onboardingDone() }),
};

describe('міграції', () => {
  test('AC-7: схема 1 → 3; перед міграцією знімок; стан «міграція»', () => {
    const kv = memoryStorage({ [KEY_SAVE]: serialize(v1()) });
    const onMigrating = jest.fn();
    const r = loadSave(kv, { current: 3, migrations, onMigrating });
    expect(onMigrating).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 1 });
    if (r.kind !== 'ok') return;
    expect(r.save.schemaVersion).toBe(3);
    expect(r.save.game.economy.signatures).toBe(42);
    expect(r.save.game.effects).toEqual([]);
    expect(JSON.parse(kv.getString(KEY_BAK1)!).schemaVersion).toBe(1);
    expect(JSON.parse(kv.getString(KEY_SAVE)!).schemaVersion).toBe(3);
  });

  test('AC-7: зламана міграція 2 → 3 — вихідний запис цілий, corrupt migration from 1 to 3', () => {
    const original = serialize(v1());
    const kv = memoryStorage({ [KEY_SAVE]: original });
    const broken = { ...migrations, 2: () => { throw new Error('boom'); } };
    const r = loadSave(kv, { current: 3, migrations: broken });
    expect(r).toMatchObject({ kind: 'corrupt', reason: 'migration', from: 1, to: 3 });
    expect(kv.getString(KEY_SAVE)).toBe(original);
  });

  test('AC-8: запис схеми 4 від 1.2.0 у застосунку зі схемою 3 → newer, сховище байт у байт те саме', () => {
    const d = draft({ schemaVersion: 4, appVersion: '1.2.0' });
    const kv = memoryStorage({ [KEY_SAVE]: serialize(d) });
    const before = JSON.stringify(kv.dump());
    expect(loadSave(kv, { current: 3, migrations })).toEqual({ kind: 'newer', schemaVersion: 4, appVersion: '1.2.0' });
    expect(JSON.stringify(kv.dump())).toBe(before);
  });

  test('AC-8: новіша схема з іншим конвертом (сума не сходиться) — так само newer, не corrupt', () => {
    const future = JSON.stringify({ schemaVersion: 5, appVersion: '2.0.0', envelope: 'new', checksum: 'deadbeef', data: {} });
    const kv = memoryStorage({ [KEY_SAVE]: future });
    expect(loadSave(kv, { current: 3, migrations })).toEqual({ kind: 'newer', schemaVersion: 5, appVersion: '2.0.0' });
    expect(kv.getString(KEY_SAVE)).toBe(future);
  });

  test('FR-4/FR-10: збій міграції на двох стартах поспіль — стара валідна копія не витісняється', () => {
    const kv = memoryStorage({ [KEY_SAVE]: serialize(v1()) });
    kv.set('save.bak1', 'older-valid-placeholder');
    const broken = { ...migrations, 2: () => { throw new Error('boom'); } };
    loadSave(kv, { current: 3, migrations: broken });
    const afterFirst = { b1: kv.getString(KEY_BAK1), b2: kv.getString('save.bak2') };
    loadSave(kv, { current: 3, migrations: broken });
    expect(kv.getString(KEY_BAK1)).toBe(afterFirst.b1);
    expect(kv.getString('save.bak2')).toBe('older-valid-placeholder');
  });
});

describe('справжні міграції', () => {
  test('1 → 2 (002): запис зрізу 001/009 — онбординг пройдено, ігровий час 0, стан економіки той самий', () => {
    // фікстура схеми 1: game без playtimeMs і onboarding
    const d = draft({ schemaVersion: 1, savedAt: 5000 }, { signatures: 777 });
    const { playtimeMs: _p, onboarding: _o, ...gameV1 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: gameV1 as never }) });
    const r = loadSave(kv, { current: 2, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 1 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.onboarding).toEqual(onboardingDone());
    expect(r.save.game.playtimeMs).toBe(0);
    expect(r.save.game.economy.signatures).toBe(777);
    expect(JSON.parse(kv.getString(KEY_BAK1)!).schemaVersion).toBe(1);
  });
});
