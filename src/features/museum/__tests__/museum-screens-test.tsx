// 007 на екрані й у сторі: порожній музей (AC-1), розкриття після цифровізації (AC-2), фільтри (AC-10), шторка (AC-11),
// крапка (AC-12), курйози (AC-13, AC-14), перевірка (AC-5, AC-6), вбивство посеред розкриття (AC-18), запис (AC-17).
import { newStory } from '@/story/engine';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import { needsSaveNow } from '@/features/boot/useBoot';
import { createConveyorStore, gameSave } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { grant, newMuseum, unseen } from '@/museum/museum';
import { onboardingDone } from '@/save/migrations';

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

const local = (h: number, m = 0, day = 0) => new Date(2025, 9, 10 + day, h, m).getTime();
const T0 = local(12);
const L = (points: number) => points * points * 75_000;

/** Гра після онбордингу; owned - журнали, що вже в музеї й переглянуті */
function game(owned: number[] = [], lifetime = 0) {
  const store = createConveyorStore(T0, bundledConfig);
  const s = store.getState().state;
  const g = grant(newMuseum(), store.getState().state, bundledConfig, owned, T0 - 86_400_000, 'digitization');
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    state: { ...newGame(bundledConfig, T0), ...s, ...g.eco, streamLevels: [120, 120, 120, 120], stageLevels: [120, 120, 120], lifetimeCycle: lifetime },
    museum: { ...g.ms, reveal: [], owned: g.ms.owned.map((o) => ({ ...o, seen: true })) },
  });
  return store;
}

