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
    // «Переїзд» (017) на Р3-Р4 уже позаду: він тримав би чергу модалок
    move: { done: [3, 4] },
    inspections: { ...store.getState().inspections, installMs: T0 - 9 * 24 * HOUR },
    telegrams: { ...store.getState().telegrams, startMs: T0 - 9 * 24 * HOUR },
    digit: { ...store.getState().digit, cycleStartMs: T0 - 5 * HOUR, levelStartMs: T0 - 40 * HOUR },
    state: { ...g, streamLevels: it.streams.map(() => 5), stageLevels: it.stages.map(() => 5), signatures: 1e6 },
  });
  return store;
}

type Json = { props?: Record<string, unknown>; children?: (Json | string)[] | null } | (Json | string)[] | null;
const find = (n: Json, id: string): Json => {
  if (!n || typeof n !== 'object') return null;
  if (Array.isArray(n)) return n.map((x) => find(x as Json, id)).find((x) => x != null) ?? null;
  if (n.props?.testID === id) return n;
  return (n.children ?? []).map((c) => (typeof c === 'string' ? null : find(c, id))).find((x) => x != null) ?? null;
};
const hasHorizontalScroll = (n: Json): boolean => {
  if (!n || typeof n !== 'object') return false;
  if (Array.isArray(n)) return n.some((x) => hasHorizontalScroll(x as Json));
  return n.props?.horizontal === true || (n.children ?? []).some((c) => typeof c !== 'string' && hasHorizontalScroll(c));
};

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

  test('AC-11: гонку програно - аркуш усе одно виданий (видача не залежить від результату)', async () => {
    const store = game(2);
    store.setState({ story: { ...newStory(), skipped: ['st_who_writes_01'] } });
    await render(<MainScreen store={store} />);
    await act(async () =>
      store.setState({
        events: [
          ...store.getState().events,
          { type: 'raceStart', id: 'r1', giftType: 'drone', docSec: 60, resourceSec: 60, winnable: true },
          { type: 'raceFinish', id: 'r1', giftType: 'drone', result: 'fail', marginSec: -5, speedups: 0, offline: false, level: 1 },
        ],
      }),
    );
    expect(Object.keys(store.getState().story.sheets)).toEqual(['ar_01']);
  });

  test('перший запуск на Р3: спершу «Переїзд» (017), потім аркуші Р2 і аркуш переїзду одним тостом з множиною', async () => {
    const store = game(3);
    store.setState({ story: storyForLevel(BEATS, 3), move: { done: [] } });
    await render(<MainScreen store={store} />);
    expect(Object.keys(store.getState().story.sheets)).toEqual([]);
    await fireEvent.press(screen.getByTestId('mi-skip'));
    await fireEvent.press(screen.getByTestId('mr-close'));
    const texts = [store.getState().toast, ...store.getState().toastQueue].map((t) => JSON.stringify(t));
    expect(texts.some((t) => t.includes('Знайдено 4 аркуші Археолога'))).toBe(true);
    expect(Object.keys(store.getState().story.sheets)).toEqual(['ar_01', 'ar_02', 'ar_03', 'ar_04']);
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
    expect(find(screen.toJSON(), 'archive-grid')).not.toBeNull();
    expect(hasHorizontalScroll(find(screen.toJSON(), 'archive-grid'))).toBe(false);
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
  test('без аркуша server (st_archaeologist_04) сцени немає, хоч 4-ту сюжетну телеграму доставлено', async () => {
    const store = game(4);
    const base = storyForLevel(BEATS, 4);
    const at = { at: T0 - HOUR, rev: 1, catchUp: false, away: false };
    store.setState({ story: { ...base, delivered: Object.fromEntries(['st_who_writes_07', 'st_who_writes_08', 'st_who_writes_09', 'st_who_writes_10'].map((id) => [id, at])) } });
    await render(<MainScreen store={store} />);
    expect(screen.queryByTestId('finale-script')).toBeNull();
  });

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
  const outcome = (kind: 'final' | 'regular', level: number, passed = true) => ({ id: 'i1', no: 7, trigger: 'scheduled' as const, boss: 'command_commission' as const, level, kind, attempt: 1, arrMs: T0, passed, exitUnlocked: kind === 'final' && passed, remark: false, items: [], reason: null, offline: false, seen: false });

  test('підсумкова Р4 пройдена (подія finalPassed): в акті «Неврахований об’єкт, спить.»', async () => {
    const store = game(4);
    store.setState({ story: storyForLevel(BEATS, 4) });
    await act(async () => store.setState({ events: [...store.getState().events, { type: 'finalPassed', id: 'i1', level: 4, attempt: 1 }], inspections: { ...store.getState().inspections, last: outcome('final', 4) } }));
    expect(store.getState().story.fired['st_cat_02']).toBeTruthy();
    const r = await render(<InspResult store={store} />);
    expect(screen.getByTestId('insp-act-line')).toHaveTextContent('Неврахований об’єкт, спить.');
    r.unmount();
  });

  test('звичайна перевірка чи програна підсумкова рядка не мають', async () => {
    const store = game(4);
    store.setState({ story: { ...newStory(), fired: { st_cat_02: { at: T0, away: false } } }, inspections: { ...store.getState().inspections, last: outcome('regular', 4) } });
    const r1 = await render(<InspResult store={store} />);
    expect(screen.queryByTestId('insp-act-line')).toBeNull();
    r1.unmount();
    store.setState({ inspections: { ...store.getState().inspections, last: outcome('final', 4, false) } });
    await render(<InspResult store={store} />);
    expect(screen.queryByTestId('insp-act-line')).toBeNull();
  });
});
