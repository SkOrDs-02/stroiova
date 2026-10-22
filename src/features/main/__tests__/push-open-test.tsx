// 010 етап 2: тап по сповіщенню (FR-8, AC-6), entry_point = push, push_open; вікно оцінки (FR-24, AC-17); дозвіл ОС (FR-11, AC-8).
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { memoryAnalytics } from '@/analytics/service';
import { bundledConfig } from '@/economy/config';
import { DEFAULT_ENV } from '@/features/conveyor/analytics';
import { createConveyorStore } from '@/features/conveyor/store';
import { fakeNotifications, fakeReview } from '@/notifications/test-services';
import type { PushOpen } from '@/notifications/types';
import { onboardingDone } from '@/save/migrations';
import { openOf, permissionOf } from '@/services/device';

import { MainScreen } from '../MainScreen';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const local = (h: number, m = 0, day = 0) => new Date(2025, 9, 10 + day, h, m).getTime();
const MIN = 60_000;

/** Р1 з діловодами на всіх ланках: офлайн-довідка після відсутності */
function game(env: Partial<typeof DEFAULT_ENV> & { entryPoint?: 'icon' | 'push' } = {}) {
  const m = memoryAnalytics();
  const notifications = fakeNotifications();
  const review = fakeReview();
  const store = createConveyorStore(local(15), bundledConfig, {
    installId: '8f3c1d52-0000-4000-8000-000000000001',
    env: { ...DEFAULT_ENV, strict: true, ...env },
    onboarding: onboardingDone(),
    services: { analytics: m.service, notifications, review },
  });
  const s = store.getState().state;
  store.setState({
    state: { ...s, streamLevels: [40, 0, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, false, false, false], stageClerks: [true, true, true] },
    inspections: { ...store.getState().inspections, installMs: local(15) },
  });
  return { store, m, notifications, review };
}
const names = (m: { events: { name: string }[] }) => m.events.map((e) => e.name);
const tap = (o: Partial<PushOpen> & Pick<PushOpen, 'type' | 'target' | 'atMs'>): PushOpen => ({ id: `n-${o.type}`, ...o });

describe('тап по сповіщенню (FR-8)', () => {
  test('AC-6: відсутність 9 год, тап по № 1 - спершу offline-return; session_start з entry_point = push, далі push_open storage_full', async () => {
    const g = game();
    await render(<MainScreen store={g.store} />);
    await act(async () => g.store.getState().goBackground(local(15, 1)));
    const at = local(0, 1, 1);
    g.store.getState().pushOpened(tap({ type: 'storage_full', target: 'offline-return', atMs: at - 21 * MIN }), at);
    await act(async () => {
      g.store.getState().away(local(15, 1), at);
      await g.store.getState().comeForeground(at);
    });
    expect(screen.getByTestId('offline-return')).toBeTruthy();
    const n = names(g.m);
    const start = n.lastIndexOf('session_start');
    expect(n.slice(start)).toContain('push_open');
    expect(n.indexOf('push_open', start)).toBeGreaterThan(start);
    expect(g.m.events[start]!.props).toMatchObject({ entry_point: 'push', is_cold_start: false });
    expect(g.m.events.find((e) => e.name === 'push_open')!.props).toMatchObject({ push_type: 'storage_full', delay_sec: 1260 });
    await fireEvent.press(screen.getByTestId('offline-claim'));
    expect(screen.queryByTestId('tg-detail')).toBeNull();
  });

  test('AC-6: відсутність 3 хв, тап по № 2 - одразу tg-detail нової телеграми; повторний тап тим самим id нічого не шле', async () => {
    const g = game();
    const tg = g.store.getState().telegrams;
    g.store.setState({ telegrams: { ...tg, inbox: [{ uid: 'tg_0015_paper_copy#1', id: 'tg_0015_paper_copy', kind: 'telegram', receivedAt: local(15, 3), status: 'new' }], deliveries: 1 } });
    await render(<MainScreen store={g.store} />);
    await act(async () => g.store.getState().goBackground(local(15, 1)));
    const p = tap({ type: 'telegram_new', target: 'tg-detail', atMs: local(15, 3) });
    await act(async () => {
      g.store.getState().pushOpened(p, local(15, 4));
      g.store.getState().pushOpened(p, local(15, 4));
      await g.store.getState().comeForeground(local(15, 4));
    });
    expect(screen.getByTestId('tg-detail')).toBeTruthy();
    expect(names(g.m).filter((x) => x === 'push_open')).toHaveLength(1);
  });

  test('холодний старт тапом: session_start з entry_point = push, потім push_open; з іконки - icon', () => {
    const g = game({ entryPoint: 'push' });
    g.store.getState().pushOpened(tap({ type: 'inspection', target: 'insp-prep', atMs: local(14) }), local(15));
    g.store.getState().pushOpened(tap({ type: 'inspection', target: 'insp-prep', atMs: local(14) }), local(15));
    const n = names(g.m);
    expect(n.indexOf('push_open')).toBeGreaterThan(n.indexOf('session_start'));
    expect(n.filter((x) => x === 'push_open')).toHaveLength(1);
    expect(g.m.events.find((e) => e.name === 'session_start')!.props.entry_point).toBe('push');
    expect(game().m.events.find((e) => e.name === 'session_start')!.props.entry_point).toBe('icon');
  });

  test('тап прийшов, поки гра у фоні: ціль чекає повернення (офлайн-довідка йде першою)', async () => {
    const g = game();
    const tg = g.store.getState().telegrams;
    g.store.setState({ telegrams: { ...tg, inbox: [{ uid: 'tg_0015_paper_copy#1', id: 'tg_0015_paper_copy', kind: 'telegram', receivedAt: local(15, 3), status: 'new' }], deliveries: 1 } });
    await render(<MainScreen store={g.store} />);
    await act(async () => g.store.getState().goBackground(local(15, 1)));
    await act(async () => g.store.getState().pushOpened(tap({ type: 'telegram_new', target: 'tg-detail', atMs: local(15, 3) }), local(15, 4)));
    expect(screen.queryByTestId('tg-detail')).toBeNull();
    expect(g.store.getState().pushNav).not.toBeNull();
    await act(async () => g.store.getState().comeForeground(local(15, 4)));
    expect(screen.getByTestId('tg-detail')).toBeTruthy();
  });
});

