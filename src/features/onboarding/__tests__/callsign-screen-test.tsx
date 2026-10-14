// 002 AC-3, AC-4, AC-5 (Sentry-частина); FR-5…FR-10.
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Sentry from '@sentry/react-native';

import { reportCorruptSave } from '@/save/report';

import { OnboardingScreen } from '../OnboardingScreen';
import { storeAt } from '../test-utils';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@sentry/react-native', () => ({ captureMessage: jest.fn() }));

describe('крок 3: позивний', () => {
  test('AC-3: «Ексель» з підказкою o3.h1, стать порожня; без статі — o3.err3, крок не закрито', async () => {
    const store = storeAt(3);
    await render(<OnboardingScreen store={store} />);
    expect(screen.getByTestId('o3-opt-excel')).toBeSelected();
    expect(screen.getByTestId('o3-hint')).toHaveTextContent('Так тебе вже записав начштабу');
    expect(screen.getByTestId('o3-g-m')).not.toBeSelected();
    expect(screen.getByTestId('o3-g-f')).not.toBeSelected();
    await fireEvent.press(screen.getByTestId('o3-cta'));
    expect(screen.getByTestId('o3-err')).toHaveTextContent('Обери, як писати в наказах: прибув чи прибула.');
    expect(store.getState().onboarding.step).toBe(3);
  });

  test('AC-4: 1 знак — кнопка неактивна й o3.err5; 17 — «17/16» і o3.err1; «зсу-1» — o3.err4, не записано', async () => {
    const store = storeAt(3);
    await render(<OnboardingScreen store={store} />);
    await fireEvent.press(screen.getByTestId('o3-custom'));
    const field = screen.getByTestId('callsign-field');
    await fireEvent.changeText(field, 'А');
    expect(screen.getByTestId('o3-sheet-cta')).toBeDisabled();
    expect(screen.getByTestId('callsign-err')).toHaveTextContent('У графу треба вписати щонайменше 2 знаки.');
    await fireEvent.changeText(field, 'Ексель-на-паперіх');
    expect(screen.getByTestId('callsign-count')).toHaveTextContent('17/16');
    expect(screen.getByTestId('callsign-err')).toHaveTextContent('У графу влазить до 16 знаків.');
    await fireEvent.changeText(field, 'зсу-1');
    await fireEvent.press(screen.getByTestId('o3-sheet-cta'));
    expect(screen.getByTestId('callsign-err')).toHaveTextContent('Такого в книгу не впишуть. Обери інший позивний.');
    expect(screen.getByTestId('callsign-input')).toBeTruthy();
    expect(store.getState().onboarding.callsign).toBeNull();
  });

  test('AC-5: свій «Сисадмін» і «вона» — custom, f; у звіті Sentry позивного немає', async () => {
    const store = storeAt(3);
    await render(<OnboardingScreen store={store} />);
    await fireEvent.press(screen.getByTestId('o3-custom'));
    await fireEvent.changeText(screen.getByTestId('callsign-field'), 'Сисадмін');
    await fireEvent.press(screen.getByTestId('o3-sheet-cta'));
    expect(screen.getByTestId('book-callsign')).toHaveTextContent('Сисадмін');
    await fireEvent.press(screen.getByTestId('o3-g-f'));
    await fireEvent.press(screen.getByTestId('o3-cta'));
    expect(store.getState().onboarding).toMatchObject({ step: 4, callsign: { type: 'custom', text: 'Сисадмін' }, gender: 'f' });
    reportCorruptSave({ reason: 'checksum', schemaVersion: 2, sizeChars: 100, hasBackup: true });
    expect(JSON.stringify((Sentry.captureMessage as jest.Mock).mock.calls)).not.toMatch(/Сисадмін/);
  });
});
