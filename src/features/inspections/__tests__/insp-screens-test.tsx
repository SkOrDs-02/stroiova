// 004 на екрані: call → insp-warning (AC-1), банер → insp-prep (AC-3), «бракує N · ще T» (AC-8),
// акт «пройшли» / «провалили» (AC-10, AC-11), Р2 (AC-18), рядки довідки (AC-15, AC-16).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import type { InspectionState } from '@/inspections/types';
import { onboardingDone } from '@/save/migrations';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const HOUR = 3_600_000;
const local = (h: number, m = 0, day = 0) => new Date(2025, 9, 10 + day, h, m).getTime();

function game(signatures = 1e12, level = 1) {
  const store = createConveyorStore(local(9), bundledConfig);
  const s = store.getState().state;
  store.setState({
    onboarding: onboardingDone(),
    state: { ...s, level, streamLevels: [40, 0, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, false, false, false], stageClerks: [true, true, true], signatures },
  });
  return store;
}

/** Перша перевірка оголошена о 18:00 */
function announced(signatures = 1e12) {
  const store = game(signatures);
  store.getState().away(local(9, 5), local(18));
  // спершу довідка повернення (FR-10): забрано
  store.getState().claim();
  return store;
}

describe('екрани перевірок', () => {
  test('AC-1: call «Археолога» → insp-warning «перший раз» → «Готуватися» відкриває insp-prep', async () => {
    const store = announced();
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('insp-call')).toHaveTextContent(/Тумбочкін/);
    await fireEvent.press(screen.getByTestId('insp-call-ok'));
    expect(screen.getByTestId('insp-warning')).toHaveTextContent(/Їде комісія/);
    expect(screen.getByTestId('insp-warning')).toHaveTextContent(/Буржуйку відкрийте/);
    await fireEvent.press(screen.getByTestId('insp-prepare'));
    expect(screen.getByTestId('insp-prep')).toHaveTextContent(/Готовність до перевірки/);
    expect(screen.getByTestId('insp-ready')).toHaveTextContent('0%');
  });

  test('AC-3: друга планова — без модалки, банер на main, тап відкриває insp-prep', async () => {
    const store = game();
    const ins: InspectionState = { ...store.getState().inspections, nextNo: 2, bossesSeen: ['brigade_commission'], nextArrMs: local(15), nextWarnMin: 150 };
    store.setState({ inspections: ins, lastMs: local(12) });
    await act(async () => store.getState().tick(local(12, 31)));
    await render(<MainScreen store={store} />);
    expect(screen.queryByTestId('insp-warning')).toBeNull();
    expect(screen.getByTestId('insp-banner')).toHaveTextContent(/Перевірка через 2:29:00 · Готуватися/);
    await fireEvent.press(screen.getByTestId('insp-banner'));
    expect(screen.getByTestId('insp-prep')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('insp-back'));
    expect(screen.queryByTestId('insp-prep')).toBeNull();
  });

  test('AC-8: пункт, на який не вистачає, неактивний з «бракує N · ще T»; доступний списує ціну', async () => {
    const store = announced(0);
    const a = store.getState().inspections.active!;
    const cheap = a.items.find((i) => i.id === 'stove_open')!;
    store.setState({ state: { ...store.getState().state, signatures: cheap.price }, inspections: { ...store.getState().inspections, callPending: false, active: { ...a, warned: true } }, inspPrepOpen: true });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('insp-item-journals_stitch')).toHaveTextContent(/бракує .*ще \d/);
    await fireEvent.press(screen.getByTestId('insp-item-journals_stitch'));
    expect(store.getState().inspections.active!.items.find((i) => i.id === 'journals_stitch')!.done).toBe(false);
    await fireEvent.press(screen.getByTestId('insp-item-stove_open'));
    expect(store.getState().inspections.active!.items.find((i) => i.id === 'stove_open')!.done).toBe(true);
    expect(store.getState().state.signatures).toBe(0);
    expect(screen.getByTestId('insp-ready')).toHaveTextContent('20%');
  });

  const arrive = async (buyAll: boolean) => {
    const store = announced();
    const a = store.getState().inspections.active!;
    store.setState({ inspections: { ...store.getState().inspections, callPending: false, active: { ...a, warned: true, items: a.items.map((i, k) => ({ ...i, done: buyAll || k > 0 })) } } });
    await act(async () => store.getState().tick(a.arrMs + 1000));
    await render(<MainScreen store={store} />);
    return store;
  };

  test('AC-10: 5 з 5 — акт «пройшли», ×3 уже діє; «До стройової» закриває', async () => {
    const store = await arrive(true);
    expect(screen.getByTestId('insp-result')).toHaveTextContent(/Акт перевірки № 1/);
    expect(screen.getByTestId('insp-verdict')).toHaveTextContent('пройшли');
    expect(screen.getByTestId('insp-status')).toHaveTextContent(/×3 до підписів уже діє/);
    await fireEvent.press(screen.getByTestId('insp-result-ok'));
    expect(screen.queryByTestId('insp-result')).toBeNull();
    expect(store.getState().inspections.last!.seen).toBe(true);
  });

  test('AC-11: 4 з 5 — «провалили», Стройова ×0,5 на 1 год', async () => {
    await arrive(false);
    expect(screen.getByTestId('insp-verdict')).toHaveTextContent('провалили');
    expect(screen.getByTestId('insp-result')).toHaveTextContent(/не виконано/);
    expect(screen.getByTestId('insp-status')).toHaveTextContent(/×0,5 на 1 год/);
  });

  test('AC-18: Р2 — «Комісія командування», 4 пункти', async () => {
    const store = game(1e12, 2);
    store.setState({ inspections: { ...store.getState().inspections, nextNo: 7, bossesSeen: ['brigade_commission'], nextArrMs: local(15), nextWarnMin: 150 }, lastMs: local(12) });
    await act(async () => store.getState().tick(local(12, 31)));
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('insp-warning')).toHaveTextContent(/Комісія командування · полковник Тумбочкін/);
    expect(store.getState().inspections.active!.items).toHaveLength(4);
  });

  test('AC-15, AC-16: без гравця — рядки перевірки в довідці, insp-result не показується', async () => {
    const store = announced();
    const a = store.getState().inspections.active!;
    store.setState({ inspections: { ...store.getState().inspections, callPending: false, active: { ...a, warned: true, items: a.items.map((i) => ({ ...i, done: true })) } } });
    await act(async () => store.getState().away(local(18), a.arrMs + HOUR));
    await render(<MainScreen store={store} />);
    const rows = screen.getAllByTestId('offline-insp');
    expect(rows[0]).toHaveTextContent(/Перевірка Тумбочкіна.*без зауважень/);
    expect(rows[1]).toHaveTextContent(/Множник за перевірку.*×3 ще 1 год/);
    await fireEvent.press(screen.getByTestId('offline-claim'));
    expect(screen.queryByTestId('insp-result')).toBeNull();
  });
});
