// 012 на екрані й у сторі: стос біля трибуни (AC-10), «Метр звітів» (AC-11), нова сесія й цифровізація, «Доповідь тезово» (AC-13), запис.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { income } from '@/economy/game/income';
import { itemsFor, newGame } from '@/economy/game/state';
import type { EconomyConfig } from '@/economy/game/types';
import { needsSaveNow } from '@/features/boot/useBoot';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { onboardingDone } from '@/save/migrations';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const HOUR = 3_600_000;
const T0 = new Date(2025, 9, 10, 12, 0).getTime();
const has = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

function game(z = 40, cfg: EconomyConfig = bundledConfig) {
  const store = createConveyorStore(T0, cfg);
  const g = { ...newGame(cfg, T0), level: 4 };
  const it = itemsFor(g, cfg);
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    inspections: { ...store.getState().inspections, installMs: T0 - 9 * 24 * HOUR },
    telegrams: { ...store.getState().telegrams, startMs: T0 - 9 * 24 * HOUR },
    state: { ...g, streamLevels: it.streams.map((u) => (u.share ? z : 30)), stageLevels: it.stages.map(() => 100), streamClerks: it.streams.map(() => true), stageClerks: it.stages.map(() => true), prestigePoints: 100 },
  });
  return store;
}

afterEach(async () => {
  await act(async () => {});
});

describe('стос біля трибуни (AC-10)', () => {
  test('на Р4: «До наради: 0 см»; росте з тіками; на Р3 стосу немає', async () => {
    const store = game(8);
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('stack-label')).toHaveTextContent('До наради: 0 см');
    await act(async () => store.getState().tick(T0 + 200 * 60_000));
    const cm = store.getState().digit.stack.cm;
    expect(cm).toBeGreaterThan(30);
    expect(screen.getByTestId('stack-label')).toHaveTextContent(`До наради: ${Math.floor(cm)} см`);
  });

  test('на Р3 стос не показується', async () => {
    const store = game(8);
    store.setState({ state: { ...store.getState().state, level: 3, streamLevels: [30, 30, 30, 30, 30, 30], stageLevels: [10, 10, 10, 10, 10], streamClerks: Array(6).fill(true), stageClerks: Array(5).fill(true) } });
    await render(<MainScreen store={store} />);
    expect(screen.queryByTestId('stack')).toBeNull();
  });

  test('нова сесія - з нуля; тік за ту саму сесію не скидає', async () => {
    const store = game(8);
    await act(async () => store.getState().tick(T0 + 60 * 60_000));
    expect(store.getState().digit.stack.cm).toBeGreaterThan(5);
    await act(async () => store.getState().away(T0 + 60 * 60_000, T0 + 61 * 60_000));
    expect(store.getState().digit.stack.cm).toBeGreaterThan(5);
    await act(async () => store.getState().away(T0 + 61 * 60_000, T0 + 61 * 60_000 + 3 * HOUR));
    // нова сесія: стос = зарахований офлайн (3 год), а не 1 год минулої сесії плюс офлайн
    const cm = store.getState().digit.stack.cm;
    const perMin = cm / 180;
    expect(store.getState().digit.stack.offlineCm).toBeCloseTo(cm, 9);
    expect(perMin).toBeGreaterThan(0);
  });
});

