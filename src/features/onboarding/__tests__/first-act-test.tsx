// 002 AC-6 (без звуку), AC-7 (без звуку); FR-11, FR-12.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { AccessibilityInfo } from 'react-native';

import { bundledConfig } from '@/economy/config';
import { ACT_TAPS } from '@/features/conveyor/store';

import { OnboardingScreen } from '../OnboardingScreen';
import { storeAt } from '../test-utils';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
  AndroidHaptics: { Keyboard_Tap: 'keyboard-tap', Confirm: 'confirm' },
}));

async function tapToEnd(reduceMotion: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduceMotion);
  jest.useFakeTimers();
  const store = storeAt(4, 'f');
  await render(<OnboardingScreen store={store} />);
  const cta = screen.getByTestId('o4-cta');
  for (let i = 0; i < 7; i++) await fireEvent.press(cta);
  expect(screen.getByTestId('o4-prog')).toHaveTextContent('7 з 8');
  for (let i = 0; i < 3; i++) await fireEvent.press(cta);
  await act(async () => jest.runAllTimers());
  return store;
}

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('кроки 4–5: перший акт', () => {
  test('AC-6: 7 з 8 і ще 3 тапи — рівно 8, ПОГОДЖЕНО раз, коментар у формі «вона», «Пташка» на 20 хв', async () => {
    const store = await tapToEnd(false);
    const st = store.getState();
    expect(st.state.signatures).toBe(ACT_TAPS * bundledConfig.params.tapValue);
    expect(st.onboarding.completed.filter((c) => c.step === 4)).toHaveLength(1);
    expect(st.onboarding.completed.filter((c) => c.step === 5)).toHaveLength(1);
    expect(st.onboarding.birdLeftMs).toBe(bundledConfig.params.onboardingBirdMin * 60_000);
    expect(screen.getAllByTestId('o4-stamp')).toHaveLength(1);
    expect(screen.getByTestId('o4-comment')).toHaveTextContent('Цього разу встигла за хвилину. Далі буде довше.');
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('o4-cta2'));
    expect(store.getState().actResultOpen).toBe(false);
  });

  test('AC-7: Reduce Motion — без тремтіння й хаптики, крок 5 закривається', async () => {
    const store = await tapToEnd(true);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(store.getState().onboarding.step).toBe(6);
  });
});
