// 008 етап 2: адаптер AdMob і UMP на підробленому SDK (FR-1, FR-10…FR-14, AC-9, AC-11, AC-12; 010 FR-17).
import type { ConsentUpdate } from '@/monetization/types';

import { AD_RETRY_MS, AD_WAIT_MS, admobAds, type AdsSdk, type ConsentInfo, type RewardedEvent } from '../admob';
import { unavailableAds } from '../ads';

function fakeSdk(consent: ConsentInfo, afterForm: ConsentInfo = consent) {
  const log = { info: 0, form: 0, privacy: 0, init: 0, loads: 0, shows: 0 };
  let cb: ((e: RewardedEvent) => void)[] = [];
  const sdk: AdsSdk = {
    requestInfoUpdate: async () => {
      log.info++;
      return consent;
    },
    consentInfo: async () => consent,
    showConsentIfRequired: async () => {
      log.form++;
      return afterForm;
    },
    showPrivacyOptions: async () => {
      log.privacy++;
      return afterForm;
    },
    initialize: async () => {
      log.init++;
    },
    rewarded: () => ({
      load: () => {
        log.loads++;
      },
      show: async () => {
        log.shows++;
      },
      listen: (f) => {
        cb.push(f);
        return () => {
          cb = cb.filter((x) => x !== f);
        };
      },
    }),
  };
  const emit = (e: RewardedEvent) => [...cb].forEach((f) => f(e));
  return { sdk, log, emit };
}

const OK: ConsentInfo = { canRequestAds: true, status: 'not_required', privacyOptionsRequired: false };
const OBTAINED: ConsentInfo = { canRequestAds: true, status: 'obtained', privacyOptionsRequired: true };
const REQUIRED: ConsentInfo = { canRequestAds: false, status: 'required', privacyOptionsRequired: true };
const DENIED: ConsentInfo = { canRequestAds: false, status: 'obtained', privacyOptionsRequired: true };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function settle() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

async function started(consent: ConsentInfo, afterForm?: ConsentInfo, clock?: () => number) {
  const f = fakeSdk(consent, afterForm);
  const ads = admobAds(f.sdk, 'unit', clock);
  const updates: ConsentUpdate[] = [];
  ads.onConsent!((c) => updates.push(c));
  ads.start!({ noAds: false });
  await settle();
  return { ...f, ads, updates };
}

