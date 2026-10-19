// 012 на екрані: перехід Р3 → Р4 (AC-1, AC-2, AC-3), доріжка, картка «Звітів про звіти» (FR-12, AC-9).
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
const D3 = 676e9;
const has = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

function game(level: number, patch: Partial<EconomyState>, counts: Record<string, number> = {}, exitAllowed = false) {
  const store = createConveyorStore(T0, bundledConfig);
  const items = (n: number) => Array(n).fill(120) as number[];
  const streams = level === 3 ? 6 : 7;
  const stages = level === 3 ? 5 : 6;
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    state: { ...newGame(bundledConfig, T0), level, streamLevels: items(streams), stageLevels: items(stages), ...patch },
    digit: { ...store.getState().digit, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), levelExitAllowed: exitAllowed },
  });
  return store;
}

describe('перехід Р3 → Р4', () => {
  beforeEach(() => jest.useFakeTimers({ now: T0 }));
  afterEach(() => jest.useRealTimers());

  test('AC-1: після пройденої підсумкової Р3 цифровізація з переходом - акт, наказ № 4, шапка «Генштаб · зал для доповідей», 7 потоків і 6 ланок', async () => {
    const store = game(3, { signatures: 1e12, prestigePoints: 90, lifetimeCycle: 40 * 40 * D3 }, { '3': 6 }, true);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-digital'));
    expect(screen.getByTestId('digit-cta')).toHaveTextContent('Оцифрувати й перейти');
    expect(screen.getByTestId('digit-exit-ok')).toHaveTextContent(has('Перехід дозволено'));
    await fireEvent.press(screen.getByTestId('digit-cta'));
    expect(screen.getByTestId('confirm-lvl')).toHaveTextContent(has('переведення в зал доповідей'));
    await fireEvent(screen.getByTestId('digit-hold'), 'pressIn');
    await act(async () => { jest.advanceTimersByTime(1300); });
    expect(screen.getByTestId('digit-result')).toHaveTextContent(has('Наказ про переведення до зали доповідей вже друкують.'));
    await fireEvent.press(screen.getByTestId('digit-result-ok'));
    expect(screen.getByTestId('level-up-r4')).toHaveTextContent(has('НАКАЗ № 4'));
    expect(screen.getByTestId('level-up-r4')).toHaveTextContent(has('Біля трибуни - стіл для документів «до наради»'));
    expect(screen.getByTestId('level-up-ok')).toHaveTextContent('Прибути до зали доповідей');
    expect(store.getState().events.some((e) => e.type === 'levelAdvance')).toBe(true);
    await fireEvent.press(screen.getByTestId('level-up-ok'));
    expect(store.getState().state.level).toBe(4);
    expect(store.getState().state.streamLevels).toHaveLength(7);
    expect(store.getState().state.stageLevels).toHaveLength(6);
    expect(screen.getByTestId('place')).toHaveTextContent('Генштаб · зал для доповідей');
    expect(screen.getByTestId('unit-zpz')).toBeTruthy();
    expect(screen.getByTestId('unit-dopovid')).toBeTruthy();
    expect(screen.getByTestId('toast')).toHaveTextContent(has('Доповідь: нова ланка труби'));
  });

  test('без пройденої підсумкової Р3 цифровізація лишає на Р3 (звичайна, не остання)', async () => {
    const store = game(3, { signatures: 1e12, prestigePoints: 90, lifetimeCycle: 40 * 40 * D3 }, { '3': 6 }, false);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-digital'));
    expect(screen.getByTestId('digit-cta')).toHaveTextContent('Оцифрувати командування');
    expect(screen.queryByTestId('digit-exit-ok')).toBeNull();
  });

  test('Р4 на digital: «Цифровізацій на рівні», доріжка (Генштаб «зараз», Р5 «пізніше»), примітка про пізніший рівень', async () => {
    const store = game(4, { signatures: 1e12, prestigePoints: 90, lifetimeCycle: 40 * 40 * 22.9e12 }, { '4': 2 }, false);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-digital'));
    expect(screen.getByTestId('digit-cta')).toHaveTextContent('Оцифрувати зал доповідей');
    expect(screen.getByTestId('digit-track')).toHaveTextContent(has('Генштабзараз'));
    expect(screen.getByTestId('digit-track')).toHaveTextContent(has('Без паперупізніше'));
    expect(screen.getByTestId('digit-later')).toBeTruthy();
  });
});

describe('картка «Звіти про звіти» (FR-12, AC-9)', () => {
  test('частка від суми потоків, виробіток, приріст наступного рівня й межа', async () => {
    const store = game(4, { streamLevels: [30, 20, 10, 5, 3, 2, 8], stageLevels: [1000, 1000, 1000, 1000, 1000, 1000], streamClerks: Array(7).fill(true), stageClerks: Array(6).fill(true) });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('zpz-share')).toHaveTextContent(has('41,3% від суми потоків · +'));
    expect(screen.getByTestId('zpz-next')).toHaveTextContent(has('Наступний рівень: +'));
    expect(screen.getByTestId('zpz-cap')).toHaveTextContent('Більше 60% не буває: звітувати треба й про щось.');
  });
});
