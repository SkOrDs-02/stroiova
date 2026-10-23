// 001 FR-32, 016 A11: Кіт Сейф на `main` - бонус раз на catCooldownMin з тостом cat.tap і сумою; між бонусами - cat.sleep з хвилинами.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { createConveyorStore } from '@/features/conveyor/store';
import { t } from '@/features/conveyor/texts';
import { lineAt, poolSize } from '@/features/telegrams/lines';
import { onboardingDone } from '@/save/migrations';

import { MainScreen } from '../MainScreen';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const T0 = new Date(2025, 9, 10, 12).getTime();
const tapLines = Array.from({ length: poolSize('cat.tap') }, (_, i) => lineAt('cat.tap', i));

test('перший тап - бонус 5 хв доходу, тост з рядком cat.tap і сумою, грамота «перший кіт»; другий - кіт спить з хвилинами', async () => {
  const store = createConveyorStore(T0, bundledConfig, { onboarding: onboardingDone(), playtimeMs: bundledConfig.params.catFromSec * 1000 });
  const s0 = store.getState().state;
  store.setState({ state: { ...s0, streamLevels: [10, 0, 0, 0], stageLevels: [10, 10, 10] } });
  jest.spyOn(Date, 'now').mockReturnValue(T0);
  await render(<MainScreen store={store} />);
  expect(screen.getByTestId('cat')).toHaveTextContent(t.cat);
  const before = store.getState().state.signatures;
  await act(async () => fireEvent.press(screen.getByTestId('cat')));
  expect(store.getState().state.signatures).toBeGreaterThan(before);
  const toast = [store.getState().toast, ...store.getState().toastQueue].find((x) => x?.kind === 'text');
  const [line, sum] = (toast as { text: string }).text.split('\n');
  expect(tapLines).toContain(line);
  expect(sum).toMatch(/^\+.+ підписів$/);
  expect(store.getState().awards.got.aw_cat_first).toBeTruthy();
  expect(screen.getByTestId('cat')).toHaveTextContent(t.catSleep(bundledConfig.params.catCooldownMin));

  await act(async () => store.getState().clearToast());
  const mid = store.getState().state.signatures;
  await act(async () => fireEvent.press(screen.getByTestId('cat')));
  expect(store.getState().state.signatures).toBe(mid);
  // тост грамоти «перший кіт» може стояти попереду: шукаємо текстовий тост у черзі
  const all = [store.getState().toast, ...store.getState().toastQueue].filter((x): x is { kind: 'text'; text: string } => x?.kind === 'text');
  const sleep = all.at(-1)!.text;
  const mins = String(bundledConfig.params.catCooldownMin);
  const sleepLines = Array.from({ length: poolSize('cat.sleep') }, (_, i) => lineAt('cat.sleep', i).replace('{хв}', mins));
  expect(sleepLines).toContain(sleep);
  (Date.now as jest.Mock).mockRestore();
});

test('кіт не частина онбордингу: до catFromSec ігрового часу плитки немає, тап нічого не дає', async () => {
  const store = createConveyorStore(T0, bundledConfig, { onboarding: onboardingDone(), playtimeMs: bundledConfig.params.catFromSec * 1000 - 1 });
  await render(<MainScreen store={store} />);
  expect(screen.queryByTestId('cat')).toBeNull();
  const before = store.getState().state;
  store.getState().cat(T0);
  expect(store.getState().state).toBe(before);
});
