// 017 на екрані: move-intro у спокійну мить (AC-1), очікування між сесіями (AC-2), пауза у фоні (AC-3),
// втрата паперу й недоторкані підписи (AC-4), аркуш слота «Переїзд» і `archive_sheet_unlock` source = move (AC-5), move_finish.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { memoryAnalytics } from '@/analytics/service';
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import { DEFAULT_ENV } from '@/features/conveyor/analytics';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { MOVE_MS } from '@/move/move';
import { onboardingDone } from '@/save/migrations';
import { SHEETS } from '@/story/archive';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const T0 = new Date(2025, 9, 10, 12).getTime();
const p = bundledConfig.params;
const WINDOW = MOVE_MS / p.moveBoxes;
const MOVE_SHEET = SHEETS.find((s) => s.source.kind === 'move' && s.level === 3)!;

function game(level = 3, paper = 1000) {
  const m = memoryAnalytics();
  const store = createConveyorStore(T0, bundledConfig, {
    state: { ...newGame(bundledConfig, T0), level, paper },
    onboarding: onboardingDone(),
    installId: '8f3c1d52-0000-4000-8000-000000000017',
    env: { ...DEFAULT_ENV, strict: true },
    services: { analytics: m.service },
  });
  store.setState({ lastMs: T0 });
  return { store, m };
}

beforeEach(() => jest.useFakeTimers({ now: T0 }));
afterEach(() => jest.useRealTimers());

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('move-intro', () => {
  test('AC-1: на Р3 у спокійну мить відкривається move-intro; після переїзду більше не відкривається', async () => {
    const { store } = game();
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('mi-title')).toHaveTextContent('Частина міняє позицію');
    expect(screen.getByTestId('mi-body')).toHaveTextContent(new RegExp(`Склади ${p.moveBoxes} ящиків з паперами за 20 с`));
    await fireEvent.press(screen.getByTestId('mi-skip'));
    await fireEvent.press(screen.getByTestId('mr-close'));
    expect(screen.queryByTestId('move-intro')).toBeNull();
    expect(store.getState().move.done).toEqual([3]);
  });

  test('FR-1: на Р2 переїзду немає', async () => {
    const { store } = game(2);
    await render(<MainScreen store={store} />);
    expect(screen.queryByTestId('move-intro')).toBeNull();
  });

  test('AC-2: переїзд чекає; без гравця паперу не списано, у наступній сесії - знову move-intro', async () => {
    const { store } = game(3, 1000);
    const first = await render(<MainScreen store={store} />);
    expect(screen.getByTestId('move-intro')).toBeTruthy();
    await first.unmount();
    await act(async () => {
      await store.getState().goBackground(T0 + 1000);
      store.getState().away(T0 + 1000, T0 + 3_600_000);
      await store.getState().comeForeground(T0 + 3_600_000);
    });
    store.getState().claim();
    expect(store.getState().move.done).toEqual([]);
    expect(store.getState().events.some((e) => e.type === 'moveFinish')).toBe(false);
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('move-intro')).toBeTruthy();
  });
});

describe('пропуск і результат', () => {
  test('FR-10, AC-4, AC-5: пропуск - 50 % паперу, підписи й рівень ті самі; аркуш «Переїзд», source = move; move_finish', async () => {
    const { store, m } = game(3, 1000);
    const before = store.getState().state;
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('mi-skip'));
    expect(screen.getByTestId('mr-stacked')).toHaveTextContent('Ящики вантажили без тебе.');
    expect(screen.getByTestId('mr-lost')).toHaveTextContent('Втрачено паперу: 500');
    expect(screen.getByTestId('mr-sheet')).toBeTruthy();
    const after = store.getState().state;
    expect(after.paper).toBeCloseTo(500);
    expect(after.signatures).toBe(before.signatures);
    expect(after.level).toBe(3);
    expect(after.prestigePoints).toBe(before.prestigePoints);
    expect(m.events.find((e) => e.name === 'move_finish')!.props).toMatchObject({ boxes_stacked: 0, boxes_total: p.moveBoxes, paper_lost: 500, is_skipped: true });
    await fireEvent.press(screen.getByTestId('mr-close'));
    await advance(60_000);
    expect(store.getState().story.sheets[MOVE_SHEET.id]).toBeDefined();
    expect(m.events.find((e) => e.name === 'archive_sheet_unlock' && e.props.sheet_id === MOVE_SHEET.id)!.props.source).toBe('move');
  });
});

describe('move-game', () => {
  test('FR-4: склав усі ящики - паперу не втрачено, акт «Усе доїхало»', async () => {
    const { store } = game(3, 1000);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('mi-start'));
    for (let i = 0; i < p.moveBoxes; i++) {
      await fireEvent.press(screen.getByTestId('mg-box'));
      if (i < p.moveBoxes - 1) await advance(WINDOW);
    }
    expect(screen.getByTestId('mr-stacked')).toHaveTextContent(`Складено ящиків: ${p.moveBoxes} з ${p.moveBoxes}`);
    expect(screen.getByTestId('mr-lost')).toHaveTextContent('Усе доїхало. Паперу не втрачено.');
    expect(store.getState().state.paper).toBe(1000);
  });

  test('FR-4, FR-8: пропущені вікна - нескладені ящики; кінець 20 с закриває гру', async () => {
    const { store } = game(3, 1000);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('mi-start'));
    await fireEvent.press(screen.getByTestId('mg-box'));
    await fireEvent.press(screen.getByTestId('mg-box'));
    expect(screen.getByTestId('mg-count')).toHaveTextContent(`У бусі: 1 з ${p.moveBoxes}`);
    await advance(MOVE_MS + 500);
    expect(screen.getByTestId('mr-stacked')).toHaveTextContent(`Складено ящиків: 1 з ${p.moveBoxes}`);
    expect(store.getState().state.paper).toBeCloseTo(1000 * (1 - (p.moveBoxes - 1) * p.moveLossPerBox));
  });

  test('AC-3: у фоні таймер стоїть, після повернення продовжує з того самого місця', async () => {
    const { store } = game();
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('mi-start'));
    await advance(5000);
    expect(screen.getByTestId('mg-left')).toHaveTextContent('Лишилось 15 с');
    await act(async () => store.getState().goBackground(T0 + 5000));
    await advance(5 * 60_000);
    await act(async () => store.setState({ background: false }));
    await advance(200);
    expect(screen.getByTestId('mg-left')).toHaveTextContent('Лишилось 15 с');
    expect(store.getState().move.done).toEqual([]);
  });

  test('AC-3: вбивство посеред гри - у новій сесії міні-гра знову з початку', async () => {
    const { store } = game();
    const r = await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('mi-start'));
    await advance(8000);
    await r.unmount();
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('move-intro')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('mi-start'));
    expect(screen.getByTestId('mg-left')).toHaveTextContent('Лишилось 20 с');
  });
});
