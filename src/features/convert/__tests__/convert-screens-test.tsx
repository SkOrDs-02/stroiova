// 013 етап 1 на екрані: перехід Р4 → Р5 (AC-1), stage-convert (AC-2…AC-4), зникнення «Комбата шукають» (AC-6), цикл Р5 (AC-7), «Збій СЕДО» (AC-8).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { convertPrice } from '@/economy/game/convert';
import { itemsFor, newGame } from '@/economy/game/state';
import type { EconomyConfig, EconomyState } from '@/economy/game/types';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { onboardingDone } from '@/save/migrations';

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

const HOUR = 3_600_000;
const T0 = new Date(2025, 9, 10, 12, 0).getTime();
const has = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

function game(patch: Partial<EconomyState> = {}, cfg: EconomyConfig = bundledConfig, level = 5, counts: Record<string, number> = {}, exit = false) {
  const store = createConveyorStore(T0, cfg);
  const g = { ...newGame(cfg, T0), level };
  const it = itemsFor(g, cfg);
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    inspections: { ...store.getState().inspections, installMs: T0 - 9 * 24 * HOUR },
    telegrams: { ...store.getState().telegrams, startMs: T0 - 9 * 24 * HOUR },
    digit: { ...store.getState().digit, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), levelExitAllowed: exit, cycleStartMs: T0 - 5 * HOUR, levelStartMs: T0 - 40 * HOUR },
    state: { ...g, streamLevels: it.streams.map(() => 120), stageLevels: it.stages.map(() => 100), streamClerks: it.streams.map(() => true), stageClerks: it.stages.map(() => true), signatures: 1e40, prestigePoints: 100, paper: 30, ...patch },
  });
  return store;
}

afterEach(async () => {
  await act(async () => {});
});

describe('перехід Р4 → Р5 (AC-1)', () => {
  beforeEach(() => jest.useFakeTimers({ now: T0 }));
  afterEach(() => jest.useRealTimers());

  test('після пройденої підсумкової Р4: наказ № 5, шапка «Армія без паперу · бліндаж», 7 потоків, 6 ланок, лічильник 0 з 6, конвертація № 1 доступна', async () => {
    const store = game({ lifetimeCycle: 40 * 40 * 22.9e12 }, bundledConfig, 4, { '4': 6 }, true);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-digital'));
    expect(screen.getByTestId('digit-cta')).toHaveTextContent('Оцифрувати й перейти');
    await fireEvent.press(screen.getByTestId('digit-cta'));
    await fireEvent(screen.getByTestId('digit-hold'), 'pressIn');
    await act(async () => { jest.advanceTimersByTime(1300); });
    await fireEvent.press(screen.getByTestId('digit-result-ok'));
    expect(screen.getByTestId('level-up-r5')).toHaveTextContent(has('НАКАЗ № 5'));
    expect(screen.getByTestId('level-up-ok')).toHaveTextContent('Повернутися в бліндаж');
    expect(store.getState().events.some((e) => e.type === 'levelAdvance' && e.to === 5)).toBe(true);
    await fireEvent.press(screen.getByTestId('level-up-ok'));
    expect(store.getState().state.level).toBe(5);
    expect(screen.getByTestId('place')).toHaveTextContent('Армія без паперу · бліндаж');
    expect(screen.getByTestId('cv-counter')).toHaveTextContent('Цифрових ланок: 0 з 6');
    expect(store.getState().state.streamLevels).toHaveLength(7);
    expect(store.getState().state.stageLevels).toHaveLength(6);
  });
});

describe('конвертація (AC-2…AC-4)', () => {
  test('stage-convert: було/стало, ціна, «Оцифрувати ланку»; ланка стає «Пакетне підписання», лічильник 1 з 6, № 2 замкнена до цифровізації', async () => {
    const store = game();
    store.setState({ state: { ...store.getState().state, signatures: convertPrice(store.getState().state, store.getState().cfg) * 3 } });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('convert-kombat')).toHaveTextContent('Оцифрувати');
    expect(screen.queryByTestId('convert-stroy')).toBeNull();
    await fireEvent.press(screen.getByTestId('convert-kombat'));
    expect(screen.getByTestId('convert-index')).toHaveTextContent('Конвертація 1 з 6');
    expect(screen.getByTestId('convert-was')).toHaveTextContent(has('Резолюції комбата'));
    expect(screen.getByTestId('convert-now')).toHaveTextContent(has('Пакетне підписання'));
    expect(screen.getByTestId('convert-price')).toHaveTextContent(has('Ціна:'));
    const before = store.getState().state.signatures;
    await fireEvent.press(screen.getByTestId('convert-ok'));
    const st = store.getState();
    expect(st.state.digital).toEqual(['kombat']);
    expect(st.state.signatures).toBeLessThan(before);
    expect(st.state.prestigePoints).toBe(100);
    expect(st.events.some((e) => e.type === 'stageConvert' && e.stageId === 'kombat')).toBe(true);
    expect(screen.getByTestId('cv-counter')).toHaveTextContent('Цифрових ланок: 1 з 6');
    expect(screen.getByTestId('digital-kombat')).toHaveTextContent('Цифрова ланка: без сповільнення');
    expect(screen.getByTestId('convert-stroy')).toHaveTextContent('Замкнено до цифровізації');
    expect(screen.getByTestId('convert-stroy')).toBeDisabled();
  });

  test('бракує підписів - кнопка неактивна з «Бракує N підписів»', async () => {
    const store = game({ signatures: 5 });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('convert-kombat'));
    expect(screen.getByTestId('convert-lack')).toHaveTextContent(has('Бракує'));
    expect(screen.getByTestId('convert-ok')).toBeDisabled();
  });
});

