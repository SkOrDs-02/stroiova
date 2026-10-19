// 009 AC-7, AC-8; FR-9…FR-11. Фікстурні міграції 1 → 2 → 3 до появи справжніх.
import { digitizationV6, inspectionsV4, MIGRATIONS, monetizationV8, museumV7, onboardingDone, raceV5, settingsV9, telegramsV3 } from '../migrations';
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
  2: (g: unknown) => ({ ...(g as object), effects: [], playtimeMs: 0, onboarding: onboardingDone(), telegrams: telegramsV3(), inspections: inspectionsV4(0), race: raceV5(), digitization: digitizationV6(0), museum: museumV7(), monetization: monetizationV8(), ...settingsV9() }),
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
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
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
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
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
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.save.game.telegrams.inbox).toEqual([expect.objectContaining({ id: 'tg_0001_sergeants', status: 'new' })]);
    expect(r.save.game.telegrams.startMs).toBe(0);
  });

  test('2 → 3: онбординг до кроку 8 — розклад чекає на № 1', () => {
    const d = draft({ schemaVersion: 2, savedAt: 5000 });
    const { telegrams: _t, inspections: _i, race: _r, digitization: _d, ...gameV2 } = d.game;
    const onboarding = { ...gameV2.onboarding, step: 6 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV2, onboarding } as never }) });
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.save.game.telegrams.startMs).toBeNull();
  });

  test('3 → 4 (004): перевірок ще не було — порожній стан, встановлення = старт розкладу телеграм', () => {
    const d = draft({ schemaVersion: 3, savedAt: 5000 });
    const { inspections: _i, race: _r, digitization: _d, museum: _m, monetization: _mo, ...gameV3 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV3, telegrams: { ...gameV3.telegrams, startMs: 4000 } } as never }) });
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 3 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.inspections).toEqual(inspectionsV4(4000));
    expect(r.save.game.inspections).toMatchObject({ nextNo: 1, active: null, nextArrMs: null, installMs: 4000 });
  });

  test('4 → 5 (005): гонок ще не було — порожній стан', () => {
    const d = draft({ schemaVersion: 4, savedAt: 5000 });
    const { race: _r, digitization: _d, museum: _m, monetization: _mo, ...gameV4 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: gameV4 as never }) });
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 4 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.race).toEqual(raceV5());
    expect(r.save.game.race).toMatchObject({ giftIdx: 0, active: null, lastRaceEndMs: null });
  });

  test('5 → 6 (006): цифровізацій ще не було — порожній стан, цикл від встановлення', () => {
    const d = draft({ schemaVersion: 5, savedAt: 5000 });
    const { digitization: _d, museum: _m, monetization: _mo, ...gameV5 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV5, inspections: { ...gameV5.inspections, installMs: 4000 } } as never }) });
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 5 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.digitization).toEqual(digitizationV6(4000));
    expect(r.save.game.digitization).toMatchObject({ total: 0, counts: {}, ceremony: null, howSeen: false, cycleStartMs: 4000 });
  });

  test('6 → 7 (007): музею й курйозів ще не було - порожній стан, решта запису цілі', () => {
    const d = draft({ schemaVersion: 6, savedAt: 5000 });
    const { museum: _m, monetization: _mo, ...gameV6 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: gameV6 as never }) });
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 6 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.museum).toEqual(museumV7());
    expect(r.save.game.museum).toEqual({ owned: [], reveal: [], curios: [], curioSeq: 0, curiosSeen: 0 });
    expect(r.save.game.digitization).toEqual(d.game.digitization);
  });

  test('7 → 8 (008): реклами й покупок ще не було - порожній стан; ефекти покупок з економіки стають кешем прав', () => {
    const d = draft({ schemaVersion: 7, savedAt: 5000 }, { hasNoAds: true, storageHours: 24 });
    const { monetization: _mo, ...gameV7 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: gameV7 as never }) });
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 7 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.monetization).toMatchObject({ rights: { no_ads: true, storage_24h: true, starter_pack: false }, starterGranted: false, offer: 'wait', pending: [], ads: { date: '', boost: 0, race: 0 } });
    expect(r.save.game.museum).toEqual(d.game.museum);
  });

  test('7 → 8 (008): набір, що вже діє в економіці (бак 12 год), позначає starterGranted і пропозицію як закриту', () => {
    const d = draft({ schemaVersion: 7, savedAt: 5000 }, { fuelCapacityMs: 12 * 3_600_000 });
    const { monetization: _mo, ...gameV7 } = d.game;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: gameV7 as never }) });
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.save.game.monetization).toMatchObject({ rights: { starter_pack: true, no_ads: false, storage_24h: false }, starterGranted: true, offer: 'done' });
  });

  test('8 → 9 (010): налаштування за замовчуванням, нічого не заплановано; наявні записи курйозів вважаються баченими', () => {
    const d = draft({ schemaVersion: 8, savedAt: 5000 });
    const { settings: _s, notifications: _n, stats: _st, ...gameV8 } = d.game;
    const museum = { owned: [], reveal: [], curios: [], curioSeq: 3 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV8, museum } as never }) });
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 8 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.settings).toEqual(settingsV9().settings);
    expect(r.save.game.settings).toMatchObject({ sound: true, haptics: true, analytics: true, pushPermission: 'not_asked', testUser: false });
    expect(r.save.game.notifications).toEqual({ planned: [], sent: { day: '', count: 0, fuel: 0 } });
    expect(r.save.game.museum).toMatchObject({ curioSeq: 3, curiosSeen: 3 });
    expect(r.save.game.stats).toEqual({ inspTotal: 0, inspPassed: 0, drones: 0 });
    expect(r.save.game.monetization).toEqual(d.game.monetization);
  });

  test('9 → 10 (011): прапорець виходу з рівня, звичайні перевірки з першою спробою, порожня «Нарада затягнулась»; лічильник на рівні лишається', () => {
    const d = draft({ schemaVersion: 9, savedAt: 5000 });
    const { levelExitAllowed: _l, ...digitV9 } = d.game.digitization;
    const { meeting: _m, ...tgV9 } = d.game.telegrams;
    const active = { id: 'insp_0002', no: 2, trigger: 'scheduled', boss: 'brigade_commission', level: 1, annMs: 1000, arrMs: 9000, items: [{ id: 'a', price: 1, done: false }], reason: null, remark: false, warned: true, modal: false };
    const last = { id: 'insp_0001', no: 1, trigger: 'scheduled', boss: 'brigade_commission', level: 1, arrMs: 500, passed: true, remark: false, items: [{ id: 'a', done: true }], reason: null, offline: false, seen: true };
    const digitization = { ...digitV9, counts: { '1': 3, '2': 2 }, total: 5 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, digitization, telegrams: tgV9, inspections: { ...d.game.inspections, active, last } } as never }) });
    const r = loadSave(kv, { current: 10, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 9 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.digitization).toMatchObject({ levelExitAllowed: false, counts: { '1': 3, '2': 2 }, total: 5 });
    expect(r.save.game.telegrams.meeting).toEqual({ lastDayKey: null, active: null });
    expect(r.save.game.inspections.active).toMatchObject({ kind: 'regular', attempt: 1, id: 'insp_0002' });
    expect(r.save.game.inspections.last).toMatchObject({ kind: 'regular', attempt: 1, exitUnlocked: false, passed: true });
    expect(r.save.game.settings).toEqual(d.game.settings);
  });
});
