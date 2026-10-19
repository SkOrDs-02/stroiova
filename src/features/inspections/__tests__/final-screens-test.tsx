// 011 на екрані й у сторі: оголошення підсумкової Р2 (AC-1), реклама лише на базові (AC-3), пройдено й перехід (AC-4, AC-7), провал і повтор (AC-5, AC-6),
// Р3 (AC-9, AC-10), «Нарада затягнулась» (AC-17).
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { itemsFor } from '@/economy/game/state';
import { draftOf, needsSaveNow } from '@/features/boot/useBoot';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { fakeAds } from '@/monetization/test-services';
import { MIGRATIONS, onboardingDone } from '@/save/migrations';
import { KEY_SAVE, loadSave, serialize } from '@/save/repository';
import { CURRENT_SCHEMA } from '@/save/schema';
import { memoryStorage } from '@/save/storage';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
  AndroidHaptics: { Keyboard_Tap: 'k', Confirm: 'c' },
}));

const cfg = bundledConfig;
const p = cfg.params;
const HOUR = 3_600_000;
const T0 = new Date(2025, 9, 10, 12, 0).getTime();
const has = (t: string) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

/** Р2, N-та цифровізація зроблена (4 з 4), усі потоки відкрито, діловоди є, підписів на всі пункти */
function r2(opts: { level?: number; counts?: Record<string, number>; signatures?: number; ads?: ReturnType<typeof fakeAds> } = {}) {
  const ads = opts.ads ?? fakeAds();
  const store = createConveyorStore(T0, cfg, { services: { ads } });
  const g = store.getState().state;
  const level = opts.level ?? 2;
  const it = itemsFor({ ...g, level }, cfg);
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    inspections: { ...store.getState().inspections, installMs: T0 - 5 * 24 * HOUR },
    telegrams: { ...store.getState().telegrams, startMs: T0 - 5 * 24 * HOUR },
    state: {
      ...g,
      level,
      streamLevels: it.streams.map(() => 40),
      stageLevels: it.stages.map(() => 40),
      streamClerks: it.streams.map(() => true),
      stageClerks: it.stages.map(() => true),
      signatures: opts.signatures ?? 0,
      prestigePoints: 100,
    },
    digit: { ...store.getState().digit, counts: opts.counts ?? { '1': 3, '2': p.levels[1]!.exitDigitizations }, total: 7 },
  });
  return { store, ads };
}

type Store = ReturnType<typeof r2>['store'];

const announce = async (store: Store) => {
  await act(async () => store.getState().tick(T0 + 61_000));
};

afterEach(async () => {
  await act(async () => {});
  await cleanup();
});

describe('оголошення (AC-1)', () => {
  test('N-та цифровізація й усі потоки відкрито - boss-brief з таймером ≈ 24 год, правилами й inspection_start (final)', async () => {
    const { store } = r2();
    await announce(store);
    const a = store.getState().inspections.active!;
    expect(a).toMatchObject({ kind: 'final', attempt: 1, level: 2 });
    expect(store.getState().events.some((e) => e.type === 'inspectionStart' && e.kind === 'final')).toBe(true);
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('boss-brief')).toBeTruthy();
    expect(screen.getByTestId('boss-title')).toHaveTextContent(has('Комісія командування. Підсумкова.'));
    expect(screen.getByTestId('boss-gives')).toHaveTextContent(has('наказ про переведення і ×3 на 2 год'));
    expect(screen.getByTestId('boss-fail')).toHaveTextContent(has('повтор через 24 год'));
    expect(screen.queryByTestId('boss-retry')).toBeNull();
    expect(screen.queryByTestId('insp-warning')).toBeNull();
    expect(a.arrMs - a.annMs).toBeGreaterThanOrEqual(p.boss.warnH * HOUR);
  });

  test('менше N цифровізацій на рівні - підсумкової немає', async () => {
    const { store } = r2({ counts: { '1': 3, '2': p.levels[1]!.exitDigitizations - 1 } });
    await announce(store);
    expect(store.getState().inspections.active).toBeNull();
  });

  test('digital на Р2 після N-ї: лічильник «4 з 4», «Підсумкова перевірка: приїзд через», «Готуватися» відкриває insp-prep', async () => {
    const { store } = r2();
    await announce(store);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('insp-later'));
    await fireEvent.press(screen.getByTestId('tab-digital'));
    expect(screen.getByTestId('digit-counter')).toHaveTextContent(has('Цифровізацій на рівні: 4 з 4'));
    expect(screen.getByTestId('digit-final')).toHaveTextContent(has('Підсумкова перевірка: приїзд через'));
    expect(screen.queryByTestId('digit-exit-ok')).toBeNull();
    await fireEvent.press(screen.getByTestId('digit-final-prep'));
    expect(screen.getByTestId('insp-prep')).toBeTruthy();
  });
});

