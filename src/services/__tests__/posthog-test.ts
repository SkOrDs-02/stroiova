// docs/analytics.md «Налаштування SDK»: EU-хост, без lifecycle, replay, GeoIP і флагів; подія не з плану не йде; без ключа - заглушка.
import { unavailableAnalytics } from '@/analytics/service';

import { inPlan, POSTHOG_HOST, posthogAnalytics } from '../posthog';

const mockCalls: { opts?: Record<string, unknown>; key?: string; made: number; log: [string, ...unknown[]][] } = { log: [], made: 0 };

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: class {
    constructor(key: string, opts: Record<string, unknown>) {
      mockCalls.made++;
      mockCalls.key = key;
      mockCalls.opts = opts;
    }
    capture = (...a: unknown[]) => mockCalls.log.push(['capture', ...a]);
    identify = (...a: unknown[]) => mockCalls.log.push(['identify', ...a]);
    setPersonProperties = (...a: unknown[]) => mockCalls.log.push(['set', ...a]);
    optOut = () => (mockCalls.log.push(['optOut']), Promise.resolve());
    optIn = () => (mockCalls.log.push(['optIn']), Promise.resolve());
    flush = () => (mockCalls.log.push(['flush']), Promise.resolve());
  },
}));

beforeEach(() => {
  mockCalls.log.length = 0;
  mockCalls.made = 0;
});

test('без ключа - заглушка, SDK не створюється', () => {
  expect(posthogAnalytics('')).toBe(unavailableAnalytics);
});

test('налаштування з docs/analytics.md', () => {
  posthogAnalytics('phc_test').optOut(false);
  expect(mockCalls.key).toBe('phc_test');
  expect(mockCalls.opts).toMatchObject({
    host: POSTHOG_HOST,
    personProfiles: 'identified_only',
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    persistence: 'file',
    maxQueueSize: 1000,
    flushAt: 20,
    flushInterval: 30_000,
    disableGeoip: true,
    preloadFeatureFlags: false,
    disableRemoteFeatureFlags: true,
    disableSurveys: true,
  });
  expect(POSTHOG_HOST).toBe('https://eu.i.posthog.com');
});

test('before_send: подія не з плану відкидається, з плану й профіль - ідуть', () => {
  posthogAnalytics('phc_test').optOut(false);
  const bs = mockCalls.opts!.before_send as (e: { event: string }) => unknown;
  expect(bs({ event: 'session_start' })).toEqual({ event: 'session_start' });
  expect(bs({ event: '$identify' })).toBeTruthy();
  expect(bs({ event: 'Application Opened' })).toBeNull();
  expect(bs({ event: '$autocapture' })).toBeNull();
  expect(inPlan('curio_entry_share')).toBe(true);
});

test('виклики: identify з $set_once, властивості, вимикач і flush', async () => {
  const a = posthogAnalytics('phc_test');
  a.identify('8f3c1d52-0000-4000-8000-000000000001', { install_week: '2026-W43' });
  a.capture('session_start', { entry_point: 'icon' });
  a.setUserProps({ current_level_id: 'batalion' } as never);
  a.optOut(true);
  a.optOut(false);
  await a.flush();
  expect(mockCalls.made).toBe(1);
  expect(mockCalls.log).toEqual([
    ['identify', '8f3c1d52-0000-4000-8000-000000000001', { $set_once: { install_week: '2026-W43' } }],
    ['capture', 'session_start', { entry_point: 'icon' }],
    ['set', { current_level_id: 'batalion' }],
    ['optOut'],
    ['optIn'],
    ['flush'],
  ]);
});

test('010 FR-16: статистику вимкнено з запуску - SDK не створюється й нічого не шле; увімкнення створює', async () => {
  const a = posthogAnalytics('phc_test');
  a.optOut(true);
  await a.flush();
  expect(mockCalls.made).toBe(0);
  a.optOut(false);
  expect(mockCalls.made).toBe(1);
  expect(mockCalls.log).toEqual([['optIn']]);
});
