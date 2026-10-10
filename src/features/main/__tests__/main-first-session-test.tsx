// 002 AC-8, AC-9, AC-10; FR-13…FR-17.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { storeAt } from '@/features/onboarding/test-utils';

import { MainScreen } from '../MainScreen';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

// затемнені коучем рядки сховані від скрінрідера (importantForAccessibility), тож шукаємо й їх
const hidden = { includeHiddenElements: true };

const setSig = (store: ReturnType<typeof storeAt>, n: number) => act(async () => store.setState({ state: { ...store.getState().state, signatures: n } }));

describe('main першої сесії', () => {
  test('AC-8: Рапорти відкриті, решта потоків замкнені, 3 ланки, таббар видно', async () => {
    const store = storeAt(6);
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('tabbar')).toBeTruthy();
    expect(screen.getByTestId('unit-raporty')).toBeTruthy();
    for (const id of ['kombat', 'stroy', 'fin']) expect(screen.getByTestId(`unit-${id}`, hidden)).toBeTruthy();
    expect(screen.getByTestId('unit-akty', hidden)).toHaveTextContent(/Відкрити/);
    expect(store.getState().state.streamLevels.slice(1)).toEqual([0, 0, 0]);
  });

  test('AC-9: коуч кроку 6 — тап поза ціллю нічого не робить, по цілі купує рівень; конфіг закріплено', async () => {
    const store = storeAt(6);
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('coach-text')).toHaveTextContent('Покращ рапорти: їх піде більше.');
    const before = store.getState().state.signatures;
    await fireEvent.press(screen.getByTestId('seal', hidden));
    await fireEvent.press(screen.getByTestId('buy-kombat', hidden));
    await fireEvent.press(screen.getByTestId('mode-x10', hidden));
    expect(store.getState().state.signatures).toBe(before);
    expect(store.getState().mode).toBe('x1');
    await fireEvent.press(screen.getByTestId('buy-raporty'));
    expect(store.getState().state.streamLevels[0]).toBe(2);
    expect(store.getState().onboarding.step).toBe(7);
    expect(store.getState().pinned?.version).toBe(bundledConfig.version);
    expect(screen.queryByTestId('coach-text')).toBeNull();
  });

  test('AC-10: 150 → ціна діловода — коуч найму Стройової; найм → clerk-first → «Далі» → тост b7.toast', async () => {
    const store = storeAt(7);
    const price = bundledConfig.params.stages.find((u) => u.id === 'stroy')!.manager;
    await render(<MainScreen store={store} />);
    await setSig(store, 150);
    expect(screen.queryByTestId('coach-text')).toBeNull();
    await setSig(store, price);
    expect(screen.getByTestId('coach-text')).toHaveTextContent('Без діловода ланка працює, лише поки ти в грі.');
    await fireEvent.press(screen.getByTestId('hire-kombat', hidden));
    expect(store.getState().state.stageClerks).toEqual([false, false, false]);
    await fireEvent.press(screen.getByTestId('hire-stroy'));
    expect(store.getState().events.at(-1)).toMatchObject({ type: 'clerkHire', target: { id: 'stroy' }, isFirstClerk: true });
    expect(store.getState().onboarding.step).toBe(8);
    expect(screen.getByTestId('clerk-first')).toHaveTextContent(/Оля «Штамп»/);
    await fireEvent.press(screen.getByTestId('clerk-first-next'));
    expect(screen.queryByTestId('clerk-first')).toBeNull();
    expect(screen.getByTestId('toast')).toHaveTextContent('Оля на місці. Ще 3 діловоди - і стройова піде без тебе.');
  });
});

describe('черга тостів', () => {
  test('FR-17, FR-18: найм після 300 с гри — спершу clerk-first і b7.toast, потім телеграма й b8.toast', async () => {
    const store = storeAt(7);
    await act(async () => store.setState({ playtimeMs: 330_000 }));
    await render(<MainScreen store={store} />);
    await setSig(store, 1e6);
    await fireEvent.press(screen.getByTestId('hire-stroy'));
    expect(store.getState().onboarding.tg1ReceivedAtPlayMs).toBeNull();
    await fireEvent.press(screen.getByTestId('clerk-first-next'));
    expect(screen.getByTestId('toast')).toHaveTextContent(/Оля на місці/);
    expect(store.getState().onboarding.tg1ReceivedAtPlayMs).toBe(330_000);
    expect(store.getState().toastQueue).toEqual([{ kind: 'text', text: 'Телеграма згори. Строк виконання: учора.' }]);
    await act(async () => store.getState().clearToast());
    expect(screen.getByTestId('toast')).toHaveTextContent('Телеграма згори. Строк виконання: учора.');
  });
});