describe('insp-prep підсумкової (AC-3)', () => {
  test('5 базових пунктів з цінами й пункт механіки без ціни: "Виконано на цю мить", коли Накази відкрито; "Ще ні: ...", коли ні', async () => {
    const { store } = r2();
    await announce(store);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('insp-prepare'));
    expect(screen.getByTestId('insp-prep')).toHaveTextContent(has('Підсумкова перевірка'));
    for (const id of ['dust_glove', 'corridor_tape', 'sign_rehang', 'orders_stitch', 'kazna_kopiyka', 'nakazy_open']) expect(screen.getByTestId(`insp-item-${id}`)).toBeTruthy();
    expect(screen.getByTestId('insp-mech-state')).toHaveTextContent(has('Виконано на цю мить'));
    expect(screen.getByTestId('insp-item-nakazy_open')).toHaveTextContent(has('Пункт рівня · за рекламу не закривається'));
    // Накази закрито цифровізацією: пункт "ламається" наживо
    const g = store.getState().state;
    const i = itemsFor(g, cfg).streams.findIndex((u) => u.id === 'nakazy');
    await act(async () => store.setState({ state: { ...g, streamLevels: g.streamLevels.map((l, k) => (k === i ? 0 : l)) } }));
    expect(screen.getByTestId('insp-mech-state')).toHaveTextContent(has('Ще ні: відкрий «Накази по частині»'));
  });

  test('«Усе за рекламу» закриває 5 базових, пункт механіки лишається; кнопка реклами після цього неактивна', async () => {
    const { store, ads } = r2();
    await announce(store);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('insp-prepare'));
    await fireEvent.press(screen.getByTestId('insp-ad'));
    expect(ads.shown).toEqual(['inspection_checklist']);
    const items = store.getState().inspections.active!.items;
    expect(items.filter((i) => i.done).map((i) => i.id)).toEqual(['dust_glove', 'corridor_tape', 'sign_rehang', 'orders_stitch', 'kazna_kopiyka']);
    expect(items.find((i) => i.mech)!.done).toBe(false);
    // реклама на перевірку одна: кнопка лишається неактивною (як у звичайної), а пункт механіки не купується
    expect(screen.getByTestId('insp-ad')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('insp-item-nakazy_open'));
    expect(store.getState().inspections.active!.items.find((i) => i.mech)!.done).toBe(false);
  });
});

