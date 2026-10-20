// 014 AC-10, AC-11, AC-13: аркуші Археолога в сторі й на екрані, сцена finale-script «знайдено».
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { itemsFor, newGame } from '@/economy/game/state';
import { createConveyorStore } from '@/features/conveyor/store';
import { InspResult } from '@/features/inspections/InspResult';
import { MainScreen } from '@/features/main/MainScreen';
import { ArchiveSheets } from '@/features/story/ArchiveSheets';
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
const T0 = new Date(2025, 9, 10, 12, 0).getTime();

function game(level: number) {
  const store = createConveyorStore(T0, bundledConfig);
  const g = { ...newGame(bundledConfig, T0), level };
  const it = itemsFor(g, bundledConfig);
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    inspections: { ...store.getState().inspections, installMs: T0 - 9 * 24 * HOUR },
    telegrams: { ...store.getState().telegrams, startMs: T0 - 9 * 24 * HOUR },
    digit: { ...store.getState().digit, cycleStartMs: T0 - 5 * HOUR, levelStartMs: T0 - 40 * HOUR },
    state: { ...g, streamLevels: it.streams.map(() => 5), stageLevels: it.stages.map(() => 5), signatures: 1e6 },
  });
  return store;
}

afterEach(async () => {
  await act(async () => {});
});

describe('аркуші Археолога в грі (AC-11)', () => {
  test('перший подарунок на Р2: аркуш 1 у збереженні, тост «Знайдено аркуш Археолога», подія archive_sheet_unlock з source: gift', async () => {
    const store = game(2);
    store.setState({ story: { ...newStory(), skipped: ['st_who_writes_01'] } });
    await render(<MainScreen store={store} />);
    await act(async () => store.setState({ events: [...store.getState().events, { type: 'raceStart', id: 'r1', giftType: 'drone', docSec: 60, resourceSec: 60, winnable: true }] }));
    expect(Object.keys(store.getState().story.sheets)).toEqual(['ar_01']);
    expect(store.getState().events.find((e) => e.type === 'archiveSheetUnlock')).toMatchObject({ sheetId: 'ar_01', sheetNumber: 1, source: 'gift', sheetsOwnedAfter: 1 });
    expect(store.getState().story.delivered['st_archaeologist_01']).toBeTruthy();
    const texts = [store.getState().toast, ...store.getState().toastQueue].map((t) => JSON.stringify(t));
    expect(texts.some((t) => t.includes('Знайдено аркуш Археолога: Вхідні телеграми'))).toBe(true);
  });

  test('перший запуск на Р3: аркуші Р2 одним тостом з множиною', async () => {
    const store = game(3);
    store.setState({ story: storyForLevel(BEATS, 3) });
    await render(<MainScreen store={store} />);
    const texts = [store.getState().toast, ...store.getState().toastQueue].map((t) => JSON.stringify(t));
    expect(texts.some((t) => t.includes('Знайдено 3 аркуші Археолога'))).toBe(true);
    expect(Object.keys(store.getState().story.sheets)).toEqual(['ar_01', 'ar_02', 'ar_03']);
  });
});

describe('archive-sheets (AC-13)', () => {
  test('12 слотів: знайдені відкриваються, решта «???» з джерелом; аркуш - таблиця з літерами стовпців, номерами рядків і вкладками', async () => {
    const store = game(3);
    store.setState({ story: { ...newStory(), sheets: { ar_01: T0 } } });
    await render(<ArchiveSheets store={store} onClose={() => {}} />);
    expect(screen.getByTestId('archive-count')).toHaveTextContent('1 з 12');
    expect(screen.getByTestId('archive-slot-2')).toHaveTextContent(/\?\?\?/);
    expect(screen.getByTestId('archive-slot-2')).toHaveTextContent(/Не знайдено · 2-й подарунок Ліни на Р2/);
    expect(screen.getByTestId('archive-slot-12')).toHaveTextContent(/конвертація № 5/);
    await fireEvent.press(screen.getByTestId('archive-slot-1'));
    expect(screen.getByTestId('archive-sheet')).toHaveTextContent(/Аркуш 1 · Вхідні телеграми/);
    const grid = screen.getByTestId('archive-grid');
    expect(grid).toHaveTextContent(/ABC/);
    expect(grid).toHaveTextContent(/Вх\. №/);
    expect(screen.getByTestId('archive-footnote')).toHaveTextContent(/Аркуш 1\./);
    await fireEvent.press(screen.getByTestId('archive-tab-1'));
    expect(screen.getByTestId('archive-grid')).toHaveTextContent(/Посада в штаті\?/);
    await fireEvent.press(screen.getByTestId('archive-sheet-back'));
    expect(screen.getByTestId('archive-sheets')).toBeTruthy();
  });
});

describe('finale-script «знайдено» (AC-10)', () => {
  test('після 4-ї сюжетної телеграми Р4 і аркуша server: сцена з кнопкою «Повернутися», без Y/N; закривається', async () => {
    const store = game(4);
    const base = storyForLevel(BEATS, 4);
    const at = { at: T0 - HOUR, rev: 1, catchUp: false, away: false };
    store.setState({
      story: {
        ...base,
        delivered: Object.fromEntries(['st_who_writes_07', 'st_who_writes_08', 'st_who_writes_09', 'st_who_writes_10', 'st_archaeologist_04'].map((id) => [id, at])),
        skipped: base.skipped.filter((id) => id !== 'st_who_writes_06'),
      },
    });
    store.setState({ story: { ...store.getState().story, skipped: [...store.getState().story.skipped, 'st_who_writes_06'] } });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('finale-script')).toHaveTextContent(/НЕ ВИМИКАТИ\. 1998/);
    expect(screen.getByTestId('fs-screen')).toHaveTextContent(/REM РОЗСИЛКА/);
    expect(screen.getByTestId('fs-line')).toHaveTextContent(/письмовим наказом/);
    expect(screen.queryByTestId('fs-yes')).toBeNull();
    await fireEvent.press(screen.getByTestId('fs-back'));
    expect(screen.queryByTestId('finale-script')).toBeNull();
    expect(store.getState().story.delivered['st_who_writes_11']).toBeTruthy();
  });
});

describe('рядок кота в акті «Аудиту усього» (AC-16)', () => {
  test('підсумкова Р4 пройдена: в акті «Неврахований об’єкт, спить.»', async () => {
    const outcome = (kind: 'final' | 'regular', level: number) => ({ id: 'i1', no: 7, trigger: 'scheduled' as const, boss: 'command_commission' as const, level, kind, attempt: 1, arrMs: T0, passed: true, exitUnlocked: kind === 'final', remark: false, items: [], reason: null, offline: false, seen: false });
    const store = game(4);
    store.setState({ story: { ...newStory(), fired: { st_cat_02: { at: T0, away: false } } }, inspections: { ...store.getState().inspections, last: outcome('final', 4) } });
    const r = await render(<InspResult store={store} />);
    expect(screen.getByTestId('insp-act-line')).toHaveTextContent('Неврахований об’єкт, спить.');
    r.unmount();
  });
});
