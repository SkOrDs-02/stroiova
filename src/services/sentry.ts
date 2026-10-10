import * as Sentry from '@sentry/react-native';

// Краші й помилки (docs/analytics.md). Без DSN Sentry вимкнено: локальна розробка, тести.
// Персональних даних не шлемо: sendDefaultPii false, позивного в подіях немає (002 FR-10, 009 FR-8).
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export const wrapRoot = Sentry.wrap;
