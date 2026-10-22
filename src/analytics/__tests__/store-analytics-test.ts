// Аналітика у сторі: перший запуск, початок сесії, глобальні властивості, події гри через track() (strict), вимикач «Аналітика».
import { memoryAnalytics } from '@/analytics/service';
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import { DEFAULT_ENV } from '@/features/conveyor/analytics';
import { createConveyorStore } from '@/features/conveyor/store';
import { newFinale } from '@/finale/finale';
import { onboardingDone } from '@/save/migrations';

const T0 = new Date(2025, 9, 10, 12).getTime();
const DAY = 86_400_000;
const ORDER = bundledConfig.params.convert.order;
const ENV = { ...DEFAULT_ENV, strict: true, contentVersion: 'content-test', appVersion: '1.2.3' };

function game(init: Parameters<typeof createConveyorStore>[2] = {}) {
  const m = memoryAnalytics();
  const store = createConveyorStore(T0, bundledConfig, { installId: '8f3c1d52-0000-4000-8000-000000000001', onboarding: onboardingDone(), env: ENV, ...init, services: { analytics: m.service } });
  return { store, ...m };
}
const names = (m: { events: { name: string }[] }) => m.events.map((e) => e.name);

describe('перший запуск і сесія', () => {
  test('identify з set_once, app_first_open і session_start; номер сесії 1', () => {
    const m = game();
    expect(m.calls.identify).toHaveLength(1);
    expect(m.calls.identify[0]).toMatchObject({ installId: '8f3c1d52-0000-4000-8000-000000000001', setOnce: { install_app_version: '1.2.3', install_build_channel: 'development', install_economy_config_version: bundledConfig.version, first_device_region: 'UA' } });
    expect(m.calls.identify[0]!.setOnce).toMatchObject({ install_date: expect.stringMatching(/^2025-10-1\d$/), install_week: expect.stringMatching(/^2025-W\d\d$/) });
    expect(names(m)).toEqual(['app_first_open', 'session_start']);
    expect(m.events[1]!.props).toMatchObject({ is_cold_start: true, entry_point: 'icon', session_number: 1, level_id: 'batalion', dub_number: 0, content_version: 'content-test', game_session_id: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(m.events[1]!.props).not.toHaveProperty('sec_since_last_session');
    expect(m.store.getState().analytics).toMatchObject({ sessionNumber: 1, firstOpenSent: true });
    expect(m.calls.user.length).toBe(1);
  });

  test('наступний запуск: без identify і app_first_open, номер сесії росте, час від кінця попередньої', () => {
    const m = game({ analytics: { sessionNumber: 4, lastSessionEndMs: T0 - 3600_000, firstOpenSent: true } });
    expect(m.calls.identify).toHaveLength(0);
    expect(names(m)).toEqual(['session_start']);
    expect(m.events[0]!.props).toMatchObject({ session_number: 5, sec_since_last_session: 3600 });
  });

  test('без install_id (ще не створено) перший запуск не шлемо', () => {
    const m = game({ installId: '' });
    expect(m.calls.identify).toHaveLength(0);
    expect(names(m)).toEqual(['session_start']);
  });

  test('глобальні властивості відбивають стан гри', () => {
    const m = game({ analytics: { sessionNumber: 0, lastSessionEndMs: null, firstOpenSent: true }, state: { ...newGame(bundledConfig, T0), level: 5, hasNoAds: true, prestigePoints: 50 } });
    expect(m.events[0]!.props).toMatchObject({ level_id: 'bez_paperu', has_no_ads: true, is_payer: false, is_finale_done: false, awards_owned: 0, is_test_user: false, economy_config_source: 'bundled', save_schema_version: 19 });
    expect(m.calls.user[0]).toMatchObject({ current_level_id: 'bez_paperu', has_no_ads: true, digital_points_total: 50, is_onboarding_complete: true });
  });
});

describe('події гри через track()', () => {
  test('покупка рівня -> upgrade_purchase з властивостями за планом', () => {
    const m = game({ analytics: { sessionNumber: 0, lastSessionEndMs: null, firstOpenSent: true }, state: { ...newGame(bundledConfig, T0), signatures: 1e6 } });
    m.events.length = 0;
    m.store.getState().buy({ type: 'stream', id: 'raporty' }, T0 + 1000);
    expect(names(m)).toContain('upgrade_purchase');
    const e = m.events.find((x) => x.name === 'upgrade_purchase')!;
    expect(e.props).toMatchObject({ target_type: 'stream', target_id: 'raporty', buy_mode: 'x1', analytics_plan_version: 3 });
  });

  test('Дубль: dub_start з новим dub_number у глобальних, personal_record_update з Дубля 2', () => {
    const quiet = { startMs: T0 - 8 * DAY, yMs: T0 - 7.5 * DAY, scriptNs: 0, done: { order: 1, script: 2, last_book: 3, call: 4, credits: 5, quiet: 6 } };
    const m = game({ analytics: { sessionNumber: 0, lastSessionEndMs: null, firstOpenSent: true }, state: { ...newGame(bundledConfig, T0), level: 5, digital: ORDER, prestigePoints: 1840 }, finale: { ...newFinale(), ...quiet } });
    m.store.setState({ lastMs: T0 });
    m.store.getState().tick(T0 + 60_000);
    m.events.length = 0;
    expect(m.store.getState().dubAccept()).toBe(true);
    const ds = m.events.find((x) => x.name === 'dub_start')!;
    expect(ds.props).toMatchObject({ dub_number: 1, points_total: 1840 });
    expect(names(m)).toContain('finale_step_complete');
    expect(names(m)).not.toContain('personal_record_update');
    m.store.setState({ state: { ...m.store.getState().state, digital: ORDER } });
    m.events.length = 0;
    m.store.getState().dubAccept();
    expect(m.events.find((x) => x.name === 'personal_record_update')!.props).toMatchObject({ record_type: 'dub', value: 2, previous_value: 1, dub_number: 2 });
  });

  test('stage_convert: sec_since_available від моменту, коли конвертація стала доступною', () => {
    const m = game({ analytics: { sessionNumber: 0, lastSessionEndMs: null, firstOpenSent: true }, state: { ...newGame(bundledConfig, T0), level: 5, signatures: 1e15, streamLevels: [1, 1, 1, 1, 1, 1, 1] } });
    m.store.setState({ state: { ...m.store.getState().state } });
    m.store.setState({ lastMs: T0 + 40_000 });
    m.events.length = 0;
    expect(m.store.getState().convertStage()).toEqual({ ok: true });
    const e = m.events.find((x) => x.name === 'stage_convert')!;
    expect(e.props).toMatchObject({ convert_index: 1, stage_id: ORDER[0] });
    expect(e.props.sec_since_available).toBe(40);
  });
});

describe('вимикач «Аналітика» (010 FR-14)', () => {
  test('вимкнення: setting_change ще йде, потім flush і optOut; далі тиша; увімкнення повертає', async () => {
    const m = game({ analytics: { sessionNumber: 0, lastSessionEndMs: null, firstOpenSent: true } });
    expect(m.calls.optOut).toEqual([false]);
    m.events.length = 0;
    m.store.getState().setSetting('analytics', false);
    expect(m.events).toHaveLength(1);
    expect(m.events[0]).toMatchObject({ name: 'setting_change', props: { setting_name: 'analytics', new_value: 'off' } });
    await Promise.resolve();
    await Promise.resolve();
    expect(m.calls.flush).toBe(1);
    expect(m.calls.optOut).toEqual([false, true]);
    // після вимкнення нічого не йде
    m.store.getState().setSetting('haptics', false);
    expect(m.events).toHaveLength(1);
    m.store.getState().setSetting('analytics', true);
    expect(m.calls.optOut).toEqual([false, true, false]);
    expect(m.events.at(-1)).toMatchObject({ name: 'setting_change', props: { setting_name: 'analytics', new_value: 'on' } });
  });

  test('запуск із вимкненою аналітикою: нічого не шлемо й optOut(true)', () => {
    const m = game({ settings: { ...game().store.getState().settings, analytics: false } });
    expect(m.events).toHaveLength(0);
    expect(m.calls.optOut).toEqual([true]);
  });
});
