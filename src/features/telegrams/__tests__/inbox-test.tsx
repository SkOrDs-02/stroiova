// 003 AC-7, AC-13, AC-14 (рядки), AC-15, AC-16, AC-18, AC-19, AC-20 (шторка) на екрані.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { T0 } from '@/economy/test-fixtures';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { onboardingDone } from '@/save/migrations';
import { tgWith } from '@/telegrams/test-utils';
import type { TelegramState } from '@/telegrams/types';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

function storeWith(tg: Partial<TelegramState> & { ids?: string[] } = {}, paper = 30) {
  const store = createConveyorStore(T0, bundledConfig);
  const { ids = [], ...patch } = tg;
  store.setState({ onboarding: onboardingDone(), telegrams: tgWith(ids, patch), state: { ...store.getState().state, paper } });
  return store;
}

describe('вхідні', () => {
  test('бейдж вкладки = нові + непрочитані записки; список: «Нові», «На виконанні», «Записки»', async () => {
    const store = storeWith({ ids: ['tg_0002_less_paper', 'tg_0007_briefing'] });
    await act(async () => {
      const tg = store.getState().telegrams;
      store.setState({ telegrams: { ...tg, inbox: [...tg.inbox, { uid: 'note_call#9', id: 'note_call', kind: 'note', receivedAt: T0, status: 'archive', read: false }] } });
    });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('tab-telegrams-badge')).toHaveTextContent('3');
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    expect(screen.getByTestId('tg-list')).toHaveTextContent(/Нові/);
    expect(screen.getByTestId('tg-list')).toHaveTextContent(/Записки · 1/);
    await fireEvent.press(screen.getByTestId('tg-row-note_call#9'));
    expect(screen.getByTestId('note-detail')).toHaveTextContent(/Археолог/);
    await fireEvent.press(screen.getByTestId('note-ok'));
    expect(screen.getByTestId('tab-telegrams-badge')).toHaveTextContent('2');
  });

  test('AC-13: 4 аркуші — варіант на 5 неактивний з «Бракує 1 аркуша»', async () => {
    const store = storeWith({ ids: ['tg_0002_less_paper'] }, 4);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    await fireEvent.press(screen.getByTestId('tg-row-tg_0002_less_paper#1'));
    expect(screen.getByTestId('tg-choice-diligent')).toBeDisabled();
    expect(screen.getByTestId('tg-why-diligent')).toHaveTextContent('Бракує 1 аркуша');
  });

  test('AC-7 і AC-14: «сумлінно» → результат з «Рішення», «Репутація +10 · норма», у списку «На виконанні» з таймером', async () => {
    const store = storeWith({ ids: ['tg_0001_sergeants'], reputation: { value: 50, history: [] } });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    await fireEvent.press(screen.getByTestId('tg-row-tg_0001_sergeants#1'));
    await fireEvent.press(screen.getByTestId('tg-choice-diligent'));
    expect(screen.getByTestId('tg-result')).toHaveTextContent(/Рішення/);
    expect(screen.getByTestId('tg-result')).toHaveTextContent(/\+10 · норма/);
    await fireEvent.press(screen.getByTestId('tg-result-cta'));
    expect(screen.getByTestId('tg-list')).toHaveTextContent(/На виконанні · 1/);
    expect(screen.getByTestId('tg-list')).toHaveTextContent(/ще 1 год/);
  });

  test('AC-15: репутація 36 → відписка −5 → «низька», тост; AC-16: шторка з рівнем «зараз» і змінами', async () => {
    const store = storeWith({ ids: ['tg_0002_less_paper'], reputation: { value: 36, history: [] } });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    await fireEvent.press(screen.getByTestId('tg-row-tg_0002_less_paper#1'));
    await fireEvent.press(screen.getByTestId('tg-choice-formal_reply'));
    expect(store.getState().events).toContainEqual(expect.objectContaining({ type: 'reputationTierChange', from: 'norm', to: 'low' }));
    expect(store.getState().toast).toEqual({ kind: 'rep', tier: 'low' });
    await fireEvent.press(screen.getByTestId('tg-result-cta'));
    await fireEvent.press(screen.getByTestId('rep-tile'));
    expect(screen.getByTestId('rep-level-low')).toHaveTextContent(/зараз/);
    expect(screen.getAllByTestId('rep-log')[0]).toHaveTextContent(/−5/);
  });

  test('AC-18: «Це не смішно» без причини — «Позначено», гра та сама', async () => {
    const store = storeWith({ ids: ['tg_0008_morale'] });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    await fireEvent.press(screen.getByTestId('tg-row-tg_0008_morale#1'));
    const before = JSON.stringify({ r: store.getState().telegrams.reputation, p: store.getState().state.paper, e: store.getState().effects });
    await fireEvent.press(screen.getByTestId('tg-flag-open'));
    await fireEvent.press(screen.getByTestId('tg-flag-send'));
    expect(screen.getByTestId('tg-flag-thanks')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tg-flag-back'));
    expect(screen.getByTestId('tg-flag-open')).toHaveTextContent('Позначено');
    expect(JSON.stringify({ r: store.getState().telegrams.reputation, p: store.getState().state.paper, e: store.getState().effects })).toBe(before);
  });

  test('AC-20 (шторка): «Комбата шукають» відкривається сама; посильний → «посильний · ще 3 хв»', async () => {
    const store = storeWith({ kombat: { lastDayKey: '2025-10-09', active: { startMs: T0, endMs: T0 + 20 * 60_000, runnerAtMs: null } } });
    await act(async () => store.setState({ state: { ...store.getState().state, signatures: 1e7 } }));
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('kombat-sheet')).toHaveTextContent(/Комбата шукають/);
    await fireEvent.press(screen.getByTestId('kombat-runner'));
    expect(screen.getByTestId('kombat-running')).toHaveTextContent(/3 хв/);
    await fireEvent.press(screen.getByTestId('kombat-wait'));
    expect(screen.queryByTestId('kombat-sheet')).toBeNull();
    expect(screen.getByTestId('kombat-bar')).toBeTruthy();
  });
});
