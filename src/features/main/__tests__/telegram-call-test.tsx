// 002 AC-11 (без PostHog), AC-12, AC-13; FR-18…FR-20, FR-29.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { baseIncomePerMin } from '@/economy/game/income';
import { HOUR } from '@/economy/test-fixtures';
import { storeAt } from '@/features/onboarding/test-utils';

import { MainScreen } from '../MainScreen';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const SEC = 1000;

/** Крок 8 на заданому ігровому часі; ігровий час далі росте лише через tick. */
async function at8(playMs: number) {
  const store = storeAt(7);
  await act(async () => {
    store.setState({ state: { ...store.getState().state, signatures: 1e6 }, playtimeMs: playMs });
    store.getState().hire({ type: 'stage', id: 'stroy' });
    store.getState().closeClerkFirst();
  });
  return store;
}

describe('кроки 8–9', () => {
  test('AC-11: крок 7 на 3:40 — телеграма о 5:00 ігрового часу; годинник +1 год о 4:00 не прискорює', async () => {
    const store = await at8(220 * SEC);
    await render(<MainScreen store={store} />);
    const last = store.getState().lastMs;
    await act(async () => store.getState().tick(last + 20 * SEC)); // 4:00
    await act(async () => store.getState().away(last + 20 * SEC, last + 20 * SEC + HOUR)); // годинник +1 год
    await act(async () => store.getState().claim()); // спершу offline-return (крайовий випадок «Гра у фоні»)
    expect(store.getState().playtimeMs).toBe(240 * SEC);
    expect(screen.queryByTestId('tab-telegrams-badge')).toBeNull();
    await act(async () => store.getState().tick(store.getState().lastMs + 59 * SEC)); // 4:59
    expect(screen.queryByTestId('tab-telegrams-badge')).toBeNull();
    await act(async () => store.getState().tick(store.getState().lastMs + 1 * SEC)); // 5:00
    expect(store.getState().onboarding.tg1ReceivedAtPlayMs).toBe(300 * SEC);
    expect(screen.getByTestId('tab-telegrams-badge')).toHaveTextContent('1');
    expect(screen.getByTestId('coach-text')).toHaveTextContent('Телеграма згори. Строк виконання: учора.');
  });

  test('AC-12: вкладка → tg-detail з b8.tip; «сумлінно» → tg-result «перший раз», крок 8, Стройова ×0,5 на 1 год', async () => {
    const store = await at8(300 * SEC);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    expect(screen.getByTestId('tg-detail')).toHaveTextContent(/Про сержантів/);
    expect(screen.getByTestId('coach-text')).toHaveTextContent('Відписка швидша, але псує репутацію. Низька репутація кличе комісію.');
    await fireEvent.press(screen.getByTestId('tg-choice-diligent'));
    expect(screen.getByTestId('tg-result-first')).toHaveTextContent(/Репутація: що вища/);
    const o = store.getState().onboarding;
    expect(o.step).toBe(9);
    expect(o.tg1?.choiceId).toBe('diligent');
    expect(store.getState().effects).toEqual([
      expect.objectContaining({ kind: 'factor', source: 'telegram_slow', value: 0.5, target: { type: 'stage', id: 'stroy' } }),
    ]);
    const eff = store.getState().effects[0]!;
    expect(eff.endMs - eff.startMs).toBe(HOUR);
  });

  test('AC-13: tg-result закрито на 6:10 — дзвінок о 7:00; бонус 60 хв базового доходу один раз, b9.toast', async () => {
    const store = await at8(300 * SEC);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    await fireEvent.press(screen.getByTestId('tg-choice-drawer'));
    await act(async () => store.setState({ playtimeMs: 370 * SEC }));
    await fireEvent.press(screen.getByTestId('tg-result-cta'));
    expect(screen.queryByTestId('call-ring')).toBeNull();
    await act(async () => store.getState().tick(store.getState().lastMs + 49 * SEC));
    expect(screen.queryByTestId('call-ring')).toBeNull();
    await act(async () => store.getState().tick(store.getState().lastMs + 1 * SEC)); // 7:00
    await fireEvent.press(screen.getByTestId('call-cta'));
    expect(screen.getByTestId('call-talk')).toHaveTextContent(/третій шухляді/);
    const st = store.getState();
    const expected = bundledConfig.params.archiveBonusMin * baseIncomePerMin(st.state, st.cfg);
    const before = st.state.signatures;
    await fireEvent.press(screen.getByTestId('call-end'));
    expect(store.getState().state.signatures).toBeCloseTo(before + expected, 6);
    expect(store.getState().onboarding).toMatchObject({ step: 10, archiveBonus: expected });
    expect(screen.getByTestId('call-sum')).toHaveTextContent(/^\+/);
    expect(screen.queryByTestId('archive')).toBeNull();
    await fireEvent.press(screen.getByTestId('call-close'));
    expect(screen.queryByTestId('call-bonus')).toBeNull();
    // тости в черзі: b8.toast (телеграма) ще на екрані, b9.toast за ним
    await act(async () => {
      while (store.getState().toast?.kind === 'text') store.getState().clearToast();
    });
    expect(screen.getByTestId('toast')).toHaveTextContent(/Архів попередника: \+/);
    expect(store.getState().claimArchive()).toBe(0);
  });
});
