// 016 на екрані й у сторі: тости (AC-10, AC-15), стіна (AC-17), аналітика вимкнена (AC-12), економіка не змінюється (AC-13), заднім числом (AC-20).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { count, newAwards } from '@/awards/awards';
import { bundledConfig } from '@/economy/config';
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

const T0 = new Date(2025, 9, 10, 12).getTime();

function game(patch: Partial<ReturnType<ReturnType<typeof createConveyorStore>['getState']>> = {}, init: Parameters<typeof createConveyorStore>[2] = {}) {
  const store = createConveyorStore(T0, bundledConfig, init);
  store.setState({ onboarding: onboardingDone(), lastMs: T0, ...patch });
  return store;
}

const grants = (ids: string[]) => ids.map((id) => ({ id, atMs: T0, retro: false, offline: false }));

describe('тости грамот', () => {
  test('AC-10: поки онбординг не завершено, тост чекає; далі «Оголошено подяку: Перша телеграма» з «Переглянути»', async () => {
    const store = createConveyorStore(T0, bundledConfig);
    store.getState().awardsUi('cat_tap', { is_bonus: true });
    // онбординг ще йде: грамота записана одразу, тост у черзі
    expect(store.getState().awards.got.aw_cat_first).toBeDefined();
    expect(store.getState().awardQueue).toHaveLength(1);
    await render(<MainScreen store={store} />);
    expect(screen.queryByTestId('toast-awards')).toBeNull();
    await act(async () => store.setState({ onboarding: onboardingDone() }));
    expect(screen.getByTestId('toast')).toHaveTextContent(/Оголошено подяку: .+/);
    expect(screen.getByTestId('toast-awards')).toHaveTextContent('Переглянути');
    expect(store.getState().awardQueue).toHaveLength(0);
  });

  test('AC-15: 3 грамоти однією подією - 2 тости по одному й «Ще 1 на стіні грамот»; «Переглянути» відкриває «Грамоти»', async () => {
    const store = game({ awardQueue: grants(['aw_digit_first', 'aw_museum_first', 'aw_tg_first']) });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('toast')).toHaveTextContent(/^Вручено грамоту: Перша цифровізація/);
    await act(async () => store.getState().clearToast());
    expect(screen.getByTestId('toast')).toHaveTextContent(/Оголошено подяку: /);
    await act(async () => store.getState().clearToast());
    expect(screen.getByTestId('toast')).toHaveTextContent(/^Ще 1 на стіні грамот/);
    await fireEvent.press(screen.getByTestId('toast-awards'));
    expect(screen.getByTestId('awards')).toBeTruthy();
    expect(screen.getByTestId('aw-head')).toHaveTextContent('Грамоти · 0 з 62');
  });

  test('одна грамота: «Переглянути» відкриває її award-detail', async () => {
    const store = game({ awardQueue: grants(['aw_digit_first']) });
    store.setState({ awards: { ...newAwards(), got: { aw_digit_first: { atMs: T0 } } } });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('toast-awards'));
    expect(screen.getByTestId('award-detail')).toBeTruthy();
    expect(screen.getByTestId('aw-doc-title')).toHaveTextContent('ГРАМОТА');
  });

  test('AC-20: оновлення контенту - одна грамота заднім числом і один тост', async () => {
    const store = game({}, { awards: { ...newAwards(), counters: { tg_diligent: 120 } } });
    expect(store.getState().awards.got.aw_tg_diligent_25).toEqual({ atMs: T0, retro: true });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('toast')).toHaveTextContent(/^Оголошено заднім числом: 1/);
  });
});

describe('економіка й аналітика', () => {
  test('AC-13: видача грамоти не змінює стан економіки', () => {
    const store = game();
    const before = store.getState().state;
    store.getState().awardsUi('cat_tap', { is_bonus: true });
    expect(count(store.getState().awards)).toBe(1);
    expect(store.getState().state).toBe(before);
  });

  test('AC-12: з вимкненою аналітикою лічильники працюють', () => {
    const store = game();
    store.getState().setSetting('analytics', false);
    store.getState().awardsUi('cat_tap', { is_bonus: true });
    expect(store.getState().awards.counters.cat_bonus_taps).toBe(1);
    expect(store.getState().events.some((e) => e.type === 'awardUnlock' && e.awardId === 'aw_cat_first')).toBe(true);
  });

  test('події доменів доходять до лічильників через журнал подій (перевірка, цифровізація)', () => {
    const store = game();
    store.setState({ events: [...store.getState().events, { type: 'digitizationComplete', no: 1, level: 1, points: 1, pointsTotal: 1, multiplier: 1, lifetimeLog10: 1, journalsCancelled: [], fromHint: false }] });
    expect(store.getState().awards.counters.digitizations).toBe(1);
    expect(store.getState().awards.got.aw_digit_first).toBeDefined();
    const ev = store.getState().events.find((e) => e.type === 'awardUnlock');
    expect(ev).toMatchObject({ awardId: 'aw_digit_first', category: 'progress', awardsOwnedAfter: 1, isRetroactive: false });
  });

  test('«Скинути прогрес»: грамоти лишаються, лічильники й черга порожні', () => {
    const store = game();
    store.getState().awardsUi('cat_tap', { is_bonus: true });
    store.getState().resetProgress();
    expect(count(store.getState().awards)).toBe(1);
    expect(store.getState().awards.counters).toEqual({});
    expect(store.getState().awardQueue).toEqual([]);
  });
});

