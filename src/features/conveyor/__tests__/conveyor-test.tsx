// Зріз 001: екран рендериться, печатка й покупка змінюють баланс, повернення показує довідку.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { cfgV5, HOUR, T0 } from '@/economy/test-fixtures';

import { MainScreen as ConveyorScreen } from '@/features/main/MainScreen';
import { createConveyorStore } from '../store';

// ігровий цикл (requestAnimationFrame) перевіряють юніт-тести advance; тут він заважав би act()
jest.mock('../useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

describe('<ConveyorScreen />', () => {
  test('печатка додає підписи, Рапорти купуються за ×1', async () => {
    const store = createConveyorStore(T0, cfgV5());
    await render(<ConveyorScreen store={store} />);
    expect(screen.getByTestId('flow-line')).toHaveTextContent(/Вузько: потоки/);
    for (let i = 0; i < 5; i++) await fireEvent.press(screen.getByTestId('seal'));
    expect(store.getState().state.signatures).toBeGreaterThanOrEqual(10);
    await act(async () => store.setState({ state: { ...store.getState().state, signatures: 100 } }));
    await fireEvent.press(screen.getByTestId('buy-raporty'));
    expect(store.getState().state.streamLevels[0]).toBe(2);
    expect(store.getState().events.at(-1)).toMatchObject({ type: 'purchase', levelTo: 2 });
  });

  test('повернення після 2 год без діловодів — довідка «Стройова стояла»', async () => {
    const store = createConveyorStore(T0, cfgV5());
    await render(<ConveyorScreen store={store} />);
    await act(async () => store.getState().away(T0, T0 + 2 * HOUR));
    expect(await screen.findByTestId('offline-return')).toHaveTextContent(/Стройова стояла/);
    await fireEvent.press(screen.getByTestId('offline-claim'));
    expect(store.getState().offline).toBeNull();
  });
});
