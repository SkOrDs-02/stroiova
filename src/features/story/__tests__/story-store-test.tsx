// 014 етап 1 на екрані й у сторі: безпечний момент (AC-4), ліміт дзвінків (AC-5), пташка (AC-14), щоденник (AC-17, AC-19), наздоганяння (AC-8, AC-20).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { itemsFor, newGame } from '@/economy/game/state';
import type { DomainEvent, EconomyState } from '@/economy/game/types';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { DiaryScreen } from '@/features/story/DiaryScreen';
import { onboardingDone } from '@/save/migrations';
import { BEATS } from '@/story/content';
import { newStory, storyForLevel } from '@/story/engine';

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

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = new Date(2025, 9, 10, 12, 0).getTime();

function game(level: number, counts: Record<string, number>, patch: Partial<EconomyState> = {}) {
  const store = createConveyorStore(T0, bundledConfig);
  const g = { ...newGame(bundledConfig, T0), level };
  const it = itemsFor(g, bundledConfig);
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    inspections: { ...store.getState().inspections, installMs: T0 - 9 * DAY },
    telegrams: { ...store.getState().telegrams, startMs: T0 - 9 * DAY },
    digit: { ...store.getState().digit, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), cycleStartMs: T0 - 5 * HOUR, levelStartMs: T0 - 40 * HOUR },
    state: { ...g, streamLevels: it.streams.map(() => 5), stageLevels: it.stages.map(() => 5), signatures: 1e6, ...patch },
  });
  return store;
}

afterEach(async () => {
  await act(async () => {});
});

describe('безпечний момент і ліміт дзвінків', () => {
  test('дзвінок сюжету: показується сам у спокійний момент, рахується в ліміті сесії, після «Зрозуміло» зникає (ліміт двох - engine-test, AC-5)', async () => {
    const store = game(1, { '1': 1 });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('story-call')).toHaveTextContent(/Такої посади в штаті немає/);
    expect(store.getState().storySession.interrupting).toBe(1);
    await fireEvent.press(screen.getByTestId('story-call-ok'));
    expect(screen.queryByTestId('story-call')).toBeNull();
    expect(store.getState().story.delivered['st_who_writes_01']).toBeTruthy();
    expect(store.getState().events.some((e) => e.type === 'storyBeatDeliver' && e.beatId === 'st_who_writes_01')).toBe(true);
  });

  test('AC-4: поки відкрита довідка повернення, дзвінок не показано; після «Забрати» - показано', async () => {
    const store = game(1, { '1': 1 });
    await act(async () => store.getState().away(T0, T0 + 20 * 60_000));
    expect(store.getState().offline).not.toBeNull();
    // перевірка й подарунок, що прийшли без гравця, - не предмет цього тесту
    store.setState({ inspections: { ...store.getState().inspections, active: null }, race: { ...store.getState().race, active: null } });
    await render(<MainScreen store={store} />);
    expect(screen.queryByTestId('story-call')).toBeNull();
    await act(async () => {
      store.getState().claim();
    });
    expect(screen.getByTestId('story-call')).toBeTruthy();
  });
});

describe('Пташка і записки (AC-14)', () => {
  test('перша виграна гонка за дрон на Р3: записка «Пташка-3» у вхідних, поза лімітом дзвінків', async () => {
    const store = game(3, { '3': 0 });
    store.setState({ story: storyForLevel(BEATS, 3) });
    await render(<MainScreen store={store} />);
    expect(store.getState().telegrams.inbox.some((x) => x.kind === 'note' && x.id === 'st_ptashka_02')).toBe(false);
    const ev: DomainEvent = { type: 'raceFinish', id: 'r1', giftType: 'drone', result: 'success', marginSec: 5, speedups: 0, offline: false };
    await act(async () => store.setState({ events: [...store.getState().events, ev] }));
    const note = store.getState().telegrams.inbox.find((x) => x.id === 'st_ptashka_02');
    expect(note).toMatchObject({ kind: 'note', read: false });
    expect(store.getState().events.some((e) => e.type === 'storyBeatDeliver' && e.beatId === 'st_ptashka_02')).toBe(true);
  });

  test('гонка за лопату не дає записки', async () => {
    const store = game(3, {});
    store.setState({ story: storyForLevel(BEATS, 3) });
    await render(<MainScreen store={store} />);
    const ev: DomainEvent = { type: 'raceFinish', id: 'r1', giftType: 'shovel', result: 'success', marginSec: 5, speedups: 0, offline: false };
    await act(async () => store.setState({ events: [...store.getState().events, ev] }));
    expect(store.getState().telegrams.inbox.some((x) => x.id === 'st_ptashka_02')).toBe(false);
  });
});

describe('наздоганяння (AC-20)', () => {
  test('перший запуск з сюжетом на Р3: кроки Р1-Р2 закрито, нічого не показано', async () => {
    const store = game(3, { '1': 6, '2': 6, '3': 0 });
    store.setState({ story: storyForLevel(BEATS, 3) });
    await render(<MainScreen store={store} />);
    expect(screen.queryByTestId('story-call')).toBeNull();
    expect(Object.keys(store.getState().story.delivered)).toEqual([]);
  });
});

