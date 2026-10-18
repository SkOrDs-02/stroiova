// 005 у сторі й на екрані: gift-arrived (AC-2), картка й race-sheet (AC-7, AC-12), офлайн з ×2 лише після акта (AC-17),
// race-won (AC-15), race-lost (AC-16), № 20 у шухляді (AC-14).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { onboardingDone } from '@/save/migrations';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const local = (h: number, m = 0, day = 0) => new Date(2025, 9, 10 + day, h, m).getTime();

/** Встановлення о 15:00 першої доби; «Акти» відкрито, діловоди є (офлайн-дохід) */
function game(level = 1, prestigePoints = 0) {
  const store = createConveyorStore(local(15), bundledConfig);
  const s = store.getState().state;
  store.setState({
    onboarding: onboardingDone(),
    inspections: { ...store.getState().inspections, installMs: local(15) },
    state: { ...s, level, prestigePoints, streamLevels: [40, 10, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, true, false, false], stageClerks: [true, true, true] },
  });
  return store;
}

/** Дрон прийшов о 08:00 другої доби, гравець повернувся о 08:30 і забрав довідку */
function withDrone(level = 1, prestigePoints = 0) {
  const store = game(level, prestigePoints);
  store.getState().away(local(15, 5), local(8, 30, 1));
  if (store.getState().offline) store.getState().claim();
  // перевірки цього тесту не стосуються
  store.setState({ inspections: { ...store.getState().inspections, active: null, callPending: false } });
  return store;
}

describe('гонка в сторі', () => {
  test('AC-17: акт скінчився через 2 год після виходу — ×2 лише від кінця акта, рядок у довідці, потім race-won', async () => {
    const store = withDrone();
    store.getState().ackGift();
    // акт дрона: 08:00 + 7 год 30 хв = 15:30, служба до 17:00; гравця немає 13:30–19:30
    store.getState().away(local(13, 30, 1), local(19, 30, 1));
    expect(store.getState().race.last).toMatchObject({ won: true, offline: true, endMs: local(15, 30, 1), marginSec: 5400 });
    const fx = store.getState().effects.find((e) => e.source === 'gift_drone')!;
    expect([fx.startMs, fx.endMs]).toEqual([local(15, 30, 1), local(17, 0, 1)]);
    expect(store.getState().events.find((e) => e.type === 'raceFinish')).toMatchObject({ result: 'success', offline: true });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('offline-return')).toHaveTextContent(/Введено квадрокоптерів1/);
    await fireEvent.press(screen.getByTestId('offline-claim'));
    expect(screen.getByTestId('race-won')).toHaveTextContent(/Пташка в небі/);
    await fireEvent.press(screen.getByTestId('race-result-ok'));
    expect(store.getState().race.last!.seen).toBe(true);
    expect(screen.queryByTestId('race-won')).toBeNull();
  });

  test('офлайн-дохід: ×2 тільки на відрізку після кінця акта', () => {
    const a = withDrone();
    a.getState().ackGift();
    // повернення до кінця акта — ефекту ще немає
    a.getState().away(local(9, 0, 1), local(15, 0, 1));
    expect(a.getState().effects.some((e) => e.source === 'gift_drone')).toBe(false);
    a.getState().claim();
    a.getState().away(local(15, 0, 1), local(17, 0, 1));
    const fx = a.getState().effects.find((e) => e.source === 'gift_drone')!;
    expect([fx.startMs, fx.endMs]).toEqual([local(15, 30, 1), local(17, 0, 1)]);
  });

  test('AC-14: № 20 у шухляді — акт стоїть; відповідь з шухляди — акт іде далі', () => {
    const store = withDrone();
    store.getState().ackGift();
    const tg = store.getState().telegrams;
    store.setState({ telegrams: { ...tg, inbox: [...tg.inbox, { uid: 'tg_0020_gift_price#9', id: 'tg_0020_gift_price', kind: 'telegram', receivedAt: local(8, 30, 1), status: 'new' }] } });
    store.getState().answerTelegram('tg_0020_gift_price#9', 'drawer');
    expect(store.getState().race.active!.pausedAtMs).toBe(store.getState().lastMs);
    store.getState().answerTelegram('tg_0020_gift_price#9', 'diligent');
    expect(store.getState().race.active!.pausedAtMs).toBeNull();
    // «сумлінно» додало 4 год
    expect(store.getState().race.active!.sped).toEqual([{ method: 'telegram', sec: 4 * 3600 }]);
  });
});

describe('екрани гонки', () => {
  test('AC-2: gift-arrived — служба 9 год, акт 7 год, вердикт; «Зареєструвати акт» відкриває картку', async () => {
    const store = withDrone();
    await render(<MainScreen store={store} />);
    const g = screen.getByTestId('gift-arrived');
    expect(g).toHaveTextContent(/Ліна привезла подарунок/);
    expect(g).toHaveTextContent(/Прослужить на фронті\s*8\sгод\s30\sхв/);
    expect(screen.getByTestId('gift-verdict')).toHaveTextContent(/Встигаєш із запасом 1\sгод\s30\sхв/);
    await fireEvent.press(screen.getByTestId('gift-register'));
    expect(screen.queryByTestId('gift-arrived')).toBeNull();
    expect(screen.getByTestId('race-card')).toHaveTextContent(/Акт № 1 · Квадрокоптер/);
  });

  test('AC-7, AC-12: Р2 — «Не встигаєш», «Прискорити» головна; «Послатися на цифру» −2 год, раз за гонку', async () => {
    const store = withDrone(2, 38);
    store.getState().ackGift();
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('race-verdict')).toHaveTextContent(/Не встигаєш: її спишуть раніше, ніж поставлять на облік. Бракує 30\sхв/);
    await fireEvent.press(screen.getByTestId('race-speed'));
    expect(screen.getByTestId('race-act-left')).toHaveTextContent(/9\sгод/);
    await fireEvent.press(screen.getByTestId('race-digital'));
    expect(screen.getByTestId('race-act-left')).toHaveTextContent(/7\sгод/);
    expect(screen.getByTestId('race-sped')).toHaveTextContent(/Прискорено · −2\sгод, послалися на цифру/);
    expect(store.getState().state.prestigePoints).toBe(38);
    expect(store.getState().raceDigital()).toBe(false);
  });

  test('AC-12: P_total 0 — «Послатися на цифру» неактивна', async () => {
    const store = withDrone(1, 0);
    store.getState().ackGift();
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('race-speed'));
    await fireEvent.press(screen.getByTestId('race-digital'));
    expect(store.getState().race.active!.digUsed).toBe(false);
  });

  test('AC-16: ресурс скінчився раніше — race-lost із записом курйозу, підписи й папір ті самі', async () => {
    const store = withDrone(2);
    store.getState().ackGift();
    const before = { sig: store.getState().state.signatures, paper: store.getState().state.paper };
    await act(async () => store.getState().tick(local(17, 1, 1)));
    // дохід за хвилини гри додається, тож порівнюємо, що не зменшилось
    expect(store.getState().state.signatures).toBeGreaterThanOrEqual(before.sig);
    expect(store.getState().state.paper).toBeGreaterThanOrEqual(before.paper);
    await render(<MainScreen store={store} />);
    const lost = screen.getByTestId('race-lost');
    expect(lost).toHaveTextContent(/Квадрокоптер \(1 шт\.\), подарунок волонтерів, списано раніше, ніж поставлено на облік\./);
    expect(lost).toHaveTextContent(/Пройдено етапів4 з 5/);
    expect(store.getState().events.some((e) => e.type === 'raceCurio')).toBe(true);
  });
});
