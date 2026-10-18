// 006 у сторі: взаємодія з гонкою (005 AC-5) і перевіркою (004 AC-18), годинник назад, збереження церемонії (AC-11).
import { bundledConfig } from '@/economy/config';
import { newGame, itemsFor } from '@/economy/game/state';
import type { EconomyState } from '@/economy/game/types';
import { draftOf } from '@/features/boot/useBoot';
import { createConveyorStore } from '@/features/conveyor/store';
import { onSessionStart } from '@/inspections/lifecycle';
import { tick as tickRace } from '@/race/race';
import { KEY_SAVE, loadSave, writeSave } from '@/save/repository';
import { MIGRATIONS } from '@/save/migrations';
import { CURRENT_SCHEMA } from '@/save/schema';
import { memoryStorage } from '@/save/storage';

const cfg = bundledConfig;
const local = (h: number, m = 0, day = 0) => new Date(2025, 9, 10 + day, h, m).getTime();
const L = (points: number) => points * points * 75_000;

function game(patch: Partial<EconomyState> = {}, counts: Record<string, number> = { '1': 2 }) {
  const store = createConveyorStore(local(8, 30, 1), cfg);
  store.setState({
    lastMs: local(8, 30, 1),
    state: { ...newGame(cfg, 0), streamLevels: [120, 120, 120, 120], stageLevels: [120, 120, 120], lifetimeCycle: L(40), prestigePoints: 70, signatures: 1e9, ...patch },
    digit: { ...store.getState().digit, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) },
  });
  return store;
}

describe('цифровізація й активні події', () => {
  test('005 AC-5: гонка Р1 лишається з 4 кроків під час переходу на Р2 і доходить до кінця', () => {
    const store = game();
    const started = tickRace(store.getState().race, store.getState().state, cfg, { fromMs: local(15), nowMs: local(8, 0, 1), tzOffsetMin: -new Date(2025, 9, 10).getTimezoneOffset(), installMs: local(15), offline: false });
    store.setState({ race: { ...started.s, active: { ...started.s.active!, seen: true } } });
    expect(store.getState().race.active!.steps).toHaveLength(4);
    store.getState().digitize();
    expect(store.getState().state.level).toBe(2);
    const r = store.getState().race.active!;
    expect(r).toMatchObject({ level: 1 });
    expect(r.steps).toHaveLength(4);
    store.getState().tick(local(16, 0, 1));
    expect(store.getState().race.last).toMatchObject({ won: true, level: 1, stepsTotal: 4 });
  });

  test('004 AC-18: перевірка, оголошена на Р1, лишається з тим самим чеклістом і комісією бригади після переходу на Р2', () => {
    const store = game();
    const tz = -new Date(2025, 9, 11).getTimezoneOffset();
    const at = local(10, 0, 1);
    const ins = onSessionStart({ ...store.getState().inspections, installMs: local(9) }, store.getState().state, cfg, at, tz, 50);
    expect(ins.s.active).not.toBeNull();
    store.setState({ inspections: ins.s, lastMs: at });
    const before = store.getState().inspections.active!;
    store.getState().digitize();
    expect(store.getState().state.level).toBe(2);
    const after = store.getState().inspections.active!;
    expect(after.boss).toBe('brigade_commission');
    expect(after.items.map((i) => [i.id, i.price])).toEqual(before.items.map((i) => [i.id, i.price]));
  });

  test('годинник назад: перевірка підказки не заморожується (digitCheckedAt скидається)', () => {
    const store = game({}, {});
    store.getState().tick(local(8, 40, 1));
    expect(store.getState().digitCheckedAt).toBe(local(8, 40, 1));
    store.getState().away(local(8, 40, 1), local(7, 0, 1));
    expect(store.getState().digitCheckedAt).toBe(0);
  });

  test('AC-18: на Р2 ланка «Казначейство» на 1-му рівні дає ×10 від Р1, діловод коштує як на Р1', () => {
    const store = game();
    store.getState().digitize();
    const it2 = itemsFor(store.getState().state, cfg);
    const kazna = it2.stages.find((u) => u.id === 'kazna')!;
    expect(kazna.rate).toBeCloseTo(21 * 10, 6);
    expect(kazna.manager).toBe(400);
    expect(store.getState().state.stageLevels).toEqual([1, 1, 1, 1]);
  });
});

describe('збереження церемонії (AC-11, FR-22)', () => {
  test('цифровізація → запис → читання: стан і церемонія ті самі (крок «акт», потім «наказ»)', () => {
    const store = game();
    store.getState().digitize();
    const kv = memoryStorage();
    expect(writeSave(kv, draftOf(store)!)).toBe(true);
    const r = loadSave(kv, { current: CURRENT_SCHEMA, migrations: MIGRATIONS });
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.save.game.digitization.ceremony).toMatchObject({ step: 'result', levelUp: true, no: 3 });
    expect(r.save.game.economy).toMatchObject({ level: 2, signatures: 0, lifetimeCycle: 0, streamLevels: [1, 0, 0, 0, 0] });
    store.getState().closeDigitStep();
    writeSave(kv, draftOf(store)!);
    const r2 = loadSave(kv, { current: CURRENT_SCHEMA, migrations: MIGRATIONS });
    if (r2.kind !== 'ok') throw new Error(r2.kind);
    expect(r2.save.game.digitization.ceremony).toMatchObject({ step: 'levelUp' });
    expect(kv.getString(KEY_SAVE)).toBeTruthy();
  });
});
