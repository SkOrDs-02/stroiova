// 013 на екрані: finale-order (AC-11), банер і Y/N (AC-12, AC-13), last-book (AC-14), титри (AC-15).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
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
const DAY = 86_400_000;
const ORDER = bundledConfig.params.convert.order;

const DONE = { start: [], order: ['order'], script: ['order', 'script'], last_book: ['order', 'script', 'last_book'] } as const;

function game(upTo: keyof typeof DONE = 'start') {
  const store = createConveyorStore(T0, bundledConfig);
  store.setState({ onboarding: { ...onboardingDone(), callsign: { type: 'custom', text: 'Ексель' }, gender: 'f' }, lastMs: T0, state: { ...newGame(bundledConfig, T0), level: 5, digital: ORDER } });
  store.getState().tick(T0 + 60_000);
  for (const s of DONE[upTo]) store.getState().finaleComplete(s);
  return store;
}

describe('фінал на екрані', () => {
  test('AC-11: після конвертації № 6 finale-order відкривається сам; 8 тапів дають штамп, «Далі» завершує крок', async () => {
    const store = game('start');
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('finale-order')).toBeTruthy();
    expect(screen.getByTestId('fo-hint')).toHaveTextContent('Скрипт приймає лише паперовий наказ. Підпиши вручну.');
    for (let i = 0; i < 7; i++) await fireEvent.press(screen.getByTestId('fo-sign'));
    expect(screen.getByTestId('fo-prog')).toHaveTextContent('7 з 8');
    expect(screen.queryByTestId('fo-stamp')).toBeNull();
    await fireEvent.press(screen.getByTestId('fo-sign'));
    expect(screen.getByTestId('fo-stamp')).toHaveTextContent('ПОГОДЖЕНО');
    expect(screen.getByTestId('fo-print')).toHaveTextContent('Дід друкує останній аркуш.');
    await fireEvent.press(screen.getByTestId('fo-next'));
    expect(store.getState().finale.done.order).toBeDefined();
    expect(screen.queryByTestId('finale-order')).toBeNull();
    expect(screen.getByTestId('finale-banner')).toHaveTextContent('Розсилка чекає вимкнення');
  });

  test('AC-12: банер на main веде на finale-script; N повертає на main з банером, крок лишається', async () => {
    const store = game('order');
    await render(<MainScreen store={store} />);
    expect(screen.queryByTestId('finale-order')).toBeNull();
    await fireEvent.press(screen.getByTestId('finale-banner'));
    expect(screen.getByTestId('fy-prompt')).toHaveTextContent('ВИМКНУТИ РОЗСИЛКУ? (Y/N)');
    await fireEvent.press(screen.getByTestId('fy-n'));
    expect(store.getState().finale.done.script).toBeUndefined();
    expect(store.getState().finale.scriptNs).toBe(1);
    expect(screen.getByTestId('finale-banner')).toBeTruthy();
  });

  test('AC-13: Y гасить екран, завершує крок, вимикає розсилку; «Далі» веде на last-book', async () => {
    const store = game('order');
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('finale-banner'));
    await fireEvent.press(screen.getByTestId('fy-y'));
    expect(screen.getByTestId('fy-off')).toHaveTextContent('Вентилятор стихає. Екран гасне.');
    expect(store.getState().finale.yMs).not.toBeNull();
    expect(store.getState().telegrams.inbox.some((x) => x.id === 'tg_0110_mailing_stopped')).toBe(true);
    await fireEvent.press(screen.getByTestId('fy-next'));
    expect(screen.queryByTestId('finale-script-yn')).toBeNull();
  });

  test('AC-14: last-book розкриває журнал № 24 як нове надходження, потім запис про кота; «Далі» завершує крок і шле № 111', async () => {
    const store = game('script');
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('finale-banner'));
    expect(store.getState().museum.owned.some((o) => o.no === 24 && o.source === 'finale')).toBe(true);
    // журнал розкривається поверх last-book
    expect(screen.getByTestId('journal-new')).toBeTruthy();
    while (screen.queryByTestId('journal-new')) {
      await fireEvent.press(screen.getByTestId('jn-next'));
    }
    expect(screen.getByTestId('lb-cat')).toHaveTextContent(/Кіт, сірий/);
    expect(screen.getByTestId('lb-cat')).toHaveTextContent(/Висить на Ексель/);
    await fireEvent.press(screen.getByTestId('lb-next'));
    expect(store.getState().finale.done.last_book).toBeDefined();
    expect(store.getState().telegrams.inbox.some((x) => x.id === 'tg_0111_last_book_delivered')).toBe(true);
  });

  test('AC-15: титри - наказ без згадки фонду; «Готово» завершує крок; з about відкриваються повторно', async () => {
    const store = game('last_book');
    store.setState({ story: { ...store.getState().story, skipped: [...store.getState().story.skipped, 'st_archaeologist_05'] } });
    expect(store.getState().finale.done.call).toBeDefined();
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('credits')).toBeTruthy();
    const text = JSON.stringify(screen.toJSON());
    expect(text).toContain('Про особовий склад гри');
    expect(text).toContain('Справи прийняла і папір здала: Ексель');
    expect(text).not.toMatch(/ФОНД|фонд/);
    await fireEvent.press(screen.getByTestId('credits-close'));
    expect(store.getState().finale.done.credits).toBeDefined();
    await fireEvent.press(screen.getByTestId('menu-open'));
    await fireEvent.press(screen.getByTestId('menu-about'));
    await fireEvent.press(screen.getByTestId('about-credits'));
    expect(screen.getByTestId('credits')).toBeTruthy();
    await act(async () => {});
  });
});