describe('«Метр звітів» (AC-11)', () => {
  test('офлайн 8 год при великій частці: запис у курйозах, тост, подія; вдруге в циклі - ні; після цифровізації знову можна', async () => {
    const store = game(60);
    await act(async () => store.getState().away(T0, T0 + 8 * HOUR));
    const st = store.getState();
    expect(st.digit.stack.reached).toBe(true);
    expect(st.events.filter((e) => e.type === 'stackReach')).toHaveLength(1);
    expect(st.museum.curios.filter((c) => c.kind === 'stack')).toHaveLength(1);
    expect(st.toast).toMatchObject({ kind: 'text' });
    await act(async () => store.getState().away(T0 + 8 * HOUR, T0 + 16 * HOUR));
    expect(store.getState().museum.curios.filter((c) => c.kind === 'stack')).toHaveLength(1);
    // цифровізація скидає стос і прапорець циклу
    const ds = store.getState().digit;
    store.setState({ digit: { ...ds, stack: { ...ds.stack, cm: 0, reached: false } } });
    await act(async () => store.getState().away(T0 + 16 * HOUR, T0 + 24 * HOUR));
    expect(store.getState().museum.curios.filter((c) => c.kind === 'stack')).toHaveLength(2);
  });

  test('журнал курйозів: рядок «МЕТР ЗВІТІВ», підсумок, документ запису', async () => {
    const store = game(60);
    await act(async () => store.getState().away(T0, T0 + 8 * HOUR));
    if (store.getState().offline) store.getState().claim();
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    await fireEvent.press(screen.getByTestId('mu-seg-curios'));
    expect(screen.getByTestId('curios-summary')).toHaveTextContent(has('1 запис'));
    expect(screen.getByTestId('curios-summary')).toHaveTextContent(has('1 метр звітів'));
    expect(screen.getByTestId('curio-1')).toHaveTextContent(has('МЕТР ЗВІТІВ'));
    await fireEvent.press(screen.getByTestId('curio-1'));
    expect(screen.getByTestId('curio-stack')).toHaveTextContent(has('Метр звітів. Нарада ще не почалась.'));
  });

  test('AC-12: пункт stack_meter купується за підписи при стосі 30 см і 0 см однаково, дохід не залежить від стосу', async () => {
    const run = async (cm: number) => {
      const store = game(8);
      store.setState({ digit: { ...store.getState().digit, stack: { sessionStartMs: T0, cm, offlineCm: 0, reached: false } }, state: { ...store.getState().state, signatures: 1e15 } });
      await act(async () => store.getState().tick(T0 + 61_000));
      const insp = store.getState().inspections;
      const items = [{ id: 'stack_meter', price: 100, done: false }];
      store.setState({ inspections: { ...insp, active: { id: 'insp_0001', no: 1, trigger: 'scheduled', boss: 'command_commission', level: 4, kind: 'regular', attempt: 1, annMs: T0, arrMs: T0 + 5 * HOUR, items, reason: null, remark: false, warned: true, modal: false }, nextNo: 2 } });
      const ok = store.getState().buyInspItem('stack_meter');
      return { ok, paid: 1e15 - store.getState().state.signatures, done: store.getState().inspections.active?.items[0]?.done, income: income(store.getState().state, store.getState().cfg, T0 + 61_000).perMin };
    };
    const a = await run(0);
    const b = await run(30);
    expect(a.ok).toBe(true);
    expect(b).toMatchObject({ ok: true, done: true });
    expect(b.paid).toBe(a.paid);
    expect(b.income).toBe(a.income);
  });
});

describe('запис', () => {
  test('ріст стосу щотіка не викликає негайний запис; прапорець «Метр звітів» - викликає', () => {
    const store = game(8);
    const a = store.getState();
    store.setState({ digit: { ...a.digit, stack: { ...a.digit.stack, cm: 10 } } });
    expect(needsSaveNow(store.getState(), a)).toBe(false);
    const b = store.getState();
    store.setState({ digit: { ...b.digit, stack: { ...b.digit.stack, reached: true } } });
    expect(needsSaveNow(store.getState(), b)).toBe(true);
  });
});

describe('«Доповідь тезово» (AC-13)', () => {
  test('нова сесія при chance = 1: документ від Кави у «Нових» з рядком пулу, бейдж, відповідь «Переписати тезово» дає ×0,5 на «Доповідь»', async () => {
    const cfg: EconomyConfig = { ...bundledConfig, params: { ...bundledConfig.params, brief: { chance: 1, minGapDays: 3 } } };
    const store = game(8, cfg);
    await act(async () => store.getState().away(T0, T0 + HOUR));
    if (store.getState().offline) store.getState().claim();
    const item = store.getState().telegrams.inbox.find((x) => x.id === 'tg_event_brief');
    expect(item).toMatchObject({ status: 'new' });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('tab-telegrams-badge')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    await fireEvent.press(screen.getByTestId(`tg-row-${item!.uid}`));
    expect(screen.getByTestId('tg-detail')).toHaveTextContent(has('Про доповідь тезово'));
    await fireEvent.press(screen.getByTestId('tg-choice-rewrite'));
    expect(store.getState().effects.find((e) => e.source === 'telegram_slow')).toMatchObject({ value: 0.5, target: { type: 'stage', id: 'dopovid' } });
  });
});