describe('admobAds', () => {
  test('без SDK чи блоку реклами - заглушка', () => {
    expect(admobAds(null, 'unit')).toBe(unavailableAds);
    expect(admobAds(fakeSdk(OK).sdk, null)).toBe(unavailableAds);
  });

  test('AC-12, FR-14: з «Без реклами» ні UMP, ні ініціалізації', async () => {
    const f = fakeSdk(OK);
    admobAds(f.sdk, 'unit').start!({ noAds: true });
    await settle();
    expect(f.log).toMatchObject({ info: 0, init: 0, loads: 0 });
  });

  test('FR-13: UMP на запуску; згода є - ролик вантажиться одразу і готовий', async () => {
    const t = await started(OK);
    expect(t.log).toMatchObject({ info: 1, init: 1, loads: 1, form: 0 });
    expect(t.ads.availability()).toBe('loading');
    t.emit({ kind: 'loaded' });
    expect(t.ads.availability()).toBe('ready');
    expect(t.updates).toEqual([]);
  });

  test('AC-11: форма потрібна - до тапу нічого не вантажимо; форма першим тапом, ads_consent_update first_ad_watch, далі ролик', async () => {
    const t = await started(REQUIRED, OBTAINED);
    expect(t.log).toMatchObject({ info: 1, init: 0, loads: 0 });
    expect(t.ads.availability()).toBe('ready');
    const p = t.ads.show('income_boost');
    await settle();
    expect(t.log.form).toBe(1);
    expect(t.updates).toEqual([{ trigger: 'first_ad_watch', status: 'obtained', formShown: true, canRequestAds: true, privacyOptionsRequired: true }]);
    expect(t.log.loads).toBe(1);
    t.emit({ kind: 'loaded' });
    await settle();
    expect(t.log.shows).toBe(1);
    t.emit({ kind: 'opened' });
    t.emit({ kind: 'earned' });
    await expect(p).resolves.toMatchObject({ kind: 'earned' });
  });

  test('FR-13: згоди не дали - consent_blocked, далі «немає згоди», ролик не вантажиться', async () => {
    const t = await started(REQUIRED, DENIED);
    await expect(t.ads.show('race_speedup')).resolves.toEqual({ kind: 'fail', stage: 'consent_blocked' });
    expect(t.ads.availability()).toBe('no_consent');
    expect(t.log.loads).toBe(0);
    expect(t.updates[0]).toMatchObject({ trigger: 'first_ad_watch', canRequestAds: false, formShown: true });
  });

  test('FR-13: збій UMP на запуску - стан згоди з попередньої сесії; без canRequestAds ролика немає', async () => {
    const f = fakeSdk(DENIED);
    f.sdk.requestInfoUpdate = async () => {
      throw new Error('net');
    };
    admobAds(f.sdk, 'unit').start!({ noAds: false });
    await settle();
    expect(f.log.loads).toBe(0);
    const g = fakeSdk(OK);
    g.sdk.requestInfoUpdate = async () => {
      throw new Error('net');
    };
    admobAds(g.sdk, 'unit').start!({ noAds: false });
    await settle();
    expect(g.log.loads).toBe(1);
  });

  test('FR-11, FR-12: нагорода - на EARNED_REWARD, до закриття; час до відкриття - для ad_start; після закриття - наступний ролик', async () => {
    let clock = 1000;
    const t = await started(OK, OK, () => clock);
    t.emit({ kind: 'loaded' });
    const p = t.ads.show('offline_double');
    await settle();
    clock = 1450;
    t.emit({ kind: 'opened' });
    t.emit({ kind: 'earned' });
    await expect(p).resolves.toEqual({ kind: 'earned', waitMs: 450 });
    expect(t.log.loads).toBe(1);
    t.emit({ kind: 'closed' });
    await settle();
    expect(t.log.loads).toBe(2);
    expect(t.ads.availability()).toBe('loading');
  });

  test('FR-11: ролик закрито раніше - closed_early', async () => {
    const t = await started(OK);
    t.emit({ kind: 'loaded' });
    const p = t.ads.show('income_boost');
    await settle();
    t.emit({ kind: 'opened' });
    t.emit({ kind: 'closed' });
    await expect(p).resolves.toMatchObject({ kind: 'closed_early' });
  });

  test('AC-9, FR-10: ролик не готовий за 10 с після тапу - fail load, кнопка «Ролика немає», повтор у фоні', async () => {
    const t = await started(OK);
    const p = t.ads.show('income_boost');
    await settle();
    jest.advanceTimersByTime(AD_WAIT_MS);
    await expect(p).resolves.toEqual({ kind: 'fail', stage: 'load' });
    expect(t.ads.availability()).toBe('no_fill');
    jest.advanceTimersByTime(AD_RETRY_MS);
    await settle();
    expect(t.log.loads).toBe(2);
    t.emit({ kind: 'loaded' });
    expect(t.ads.availability()).toBe('ready');
  });

  test('немає ролика чи мережі - причина в availability і повтор через хвилину', async () => {
    const t = await started(OK);
    t.emit({ kind: 'error', phase: 'load', reason: 'no-fill' });
    expect(t.ads.availability()).toBe('no_fill');
    jest.advanceTimersByTime(AD_RETRY_MS);
    await settle();
    expect(t.log.loads).toBe(2);
    t.emit({ kind: 'error', phase: 'load', reason: 'network-error' });
    expect(t.ads.availability()).toBe('no_net');
  });

  test('FR-14: «Без реклами» посеред сесії - повторів більше немає', async () => {
    const t = await started(OK);
    t.emit({ kind: 'error', phase: 'load', reason: 'no-fill' });
    t.ads.start!({ noAds: true });
    jest.advanceTimersByTime(AD_RETRY_MS * 3);
    await settle();
    expect(t.log.loads).toBe(1);
  });

  test('збій показу - fail show з причиною', async () => {
    const t = await started(OK);
    t.emit({ kind: 'loaded' });
    const p = t.ads.show('inspection_checklist');
    await settle();
    t.emit({ kind: 'error', phase: 'show', reason: 'internal-error' });
    await expect(p).resolves.toEqual({ kind: 'fail', stage: 'show', code: 'internal-error' });
  });

  test('010 FR-17: рядок налаштувань реклами - за вимогою UMP; форма шле privacy_settings', async () => {
    const eu = await started(OBTAINED);
    expect(eu.ads.privacyOptionsRequired!()).toBe(true);
    await eu.ads.showPrivacyOptions!();
    expect(eu.log.privacy).toBe(1);
    expect(eu.updates).toEqual([{ trigger: 'privacy_settings', status: 'obtained', formShown: true, canRequestAds: true, privacyOptionsRequired: true }]);
    const ua = await started(OK);
    expect(ua.ads.privacyOptionsRequired!()).toBe(false);
  });
});