describe('музей на екрані', () => {
  test('AC-1: новий гравець - 24 слоти «???» у 5 секціях, «0 з 24», 0 заповнених сегментів, «До цифровізації» відкриває «Цифру»; фільтрів немає', async () => {
    const store = game();
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    expect(screen.getByTestId('mu-count')).toHaveTextContent('0 з 24');
    expect(screen.getAllByTestId('mu-pip-off', { includeHiddenElements: true })).toHaveLength(24);
    expect(screen.queryAllByTestId('mu-pip-on', { includeHiddenElements: true })).toHaveLength(0);
    for (let n = 1; n <= 24; n++) expect(screen.getByTestId(`slot-${n}`)).toHaveTextContent(/\?\?\?/);
    // 016 FR-15: п'ять секцій серій; серії наступних рівнів замкнені з назвою рівня
    expect(screen.getByTestId('mu-sec-1')).toHaveTextContent(/Майно батальйону · 0 з 8/);
    expect(screen.getByTestId('mu-sec-2')).toHaveTextContent(/Особовий склад · 0 з 4/);
    expect(screen.getByTestId('mu-sec-locked-2')).toHaveTextContent('Відкриється на рівні «Бригада»');
    expect(screen.getByTestId('mu-sec-locked-5')).toHaveTextContent(/Відкриється на рівні «Армія без паперу»/);
    expect(screen.queryByTestId('mu-sec-locked-1')).toBeNull();
    expect(screen.getByTestId('mu-empty')).toHaveTextContent(/Музей порожній.*Перші три скасує перша цифровізація/);
    expect(screen.queryByTestId('mu-filter-all')).toBeNull();
    await fireEvent.press(screen.getByTestId('mu-empty-cta'));
    expect(screen.getByTestId('digit-cta')).toBeTruthy();
  });

  test('знайдені слоти: обкладинка зі штампом, рідкість словом, бонус; незнайдені - «Не знайдено» і джерело', async () => {
    const store = game([1, 2, 3, 6]);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    expect(screen.getByTestId('mu-count')).toHaveTextContent('4 з 24');
    expect(screen.getAllByTestId('mu-pip-on', { includeHiddenElements: true })).toHaveLength(4);
    expect(screen.getByTestId('slot-3')).toHaveTextContent(/Рідкісний.*\+10% паперу з будь-якого джерела/);
    expect(screen.getByTestId('slot-1')).toHaveTextContent(/Скасовано/);
    expect(screen.getByTestId('slot-7')).toHaveTextContent(/Не знайдено.*Перевірка без зауважень/);
    expect(screen.getByTestId('slot-6')).toHaveTextContent(/Акти на подарунки волонтерів ідуть конвеєром на 10% швидше/);
  });

  test('AC-10: № 1, 2, 3, 6 - «Особовий склад» порожній, «Показати всі» повертає 8 слотів', async () => {
    const store = game([1, 2, 3, 6]);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    await fireEvent.press(screen.getByTestId('mu-filter-personnel'));
    expect(screen.getByTestId('mu-none')).toHaveTextContent(/Журналів особового складу в музеї поки немає/);
    expect(screen.queryByTestId('slot-1')).toBeNull();
    await fireEvent.press(screen.getByTestId('mu-none-cta'));
    expect(screen.queryByTestId('mu-none')).toBeNull();
    for (let n = 1; n <= 8; n++) expect(screen.getByTestId(`slot-${n}`)).toBeTruthy();
    // «Майно» показує лише знайдені журнали цієї категорії
    await fireEvent.press(screen.getByTestId('mu-filter-property'));
    expect(screen.getByTestId('slot-6')).toBeTruthy();
    expect(screen.queryByTestId('slot-4')).toBeNull();
  });

  test('AC-7 (екран): 8 з 24 - банер «Серію зібрано» з «×2 уже діє»', async () => {
    const store = game([1, 2, 3, 4, 5, 6, 7]);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    expect(screen.getByTestId('mu-count')).toHaveTextContent('8 з 24');
    expect(screen.getByTestId('mu-done')).toHaveTextContent(/Серію зібрано.*×2 уже діє/);
  });

  test('AC-11: № 7 до цифровізацій - «???», джерело і підказка «Спершу цифровізація»; після 1-ї - «Підготуй усі пункти»; № 1 - усі поля з датою', async () => {
    const store = game([1]);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    await fireEvent.press(screen.getByTestId('slot-7'));
    expect(screen.getByTestId('journal-detail')).toHaveTextContent(/Експонат № 7 з 24.*Не знайдено.*\?\?\?/);
    expect(screen.getByTestId('jd-source')).toHaveTextContent('Перевірка без зауважень');
    expect(screen.getByTestId('jd-hint')).toHaveTextContent('Спершу цифровізація. Потім перевірка без зауважень.');
    await fireEvent.press(screen.getByTestId('journal-detail-ok'));
    await act(async () => store.setState({ digit: { ...store.getState().digit, total: 1, counts: { '1': 1 } } }));
    await fireEvent.press(screen.getByTestId('slot-7'));
    expect(screen.getByTestId('jd-hint')).toHaveTextContent('Підготуй усі пункти чекліста до приїзду комісії.');
    await fireEvent.press(screen.getByTestId('journal-detail-ok'));
    await fireEvent.press(screen.getByTestId('slot-1'));
    const d = screen.getByTestId('journal-detail');
    expect(d).toHaveTextContent(/Експонат № 1 з 24.*Книга обліку видавання мила.*Звичайний.*Бонус · діє завжди.*\+5% до швидкості Стройової частини/);
    expect(d).toHaveTextContent(/Історія скасування.*16 паперових форм.*Джерело: тези-роз'яснення МОУ, 2024/);
    expect(screen.getByTestId('jd-since')).toHaveTextContent('09.10.2025');
  });
});

describe('розкриття (рішення 79)', () => {
  test('AC-2: перша цифровізація - digit-result, «Далі» і три journal-new «1 з 3…3 з 3»; крапка горить, поки є непереглянуті', async () => {
    const store = game([], L(40));
    await render(<MainScreen store={store} />);
    await act(async () => {
      expect(store.getState().digitize()).toBe(true);
    });
    expect(screen.getByTestId('digit-result')).toBeTruthy();
    expect(screen.getByTestId('digit-result-ok')).toHaveTextContent('Далі');
    // поки акт на екрані, розкриття чекає
    expect(screen.queryByTestId('journal-new')).toBeNull();
    expect(screen.getByTestId('tab-museum-dot')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('digit-result-ok'));
    expect(screen.getByTestId('jn-counter')).toHaveTextContent('1 з 3 нових · у музеї 1 з 24');
    expect(screen.getByTestId('jn-note')).toHaveTextContent('Уже діє. Назавжди.');
    expect(screen.getByTestId('jn-next')).toHaveTextContent('Наступний експонат');
    await fireEvent.press(screen.getByTestId('jn-next'));
    expect(screen.getByTestId('jn-counter')).toHaveTextContent('2 з 3 нових · у музеї 2 з 24');
    await fireEvent.press(screen.getByTestId('jn-next'));
    expect(screen.getByTestId('jn-counter')).toHaveTextContent('3 з 3 нових · у музеї 3 з 24');
    expect(screen.getByTestId('jn-rarity')).toHaveTextContent('Рідкісний');
    expect(screen.getByTestId('jn-next')).toHaveTextContent('Добре');
    await fireEvent.press(screen.getByTestId('jn-next'));
    expect(screen.queryByTestId('journal-new')).toBeNull();
    const unlocks = store.getState().events.filter((e) => e.type === 'museumJournalUnlock');
    expect(unlocks).toHaveLength(3);
    expect(unlocks.map((e) => e.type === 'museumJournalUnlock' && [e.no, e.source])).toEqual([[1, 'digitization'], [2, 'digitization'], [3, 'digitization']]);
    // бонуси діють з моменту отримання
    expect(store.getState().state.museum.unit.stroy).toBeCloseTo(1.05, 10);
    expect(store.getState().state.museum.storage).toBeCloseTo(1.05, 10);
    // 016 FR-29: ту саму крапку тримають і непереглянуті грамоти (перша цифровізація дала їх дві)
    expect(screen.queryByTestId('tab-museum-dot')).not.toBeNull();
    await act(async () => store.getState().openAwards('segment'));
    expect(screen.queryByTestId('tab-museum-dot')).toBeNull();
  });

  test('AC-3 (016, екран): цифровізація на Р2 дає № 9 - digit-result «Далі», journal-new з бонусом та лічильником «У музеї 6 з 24»; 4-та журналу не дає', async () => {
    const store = game([1, 2, 3, 4, 5], 6.27e9 * 1600);
    store.setState({
      state: { ...store.getState().state, level: 2, streamLevels: [30, 20, 10, 5, 3], stageLevels: [20, 20, 20, 20], prestigePoints: 100 },
      digit: { ...store.getState().digit, counts: { '1': 3 }, total: 3 },
    });
    await render(<MainScreen store={store} />);
    await act(async () => {
      expect(store.getState().digitize()).toBe(true);
    });
    expect(screen.getByTestId('digit-result-ok')).toHaveTextContent('Далі');
    await fireEvent.press(screen.getByTestId('digit-result-ok'));
    expect(screen.getByTestId('jn-title')).toHaveTextContent('Іменний список для проведення вечірньої повірки');
    expect(screen.getByTestId('jn-counter')).toHaveTextContent('У музеї 6 з 24');
    expect(store.getState().state.museum.unit.nakazy).toBeCloseTo(1.05, 10);
    expect(store.getState().events.find((e) => e.type === 'museumJournalUnlock' && e.no === 9)).toMatchObject({ seriesId: 'personnel', source: 'digitization', isSeriesComplete: false });
    await fireEvent.press(screen.getByTestId('jn-next'));
    expect(screen.queryByTestId('journal-new')).toBeNull();
    expect(unseen(store.getState().museum)).toBe(0);
  });

  test('«Деталі експоната» відкриває шторку над розкриттям і повертає до нього', async () => {
    const store = game([], L(40));
    await render(<MainScreen store={store} />);
    await act(async () => {
      store.getState().digitize();
    });
    await fireEvent.press(screen.getByTestId('digit-result-ok'));
    await fireEvent.press(screen.getByTestId('jn-detail'));
    expect(screen.getByTestId('journal-detail')).toHaveTextContent(/Експонат № 1 з 24/);
    await fireEvent.press(screen.getByTestId('journal-detail-ok'));
    expect(screen.queryByTestId('journal-detail')).toBeNull();
    expect(screen.getByTestId('jn-counter')).toHaveTextContent(/^1 з 3 нових/);
  });

  test('AC-12: непереглянутий журнал - крапка; вкладка «Музей» гасить її, museum_open з journals_unseen = 1', async () => {
    const store = game([1]);
    store.setState({ museum: { ...store.getState().museum, owned: store.getState().museum.owned.map((o) => ({ ...o, seen: false })) } });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('tab-museum-dot')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tab-museum'));
    expect(screen.queryByTestId('tab-museum-dot')).toBeNull();
    expect(unseen(store.getState().museum)).toBe(0);
    expect(store.getState().events.at(-1)).toEqual({ type: 'museumOpen', source: 'tab', journalsOwned: 1, journalsUnseen: 1 });
  });

  test('AC-18: вбито посеред розкриття - усі 3 журнали в музеї, бонуси діють, непереглянуті дають тост «Новий експонат» з «Відкрити»', async () => {
    const first = game([], L(40));
    first.getState().digitize();
    first.getState().closeDigitStep();
    first.getState().closeReveal();
    // на другому журналі застосунок вбито: запис зі стору
    const saved = gameSave(first);
    expect(saved.museum.owned.map((o) => o.no)).toEqual([1, 2, 3]);
    expect(saved.museum.reveal.map((r) => r.no)).toEqual([2, 3]);
    const second = createConveyorStore(T0, bundledConfig, { state: saved.economy, effects: [], pinned: null, onboarding: onboardingDone(), museum: saved.museum });
    expect(second.getState().museum.reveal).toEqual([]);
    expect(second.getState().state.museum.unit.stroy).toBeCloseTo(1.05, 10);
    await render(<MainScreen store={second} />);
    expect(screen.getByTestId('toast')).toHaveTextContent(/Новий експонат: Стелажні \(штабельні\) ярлики/);
    expect(screen.queryByTestId('journal-new')).toBeNull();
    expect(screen.getByTestId('tab-museum-dot')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('toast-open'));
    expect(screen.getByTestId('museum')).toBeTruthy();
    expect(screen.getByTestId('mu-count')).toHaveTextContent('3 з 24');
    expect(screen.queryByTestId('tab-museum-dot')).toBeNull();
    expect(second.getState().events.at(-1)).toMatchObject({ type: 'museumOpen', source: 'unlock_toast', journalsUnseen: 2 });
  });
});

describe('збереження в мить джерела (AC-18)', () => {
  test('журнали № 1-3 потрапляють у запис одразу: хоча б одна зміна стору з уже заповненим музеєм вимагає негайного запису', () => {
    const store = game([], L(40));
    const saves: number[] = [];
    store.subscribe((st, prev) => {
      if (needsSaveNow(st, prev)) saves.push(st.museum.owned.length);
    });
    store.getState().digitize();
    expect(saves.at(-1)).toBe(3);
  });
});

describe('перевірка й телеграма дають журнали', () => {
  /** Перевірка о 17:00 у гравця з 1 цифровізацією, чекліст виконано повністю */
  function inspected(digitizations: number, ownedBefore = [1, 2, 3]) {
    const store = createConveyorStore(local(9), bundledConfig);
    const s = store.getState().state;
    const g = grant(newMuseum(), s, bundledConfig, ownedBefore, local(9), 'digitization');
    store.setState({
      onboarding: onboardingDone(),
      state: { ...s, ...g.eco, streamLevels: [40, 0, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, false, false, false], stageClerks: [true, true, true], signatures: 1e12 },
      digit: { ...store.getState().digit, total: digitizations, counts: digitizations ? { '1': digitizations } : {} },
      museum: { ...g.ms, reveal: [], owned: g.ms.owned.map((o) => ({ ...o, seen: true })) },
    });
    store.getState().away(local(9, 5), local(17));
    if (store.getState().offline) store.getState().claim();
    const a = store.getState().inspections.active!;
    for (const it of a.items) store.getState().buyInspItem(it.id);
    store.getState().ackInspCall();
    store.getState().ackInspWarning(false);
    return { store, arr: a.arrMs };
  }

  test('AC-5: до цифровізації № 7 не додається, блоку в insp-result немає', async () => {
    const { store, arr } = inspected(0, []);
    store.getState().tick(arr + 1000);
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('insp-result')).toBeTruthy();
    expect(screen.queryByTestId('insp-exhibit')).toBeNull();
    expect(store.getState().museum.owned).toEqual([]);
  });

  test('AC-5: після 1-ї цифровізації «без зауважень» дає № 7 блоком «Новий експонат · 4 з 24» в акті; повторна - ні', async () => {
    const { store, arr } = inspected(1);
    store.getState().tick(arr + 1000);
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('insp-exhibit')).toHaveTextContent(/Новий експонат · 4 з 24.*№ 7 · Журнал результатів звірки обліку військового майна/);
    // журнал діє з моменту отримання, у гонці крок Фінслужби коротший
    expect(store.getState().museum.owned.map((o) => o.no)).toEqual([1, 2, 3, 7]);
    await fireEvent.press(screen.getByTestId('insp-result-ok'));
    expect(screen.queryByTestId('journal-new')).toBeNull();
    expect(unseen(store.getState().museum)).toBe(0);
  });

  test('AC-6: перевірка минула при закритій грі - після offline-return journal-new з № 7', async () => {
    const { store, arr } = inspected(1);
    store.setState({ state: { ...store.getState().state, signatures: 0 } });
    store.getState().away(local(17), arr + 3_600_000);
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('offline-return')).toBeTruthy();
    expect(screen.queryByTestId('journal-new')).toBeNull();
    await fireEvent.press(screen.getByTestId('offline-claim'));
    expect(screen.getByTestId('jn-title')).toHaveTextContent('Журнал результатів звірки обліку військового майна');
    expect(screen.getByTestId('jn-counter')).toHaveTextContent('У музеї 4 з 24');
  });

  test('AC-7: 6 з 8 без № 7 - № 7 і одразу № 8 «Легендарний» з «Серію зібрано. Уже діє.»', async () => {
    const { store, arr } = inspected(1, [1, 2, 3, 4, 5, 6]);
    store.getState().tick(arr + 1000);
    await render(<MainScreen store={store} />);
    expect(screen.getAllByTestId('insp-exhibit')).toHaveLength(2);
    expect(screen.getAllByTestId('insp-exhibit-note')[1]).toHaveTextContent('Легендарний. Серію зібрано. Уже діє.');
    await fireEvent.press(screen.getByTestId('insp-result-ok'));
    expect(store.getState().museum.owned.map((o) => o.no)).toContain(8);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    expect(screen.getByTestId('mu-done')).toBeTruthy();
    const unlock = store.getState().events.filter((e) => e.type === 'museumJournalUnlock').at(-1);
    expect(unlock).toMatchObject({ no: 8, isSeriesComplete: true, ownedAfter: 8 });
  });

  test('AC-4: відповідь на телеграму 25 і лист без вибору наступного дня - journal-new з № 6 «Рідкісний», лічильник +1', async () => {
    const store = game([1, 2, 3]);
    // дзвінок сюжету на цифровізації 1 тут не потрібен: тест про журнал
    store.setState({ digit: { ...store.getState().digit, total: 1, counts: { '1': 1 } }, story: { ...newStory(), skipped: ['st_who_writes_01'] } });
    const tg = store.getState().telegrams;
    store.setState({
      telegrams: {
        ...tg,
        startMs: T0 - 1000,
        inbox: [
          { uid: 'tg_0025b_prize_cancelled#1', id: 'tg_0025b_prize_cancelled', kind: 'notice', receivedAt: T0, status: 'new' },
        ],
      },
    });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    await act(async () => store.getState().openItem('tg_0025b_prize_cancelled#1'));
    await fireEvent.press(screen.getByTestId('tab-stroyova'));
    expect(screen.getByTestId('jn-title')).toHaveTextContent('Книга обліку призів і подарунків');
    expect(screen.getByTestId('jn-rarity')).toHaveTextContent('Рідкісний');
    expect(screen.getByTestId('jn-counter')).toHaveTextContent('У музеї 4 з 24');
    expect(store.getState().museum.curios[0]).toMatchObject({ kind: 'telegram', status: 'info', telegramId: 'tg_0025b_prize_cancelled' });
  });
});