describe('стіна', () => {
  test('AC-17: плитки, «37 з 100» для неотриманої, прихована - «Для службового користування»; відкриття позначає переглянутими', async () => {
    const store = game();
    store.setState({ awards: { ...newAwards(), counters: { tg_answered: 37 }, got: { aw_digit_first: { atMs: T0 } } } });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('tab-museum-dot')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tab-museum'));
    expect(screen.getByTestId('mu-seg-awards-dot')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('mu-seg-awards'));
    expect(screen.getByTestId('aw-head')).toHaveTextContent('Грамоти · 1 з 62');
    expect(screen.getByTestId('aw-tile-aw_digit_first')).toHaveTextContent(/Грамота.*Перша цифровізація.*Оголошено 10\.10\.2025/s);
    expect(screen.getByTestId('aw-prog-aw_tg_100')).toHaveTextContent('37 з 100');
    expect(screen.getByTestId('aw-tile-aw_h_drawer_streak')).toHaveTextContent(/Для службового користування.*Умову оголосять після нагородження/s);
    expect(screen.queryByTestId('tab-museum-dot')).toBeNull();
    expect(store.getState().awards.seen).toEqual(['aw_digit_first']);
    expect(store.getState().events.some((e) => e.type === 'awardsWallOpen')).toBe(true);
  });

  test('фільтри «Отримані» й «Попереду», порожній стан', async () => {
    const store = game();
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    await fireEvent.press(screen.getByTestId('mu-seg-awards'));
    await fireEvent.press(screen.getByTestId('aw-filter-owned'));
    expect(screen.getByTestId('aw-none')).toHaveTextContent('Грамот поки немає. Першу оголосять швидше, ніж підпишуть.');
    await fireEvent.press(screen.getByTestId('aw-filter-ahead'));
    expect(screen.queryByTestId('aw-none')).toBeNull();
    expect(screen.getByTestId('aw-sec-progress')).toHaveTextContent(/Служба · 0 з 18/);
  });

  test('award-detail: наказ має номер, "Нагороджується" за статтю; прихована - заглушка без умови', async () => {
    const store = game();
    store.setState({
      onboarding: { ...onboardingDone(), callsign: { type: 'custom', text: 'Ексель' }, gender: 'f' },
      awards: { ...newAwards(), got: { aw_level_bryhada: { atMs: T0, orderNo: 3 } } },
    });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    await fireEvent.press(screen.getByTestId('mu-seg-awards'));
    await fireEvent.press(screen.getByTestId('aw-tile-aw_level_bryhada'));
    expect(screen.getByTestId('aw-doc-title')).toHaveTextContent('ВИТЯГ З НАКАЗУ № 3');
    expect(screen.getByTestId('aw-doc-awardee')).toHaveTextContent('Нагороджується: стройовичка Ексель');
    await fireEvent.press(screen.getByTestId('award-detail-ok'));
    await fireEvent.press(screen.getByTestId('aw-tile-aw_h_drawer_streak'));
    expect(screen.getByTestId('aw-locked')).toHaveTextContent(/Для службового користування.*Умову оголосять після нагородження/s);
  });

  test('особова справа: «Грамоти: N з 62» відкриває музей на грамотах', async () => {
    const store = game();
    store.setState({ awards: { ...newAwards(), got: { aw_digit_first: { atMs: T0 }, aw_tg_first: { atMs: T0 } } } });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('menu-open'));
    await fireEvent.press(screen.getByTestId('menu-profile'));
    expect(screen.getByTestId('pf-awards')).toHaveTextContent('Грамоти: 2 з 62');
    await fireEvent.press(screen.getByTestId('pf-awards'));
    expect(screen.getByTestId('awards')).toBeTruthy();
  });
});