describe('щоденник (AC-17, AC-19)', () => {
  test('друга доба: рядок Р1 у довідці повернення; та сама доба вдруге - без рядка', async () => {
    const store = game(1, {});
    store.setState({ story: { ...newStory(), skipped: ['st_who_writes_01'] } });
    await act(async () => store.getState().away(T0 - 14 * HOUR, T0 + 13 * HOUR));
    expect(store.getState().story.diary.got).toHaveLength(1);
    expect(store.getState().story.diary.got[0]!.id).toBe('di_l1_01');
    await act(async () => {
      store.getState().claim();
    });
    // та сама доба, нова сесія - рядка немає
    await act(async () => store.getState().away(T0 + 14 * HOUR, T0 + 16 * HOUR));
    expect(store.getState().story.diary.got).toHaveLength(1);
  });

  test('без довідки (коротка відсутність) рядок приходить тостом', async () => {
    const store = game(1, {});
    store.setState({ story: { ...newStory(), skipped: ['st_who_writes_01'] } });
    // 11.10, рання сесія: перша сесія доби, відсутність надто коротка для довідки - рядок тостом
    const back = T0 + 14 * HOUR;
    await act(async () => store.getState().away(back - 3 * 60_000, back));
    expect(store.getState().offline).toBeNull();
    expect(store.getState().toast).toMatchObject({ kind: 'text', text: expect.stringContaining('комп’ютерами') });
    store.getState().clearToast();
    // друга сесія тієї самої доби
    await act(async () => store.getState().away(back + 60_000, back + 120_000));
    expect(store.getState().toast).toBeNull();
    expect(store.getState().story.diary.got).toHaveLength(1);
  });

  test('diary: порожній екран - підказка', async () => {
    await render(<DiaryScreen store={game(1, {})} insetTop={0} onBack={() => {}} />);
    expect(screen.getByTestId('diary-empty')).toBeTruthy();
  });

  test('diary: отримані рядки за днями з лічильником, нові зверху', async () => {
    const store = game(1, {});
    store.setState({ story: { ...newStory(), diary: { got: [{ id: 'di_l1_01', atMs: T0, day: 2 }, { id: 'di_l1_02', atMs: T0 + DAY, day: 3 }], lastDay: '2025-10-11' } } });
    await render(<DiaryScreen store={store} insetTop={0} onBack={() => {}} />);
    expect(screen.getByTestId('diary-count')).toHaveTextContent('2 записи');
    expect(screen.getAllByTestId('diary-row')).toHaveLength(2);
  });
});

describe('носії: телеграма, курйоз, записка', () => {
  test('телеграма кроку: після записки й +24 год стає в чергу телеграм; доставленою вважається при отриманні', async () => {
    const store = game(2, { '2': 1 });
    store.setState({ story: { ...newStory(), skipped: ['st_who_writes_01'] } });
    await render(<MainScreen store={store} />);
    expect(store.getState().telegrams.inbox.some((x) => x.id === 'st_who_writes_02' && x.kind === 'note')).toBe(true);
    expect(store.getState().telegrams.queue).toEqual([]);
    await act(async () => {
      store.setState({ lastMs: T0 + 25 * HOUR });
      store.getState().storyRun();
    });
    expect(store.getState().telegrams.queue).toEqual(['tg_notice_kopiyka_numbering']);
    expect(store.getState().story.delivered['st_who_writes_03']).toBeUndefined();
    await act(async () => store.setState({ events: [...store.getState().events, { type: 'telegramReceive', telegramId: 'tg_notice_kopiyka_numbering', uid: 'u1', delivery: 'live', scripted: true }] }));
    expect(store.getState().story.delivered['st_who_writes_03']).toBeTruthy();
    expect(store.getState().events.some((e) => e.type === 'storyBeatDeliver' && e.beatId === 'st_who_writes_03' && e.carrier === 'telegram')).toBe(true);
  });

  test('курйоз від сюжету: запис у Журналі курйозів з підписом персонажа', async () => {
    const store = game(3, { '3': 0 });
    store.setState({ story: storyForLevel(BEATS, 3), telegrams: { ...store.getState().telegrams, packs: { day: null, seq: 1 } } });
    await render(<MainScreen store={store} />);
    const c = store.getState().museum.curios.find((x) => x.kind === 'story');
    expect(c?.story).toMatchObject({ beatId: 'st_who_writes_04', title: 'Зведення телеграм' });
    expect(store.getState().museum.curioSeq).toBe(1);
  });

  test('записка сюжету відкривається в note-detail з підписом і текстом', async () => {
    const store = game(3, {});
    store.setState({ story: storyForLevel(BEATS, 3) });
    await render(<MainScreen store={store} />);
    await act(async () => store.setState({ events: [...store.getState().events, { type: 'raceFinish', id: 'r1', giftType: 'drone', result: 'success', marginSec: 5, speedups: 0, offline: false }] }));
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    await fireEvent.press(screen.getByTestId('tg-row-st_ptashka_02#1'));
    expect(screen.getByTestId('note-detail')).toHaveTextContent(/Пташка-3 у небі/);
    expect(screen.getByTestId('note-detail')).toHaveTextContent(/Ліна/);
  });
});
