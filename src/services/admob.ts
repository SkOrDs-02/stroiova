// Реклама за винагороду на пристрої (008 етап 2): AdMob (`react-native-google-mobile-ads`) і згода UMP.
// Без блоку реклами для платформи (`EXPO_PUBLIC_ADMOB_REWARDED_IOS` / `_ANDROID`) у збірці релізу ролика немає; у розробці - тестовий блок Google.
// SDK передається залежністю (`AdsSdk`): у тестах без нативного модуля - підробка.
import { Platform } from 'react-native';

import type { AdAvailability, AdResult, AdService, ConsentUpdate } from '@/monetization/types';

import { unavailableAds } from './ads';

/** FR-10: скільки чекаємо ролик після тапу */
export const AD_WAIT_MS = 10_000;
/** Повтор завантаження після «немає ролика» чи мережі (рішення 123) */
export const AD_RETRY_MS = 60_000;

export interface ConsentInfo {
  canRequestAds: boolean;
  status: ConsentUpdate['status'];
  /** UMP вимагає рядок «Налаштування реклами» (010 FR-17) */
  privacyOptionsRequired: boolean;
}

/** Події ролика, які нам потрібні */
export type RewardedEvent = { kind: 'loaded' } | { kind: 'opened' } | { kind: 'earned' } | { kind: 'closed' } | { kind: 'error'; phase: 'load' | 'show'; reason: string };

export interface RewardedLike {
  load(): void;
  show(): Promise<void>;
  /** Підписка на події; повертає відписку */
  listen(cb: (e: RewardedEvent) => void): () => void;
}

export interface AdsSdk {
  requestInfoUpdate(): Promise<ConsentInfo>;
  /** Стан згоди з попередньої сесії (без мережі) */
  consentInfo(): Promise<ConsentInfo>;
  /** Форма згоди, якщо потрібна; після неї - актуальний стан */
  showConsentIfRequired(): Promise<ConsentInfo>;
  showPrivacyOptions(): Promise<ConsentInfo>;
  initialize(): Promise<unknown>;
  rewarded(unitId: string): RewardedLike;
}

type Load = 'idle' | 'loading' | 'ready' | 'no_fill' | 'no_net';

export function admobAds(sdk: AdsSdk | null, unitId: string | null, now: () => number = Date.now): AdService {
  if (!sdk || !unitId) return unavailableAds;
  const ads = sdk;
  const unit = unitId;
  let started = false;
  let off = false;
  let consent: ConsentInfo | null = null;
  let load: Load = 'idle';
  let ad: RewardedLike | null = null;
  let inited: Promise<unknown> | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  const waiters = new Set<() => void>();
  const consentCbs = new Set<(c: ConsentUpdate) => void>();
  const wake = () => {
    for (const w of [...waiters]) w();
  };
  const emit = (trigger: ConsentUpdate['trigger'], c: ConsentInfo, formShown: boolean) => {
    for (const cb of consentCbs) cb({ trigger, status: c.status, formShown, canRequestAds: c.canRequestAds, privacyOptionsRequired: c.privacyOptionsRequired });
  };

  const failLoad = (state: 'no_fill' | 'no_net') => {
    load = state;
    if (!off) {
      retry ??= setTimeout(() => {
        retry = null;
        if (load === 'no_fill' || load === 'no_net') load = 'idle';
        startLoad();
      }, AD_RETRY_MS);
    }
    wake();
  };

  const onEvent = (e: RewardedEvent) => {
    if (e.kind === 'loaded') {
      load = 'ready';
      wake();
    } else if (e.kind === 'error' && e.phase === 'load') failLoad(e.reason === 'network-error' || e.reason === 'timeout' ? 'no_net' : 'no_fill');
  };

  // один ролик напоготові (FR-10); вантажимо лише з дозволом UMP (FR-13), з «Без реклами» - ніколи (FR-14)
  function startLoad() {
    if (off || !consent?.canRequestAds || load !== 'idle') return;
    load = 'loading';
    inited ??= ads.initialize().catch(() => undefined);
    void inited.then(() => {
      try {
        if (!ad) {
          ad = ads.rewarded(unit);
          ad.listen(onEvent);
        }
        ad.load();
      } catch {
        failLoad('no_fill');
      }
    });
  }

  function waitReady(): Promise<boolean> {
    if (load === 'ready') return Promise.resolve(true);
    return new Promise((resolve) => {
      const done = (ok: boolean) => {
        clearTimeout(t);
        waiters.delete(check);
        resolve(ok);
      };
      const check = () => {
        if (load === 'ready') done(true);
        else if (load === 'no_fill' || load === 'no_net') done(false);
      };
      // FR-10, AC-9: 10 с без ролика - «Ролика немає», далі повтор у фоні
      const t = setTimeout(() => {
        failLoad('no_fill');
        done(false);
      }, AD_WAIT_MS);
      waiters.add(check);
    });
  }

  return {
    start: ({ noAds }) => {
      // FR-14: з «Без реклами» ні AdMob, ні UMP; після покупки посеред сесії - без повторів
      if (noAds) {
        off = true;
        if (retry) clearTimeout(retry);
        retry = null;
        return;
      }
      if (started) return;
      started = true;
      ads
        .requestInfoUpdate()
        // збій UMP: стан згоди з попередньої сесії, ролик - лише з canRequestAds (FR-13)
        .catch(() => ads.consentInfo())
        .then((c) => {
          consent = c;
        })
        .catch(() => undefined)
        .then(startLoad);
    },
    onConsent: (cb) => {
      consentCbs.add(cb);
      return () => void consentCbs.delete(cb);
    },
    privacyOptionsRequired: () => consent?.privacyOptionsRequired ?? false,
    showPrivacyOptions: async () => {
      try {
        consent = await ads.showPrivacyOptions();
        emit('privacy_settings', consent, true);
        startLoad();
      } catch {
        // форма не відкрилась: нічого не змінюємо
      }
    },
    availability: (): AdAvailability => {
      // форма згоди відкривається першим тапом «Дивитися» (FR-13)
      if (consent?.status === 'required') return 'ready';
      if (consent && !consent.canRequestAds) return 'no_consent';
      if (load === 'ready') return 'ready';
      if (load === 'no_fill') return 'no_fill';
      if (load === 'no_net') return 'no_net';
      return 'loading';
    },
    show: async (): Promise<AdResult> => {
      const tapped = now();
      if (!consent || consent.status === 'required') {
        try {
          const before = consent?.status;
          consent = await ads.showConsentIfRequired();
          // AC-11: форма була (статус «потрібна» до неї) - `ads_consent_update` з trigger = first_ad_watch
          if (before === 'required' || consent.status !== before) emit('first_ad_watch', consent, before === 'required');
        } catch {
          // форма не відкрилась: стан згоди лишається попереднім
        }
        if (!consent?.canRequestAds) return { kind: 'fail', stage: 'consent_blocked' };
      }
      startLoad();
      if (!(await waitReady()) || !ad) return { kind: 'fail', stage: 'load' };
      const shown = ad;
      load = 'idle';
      return new Promise<AdResult>((resolve) => {
        let settled = false;
        let waitMs = 0;
        const finish = (r: AdResult) => {
          if (!settled) {
            settled = true;
            resolve(r);
          }
        };
        const done = () => {
          unlisten();
          startLoad();
        };
        const unlisten = shown.listen((e) => {
          if (e.kind === 'opened') waitMs = Math.max(0, now() - tapped);
          // контракт AdService: нагорода - на EARNED_REWARD, до закриття ролика (FR-12)
          else if (e.kind === 'earned') finish({ kind: 'earned', waitMs });
          else if (e.kind === 'closed') {
            finish({ kind: 'closed_early', waitMs });
            done();
          } else if (e.kind === 'error' && e.phase === 'show') {
            finish({ kind: 'fail', stage: 'show', code: e.reason });
            done();
          }
        });
        shown.show().catch((err: unknown) => {
          finish({ kind: 'fail', stage: 'show', code: err instanceof Error ? err.message.slice(0, 60) : undefined });
          done();
        });
      });
    },
  };
}

