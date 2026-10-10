// 009 AC-19 (без онбордингу — 002), AC-3/AC-4 на екрані, AC-8, FR-22.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { HOUR } from '@/economy/test-fixtures';
import { KEY_BAK1, KEY_SAVE, serialize, snapshot, writeSave } from '@/save/repository';
import { memoryStorage } from '@/save/storage';
import { draft } from '@/save/test-saves';

const mockKv = memoryStorage();
jest.mock('@/save/mmkv', () => ({ createStorage: () => mockKv }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000001' }));
jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('@sentry/react-native', () => ({ captureMessage: jest.fn(), init: jest.fn(), wrap: (c: unknown) => c }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

// eslint-disable-next-line import/first
import Index from '@/app/index';

function reset() {
  for (const k of Object.keys(mockKv.dump())) mockKv.remove(k);
}

async function boot() {
  await render(<Index />);
  await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
}

describe('запуск', () => {
  beforeEach(reset);

  test('порожнє сховище → гра, запис і install_id створено', async () => {
    await boot();
    expect(screen.getByTestId('flow-line')).toBeTruthy();
    expect(mockKv.getString(KEY_SAVE)).toBeDefined();
    expect(mockKv.getString('install_id')).toMatch(/.+/);
  });

  test('AC-19: запис із відсутністю 3 год і діловодами → offline-return', async () => {
    writeSave(mockKv, draft({ savedAt: Date.now() - 3 * HOUR }, { streamClerks: [true, false, false, false], stageClerks: [true, true, true] }));
    await boot();
    expect(await screen.findByTestId('offline-return')).toHaveTextContent(/Зараховано 3/);
  });

  test('годинник назад → гра з тостом, без довідки (FR-14)', async () => {
    writeSave(mockKv, draft({ savedAt: Date.now() + 2 * HOUR }, { streamClerks: [true, false, false, false], stageClerks: [true, true, true] }));
    await boot();
    expect(await screen.findByTestId('toast')).toHaveTextContent(/Годинник переводили назад/);
    expect(screen.queryByTestId('offline-return')).toBeNull();
  });

  test('AC-3/AC-4: обрізаний запис → save-error з копією → «Відновити з копії» → гра', async () => {
    writeSave(mockKv, draft({ savedAt: Date.now() - 60_000 }, { signatures: 777 }));
    snapshot(mockKv);
    mockKv.set(KEY_SAVE, serialize(draft()).slice(0, 80));
    await boot();
    expect(screen.getByTestId('save-error')).toBeTruthy();
    expect(screen.getByTestId('save-backup')).toHaveTextContent(/777/);
    await fireEvent.press(screen.getByTestId('save-restore'));
    expect(await screen.findByTestId('flow-line')).toBeTruthy();
    expect(JSON.parse(mockKv.getString(KEY_SAVE)!).game.economy.signatures).toBeGreaterThanOrEqual(777);
  });

  test('AC-6: без копії — лише «Почати заново» й «Надіслати звіт»', async () => {
    mockKv.set(KEY_SAVE, '{');
    mockKv.set(KEY_BAK1, 'broken');
    await boot();
    expect(screen.queryByTestId('save-restore')).toBeNull();
    await fireEvent.press(screen.getByTestId('save-report'));
    await fireEvent.press(screen.getByTestId('save-new'));
    expect(await screen.findByTestId('flow-line')).toBeTruthy();
  });

  test('AC-8: новіша схема → force-update з версією запису, запис не змінено', async () => {
    const text = serialize(draft({ schemaVersion: 99, appVersion: '1.2.0' }));
    mockKv.set(KEY_SAVE, text);
    await boot();
    expect(screen.getByTestId('force-update')).toHaveTextContent(/Потрібно щонайменше 1.2.0/);
    expect(mockKv.getString(KEY_SAVE)).toBe(text);
  });
});
