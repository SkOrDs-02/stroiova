// 006 на екрані: digital (AC-4, 5, 8), підказка й крапка (AC-6), утримання (AC-10), акт (AC-14), перехід на Р2 (AC-15, 17, 19), Р2 (AC-20).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import type { EconomyState } from '@/economy/game/types';
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

const T0 = new Date(2025, 9, 10, 12, 0).getTime();

function game(lifetime: number, patch: Partial<EconomyState> = {}, counts: Record<string, number> = {}) {
  const store = createConveyorStore(T0, bundledConfig);
  const s = store.getState().state;
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    state: { ...newGame(bundledConfig, T0), ...s, streamLevels: [120, 120, 120, 120], stageLevels: [120, 120, 120], lifetimeCycle: lifetime, ...patch },
    digit: { ...store.getState().digit, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) },
  });
  return store;
}

const L = (points: number) => points * points * 75_000;

async function openDigital(store: ReturnType<typeof game>) {
  await render(<MainScreen store={store} />);
  await fireEvent.press(screen.getByTestId('tab-digital'));
}

describe('digital', () => {
  test('AC-4: замкнено — перелік закритих потоків із цінами, кнопка неактивна; мало балів — «Ще 8 балів»', async () => {
    const locked = game(L(40), { streamLevels: [30, 20, 0, 0] });
    await openDigital(locked);
    expect(screen.getByTestId('digit-locked')).toHaveTextContent(/Довідки · відкриття .*Накладні · відкриття/);
    expect(screen.getByTestId('digit-cta')).toBeDisabled();
  });

  test('AC-4: P = 22 — «Ще 8 балів до мінімуму в 30», кнопка неактивна', async () => {
    await openDigital(game(L(22)));
    expect(screen.getByTestId('digit-few')).toHaveTextContent(/Ще 8 балів до мінімуму в 30/);
    expect(screen.getByTestId('digit-cta')).toBeDisabled();
  });

  test('AC-8: перша доступна цифровізація — +38, ×1,00 → ×1,76, 0 з 3, журнали № 1–3, доріжка; картка «Як це працює»', async () => {
    await openDigital(game(L(38)));
    expect(screen.getByTestId('digit-points')).toHaveTextContent('Зараз дасть +38 цифрових балів');
    expect(screen.getByTestId('digit-mult')).toHaveTextContent('Множник підписів ×1 → ×1,76');
    expect(screen.getByTestId('digit-counter')).toHaveTextContent('Цифровізацій на рівні: 0 з 3');
    expect(screen.getByTestId('digit-journals')).toHaveTextContent(/№ 1 ·.*№ 2 ·.*№ 3 ·/);
    expect(screen.getByTestId('digit-track')).toHaveTextContent(/Батальйонзараз.*Бригадапісля 3-ї.*Командуванняпізніше/);
    // картка показується, доки гравець не натисне «Зрозуміло»; (i) відкриває знову
    expect(screen.getByTestId('digit-how')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('digit-how-ok'));
    expect(screen.queryByTestId('digit-how')).toBeNull();
    await fireEvent.press(screen.getByTestId('digit-info'));
    expect(screen.getByTestId('digit-how')).toBeTruthy();
  });

  test('AC-20: на Р2 — «Цифровізацій у бригаді: 1», примітка «Наступний рівень відкриється пізніше», доріжка «пройдено»', async () => {
    const store = game(6.27e9 * 1600, { level: 2, streamLevels: [30, 20, 10, 5, 3], stageLevels: [20, 20, 20, 20], prestigePoints: 100 }, { '1': 3, '2': 1 });
    await openDigital(store);
    expect(screen.getByTestId('digit-counter')).toHaveTextContent('Цифровізацій у бригаді: 1');
    expect(screen.getByTestId('digit-track')).toHaveTextContent(/Батальйонпройдено.*Бригадазараз/);
    expect(screen.getByText(/Наступний рівень відкриється пізніше/)).toBeTruthy();
  });
});

describe('підказка (AC-6)', () => {
  test('банер «Наступна покупка — через N. Час цифровізуватися.», крапка на вкладці; подія раз за сесію', async () => {
    const store = game(L(31), { prestigePoints: 30, streamLevels: [120, 120, 120, 120], stageLevels: [120, 120, 120] });
    await act(async () => store.getState().tick(T0 + 61_000));
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('digit-hint')).toHaveTextContent(/Наступна покупка — через .* Час цифровізуватися\./);
    expect(screen.getByTestId('tab-digital-dot')).toBeTruthy();
    await act(async () => store.getState().tick(T0 + 200_000));
    await act(async () => store.getState().tick(T0 + 400_000));
    expect(store.getState().events.filter((e) => e.type === 'digitizationHint')).toHaveLength(1);
    await fireEvent.press(screen.getByTestId('digit-hint'));
    expect(screen.getByTestId('digital')).toBeTruthy();
    expect(screen.getByTestId('digit-recommended')).toBeTruthy();
  });

  test('AC-7: P_total = 200, P = 35 — підказки немає', async () => {
    const store = game(L(35), { prestigePoints: 200 }, { '1': 1 });
    await act(async () => store.getState().tick(T0 + 61_000));
    await render(<MainScreen store={store} />);
    expect(screen.queryByTestId('digit-hint')).toBeNull();
    expect(screen.queryByTestId('tab-digital-dot')).toBeNull();
  });
});