describe('результат', () => {
  const arrive = async (store: Store) => {
    const a = store.getState().inspections.active!;
    await act(async () => store.getState().tick(a.arrMs + 1000));
  };

  test('AC-4, AC-7: усе виконано - insp-result з наказом, ×3 на 2 год, перехід дозволено; digital "перехід дозволено", digit-confirm з dc.lvl_r3; після цифровізації - level-up Р3', async () => {
    const { store } = r2();
    await announce(store);
    const rep = store.getState().telegrams.reputation.value;
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('insp-prepare'));
    await fireEvent.press(screen.getByTestId('insp-ad'));
    await fireEvent.press(screen.getByTestId('insp-back'));
    await arrive(store);
    expect(store.getState().digit.levelExitAllowed).toBe(true);
    expect(store.getState().telegrams.reputation.value).toBe(rep);
    expect(store.getState().effects.some((e) => e.source === 'inspection_pass')).toBe(true);
    expect(screen.getByTestId('insp-result')).toBeTruthy();
    expect(screen.getByTestId('insp-verdict')).toHaveTextContent(has('зауважень немає'));
    expect(screen.getByTestId('insp-order')).toHaveTextContent(has('Наказ про переведення підписано. Наступна цифровізація - з переходом.'));
    await fireEvent.press(screen.getByTestId('insp-result-ok'));
    await fireEvent.press(screen.getByTestId('tab-digital'));
    expect(screen.getByTestId('digit-exit-ok')).toHaveTextContent(has('Перехід дозволено. Наступна цифровізація переведе в командування.'));
    expect(screen.queryByTestId('digit-final')).toBeNull();
    expect(screen.getByTestId('digit-cta')).toHaveTextContent(has('Оцифрувати й перейти'));
    // цифровізація (як з digit-confirm): перехід на Р3
    await act(async () => store.setState({ state: { ...store.getState().state, lifetimeCycle: p.levels[1]!.prestigeDivisor * 40 * 40 } }));
    await fireEvent.press(screen.getByTestId('digit-cta'));
    expect(screen.getByTestId('confirm-lvl')).toHaveTextContent(has('Після цієї цифровізації - переведення в командування. Бали й музей їдуть з тобою.'));
    expect(store.getState().digitize()).toBe(true);
    await act(async () => {});
    expect(store.getState().state.level).toBe(3);
    expect(store.getState().digit.levelExitAllowed).toBe(false);
    expect(store.getState().events.some((e) => e.type === 'levelAdvance' && e.to === 3)).toBe(true);
  });

  test('AC-5: куплено не все - провал, Стройова ×0,5 на 1 год, insp-result з повтором, потім boss-brief "Повтор, спроба 2"', async () => {
    const { store } = r2({ signatures: 0 });
    await announce(store);
    const first = store.getState().inspections.active!;
    // 4 базові куплено, п'ятий ні
    store.setState({ inspections: { ...store.getState().inspections, active: { ...first, warned: true, items: first.items.map((i, k) => (k < 4 ? { ...i, done: true } : i)) } } });
    await render(<MainScreen store={store} />);
    await arrive(store);
    expect(store.getState().effects.some((e) => e.source === 'inspection_fail')).toBe(true);
    expect(store.getState().digit.levelExitAllowed).toBe(false);
    expect(screen.getByTestId('insp-verdict')).toHaveTextContent(has('провалили'));
    expect(screen.getByTestId('insp-retry')).toHaveTextContent(has('Повторний приїзд через'));
    const retry = store.getState().inspections.active!;
    expect(retry).toMatchObject({ kind: 'final', attempt: 2 });
    expect(retry.items.filter((i) => i.done && !i.mech)).toHaveLength(4);
    await fireEvent.press(screen.getByTestId('insp-result-ok'));
    expect(screen.getByTestId('boss-retry')).toHaveTextContent(has('Повтор, спроба 2'));
  });

  test('AC-6: цифровізація під час оголошеної підсумкової - рівень той самий, лічильник +1, підсумкова й пункти на місці', async () => {
    const { store } = r2({ signatures: 0 });
    await announce(store);
    const before = store.getState().inspections.active!;
    const done = { ...before, items: before.items.map((i, k) => (k < 2 ? { ...i, done: true } : i)) };
    store.setState({ inspections: { ...store.getState().inspections, active: done }, state: { ...store.getState().state, lifetimeCycle: p.levels[1]!.prestigeDivisor * 40 * 40 } });
    expect(store.getState().digitize()).toBe(true);
    const st = store.getState();
    expect(st.state.level).toBe(2);
    expect(st.digit.counts['2']).toBe(p.levels[1]!.exitDigitizations + 1);
    expect(st.digit.levelExitAllowed).toBe(false);
    expect(st.inspections.active!.id).toBe(before.id);
    expect(st.inspections.active!.items.filter((i) => i.done)).toHaveLength(2);
  });
});

