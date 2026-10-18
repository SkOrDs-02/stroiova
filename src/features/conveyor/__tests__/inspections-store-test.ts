// 004 у сторі: перша на старті сесії (AC-1), купівля пункту, офлайн з ×3 (AC-15), 003 FR-15 після першої планової.
import { bundledConfig } from '@/economy/config';
import { income, multStack } from '@/economy/game/income';
import { createConveyorStore, gameSave } from '@/features/conveyor/store';
import { onboardingDone } from '@/save/migrations';

const HOUR = 3_600_000;
// місцевий час пристрою: стор бере зсув зони з Date
const local = (h: number, m = 0, day = 0) => new Date(2025, 9, 10 + day, h, m).getTime();

function installed(at = local(9)) {
  const store = createConveyorStore(at, bundledConfig);
  const s = store.getState().state;
  store.setState({ onboarding: onboardingDone(), state: { ...s, streamLevels: [40, 0, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, false, false, false], stageClerks: [true, true, true], signatures: 1e12 } });
  return store;
}

describe('перевірки в сторі', () => {
  test('AC-1: сесія о 17:00 після встановлення о 09:00 — call, потім insp-warning; о 14:00 — нічого', () => {
    const early = installed();
    early.getState().away(local(9, 5), local(14));
    expect(early.getState().inspections.active).toBeNull();

    const store = installed();
    store.getState().away(local(9, 5), local(17));
    const ins = store.getState().inspections;
    expect(ins.active).toMatchObject({ id: 'insp_0001', trigger: 'scheduled', modal: true, warned: false });
    expect(ins.callPending).toBe(true);
    expect(store.getState().events.some((e) => e.type === 'inspectionStart')).toBe(true);
    store.getState().ackInspCall();
    store.getState().ackInspWarning(true);
    expect(store.getState().inspections).toMatchObject({ callPending: false, active: { warned: true } });
    expect(store.getState().inspPrepOpen).toBe(true);
  });

  test('онбординг не пройдено — першої немає', () => {
    const store = createConveyorStore(local(9), bundledConfig);
    store.getState().away(local(9, 5), local(17));
    expect(store.getState().inspections.active).toBeNull();
  });

  test('пункт за підписи списує ціну; приїзд у грі — ×3 і firstInspectionPassed (003 FR-15)', () => {
    const store = installed();
    store.getState().away(local(9, 5), local(17));
    const a = store.getState().inspections.active!;
    const before = store.getState().state.signatures;
    for (const it of a.items) expect(store.getState().buyInspItem(it.id)).toBe(true);
    const spent = a.items.reduce((s, i) => s + i.price, 0);
    expect(before - store.getState().state.signatures).toBeCloseTo(spent, 0);
    expect(store.getState().buyInspItem(a.items[0]!.id)).toBe(false);
    store.getState().tick(a.arrMs + 1000);
    const st = store.getState();
    expect(st.inspections.last).toMatchObject({ passed: true, offline: false, seen: false });
    expect(st.effects.some((e) => e.source === 'inspection_pass' && e.startMs === a.arrMs)).toBe(true);
    expect(st.telegrams.firstInspectionPassed).toBe(true);
    st.closeInspResult();
    expect(store.getState().inspections.last!.seen).toBe(true);
  });

  test('AC-15: 5 з 5, гра закрита — офлайн рахується з ×3, довідка позначає результат показаним', () => {
    const run = (buy: boolean) => {
      const store = installed();
      store.getState().away(local(9, 5), local(17));
      const a = store.getState().inspections.active!;
      if (buy) for (const it of a.items) store.getState().buyInspItem(it.id);
      store.setState({ state: { ...store.getState().state, signatures: 0 } });
      store.getState().away(local(17), a.arrMs + HOUR);
      return store;
    };
    const ok = run(true);
    const bad = run(false);
    expect(ok.getState().inspections.last).toMatchObject({ passed: true, offline: true });
    expect(bad.getState().inspections.last).toMatchObject({ passed: false, offline: true });
    expect(ok.getState().offline!.earned).toBeGreaterThan(bad.getState().offline!.earned);
    ok.getState().claim();
    expect(ok.getState().inspections.last!.seen).toBe(true);
  });
});

describe('перевірки в сторі: крайові', () => {
  test('AC-11, AC-21: провал — дохід більший за 0, тап дає tapValue × M; репутація та сама, reputationTierChange немає', () => {
    const store = installed();
    store.getState().away(local(9, 5), local(17));
    const a = store.getState().inspections.active!;
    const rep = store.getState().telegrams.reputation.value;
    store.getState().tick(a.arrMs + 60_000);
    const st = store.getState();
    expect(st.inspections.last!.passed).toBe(false);
    expect(st.effects.some((e) => e.source === 'inspection_fail')).toBe(true);
    const inc = income(st.state, st.cfg, st.lastMs, st.effects);
    expect(inc.perMin).toBeGreaterThan(0);
    const M = multStack(st.state, st.cfg, st.lastMs, st.effects).total;
    const before = st.state.signatures;
    st.tapSeal(st.lastMs + 1);
    expect(store.getState().state.signatures - before).toBeCloseTo(st.cfg.params.tapValue * M, 6);
    expect(st.telegrams.reputation.value).toBe(rep);
    expect(st.events.some((e) => e.type === 'reputationTierChange')).toBe(false);
  });

  test('AC-19: вбивство застосунку — пункти, відлік і id ті самі після запису й відкриття', () => {
    const store = installed();
    store.getState().away(local(9, 5), local(17));
    const a = store.getState().inspections.active!;
    for (const it of a.items.slice(0, 3)) store.getState().buyInspItem(it.id);
    const saved = JSON.parse(JSON.stringify(gameSave(store)));
    const again = createConveyorStore(local(17, 30), bundledConfig, { ...saved, state: saved.economy });
    again.getState().away(local(17, 1), local(17, 30));
    const b = again.getState().inspections.active!;
    expect(b.id).toBe(a.id);
    expect(b.arrMs).toBe(a.arrMs);
    expect(b.items.filter((i) => i.done)).toHaveLength(3);
  });

  test('годинник назад: відлік до комісії не стрибає (009 FR-14)', () => {
    const store = installed();
    store.getState().away(local(9, 5), local(17));
    const left = store.getState().inspections.active!.arrMs - store.getState().lastMs;
    store.getState().away(local(17), local(17));
    expect(store.getState().inspections.active!.arrMs - store.getState().lastMs).toBe(left);
  });
});
