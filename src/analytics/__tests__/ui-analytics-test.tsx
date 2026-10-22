// Аналітика на екранах: telegram_open (перше відкриття), digitization_screen_open, shop_view.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { memoryAnalytics } from '@/analytics/service';
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import { DEFAULT_ENV } from '@/features/conveyor/analytics';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { onboardingDone } from '@/save/migrations';
import { deliverScripted } from '@/telegrams/schedule';

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

function game() {
  const m = memoryAnalytics();
  const store = createConveyorStore(T0, bundledConfig, {
    installId: 'id-1',
    onboarding: { ...onboardingDone(), callsign: { type: 'custom', text: 'Ексель' }, gender: 'f' },
    state: { ...newGame(bundledConfig, T0) },
    env: { ...DEFAULT_ENV, strict: true },
    analytics: { sessionNumber: 0, lastSessionEndMs: null, firstOpenSent: true },
    services: { analytics: m.service },
  });
  store.setState({ lastMs: T0 });
  return { store, ...m };
}

describe('події екранів', () => {
  test('digitization_screen_open: вкладка; shop_view: вкладка', async () => {
    const g = game();
    await render(<MainScreen store={g.store} />);
    g.events.length = 0;
    await fireEvent.press(screen.getByTestId('tab-digital'));
    expect(g.events[0]).toMatchObject({ name: 'digitization_screen_open', props: { source: 'tab', is_eligible: false, points_available: 0 } });
    await fireEvent.press(screen.getByTestId('tab-shop'));
    expect(g.events[1]).toMatchObject({ name: 'shop_view', props: { source: 'tab', is_starter_pack_available: true } });
  });

  test('telegram_open: перше відкриття запису шле подію', async () => {
    const g = game();
    const r = deliverScripted(g.store.getState().telegrams, 'tg_0108_shutdown_order', T0 - 120_000);
    g.store.setState({ telegrams: { ...r.tg, startMs: T0 - 1e6 } });
    await render(<MainScreen store={g.store} />);
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    g.events.length = 0;
    const uid = g.store.getState().telegrams.inbox[0]!.uid;
    await fireEvent.press(screen.getByTestId(`tg-row-${uid}`));
    expect(g.events.find((e) => e.name === 'telegram_open')).toMatchObject({ props: { telegram_id: 'tg_0108_shutdown_order', source: 'inbox' } });
  });
});
