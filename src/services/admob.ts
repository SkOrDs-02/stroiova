// Реклама за винагороду на пристрої (008 етап 2): AdMob (`react-native-google-mobile-ads`) і згода UMP.
// Без блоку реклами для платформи (`EXPO_PUBLIC_ADMOB_REWARDED_IOS` / `_ANDROID`) у збірці релізу ролика немає; у розробці - тестовий блок Google.
// SDK передається залежністю (`AdsSdk`): у тестах без нативного модуля - підробка.
import { Platform } from 'react-native';

import type { AdAvailability, AdResult, AdService } from '@/monetization/types';

import { unavailableAds } from './ads';

/** FR-10: скільки чекаємо ролик після тапу */
export const AD_WAIT_MS = 10_000;
/** Повтор завантаження після «немає ролика» чи мережі, поки гравець не тапнув */
export const AD_RETRY_MS = 60_000;

export interface ConsentInfo {
  canRequestAds: boolean;
  /** UMP: форму треба показати (ЄЕЗ, Велика Британія, Швейцарія) */
  required: boolean;
}

/** Події ролика, які нам потрібні */
export type RewardedEvent = { kind: 'loaded' } | { kind: 'earned' } | { kind: 'closed' } | { kind: 'error'; phase: 'load' | 'show'; reason: string };

export interface RewardedLike {
  load(): void;
  show(): Promise<void>;
  /** Підписка на події; повертає відписку */
  listen(cb: (e: RewardedEvent) => void): () => void;
}

export interface AdsSdk {
  requestInfoUpdate(): Promise<ConsentInfo>;
  /** Форма згоди, якщо потрібна; після неї - актуальний стан */
  showConsentIfRequired(): Promise<ConsentInfo>;
  initialize(): Promise<unknown>;
  rewarded(unitId: string): RewardedLike;
}

type Load = 'idle' | 'loading' | 'ready' | 'no_fill' | 'no_net';
type Consent = 'unknown' | 'required' | 'ok' | 'denied';

export function admobAds(sdk: AdsSdk | null, unitId: string | null): AdService {
  if (!sdk || !unitId) return unavailableAds;
  const ads = sdk;
  const unit = unitId;
  let started = false;
  let consent: Consent = 'unknown';
  let load: Load = 'idle';
  let ad: RewardedLike | null = null;
  let inited: Promise<unknown> | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  const waiters = new Set<() => void>();
  const wake = () => {
    for (const w of [...waiters]) w();
  };

  const onEvent = (e: RewardedEvent) => {
    if (e.kind === 'loaded') load = 'ready';
    else if (e.kind === 'error' && e.phase === 'load') {
      load = e.reason === 'network-error' || e.reason === 'timeout' ? 'no_net' : 'no_fill';
      retry ??= setTimeout(() => {
        retry = null;
        startLoad();
      }, AD_RETRY_MS);
    }
    wake();
  };

  // один ролик напоготові (FR-10); вантажимо лише з дозволом UMP (FR-13)
  function startLoad() {
    if (consent !== 'ok' || load === 'loading' || load === 'ready') return;
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
        load = 'no_fill';
        wake();
      }
    });
  }

  const take = (c: ConsentInfo) => {
    consent = c.canRequestAds ? 'ok' : c.required ? 'required' : 'denied';
  };

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
      const t = setTimeout(() => done(false), AD_WAIT_MS);
      waiters.add(check);
    });
  }

  return {
    start: ({ noAds }) => {
      // FR-14: з «Без реклами» ні AdMob, ні UMP
      if (noAds || started) return;
      started = true;
      ads
        .requestInfoUpdate()
        .then(take)
        // збій UMP: SDK бере згоду з попередньої сесії, ролик пробуємо однаково
        .catch(() => {
          consent = 'ok';
        })
        .then(startLoad);
    },
    availability: (): AdAvailability => {
      if (consent === 'denied') return 'no_consent';
      // форма згоди відкривається першим тапом «Дивитися» (FR-13)
      if (consent === 'required') return 'ready';
      if (load === 'ready') return 'ready';
      if (load === 'no_fill') return 'no_fill';
      if (load === 'no_net') return 'no_net';
      return 'loading';
    },
    show: async (): Promise<AdResult> => {
      if (consent === 'required' || consent === 'unknown') {
        try {
          take(await ads.showConsentIfRequired());
        } catch {
          // форма не відкрилась: стан згоди лишається попереднім
        }
        if ((consent as Consent) !== 'ok') return { kind: 'fail', stage: 'consent_blocked' };
      }
      if (load === 'no_fill' || load === 'no_net') {
        if (retry) clearTimeout(retry);
        retry = null;
        load = 'idle';
      }
      startLoad();
      if (!(await waitReady()) || !ad) return { kind: 'fail', stage: load === 'loading' ? 'not_ready' : 'load' };
      const shown = ad;
      load = 'idle';
      return new Promise<AdResult>((resolve) => {
        let settled = false;
        const finish = (r: AdResult) => {
          if (!settled) {
            settled = true;
            resolve(r);
          }
        };
        const off = shown.listen((e) => {
          // контракт AdService: нагорода - на EARNED_REWARD, до закриття ролика (FR-12)
          if (e.kind === 'earned') finish({ kind: 'earned' });
          else if (e.kind === 'closed') {
            finish({ kind: 'closed_early' });
            off();
            startLoad();
          } else if (e.kind === 'error' && e.phase === 'show') {
            finish({ kind: 'fail', stage: 'show', code: e.reason });
            off();
            startLoad();
          }
        });
        shown.show().catch((err: unknown) => {
          finish({ kind: 'fail', stage: 'show', code: err instanceof Error ? err.message.slice(0, 60) : undefined });
          off();
          startLoad();
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
    const info = (c: { canRequestAds: boolean; status: string }): ConsentInfo => ({ canRequestAds: c.canRequestAds, required: c.status === m.AdsConsentStatus.REQUIRED });
    return {
      requestInfoUpdate: async () => info(await m.AdsConsent.requestInfoUpdate()),
      showConsentIfRequired: async () => info(await m.AdsConsent.loadAndShowConsentFormIfRequired()),
      initialize: () => m.default().initialize(),
      rewarded: (unitId) => {
        const ad = m.RewardedAd.createForAdRequest(unitId);
        return {
          load: () => ad.load(),
          show: () => ad.show(),
          listen: (cb) => {
            const offs = [
              ad.addAdEventListener(m.RewardedAdEventType.LOADED, () => cb({ kind: 'loaded' })),
              ad.addAdEventListener(m.RewardedAdEventType.EARNED_REWARD, () => cb({ kind: 'earned' })),
              ad.addAdEventListener(m.AdEventType.CLOSED, () => cb({ kind: 'closed' })),
              ad.addAdEventListener(m.AdEventType.ERROR, (e) => cb({ kind: 'error', phase: e.phase ?? 'load', reason: String(e.reason ?? 'unknown') })),
            ];
            return () => offs.forEach((off) => off());
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
