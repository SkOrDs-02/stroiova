// 009 AC-7, AC-8; FR-9…FR-11. Фікстурні міграції 1 → 2 → 3 до появи справжніх.
import { digitizationV6, inspectionsV4, MIGRATIONS, monetizationV8, museumV7, onboardingDone, raceV5, settingsV9, telegramsV3 } from '../migrations';
import { KEY_BAK1, KEY_SAVE, loadSave, serialize, type SaveDraft } from '../repository';
import { memoryStorage } from '../storage';
import { newAwards } from '@/awards/awards';
import { newFinale } from '@/finale/finale';
import { newStory } from '@/story/engine';
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
  2: (g: unknown) => ({ ...(g as object), effects: [], playtimeMs: 0, onboarding: onboardingDone(), telegrams: telegramsV3(), inspections: inspectionsV4(0), race: raceV5(), digitization: digitizationV6(0), museum: museumV7(), monetization: monetizationV8(), ...settingsV9(), story: newStory(), awards: newAwards(), finale: newFinale() }),
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

  test('10 → 11 (011 етап 2): пачок ще не було - порожній стан доби й лічильника; вхідні лишаються', () => {
    const d = draft({ schemaVersion: 10, savedAt: 5000 });
    const { packs: _p, ...tgV10 } = d.game.telegrams;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, telegrams: tgV10 } as never }) });
    const r = loadSave(kv, { current: 11, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 10 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.telegrams.packs).toEqual({ day: null, seq: 0 });
    expect(r.save.game.telegrams.inbox).toEqual(d.game.telegrams.inbox);
  });

  test('схема 11: телеграма пачки, зведена відповідь і запис курйозу пачки проходять збереження без втрат', () => {
    const d = draft({ schemaVersion: 11, savedAt: 5000 });
    const item = { uid: 'tg_0049_fewer_meetings#1', id: 'tg_0049_fewer_meetings', kind: 'telegram', receivedAt: 100, status: 'archive', choiceId: 'diligent', answeredAt: 200, pack: { id: 'pack_01', no: 1, index: 1, summary: 'diligent' } };
    const telegrams = { ...d.game.telegrams, inbox: [item], packs: { day: '2025-10-11', seq: 1 } };
    const curio = { seq: 1, kind: 'pack', atMs: 300, status: 'diligent', pack: { packId: 'pack_01', no: 1, kind: 'diligent', uids: [item.uid] } };
    const museum = { ...d.game.museum, curios: [curio], curioSeq: 1 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, telegrams, museum } as never }) });
    const r = loadSave(kv, { current: 11, migrations: MIGRATIONS });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.save.game.telegrams.inbox[0]).toMatchObject({ pack: { no: 1, summary: 'diligent' } });
    expect(r.save.game.museum.curios[0]).toMatchObject({ kind: 'pack', pack: { packId: 'pack_01' } });
  });

  test('11 → 12 (012 етап 2): порожній стос у цифровізації, «Доповідь тезово» без останньої доби; решта цілі', () => {
    const d = draft({ schemaVersion: 11, savedAt: 5000 });
    const { brief: _b, ...tgV11 } = d.game.telegrams;
    const { stack: _s, ...digitV11 } = d.game.digitization;
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, telegrams: tgV11, digitization: { ...digitV11, counts: { '3': 6 }, total: 9, levelExitAllowed: true } } as never }) });
    const r = loadSave(kv, { current: 12, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 11 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.telegrams.brief).toEqual({ lastDay: null });
    expect(r.save.game.digitization.stack).toEqual({ sessionStartMs: null, cm: 0, offlineCm: 0, reached: false });
    expect(r.save.game.digitization).toMatchObject({ counts: { '3': 6 }, total: 9, levelExitAllowed: true });
    expect(r.save.game.telegrams.inbox).toEqual(d.game.telegrams.inbox);
  });

  test('схема 12: стос, «Метр звітів» у курйозах і «Доповідь тезово» проходять збереження без втрат', () => {
    const d = draft({ schemaVersion: 12, savedAt: 5000 });
    const digitization = { ...d.game.digitization, stack: { sessionStartMs: 1000, cm: 64.5, offlineCm: 30.25, reached: true } };
    const telegrams = { ...d.game.telegrams, brief: { lastDay: 20300 } };
    const museum = { ...d.game.museum, curios: [{ seq: 1, kind: 'stack', atMs: 300, status: 'info', stack: { cm: 100 } }], curioSeq: 1 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, digitization, telegrams, museum } as never }) });
    const r = loadSave(kv, { current: 12, migrations: MIGRATIONS });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.save.game.digitization.stack).toEqual({ sessionStartMs: 1000, cm: 64.5, offlineCm: 30.25, reached: true });
    expect(r.save.game.telegrams.brief.lastDay).toBe(20300);
    expect(r.save.game.museum.curios[0]).toMatchObject({ kind: 'stack', stack: { cm: 100 } });
  });

  test('12 → 13 (013 етап 1): порожні цифрові ланки, початок рівня, «Збій СЕДО» без події; акт цифровізації отримує тривалість циклу', () => {
    const d = draft({ schemaVersion: 12, savedAt: 5000 });
    const { digital: _d, ...ecoV12 } = d.game.economy;
    const { sedo: _s, ...tgV12 } = d.game.telegrams;
    const { levelStartMs: _l, lastCycleMs: _c, ...digitV12 } = d.game.digitization;
    const ceremony = { no: 1, level: 3, levelCount: 1, atMs: 100, lifetime: 1, points: 40, pointsTotal: 40, multBefore: 1, multAfter: 1.8, journals: [], levelUp: false, step: 'result' };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, economy: ecoV12, telegrams: tgV12, digitization: { ...digitV12, cycleStartMs: 777, ceremony } } as never }) });
    const r = loadSave(kv, { current: 13, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 12 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.economy.digital).toEqual([]);
    expect(r.save.game.telegrams.sedo).toEqual({ lastDayKey: null, active: null });
    expect(r.save.game.digitization).toMatchObject({ levelStartMs: 777, lastCycleMs: null, ceremony: { cycleMs: 0, prevCycleMs: null } });
    expect(r.save.game.telegrams.inbox).toEqual(d.game.telegrams.inbox);
  });

  test('схема 13: цифрові ланки, «Збій СЕДО», тривалість циклу й комісія Р5 проходять збереження без втрат', () => {
    const d = draft({ schemaVersion: 13, savedAt: 5000 });
    const economy = { ...d.game.economy, level: 5, digital: ['kombat', 'stroy'] };
    const telegrams = { ...d.game.telegrams, sedo: { lastDayKey: '2025-10-10', active: { startMs: 1, endMs: 2, stageId: 'stroy' } } };
    const digitization = { ...d.game.digitization, levelStartMs: 50, lastCycleMs: 72_000_000 };
    const effects = [{ kind: 'factor', source: 'sedo_failure', value: 0.5, target: { type: 'stage', id: 'stroy' }, startMs: 1, endMs: 2 }];
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, economy, telegrams, digitization, effects } as never }) });
    const r = loadSave(kv, { current: 13, migrations: MIGRATIONS });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.save.game.economy.digital).toEqual(['kombat', 'stroy']);
    expect(r.save.game.telegrams.sedo.active).toMatchObject({ stageId: 'stroy' });
    expect(r.save.game.digitization).toMatchObject({ levelStartMs: 50, lastCycleMs: 72_000_000 });
    expect(r.save.game.effects[0]).toMatchObject({ source: 'sedo_failure' });
  });
  test('13 → 14 (014 етап 1): сюжет на Р3 - кроки Р1-Р2 закрито, щоденник порожній, прогрес на місці', () => {
    const d = draft({ schemaVersion: 13, savedAt: 5000 });
    const { story: _story, ...gameV13 } = d.game;
    const economy = { ...d.game.economy, level: 3 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV13, economy } as never }) });
    const r = loadSave(kv, { current: 14, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 13 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.story.skipped).toEqual(expect.arrayContaining(['st_who_writes_01', 'st_who_writes_02', 'st_archaeologist_01', 'st_ptashka_01']));
    expect(r.save.game.story.skipped).not.toContain('st_who_writes_04');
    expect(r.save.game.story).toMatchObject({ delivered: {}, fired: {}, dispatched: {}, diary: { got: [], lastDay: null } });
    expect(r.save.game.telegrams.inbox).toEqual(d.game.telegrams.inbox);
  });

  test('13 → 14: Р1 - нічого не закрито; Р4 - закриті кроки Р1-Р3, відкрите Р4', () => {
    const run = (level: number) => {
      const d = draft({ schemaVersion: 13, savedAt: 5000 });
      const { story: _story, ...gameV13 } = d.game;
      const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV13, economy: { ...d.game.economy, level } } as never }) });
      const r = loadSave(kv, { current: 14, migrations: MIGRATIONS });
      if (r.kind !== 'ok') throw new Error(r.kind);
      return r.save.game.story;
    };
    expect(run(1).skipped).toEqual([]);
    const l4 = run(4).skipped;
    expect(l4).toEqual(expect.arrayContaining(['st_who_writes_06', 'st_cat_01', 'st_kombat_leave_03']));
    expect(l4).not.toContain('st_who_writes_07');
    expect(l4).not.toContain('st_who_writes_12');
  });

  test('схема 14: доставлені кроки, лічильники, стани персонажів і щоденник проходять збереження без втрат', () => {
    const d = draft({ schemaVersion: 14, savedAt: 5000 });
    const story = {
      delivered: { st_ptashka_02: { at: 100, rev: 1, catchUp: false, away: true } },
      skipped: ['st_who_writes_01'],
      fired: { st_cat_01: { at: 50, away: false } },
      dispatched: { st_cat_01: 60 },
      counters: { wins: { 'drone:3': 1 }, gifts: { '2': 2 } },
      chars: { granit: 'granit_on_leave' },
      sheets: {},
      bosses: [],
      diary: { got: [{ id: 'di_l1_01', atMs: 70, day: 2 }], lastDay: '2025-10-11' },
    };
    const museum = { ...d.game.museum, curios: [{ seq: 1, kind: 'story', atMs: 1, status: 'info', story: { beatId: 'st_who_writes_04', from: 'stroy', title: 'Зведення', body: 'Текст' } }], curioSeq: 1 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, story, museum } as never }) });
    const r = loadSave(kv, { current: 14, migrations: MIGRATIONS });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.save.game.story).toEqual(story);
    expect(r.save.game.museum.curios[0]).toMatchObject({ kind: 'story', story: { beatId: 'st_who_writes_04' } });
  });
  test('14 → 15 (014 етап 2): аркуші Археолога й пройдені підсумкові порожні, решта сюжету на місці', () => {
    const d = draft({ schemaVersion: 14, savedAt: 5000 });
    const { sheets: _a, bosses: _b, ...storyV14 } = d.game.story;
    const story = { ...storyV14, skipped: ['st_who_writes_01'], diary: { got: [{ id: 'di_l1_01', atMs: 7, day: 2 }], lastDay: '2025-10-11' } };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, story } as never }) });
    const r = loadSave(kv, { current: 16, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 14 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.story).toMatchObject({ sheets: {}, bosses: [], skipped: ['st_who_writes_01'], diary: { lastDay: '2025-10-11' } });
  });

  test('15 → 16 (016 етап 2): грамоти з порожнім станом, решта запису на місці', () => {
    const d = draft({ schemaVersion: 15, savedAt: 5000 });
    const { awards: _a, ...gameV15 } = d.game;
    const story = { ...d.game.story, sheets: { ar_01: 100 }, bosses: [2] };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV15, story } as never }) });
    const r = loadSave(kv, { current: 16, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 15 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.awards).toEqual({ got: {}, counters: {}, sets: {}, seen: [], pendingPlatform: [], lastOrderNo: 0 });
    expect(r.save.game.story).toMatchObject({ sheets: { ar_01: 100 }, bosses: [2] });
  });

  test('16 → 17 (013 етап 2): фінал не почато, решта запису на місці (AC-22)', () => {
    const d = draft({ schemaVersion: 16, savedAt: 5000 });
    const { finale: _f, ...gameV16 } = d.game;
    const awards = { ...d.game.awards, counters: { digitizations: 4 } };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...gameV16, awards } as never }) });
    const r = loadSave(kv, { current: 17, migrations: MIGRATIONS });
    expect(r).toMatchObject({ kind: 'ok', migratedFrom: 16 });
    if (r.kind !== 'ok') return;
    expect(r.save.game.finale).toEqual({ startMs: null, done: {}, yMs: null, scriptNs: 0 });
    expect(r.save.game.awards.counters).toEqual({ digitizations: 4 });
  });

  test('схема 17: стан фіналу проходить збереження без втрат', () => {
    const d = draft({ schemaVersion: 17, savedAt: 5000 });
    const finale = { startMs: 100, done: { order: 110, script: 200 }, yMs: 200, scriptNs: 2 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, finale } as never }) });
    const r = loadSave(kv, { current: 17, migrations: MIGRATIONS });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.save.game.finale).toEqual(finale);
  });

  test('схема 16: грамоти, лічильники й номер наказу проходять збереження без втрат', () => {
    const d = draft({ schemaVersion: 16, savedAt: 5000 });
    const awards = { got: { aw_level_bryhada: { atMs: 4, orderNo: 1, seq: 1 } }, counters: { digitizations: 3 }, sets: { race_gift_types_won: ['drone'] }, seen: [], pendingPlatform: ['aw_level_bryhada'], lastOrderNo: 1 };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, awards } as never }) });
    const r = loadSave(kv, { current: 16, migrations: MIGRATIONS });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.save.game.awards).toEqual(awards);
  });

  test('схема 15: аркуші й підсумкові проходять збереження без втрат', () => {
    const d = draft({ schemaVersion: 15, savedAt: 5000 });
    const story = { ...d.game.story, sheets: { ar_01: 100, ar_02: 200 }, bosses: [2] };
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, story } as never }) });
    const r = loadSave(kv, { current: 16, migrations: MIGRATIONS });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.save.game.story).toMatchObject({ sheets: { ar_01: 100, ar_02: 200 }, bosses: [2] });
  });
});
