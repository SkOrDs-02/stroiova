// 003 AC-7, AC-13, AC-14 (рядки), AC-15, AC-16, AC-18, AC-19, AC-20 (шторка) на екрані.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { T0 } from '@/economy/test-fixtures';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { onboardingDone } from '@/save/migrations';
import { seedFrom } from '@/telegrams/rng';
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

describe('репліки (рішення 41, 45)', () => {
  test('Кава над новою телеграмою — одна на телеграму, не більше 2 за сесію', () => {
    const store = storeWith({ ids: ['tg_0002_less_paper', 'tg_0007_briefing', 'tg_0008_morale'] });
    const [a, b, c] = store.getState().telegrams.inbox.map((x) => x.uid);
    const la = store.getState().kavaLineFor(a!);
    expect(la).toBeTruthy();
    expect(store.getState().kavaLineFor(a!)).toBe(la);
    expect(store.getState().kavaLineFor(b!)).toBeTruthy();
    expect(store.getState().kavaLineFor(c!)).toBeNull();
    store.getState().away(T0, T0 + 10 * 60_000);
    expect(store.getState().kavaLineFor(c!)).toBeTruthy();
  });
});

describe('доповнення за рев\'ю (екран)', () => {
  test('AC-14: № 24 «Видати під усне розпорядження» — бак повний, «Рішення», «−5 · норма», «Шанс перевірки 20%», «Виконано»', async () => {
    const store = storeWith({ ids: ['tg_0024_fuel_order'], firstInspectionPassed: true });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    await fireEvent.press(screen.getByTestId('tg-row-tg_0024_fuel_order#1'));
    await fireEvent.press(screen.getByTestId('tg-choice-formal_reply'));
    const res = screen.getByTestId('tg-result');
    expect(res).toHaveTextContent(/Рішення/);
    expect(res).toHaveTextContent(/−5 · норма/);
    expect(res).toHaveTextContent(/Шанс перевірки/);
    expect(res).toHaveTextContent(/20%/);
    expect(res).toHaveTextContent(/Виконано/);
    expect(store.getState().state.fuelEndMs).toBe(store.getState().lastMs + store.getState().state.fuelCapacityMs);
  });

  test('AC-16: шторка показує 3 останні зміни', async () => {
    const store = storeWith({ ids: ['tg_0002_less_paper', 'tg_0007_briefing', 'tg_0008_morale', 'tg_0011_engines'] }, 999);
    for (const uid of store.getState().telegrams.inbox.map((x) => x.uid)) store.getState().answerTelegram(uid, 'formal_reply');
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('rep-tile'));
    expect(screen.getAllByTestId('rep-log')).toHaveLength(3);
  });

  test('AC-20: ціна посильного не залежить від сповільнень (4 хв базового доходу)', () => {
    const { runnerCost } = jest.requireActual('@/telegrams/events') as typeof import('@/telegrams/events');
    const store = storeWith({ ids: ['tg_0001_sergeants'] });
    const before = runnerCost(store.getState().state, store.getState().cfg);
    store.getState().answerTelegram('tg_0001_sergeants#1', 'diligent');
    expect(store.getState().effects.some((e) => e.source === 'telegram_slow')).toBe(true);
    expect(runnerCost(store.getState().state, store.getState().cfg)).toBe(before);
  });

  test('AC-21: № 18 «на стіл» з випадінням — стор вмикає «Резолюції комбата» ×0,25 не довше 30 хв', () => {
    for (let s = 1; s <= 40; s++) {
      const store = storeWith({ ids: ['tg_0018_kombat_leave'], rng: seedFrom(`ui21-${s}`) });
      store.getState().answerTelegram('tg_0018_kombat_leave#1', 'kombat_desk');
      const k = store.getState().effects.find((e) => e.source === 'kombat_away');
      if (!k) continue;
      expect(k.value).toBe(bundledConfig.params.kombatMult);
      expect(k.endMs - k.startMs).toBeLessThanOrEqual(30 * 60_000);
      return;
    }
    throw new Error('за 40 зерен «на стіл» жодного разу не випало');
  });
});
