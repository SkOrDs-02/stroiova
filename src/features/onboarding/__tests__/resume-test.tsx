// 002 AC-19 (перша частина), FR-28: застосунок вбито посеред кроку 4 — крок з початку, позивний і форма на місці.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { draftOf } from '@/features/boot/useBoot';
import { KEY_SAVE, writeSave } from '@/save/repository';
import { memoryStorage } from '@/save/storage';

import { storeAt } from '../test-utils';

const mockKv = memoryStorage();
jest.mock('@/save/mmkv', () => ({ createStorage: () => mockKv }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000002' }));
jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('@sentry/react-native', () => ({ captureMessage: jest.fn(), init: jest.fn(), wrap: (c: unknown) => c }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

// eslint-disable-next-line import/first
import Index from '@/app/index';

async function boot() {
  await render(<Index />);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}

describe('відновлення онбордингу', () => {
  test('AC-19: крок 4 з 5 тапами → після вбивства «0 з 8», позивний і форма записані, кроки 1–3 не повторюються', async () => {
    const before = storeAt(4, 'f');
    for (let i = 0; i < 5; i++) before.getState().actSign();
    writeSave(mockKv, draftOf(before)!);
    await boot();
    expect(screen.getByTestId('onb-first-act')).toBeTruthy();
    expect(screen.getByTestId('o4-prog')).toHaveTextContent('0 з 8');
    const saved = JSON.parse(mockKv.getString(KEY_SAVE)!).game.onboarding;
    expect(saved).toMatchObject({ step: 4, callsign: { type: 'excel', text: 'Ексель' }, gender: 'f' });
    expect(saved.completed.map((c: { step: number }) => c.step)).toEqual([1, 2, 3]);
  });

  test('FR-28: закритий крок пишеться одразу, без чекання автозапису', async () => {
    for (const k of Object.keys(mockKv.dump())) mockKv.remove(k);
    await boot();
    await fireEvent.press(screen.getByTestId('o1-cta'));
    expect(JSON.parse(mockKv.getString(KEY_SAVE)!).game.onboarding.step).toBe(2);
  });
});