describe('утримання й церемонія', () => {
  beforeEach(() => jest.useFakeTimers({ now: T0 }));
  afterEach(() => jest.useRealTimers());

  test('AC-10: відпущено через 0,8 с — нічого; утримано 1,2 с — цифровізація; «Не зараз» закриває без змін', async () => {
    const store = game(L(40), { signatures: 1e9 });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-digital'));
    await fireEvent.press(screen.getByTestId('digit-cta'));
    expect(screen.getByTestId('digit-confirm')).toHaveTextContent(/Зараз дасть \+40/);
    // 0,8 с
    await fireEvent(screen.getByTestId('digit-hold'), 'pressIn');
    await act(async () => { jest.advanceTimersByTime(800); });
    await fireEvent(screen.getByTestId('digit-hold'), 'pressOut');
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(store.getState().digit.total).toBe(0);
    expect(store.getState().state.signatures).toBe(1e9);
    // «Не зараз»
    await fireEvent.press(screen.getByTestId('digit-no'));
    expect(screen.queryByTestId('digit-confirm')).toBeNull();
    expect(store.getState().digit.total).toBe(0);
    // 1,2 с
    await fireEvent.press(screen.getByTestId('digit-cta'));
    await fireEvent(screen.getByTestId('digit-hold'), 'pressIn');
    await act(async () => { jest.advanceTimersByTime(1300); });
    expect(store.getState().digit.total).toBe(1);
    expect(store.getState().state).toMatchObject({ signatures: 0, lifetimeCycle: 0, prestigePoints: 40, streamLevels: [1, 0, 0, 0] });
  });

  test('AC-14: digit-result — акт, штамп, бали, множник; «До стройової» закриває церемонію', async () => {
    const store = game(L(40), { signatures: 1e9 });
    store.getState().digitize();
    await render(<MainScreen store={store} />);
    const r = screen.getByTestId('digit-result');
    expect(r).toHaveTextContent(/Акт № 1/);
    expect(r).toHaveTextContent(/про переведення обліку в електронну форму/);
    expect(r).toHaveTextContent(/Оцифровано/);
    expect(screen.getByTestId('result-points')).toHaveTextContent('+40');
    expect(screen.getByTestId('result-total')).toHaveTextContent('Разом 40 · ×1,8 до всіх підписів назавжди');
    expect(r).toHaveTextContent(/Летять у музей.*№ 1 ·.*№ 2 ·.*№ 3 ·/);
    await fireEvent.press(screen.getByTestId('digit-result-ok'));
    expect(screen.queryByTestId('digit-result')).toBeNull();
    expect(store.getState().digit.ceremony).toBeNull();
  });

  test('AC-17: 3-тя на Р1 — акт, потім level-up з «Цифрові бали N, переходять»; тост k.tip; шапка Р2', async () => {
    const store = game(L(40), { signatures: 1e9, prestigePoints: 70 }, { '1': 2 });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-digital'));
    await fireEvent.press(screen.getByTestId('digit-cta'));
    expect(screen.getByTestId('confirm-lvl')).toHaveTextContent(/Третя цифровізація на рівні/);
    await fireEvent(screen.getByTestId('digit-hold'), 'pressIn');
    await act(async () => { jest.advanceTimersByTime(1300); });
    expect(screen.getByTestId('digit-result')).toHaveTextContent(/Батальйон оцифровано. Наказ про переведення вже друкують./);
    await fireEvent.press(screen.getByTestId('digit-result-ok'));
    expect(screen.getByTestId('level-up')).toHaveTextContent(/НАКАЗ № 2/);
    expect(screen.getByTestId('level-points')).toHaveTextContent('Цифрові бали 110, переходять');
    expect(store.getState().events.some((e) => e.type === 'levelAdvance')).toBe(true);
    await fireEvent.press(screen.getByTestId('level-up-ok'));
    expect(screen.queryByTestId('level-up')).toBeNull();
    expect(store.getState().state.level).toBe(2);
    expect(screen.getByTestId('place')).toHaveTextContent('Бригада · будинок культури');
    expect(screen.getByTestId('toast')).toHaveTextContent(/Казначейство — нова ланка труби/);
  });

  test('AC-15: застосунок убито на digit-result після 3-ї — при запуску показано level-up, гравець на Р2', async () => {
    const store = game(L(40), { signatures: 1e9, prestigePoints: 70 }, { '1': 2 });
    store.getState().digitize();
    store.getState().closeDigitStep(); // акт закрито, застосунок убито на наказі
    expect(store.getState().digit.ceremony).toMatchObject({ step: 'levelUp' });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('level-up')).toBeTruthy();
    expect(store.getState().state.level).toBe(2);
  });

  test('AC-19: Р2 — 5 потоків, 4 ланки, шапка «Бригада · будинок культури»', async () => {
    const store = game(L(40), { signatures: 1e9, prestigePoints: 70 }, { '1': 2 });
    store.getState().digitize();
    store.getState().closeDigitStep();
    store.getState().closeDigitStep();
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('place')).toHaveTextContent('Бригада · будинок культури');
    expect(screen.getByTestId('unit-nakazy')).toBeTruthy();
    expect(screen.getByTestId('unit-kazna')).toBeTruthy();
  });
});
