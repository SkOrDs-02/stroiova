// Аналітика: обгортка track() проти tracking-plan.yaml - перевірка типів і переліків, глобальні властивості, вимикач, вибірка.
import { EVENTS, GLOBAL_PROPS, PLAN_VERSION } from '../plan.generated';
import { isSampled } from '../sampling';
import { memoryAnalytics } from '../service';
import { createTracker } from '../track';
import { validateEvent, validateGlobals } from '../validate';

const GLOBALS = {
  economy_config_version: 'econ-v7.4',
  economy_config_source: 'bundled' as const,
  content_version: 'content-2026.10.10',
  save_schema_version: 18,
  game_session_id: '9b2f6c1e-7d3a-4c1b-9a51-2f0f3e8d4a10',
  session_number: 3,
  playtime_sec: 1200,
  days_since_install: 1,
  level_id: 'batalion' as const,
  dub_number: 0,
  is_finale_done: false,
  awards_owned: 0,
  digitization_count: 0,
  has_no_ads: false,
  is_payer: false,
  is_econ_detail_sampled: true,
  build_channel: 'development' as const,
  is_test_user: false,
};

function tracker(patch: { enabled?: boolean; sampled?: boolean; strict?: boolean } = {}) {
  const m = memoryAnalytics();
  const bad: [string, string[]][] = [];
  const t = createTracker({ service: m.service, globals: () => GLOBALS, enabled: () => patch.enabled ?? true, sampled: () => patch.sampled ?? true, strict: patch.strict, onInvalid: (n, e) => bad.push([n, e]) });
  return { ...m, t, bad };
}

describe('план: генерований файл', () => {
  // відповідність YAML перевіряє `node tools/gen_analytics.mjs --check` (CI)
  test('60 подій, версія плану 3, 19 глобальних властивостей', () => {
    expect(Object.keys(EVENTS)).toHaveLength(60);
    expect(PLAN_VERSION).toBe(3);
    expect(Object.keys(GLOBAL_PROPS)).toHaveLength(19);
  });
  test('обов’язкові властивості позначено: dub_start - усі, app_first_open - без is_reinstall', () => {
    expect(Object.values(EVENTS.dub_start.props).every((p) => p.required)).toBe(true);
    expect(EVENTS.app_first_open.props.is_reinstall!.required).toBe(false);
    expect(EVENTS.upgrade_purchase.sampling).toBe('econ_detail');
  });
});

describe('validateEvent', () => {
  test('повна подія проходить', () => {
    expect(validateEvent('dub_start', { dub_number: 1, modifier_id: 'wet_seal', points_total: 10, sec_since_finale: 5, sec_since_offer: 2 })).toEqual([]);
  });
  test('невідома подія, відсутня обов’язкова, зайва, тип, перелік', () => {
    expect(validateEvent('nope', {})).toHaveLength(1);
    expect(validateEvent('personal_record_update', { record_type: 'dub', value: 2 })).toEqual(['previous_value: обов’язкова властивість відсутня']);
    expect(validateEvent('personal_record_update', { record_type: 'dub', value: 2, previous_value: 1, extra: 1 })).toEqual(['extra: властивості немає в плані']);
    expect(validateEvent('personal_record_update', { record_type: 'dub', value: 'x', previous_value: 1 })[0]).toMatch(/value: очікується число/);
    expect(validateEvent('personal_record_update', { record_type: 'wat', value: 2, previous_value: 1 })[0]).toMatch(/record_type: значення "wat" поза переліком/);
  });
  test('integer не приймає дроб; необов’язкова може бути відсутня', () => {
    expect(validateEvent('clerk_hire', { target_type: 'stream', target_id: 'raporty', cost_log10: 1.2, is_first_clerk: true, clerks_count_after: 1.5, sec_since_cycle_start: 3 })[0]).toMatch(/clerks_count_after: очікується ціле/);
    expect(validateEvent('app_first_open', { device_region: 'UA', device_locale: 'uk-UA' })).toEqual([]);
  });
  test('глобальні властивості', () => {
    expect(validateGlobals({ ...GLOBALS, analytics_plan_version: PLAN_VERSION })).toEqual([]);
    expect(validateGlobals({ ...GLOBALS })).toEqual(['analytics_plan_version: глобальна властивість відсутня']);
  });
});

describe('createTracker', () => {
  test('подія йде з глобальними властивостями й версією плану', () => {
    const { t, events } = tracker();
    expect(t.track('dub_start', { dub_number: 1, modifier_id: 'no_did', points_total: 10, sec_since_finale: 5, sec_since_offer: 2 })).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ name: 'dub_start', props: { dub_number: 1, modifier_id: 'no_did', level_id: 'batalion', analytics_plan_version: PLAN_VERSION, session_number: 3 } });
  });
  test('вимикач «Аналітика»: нічого не шлемо', () => {
    const { t, events } = tracker({ enabled: false });
    expect(t.track('dub_start', { dub_number: 1, modifier_id: 'no_did', points_total: 10, sec_since_finale: 5, sec_since_offer: 2 })).toBe(false);
    expect(events).toHaveLength(0);
  });
  test('upgrade_purchase - лише для пристроїв у вибірці', () => {
    const p = { target_type: 'stream' as const, target_id: 'raporty' as const, level_from: 1, level_to: 2, levels_bought: 1, buy_mode: 'x1' as const, cost_log10: 1, was_bottleneck: false, income_before_log10: 1, income_after_log10: 1.1 };
    const out = tracker({ sampled: false });
    expect(out.t.track('upgrade_purchase', p)).toBe(false);
    expect(out.events).toHaveLength(0);
    const inn = tracker({ sampled: true });
    expect(inn.t.track('upgrade_purchase', p)).toBe(true);
  });
  test('хибні властивості: подію відкинуто й повідомлено; у strict - кидається', () => {
    const a = tracker();
    expect(a.t.track('personal_record_update', { record_type: 'dub', value: 2 } as never)).toBe(false);
    expect(a.events).toHaveLength(0);
    expect(a.t.dropped()).toBe(1);
    expect(a.bad[0]![0]).toBe('personal_record_update');
    const b = tracker({ strict: true });
    expect(() => b.t.track('personal_record_update', { record_type: 'dub', value: 2 } as never)).toThrow(/previous_value/);
  });
  test('невідому подію відкинуто', () => {
    const a = tracker();
    expect(a.t.track('nope' as never, {} as never)).toBe(false);
    expect(a.t.dropped()).toBe(1);
  });
});

describe('вибірка', () => {
  test('детермінована: один install_id - одна група; 100% бере всіх, 0% - нікого', () => {
    expect(isSampled('abc', 100)).toBe(true);
    expect(isSampled('abc', 0)).toBe(false);
    expect(isSampled('abc', 37)).toBe(isSampled('abc', 37));
    let n = 0;
    for (let i = 0; i < 2000; i++) if (isSampled(`id-${i}`, 20)) n++;
    expect(n / 2000).toBeGreaterThan(0.15);
    expect(n / 2000).toBeLessThan(0.25);
  });
});