describe('Р3 (AC-9, AC-10)', () => {
  test('шапка «Командування · кабінети й наради», 6 потоків і 5 ланок, "Нарада" і "Зведення" в рядках', async () => {
    const { store } = r2({ level: 3, counts: { '1': 3, '2': 5, '3': 0 } });
    store.setState({ state: { ...store.getState().state, streamLevels: [30, 20, 10, 5, 3, 0], stageLevels: [30, 30, 30, 30, 30] } });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('place')).toHaveTextContent(has('Командування · кабінети й наради'));
    for (const id of ['raporty', 'akty', 'dovidky', 'nakladni', 'nakazy', 'zvedennia', 'kombat', 'stroy', 'fin', 'kazna', 'narada']) expect(screen.getByTestId(`unit-${id}`)).toBeTruthy();
  });

  test('числа Р3: "Рапорти" = Р1 × rateMult, Зведення відкривається останнім', () => {
    const { store } = r2({ level: 3 });
    const it = itemsFor(store.getState().state, cfg);
    const l1 = itemsFor({ ...store.getState().state, level: 1 }, cfg);
    expect(it.streams[0]!.rate).toBeCloseTo(l1.streams[0]!.rate * p.levels[2]!.rateMult, 6);
    expect(it.streams.at(-1)!.id).toBe('zvedennia');
    expect(it.stages.at(-1)!.id).toBe('narada');
  });

  test('digital на Р3: "n з 6", без підсумкової (вона з пачками), примітка про наступний рівень; AC-10: 5 з 6 потоків - замкнено', async () => {
    const { store } = r2({ level: 3, counts: { '1': 3, '2': 5, '3': 2 } });
    store.setState({ state: { ...store.getState().state, streamLevels: [30, 20, 10, 5, 3, 0], lifetimeCycle: p.levels[2]!.prestigeDivisor * 40 * 40 } });
    await announce(store);
    expect(store.getState().inspections.active?.kind).not.toBe('final');
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-digital'));
    expect(screen.getByTestId('digit-counter')).toHaveTextContent(has('Цифровізацій на рівні: 2 з 6'));
    expect(screen.getByTestId('digit-locked')).toHaveTextContent(has('Зведення'));
    expect(screen.getByTestId('digit-cta')).toBeDisabled();
    await act(async () => store.setState({ state: { ...store.getState().state, streamLevels: [30, 20, 10, 5, 3, 1] } }));
    expect(screen.getByTestId('digit-cta')).toBeEnabled();
    expect(screen.getByTestId('digit-cta')).toHaveTextContent(has('Оцифрувати командування'));
  });
});

describe('«Нарада затягнулась» (AC-17)', () => {
  const MIN = 60_000;
  test('нарада ×0,25 не довше 30 хв: шторка, "Передати записку" за підписи, кінець ефекту; комбат у цей час не стартує', async () => {
    const { store } = r2({ level: 3, signatures: 1e12 });
    store.setState({ telegrams: { ...store.getState().telegrams, meeting: { lastDayKey: null, active: { startMs: T0, endMs: T0 + 25 * MIN, runnerAtMs: null } } } });
    store.setState({ effects: [{ kind: 'factor', source: 'meeting_overrun', value: p.naradaMult, target: { type: 'stage', id: 'narada' }, startMs: T0, endMs: T0 + 25 * MIN }] });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('meeting-sheet')).toHaveTextContent(has('Нарада затягнулась'));
    expect(screen.getByTestId('meeting-sheet')).toHaveTextContent(has('Нарада, ×0,25'));
    const sigs = store.getState().state.signatures;
    await fireEvent.press(screen.getByTestId('meeting-note'));
    expect(store.getState().state.signatures).toBeLessThan(sigs);
    expect(store.getState().telegrams.meeting.active!.runnerAtMs).toBe(T0);
    expect(store.getState().telegrams.meeting.active!.endMs).toBeLessThanOrEqual(T0 + 25 * MIN);
    expect(screen.getByTestId('meeting-running')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('meeting-wait'));
    expect(screen.getByTestId('meeting-bar')).toBeTruthy();
    // час минув: ефект знято, шторка "закінчилась"
    const end = store.getState().telegrams.meeting.active!.endMs;
    await act(async () => store.getState().tick(end + 1000));
    expect(store.getState().telegrams.meeting.active!.found).toBe(true);
    expect(screen.queryByTestId('meeting-bar')).toBeNull();
  });
});

describe('збереження (AC-19)', () => {
  test('оголошена підсумкова з пунктом механіки, прапорець виходу і нарада переживають запис і читання; вони ж запускають негайний запис', async () => {
    const { store } = r2();
    await announce(store);
    const prev = store.getState();
    store.setState({
      digit: { ...prev.digit, levelExitAllowed: true },
      telegrams: { ...prev.telegrams, meeting: { lastDayKey: '2025-10-10', active: { startMs: T0, endMs: T0 + 20 * 60_000, runnerAtMs: null } } },
    });
    expect(needsSaveNow(store.getState(), prev)).toBe(true);
    const kv = memoryStorage({ [KEY_SAVE]: serialize(draftOf(store)!) });
    const r = loadSave(kv, { current: CURRENT_SCHEMA, migrations: MIGRATIONS });
    if (r.kind !== 'ok') throw new Error(r.kind);
    const a = r.save.game.inspections.active!;
    expect(a).toMatchObject({ kind: 'final', attempt: 1 });
    expect(a.items.filter((i) => i.mech).map((i) => i.id)).toEqual(['nakazy_open']);
    expect(r.save.game.digitization.levelExitAllowed).toBe(true);
    expect(r.save.game.telegrams.meeting.active).toMatchObject({ startMs: T0 });
  });
});