/** Справжній SDK; без нативного модуля (Expo Go, тести) - null */
export function nativeAdsSdk(): AdsSdk | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');
    const S = m.AdsConsentStatus;
    const info = (c: { canRequestAds: boolean; status: string; privacyOptionsRequirementStatus: string }): ConsentInfo => ({
      canRequestAds: c.canRequestAds,
      status: c.status === S.OBTAINED ? 'obtained' : c.status === S.REQUIRED ? 'required' : c.status === S.NOT_REQUIRED ? 'not_required' : 'unknown',
      privacyOptionsRequired: c.privacyOptionsRequirementStatus === m.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    });
    return {
      requestInfoUpdate: async () => info(await m.AdsConsent.requestInfoUpdate()),
      consentInfo: async () => info(await m.AdsConsent.getConsentInfo()),
      showConsentIfRequired: async () => info(await m.AdsConsent.loadAndShowConsentFormIfRequired()),
      showPrivacyOptions: async () => info(await m.AdsConsent.showPrivacyOptionsForm()),
      initialize: () => m.default().initialize(),
      rewarded: (unitId) => {
        const ad = m.RewardedAd.createForAdRequest(unitId);
        return {
          load: () => ad.load(),
          show: () => ad.show(),
          listen: (cb) => {
            const offs = [
              ad.addAdEventListener(m.RewardedAdEventType.LOADED, () => cb({ kind: 'loaded' })),
              ad.addAdEventListener(m.AdEventType.OPENED, () => cb({ kind: 'opened' })),
              ad.addAdEventListener(m.RewardedAdEventType.EARNED_REWARD, () => cb({ kind: 'earned' })),
              ad.addAdEventListener(m.AdEventType.CLOSED, () => cb({ kind: 'closed' })),
              ad.addAdEventListener(m.AdEventType.ERROR, (e) => cb({ kind: 'error', phase: e.phase ?? 'load', reason: String(e.reason ?? 'unknown') })),
            ];
            return () => offs.forEach((f) => f());
          },
        };
      },
    };
  } catch {
    return null;
  }
}

/** Блок реклами платформи; у розробці без ключа - тестовий блок Google */
export function rewardedUnitId(sdk: AdsSdk | null): string | null {
  const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID;
  if (key) return key;
  if (!__DEV__ || !sdk) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads')).TestIds.REWARDED;
  } catch {
    return null;
  }
}

export function deviceAds(): AdService {
  const sdk = nativeAdsSdk();
  return admobAds(sdk, rewardedUnitId(sdk));
}
