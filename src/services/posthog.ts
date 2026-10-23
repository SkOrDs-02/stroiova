// Аналітика на пристрої: PostHog EU Cloud (docs/analytics.md «Налаштування SDK»). Без ключа `EXPO_PUBLIC_POSTHOG_KEY` вимкнено
// (локальна розробка, тести), як Sentry без DSN. Подія вже перевірена `track()`; `before_send` відкидає все, чого немає в плані.
import PostHog from 'posthog-react-native';

import { EVENTS } from '@/analytics/plan.generated';
import { unavailableAnalytics, type AnalyticsService } from '@/analytics/service';

/** Дані в ЄС */
export const POSTHOG_HOST = 'https://eu.i.posthog.com';

/** Події плану й службові події SDK для профілю (`$identify`, `$set`); решта (автозахоплення, lifecycle) не йде */
export function inPlan(event: string): boolean {
  return event in EVENTS || event === '$identify' || event === '$set';
}

export function posthogAnalytics(apiKey: string | undefined = process.env.EXPO_PUBLIC_POSTHOG_KEY): AnalyticsService {
  if (!apiKey) return unavailableAnalytics;
  const key = apiKey;
  // SDK створюється лише тоді, коли статистику ввімкнено: на старті він завжди тягне віддалений конфіг,
  // тож із вимкненою «Аналітикою» (010 FR-16) клієнта немає взагалі й запитів теж
  let ph: PostHog | null = null;
  let off = false;
  const client = (): PostHog | null => {
    if (ph || off) return ph;
    try {
      ph = new PostHog(key, {
        host: POSTHOG_HOST,
        personProfiles: 'identified_only',
        // свої app_first_open і session_* замість «Application Opened / Backgrounded»
        captureAppLifecycleEvents: false,
        enableSessionReplay: false,
        disableSurveys: true,
        persistence: 'file',
        maxQueueSize: 1000,
        flushAt: 20,
        flushInterval: 30_000,
        // країна - з налаштувань пристрою (`device_region`), а не з IP (010 FR-23)
        disableGeoip: true,
        // віддалений конфіг економіки через флаг - окремий етап; до нього запитів флагів немає
        preloadFeatureFlags: false,
        disableRemoteFeatureFlags: true,
        before_send: (e) => (inPlan(e.event) ? e : null),
      });
    } catch {
      off = true;
    }
    return ph;
  };
  return {
    capture: (name, props) => client()?.capture(name, props as never),
    identify: (installId, setOnce) => client()?.identify(installId, setOnce ? { $set_once: setOnce as never } : undefined),
    setUserProps: (props) => client()?.setPersonProperties(props as never),
    optOut: (out) => {
      if (out && !ph) return;
      const c = client();
      if (c) void (out ? c.optOut() : c.optIn()).catch(() => {});
    },
    flush: () => (ph ? ph.flush().catch(() => {}) : Promise.resolve()),
  };
}