describe('музей на 24 (016 етап 1)', () => {
  test('AC-4/FR-16: останній журнал серії «Особовий склад» в акті підсумкової - блок експоната № 12 і «Серію зібрано»; потім секція в музеї і рядок «Серії музею»', async () => {
    const store = game([1, 2, 3, 4, 5, 6, 7, 9, 10, 11]);
    store.setState({ state: { ...store.getState().state, level: 2 } });
    const g = grant(store.getState().museum, store.getState().state, bundledConfig, [12], T0, 'final_inspection', 'insp');
    const outcome = { id: 'i1', no: 7, trigger: 'scheduled' as const, boss: 'brigade_commission' as const, level: 2, kind: 'final' as const, attempt: 1, arrMs: T0, passed: true, exitUnlocked: true, remark: false, items: [], reason: null, offline: false, seen: false };
    store.setState({ museum: g.ms, state: g.eco, events: [...store.getState().events, ...g.events], inspections: { ...store.getState().inspections, last: outcome } });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('insp-exhibit')).toHaveTextContent(/№ 12 · Журнал контролю за станом обліку особового складу/);
    expect(screen.getByTestId('insp-exhibit-series')).toHaveTextContent('Серію «Особовий склад» зібрано. +1% до всіх підписів. Уже діє.');
    expect(store.getState().events.find((e) => e.type === 'museumJournalUnlock' && e.no === 12)).toMatchObject({ isSeriesComplete: true, seriesId: 'personnel', seriesOwnedAfter: 4, seriesCompleteCount: 2, source: 'final_inspection' });
    await fireEvent.press(screen.getByTestId('insp-result-ok'));
    await fireEvent.press(screen.getByTestId('tab-museum'));
    expect(screen.getByTestId('mu-sec-done-2')).toHaveTextContent('Серію зібрано · +1% до всіх підписів');
    expect(screen.getByTestId('mu-sec-2')).toHaveTextContent(/Особовий склад · 4 з 4/);
    await fireEvent.press(screen.getByTestId('tab-stroyova'));
    await fireEvent.press(screen.getByTestId('income-open'));
    expect(screen.getByTestId('boost-row-museum_series')).toHaveTextContent(/Серії музею.*×1,01.*1 з 4/);
  });

  test('офлайн: журнал № 12 розкривається модалкою journal-new із приміткою про серію', async () => {
    const store = game([9, 10, 11]);
    store.setState({ state: { ...store.getState().state, level: 2 } });
    const g = grant(store.getState().museum, store.getState().state, bundledConfig, [12], T0, 'final_inspection');
    store.setState({ museum: g.ms, state: g.eco });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('jn-title')).toHaveTextContent('Журнал контролю за станом обліку особового складу');
    expect(screen.getByTestId('jn-note')).toHaveTextContent('Серію «Особовий склад» зібрано. +1% до всіх підписів. Уже діє.');
  });

  test('AC-7 (016): шторка № 16 на Р2 - «Діятиме з рівня «Командування»», шторка № 9 - діє зараз; рядок серії в шапці', async () => {
    const store = game([9, 16]);
    store.setState({ state: { ...store.getState().state, level: 2 } });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    await fireEvent.press(screen.getByTestId('slot-16'));
    expect(screen.getByTestId('jd-later')).toHaveTextContent('Діятиме з рівня «Командування»');
    expect(screen.getByTestId('jd-series')).toHaveTextContent('Серія «Транспорт і склад» · 1 з 4');
    expect(screen.getByTestId('jd-bonus')).toHaveTextContent('+10% до ланки «Нарада»');
    await fireEvent.press(screen.getByTestId('journal-detail-ok'));
    await fireEvent.press(screen.getByTestId('slot-9'));
    expect(screen.queryByTestId('jd-later')).toBeNull();
  });

  test('FR-16: усі 24 - банер «Музей укомплектовано» замість банера серії', async () => {
    const store = game(Array.from({ length: 24 }, (_, i) => i + 1));
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    expect(screen.getByTestId('mu-full')).toHaveTextContent(/Музей укомплектовано.*Двадцять четвертого не існувало/);
    expect(screen.queryByTestId('mu-done')).toBeNull();
    expect(screen.getByTestId('mu-count')).toHaveTextContent('24 з 24');
  });
  test('AC-7: № 21 на Р5 без цифрових ланок - «Діятиме з рівня «Армія без паперу»»; після конвертації № 1 напису немає', async () => {
    const store = game([21]);
    store.setState({ state: { ...store.getState().state, level: 5, digital: [] } });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    await fireEvent.press(screen.getByTestId('slot-21'));
    expect(screen.getByTestId('jd-later')).toHaveTextContent('Діятиме з рівня «Армія без паперу»');
    await fireEvent.press(screen.getByTestId('journal-detail-ok'));
    await act(async () => store.setState({ state: { ...store.getState().state, digital: ['kombat'] } }));
    await fireEvent.press(screen.getByTestId('slot-21'));
    expect(screen.queryByTestId('jd-later')).toBeNull();
  });
});
