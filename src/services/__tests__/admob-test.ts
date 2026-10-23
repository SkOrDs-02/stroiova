// 008 етап 2: адаптер AdMob і UMP на підробленому SDK (FR-1, FR-10…FR-14, AC-12).
import { AD_RETRY_MS, AD_WAIT_MS, admobAds, type AdsSdk, type ConsentInfo, type RewardedEvent } from '../admob';
import { unavailableAds } from '../ads';

function fakeSdk(consent: ConsentInfo, afterForm: ConsentInfo = consent) {
  const log = { info: 0, form: 0, init: 0, loads: 0, shows: 0 };
  let cb: ((e: RewardedEvent) => void)[] = [];
  const sdk: AdsSdk = {
    requestInfoUpdate: async () => {
      log.info++;
      return consent;
    },
    showConsentIfRequired: async () => {
      log.form++;
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

const OK: ConsentInfo = { canRequestAds: true, required: false };
const REQUIRED: ConsentInfo = { canRequestAds: false, required: true };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function settle() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
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
    const f = fakeSdk(OK);
    const ads = admobAds(f.sdk, 'unit');
    expect(ads.availability()).toBe('loading');
    ads.start!({ noAds: false });
    await settle();
    expect(f.log).toMatchObject({ info: 1, init: 1, loads: 1, form: 0 });
    f.emit({ kind: 'loaded' });
    expect(ads.availability()).toBe('ready');
  });

  test('FR-13: потрібна форма - до тапу нічого не вантажимо; форма після тапу, далі ролик', async () => {
    const f = fakeSdk(REQUIRED, OK);
    const ads = admobAds(f.sdk, 'unit');
    ads.start!({ noAds: false });
    await settle();
    expect(f.log).toMatchObject({ info: 1, init: 0, loads: 0 });
    expect(ads.availability()).toBe('ready');
    const p = ads.show('income_boost');
    await settle();
    expect(f.log.form).toBe(1);
    expect(f.log.loads).toBe(1);
    f.emit({ kind: 'loaded' });
    await settle();
    expect(f.log.shows).toBe(1);
    f.emit({ kind: 'earned' });
    await expect(p).resolves.toEqual({ kind: 'earned' });
  });

  test('FR-13: згоди не дали - consent_blocked, далі «немає згоди»', async () => {
    const f = fakeSdk(REQUIRED, { canRequestAds: false, required: false });
    const ads = admobAds(f.sdk, 'unit');
    ads.start!({ noAds: false });
    await settle();
    await expect(ads.show('race_speedup')).resolves.toEqual({ kind: 'fail', stage: 'consent_blocked' });
    expect(ads.availability()).toBe('no_consent');
    expect(f.log.loads).toBe(0);
  });

  test('FR-11, FR-12: нагорода - на EARNED_REWARD, до закриття; після закриття вантажиться наступний ролик', async () => {
    const f = fakeSdk(OK);
    const ads = admobAds(f.sdk, 'unit');
    ads.start!({ noAds: false });
    await settle();
    f.emit({ kind: 'loaded' });
    const p = ads.show('offline_double');
    await settle();
    f.emit({ kind: 'earned' });
    await expect(p).resolves.toEqual({ kind: 'earned' });
    expect(f.log.loads).toBe(1);
    f.emit({ kind: 'closed' });
    await settle();
    expect(f.log.loads).toBe(2);
    expect(ads.availability()).toBe('loading');
  });

  test('FR-11: ролик закрито раніше - closed_early', async () => {
    const f = fakeSdk(OK);
    const ads = admobAds(f.sdk, 'unit');
    ads.start!({ noAds: false });
    await settle();
    f.emit({ kind: 'loaded' });
    const p = ads.show('income_boost');
    await settle();
    f.emit({ kind: 'closed' });
    await expect(p).resolves.toEqual({ kind: 'closed_early' });
  });

  test('FR-10: ролик не готовий за 10 с після тапу - not_ready', async () => {
    const f = fakeSdk(OK);
    const ads = admobAds(f.sdk, 'unit');
    ads.start!({ noAds: false });
    await settle();
    const p = ads.show('income_boost');
    await settle();
    jest.advanceTimersByTime(AD_WAIT_MS);
    await expect(p).resolves.toEqual({ kind: 'fail', stage: 'not_ready' });
  });

  test('немає ролика чи мережі - причина в availability і повтор через хвилину', async () => {
    const f = fakeSdk(OK);
    const ads = admobAds(f.sdk, 'unit');
    ads.start!({ noAds: false });
    await settle();
    f.emit({ kind: 'error', phase: 'load', reason: 'no-fill' });
    expect(ads.availability()).toBe('no_fill');
    jest.advanceTimersByTime(AD_RETRY_MS);
    await settle();
    expect(f.log.loads).toBe(2);
    f.emit({ kind: 'error', phase: 'load', reason: 'network-error' });
    expect(ads.availability()).toBe('no_net');
  });

  test('збій показу - fail show з причиною', async () => {
    const f = fakeSdk(OK);
    const ads = admobAds(f.sdk, 'unit');
    ads.start!({ noAds: false });
    await settle();
    f.emit({ kind: 'loaded' });
    const p = ads.show('inspection_checklist');
    await settle();
    f.emit({ kind: 'error', phase: 'show', reason: 'internal-error' });
    await expect(p).resolves.toEqual({ kind: 'fail', stage: 'show', code: 'internal-error' });
  });

  test('збій UMP на запуску - ролик пробуємо однаково (згода з попередньої сесії)', async () => {
    const f = fakeSdk(OK);
    f.sdk.requestInfoUpdate = async () => {
      throw new Error('net');
    };
    const ads = admobAds(f.sdk, 'unit');
    ads.start!({ noAds: false });
    await settle();
    expect(f.log.loads).toBe(1);
  });
});