describe('«Комбата шукають» після конвертації № 1 (AC-6)', () => {
  test('активна подія знімається, нових немає навіть при chance = 1', async () => {
    const cfg: EconomyConfig = { ...bundledConfig, params: { ...bundledConfig.params, kombatChance: 1 } };
    const store = game({}, cfg);
    store.setState({ telegrams: { ...store.getState().telegrams, kombat: { lastDayKey: null, active: { startMs: T0, endMs: T0 + HOUR, runnerAtMs: null } } } });
    expect(store.getState().convertStage()).toEqual({ ok: true });
    expect(store.getState().telegrams.kombat.active).toBeNull();
    await act(async () => store.getState().away(T0, T0 + 3 * HOUR));
    if (store.getState().offline) store.getState().claim();
    expect(store.getState().telegrams.kombat.active).toBeNull();
  });
});

describe('«Збій СЕДО» (AC-8)', () => {
  const sedoCfg: EconomyConfig = { ...bundledConfig, params: { ...bundledConfig.params, sedoFailChance: 1 } };

  async function failed(paper: number) {
    const store = game({ digital: ['stroy'], paper }, sedoCfg);
    await act(async () => store.getState().away(T0, T0 + HOUR));
    if (store.getState().offline) store.getState().claim();
    store.setState({ state: { ...store.getState().state, paper } });
    await render(<MainScreen store={store} />);
    return store;
  }

  test('сесія з цифровою ланкою: шторка «Збій СЕДО» сама, ×sedoFailMult на ланку; 3 аркуші - «Бракує 2 аркушів»', async () => {
    const store = await failed(3);
    expect(screen.getByTestId('sedo-sheet')).toHaveTextContent(has('Збій СЕДО'));
    expect(store.getState().effects.find((e) => e.source === 'sedo_failure')).toMatchObject({ value: bundledConfig.params.sedoFailMult, target: { type: 'stage', id: 'stroy' } });
    expect(screen.getByTestId('sedo-print')).toBeDisabled();
    expect(screen.getByTestId('sedo-lack')).toHaveTextContent('Бракує 2 аркушів');
  });

  test('5 аркушів: «Роздрукувати» знімає збій, папір 0, документ «Паперова копія електронного документа»', async () => {
    const store = await failed(5);
    await fireEvent.press(screen.getByTestId('sedo-print'));
    expect(store.getState().state.paper).toBe(0);
    expect(store.getState().effects.some((e) => e.source === 'sedo_failure')).toBe(false);
    expect(screen.getByTestId('sedo-doc')).toHaveTextContent(has('Паперова копія електронного документа'));
  });
});

describe('цикл Р5 (AC-7)', () => {
  beforeEach(() => jest.useFakeTimers({ now: T0 }));
  afterEach(() => jest.useRealTimers());

  test('digit-result: «Цей цикл» і «попередній»; цифрові ланки лишаються після цифровізації', async () => {
    const store = game({ digital: ['kombat', 'stroy'], lifetimeCycle: 40 * 40 * 9.01e22 }, bundledConfig, 5, { '5': 1 });
    store.setState({ digit: { ...store.getState().digit, lastCycleMs: 20 * HOUR } });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-digital'));
    expect(screen.getByTestId('digit-counter')).toHaveTextContent('Цифрових ланок: 2 з 6');
    await fireEvent.press(screen.getByTestId('digit-cta'));
    await fireEvent(screen.getByTestId('digit-hold'), 'pressIn');
    await act(async () => { jest.advanceTimersByTime(1300); });
    expect(screen.getByTestId('result-cycle')).toHaveTextContent('Цей цикл: 5 год · попередній: 20 год');
    expect(store.getState().state.digital).toEqual(['kombat', 'stroy']);
    expect(store.getState().digit.lastCycleMs).toBe(5 * HOUR);
  });
});