describe('вікно оцінки (FR-24, AC-17)', () => {
  test('після пройденої перевірки й акта цифровізації - системне вікно; після провалу - ні', () => {
    const g = game();
    const ins = g.store.getState().inspections;
    const last = { id: 'i1', arrMs: local(15), passed: false, seen: false } as never;
    g.store.setState({ inspections: { ...ins, last } });
    g.store.getState().closeInspResult();
    expect(g.review.log.requests).toBe(0);
    g.store.setState({ inspections: { ...ins, last: { ...(last as object), id: 'i2', passed: true } as never } });
    g.store.getState().closeInspResult();
    expect(g.review.log.requests).toBe(1);
    g.store.setState({ digit: { ...g.store.getState().digit, ceremony: { step: 'result', level: 1 } as never } });
    g.store.getState().closeDigitStep();
    expect(g.review.log.requests).toBe(2);
  });
});

describe('пристрій: дозвіл і дані сповіщення', () => {
  const st = (o: object) => o as Notifications.NotificationPermissionsStatus;
  test('iOS: ios.status точніший за загальний; provisional окремо', () => {
    expect(permissionOf(st({ granted: false, canAskAgain: true, ios: { status: Notifications.IosAuthorizationStatus.NOT_DETERMINED } }))).toBe('not_asked');
    expect(permissionOf(st({ granted: true, canAskAgain: true, ios: { status: Notifications.IosAuthorizationStatus.PROVISIONAL } }))).toBe('provisional');
    expect(permissionOf(st({ granted: true, canAskAgain: true, ios: { status: Notifications.IosAuthorizationStatus.AUTHORIZED } }))).toBe('granted');
    expect(permissionOf(st({ granted: false, canAskAgain: false, ios: { status: Notifications.IosAuthorizationStatus.DENIED } }))).toBe('denied');
  });

  test('AC-8: Android 12 дає granted без запиту; Android 13+ до запиту - not_asked, після відмови назавжди - denied', () => {
    expect(permissionOf(st({ granted: true, canAskAgain: true }))).toBe('granted');
    expect(permissionOf(st({ granted: false, canAskAgain: true }))).toBe('not_asked');
    expect(permissionOf(st({ granted: false, canAskAgain: false }))).toBe('denied');
  });

  test('дані сповіщення -> тап; чуже сповіщення ігнорується', () => {
    const resp = (data: object) => ({ notification: { request: { identifier: 'abc', content: { data } } } }) as unknown as Notifications.NotificationResponse;
    expect(openOf(resp({ type: 'race_won', target: 'main', atMs: 5, ref: 'race_0001' }))).toEqual({ id: 'abc', type: 'race_won', target: 'main', atMs: 5, ref: 'race_0001' });
    expect(openOf(resp({ foo: 1 }))).toBeNull();
  });
});
