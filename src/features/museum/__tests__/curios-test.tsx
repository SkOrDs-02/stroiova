// 007: журнал курйозів - записи з відповідей і програної гонки (AC-13, AC-14), збереження (AC-17).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { createConveyorStore, gameSave } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { memoryStorage } from '@/save/storage';
import { KEY_SAVE, loadSave, serialize } from '@/save/repository';
import { grant, newMuseum } from '@/museum/museum';
import { MIGRATIONS, onboardingDone } from '@/save/migrations';
import { CURRENT_SCHEMA } from '@/save/schema';
import { draft } from '@/save/test-saves';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const local = (h: number, m = 0, day = 0) => new Date(2025, 9, 10 + day, h, m).getTime();

/** Р2, дрон прийшов о 08:00 другої доби, гравець забрав довідку о 08:30; два листи у вхідних */
function game() {
  const store = createConveyorStore(local(15), bundledConfig);
  const s = store.getState().state;
  const tg = store.getState().telegrams;
  store.setState({
    onboarding: onboardingDone(),
    inspections: { ...store.getState().inspections, installMs: local(15) },
    state: { ...s, level: 2, paper: 30, streamLevels: [40, 10, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, true, false, false], stageClerks: [true, true, true] },
    telegrams: {
      ...tg,
      startMs: local(15),
      inbox: [
        { uid: 'tg_0015_paper_copy#1', id: 'tg_0015_paper_copy', kind: 'telegram', receivedAt: local(15), status: 'new' },
        { uid: 'tg_0016_second_page#2', id: 'tg_0016_second_page', kind: 'telegram', receivedAt: local(15), status: 'new' },
      ],
      deliveries: 2,
    },
  });
  store.getState().away(local(15, 5), local(8, 30, 1));
  if (store.getState().offline) store.getState().claim();
  store.setState({ inspections: { ...store.getState().inspections, active: null, callPending: false } });
  return store;
}

async function lose(store: ReturnType<typeof game>) {
  store.getState().ackGift();
  await act(async () => store.getState().tick(local(17, 1, 1)));
  store.getState().closeRaceResult();
}

describe('журнал курйозів', () => {
  test('AC-13: дві відповіді й програна гонка - записи 3, 2, 1 зверху вниз, підсумок «3 записи · 2 телеграми · 1 списаний подарунок»', async () => {
    const store = game();
    store.getState().answerTelegram('tg_0015_paper_copy#1', 'diligent');
    store.getState().answerTelegram('tg_0016_second_page#2', 'drawer');
    await lose(store);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    await fireEvent.press(screen.getByTestId('mu-seg-curios'));
    expect(screen.getByTestId('curios-summary')).toHaveTextContent('3 записи · 2 телеграми · 1 списаний подарунок');
    expect(store.getState().museum.curios.map((c) => c.seq)).toEqual([1, 2, 3]);
    expect(screen.getByTestId('curio-3')).toHaveTextContent(/АКТ № 1 · 17:00.*списано.*Списано раніше, ніж поставлено на облік.*Квадрокоптер · подарунок волонтерів/);
    expect(screen.getByTestId('curio-2')).toHaveTextContent(/ТЕЛЕГРАМА № .*у шухляді/);
    expect(screen.getByTestId('curio-1')).toHaveTextContent(/сумлінно/);
    // групи за днями: усі записи першої доби й другої, нові зверху
    expect(screen.getAllByText(/Сьогодні|Учора|\d\d\.\d\d\.\d{4}/).length).toBeGreaterThan(0);
  });

  test('AC-14: запис списаного подарунка - маршрут, «Бракувало», «Штраф: немає», репліка Ліни; запис телеграми - вибір і наслідок', async () => {
    const store = game();
    store.getState().answerTelegram('tg_0015_paper_copy#1', 'formal_reply');
    await lose(store);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    await fireEvent.press(screen.getByTestId('mu-seg-curios'));
    await fireEvent.press(screen.getByTestId('curio-2'));
    const g = screen.getByTestId('curio-gift');
    expect(g).toHaveTextContent(/Акт № 1.*Введення в експлуатацію.*Пройдено етапів4 з 5.*Бракувало.*Штраф.*немає/);
    expect(screen.getByTestId('curio-line').props.children).toBeTruthy();
    await fireEvent.press(screen.getByTestId('curio-detail-ok'));
    await fireEvent.press(screen.getByTestId('curio-1'));
    expect(screen.getByTestId('curio-telegram')).toHaveTextContent(/Вибір/);
    expect(screen.getByTestId('curio-choice')).toBeTruthy();
  });

  test('порожньо: «Записів поки немає»', async () => {
    const store = game();
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-museum'));
    await fireEvent.press(screen.getByTestId('mu-seg-curios'));
    expect(screen.getByTestId('curios-empty')).toHaveTextContent(/Записів поки немає.*Сюди лягають усі телеграми згори/);
  });

  test('AC-17: записи курйозів переживають збереження й завантаження; новий стор після скидання - порожній музей, записів 0', async () => {
    const store = game();
    store.getState().answerTelegram('tg_0015_paper_copy#1', 'diligent');
    await lose(store);
    const saved = gameSave(store);
    const d = draft({}, {});
    const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, museum: saved.museum, economy: saved.economy as never } }) });
    const r = loadSave(kv, { current: CURRENT_SCHEMA, migrations: MIGRATIONS });
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.save.game.museum.curios).toHaveLength(2);
    expect(r.save.game.museum.curios[1]!.gift).toMatchObject({ raceNo: 1, stepsTotal: 5 });
    const fresh = createConveyorStore(local(9), bundledConfig);
    expect(fresh.getState().museum).toEqual({ owned: [], reveal: [], curios: [], curioSeq: 0 });
  });

  test('журнали № 6 і № 7 скорочують кроки акта у гонці, що стартує після їх отримання (005 FR-17)', () => {
    const store = createConveyorStore(local(15), bundledConfig);
    const s = store.getState().state;
    const g = grant(newMuseum(), s, bundledConfig, [6, 7], local(15), 'telegram');
    store.setState({
      onboarding: onboardingDone(),
      inspections: { ...store.getState().inspections, installMs: local(15) },
      state: { ...s, ...g.eco, streamLevels: [40, 10, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, true, false, false], stageClerks: [true, true, true] },
      museum: g.ms,
    });
    store.getState().away(local(15, 5), local(8, 30, 1));
    const steps = store.getState().race.active!.steps;
    // дрон на Р1: Акти 1 год 30 хв, Комбат 1 год 50 хв, Стройова 1 год 30 хв, Фін. 2 год 40 хв; № 6 -10% на кожному, № 7 ще -10% на Фін.
    expect(steps.map((x) => x.sec / 60)).toEqual([81, 99, 81, 160 * 0.9 * 0.9]);
  });
});
