// 009 AC-7, AC-8; FR-9…FR-11. Фікстурні міграції 1 → 2 → 3 до появи справжніх.
import { digitizationV6, inspectionsV4, MIGRATIONS, onboardingDone, raceV5, telegramsV3 } from '../migrations';
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
  2: (g: unknown) => ({ ...(g as object), effects: [], playtimeMs: 0, onboarding: onboardingDone(), telegrams: telegramsV3(), inspections: inspectionsV4(0), race: raceV5(), digitization: digitizationV6(0) }),
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
  test('1 → 2 → 3 (002, 003): запис зрізу 001/009 — онбординг пройдено, ігровий час 0, телеграм немає, економіка та сама', () => {
    // фікстура схеми 1: game без playtimeMs, onboarding і telegrams
    const d = draft({ schemaVersion: 1, savedAt: 5000 }, { signatures: 777 });
    const { playtimeMs: _p, onboarding: _o, telegrams: _t, inspections: _i, race: _r, digitization: _d, ...gameV1 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: gameV1 as never }) });
    const r = loadSave(kv, { current: 6, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 1 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.onboarding).toEqual(onboardingDone());
    expect(r.save.game.playtimeMs).toBe(0);
    expect(r.save.game.economy.signatures).toBe(777);
    // онбординг пройдено: розклад телеграм стартує одразу (startMs = 0), вхідні порожні
    expect(r.save.game.telegrams).toEqual({ ...telegramsV3(), startMs: 0 });
    expect(JSON.parse(kv.getString(KEY_BAK1)!).schemaVersion).toBe(1);
  });

  test('2 → 3 (003): онбординг уже відповів на № 1 — вона в архіві з тим самим вибором', () => {
    const d = draft({ schemaVersion: 2, savedAt: 5000 });
    const { telegrams: _t, inspections: _i, race: _r, digitization: _d, ...gameV2 } = d.game;
    const onboarding = { ...gameV2.onboarding, step: 9, tg1: { choiceId: 'formal_reply', atPlayMs: 310_000 } };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV2, onboarding } as never }) });
    const r = loadSave(kv, { current: 6, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 2 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.telegrams.inbox).toEqual([expect.objectContaining({ id: 'tg_0001_sergeants', status: 'archive', choiceId: 'formal_reply' })]);
    expect(r.save.game.telegrams.startMs).toBe(0);
  });

  test('2 → 3: крок 8, № 1 прийшла без відповіді — вона в «Нових», розклад іде', () => {
    const d = draft({ schemaVersion: 2, savedAt: 5000 });
    const { telegrams: _t, inspections: _i, race: _r, digitization: _d, ...gameV2 } = d.game;
    const onboarding = { ...gameV2.onboarding, step: 8, tg1ReceivedAtPlayMs: 300_000, tg1: null };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV2, onboarding } as never }) });
    const r = loadSave(kv, { current: 6, migrations: MIGRATIONS });
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.save.game.telegrams.inbox).toEqual([expect.objectContaining({ id: 'tg_0001_sergeants', status: 'new' })]);
    expect(r.save.game.telegrams.startMs).toBe(0);
  });

  test('2 → 3: онбординг до кроку 8 — розклад чекає на № 1', () => {
    const d = draft({ schemaVersion: 2, savedAt: 5000 });
    const { telegrams: _t, inspections: _i, race: _r, digitization: _d, ...gameV2 } = d.game;
    const onboarding = { ...gameV2.onboarding, step: 6 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV2, onboarding } as never }) });
    const r = loadSave(kv, { current: 6, migrations: MIGRATIONS });
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.save.game.telegrams.startMs).toBeNull();
  });

  test('3 → 4 (004): перевірок ще не було — порожній стан, встановлення = старт розкладу телеграм', () => {
    const d = draft({ schemaVersion: 3, savedAt: 5000 });
    const { inspections: _i, race: _r, digitization: _d, ...gameV3 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV3, telegrams: { ...gameV3.telegrams, startMs: 4000 } } as never }) });
    const r = loadSave(kv, { current: 6, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 3 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.inspections).toEqual(inspectionsV4(4000));
    expect(r.save.game.inspections).toMatchObject({ nextNo: 1, active: null, nextArrMs: null, installMs: 4000 });
  });

  test('4 → 5 (005): гонок ще не було — порожній стан', () => {
    const d = draft({ schemaVersion: 4, savedAt: 5000 });
    const { race: _r, digitization: _d, ...gameV4 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: gameV4 as never }) });
    const r = loadSave(kv, { current: 6, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 4 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.race).toEqual(raceV5());
    expect(r.save.game.race).toMatchObject({ giftIdx: 0, active: null, lastRaceEndMs: null });
  });

  test('5 → 6 (006): цифровізацій ще не було — порожній стан, цикл від встановлення', () => {
    const d = draft({ schemaVersion: 5, savedAt: 5000 });
    const { digitization: _d, ...gameV5 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV5, inspections: { ...gameV5.inspections, installMs: 4000 } } as never }) });
    const r = loadSave(kv, { current: 6, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 5 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.digitization).toEqual(digitizationV6(4000));
    expect(r.save.game.digitization).toMatchObject({ total: 0, counts: {}, ceremony: null, howSeen: false, cycleStartMs: 4000 });
  });
});
