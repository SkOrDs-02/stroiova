// 002 AC-1 (без PostHog), AC-2; FR-1…FR-4.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { OnboardingScreen } from '../OnboardingScreen';
import { storeAt } from '../test-utils';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

describe('кроки 1–2', () => {
  test('AC-1: титул без системних вікон; «Прибути в частину» закриває крок 1 один раз і відкриває вступ', async () => {
    const store = storeAt(1);
    await render(<OnboardingScreen store={store} />);
    expect(screen.getByTestId('onb-title')).toHaveTextContent(/Без реєстрації/);
    const cta = screen.getByTestId('o1-cta');
    await fireEvent.press(cta);
    await fireEvent.press(cta);
    expect(store.getState().onboarding.completed.filter((c) => c.step === 1)).toHaveLength(1);
    expect(screen.getByTestId('onb-intro')).toBeTruthy();
  });

  test('AC-2: «Пропустити» — одразу позивний, skipped: true', async () => {
    const store = storeAt(2);
    await render(<OnboardingScreen store={store} />);
    await fireEvent.press(screen.getByTestId('o2-skip'));
    expect(screen.getByTestId('onb-callsign')).toBeTruthy();
    expect(store.getState().onboarding.completed.at(-1)).toMatchObject({ step: 2, skipped: true });
  });

  test('AC-2: «Далі» 4 рази — репліки 2–4 по черзі, skipped: false', async () => {
    const store = storeAt(2);
    await render(<OnboardingScreen store={store} />);
    expect(screen.getByTestId('o2-line-1')).toHaveTextContent(/поповнення/);
    await fireEvent.press(screen.getByTestId('o2-next'));
    expect(screen.getByTestId('o2-line-2')).toHaveTextContent(/бекенду/);
    await fireEvent.press(screen.getByTestId('o2-next'));
    expect(screen.getByTestId('o2-line-3')).toHaveTextContent(/стройовій/);
    await fireEvent.press(screen.getByTestId('o2-next'));
    expect(screen.getByTestId('o2-line-4')).toHaveTextContent(/архів/);
    await fireEvent.press(screen.getByTestId('o2-next'));
    expect(store.getState().onboarding.completed.at(-1)).toMatchObject({ step: 2, skipped: false });
    expect(screen.getByTestId('onb-callsign')).toBeTruthy();
  });
});
