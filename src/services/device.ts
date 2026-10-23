// Сервіси пристрою для 010 етапу 2: локальні сповіщення (expo-notifications), зовнішні посилання й буфер (FR-25, FR-27),
// системне вікно оцінки (FR-24). Гра шле лише локальні сповіщення: push-токен не запитуємо, віддалених пушів немає.
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

import { setT } from '@/features/settings/texts';
import type { LinkService, NotificationService, PlannedPush, PushOpen, PushPermission, PushTarget, PushType, ReviewService } from '@/notifications/types';

/** Канал Android: без нього Android 13+ не покаже системного запиту дозволу */
const CHANNEL = 'game';

// сповіщення, що прийшло, поки гра відкрита, не показуємо: гравець і так бачить подію на екрані
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false }),
  });
} catch {
  // без нативного модуля обробника немає
}

let channelReady: Promise<unknown> | null = null;
function ensureChannel(): Promise<unknown> {
  if (Platform.OS !== 'android') return Promise.resolve();
  // невдала спроба не запам'ятовується: наступне планування спробує знову
  channelReady ??= Notifications.setNotificationChannelAsync(CHANNEL, { name: setT.channelName, importance: Notifications.AndroidImportance.DEFAULT }).catch((e: unknown) => {
    channelReady = null;
    throw e;
  });
  return channelReady;
}

/** Дозвіл ОС -> стан гри. iOS: `ios.status` точніший за загальний (provisional); Android 12 і нижче дає granted без запиту */
export function permissionOf(r: Notifications.NotificationPermissionsStatus): PushPermission {
  const ios = r.ios?.status;
  if (ios != null) {
    if (ios === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'provisional';
    if (ios === Notifications.IosAuthorizationStatus.AUTHORIZED || ios === Notifications.IosAuthorizationStatus.EPHEMERAL) return 'granted';
    if (ios === Notifications.IosAuthorizationStatus.DENIED) return 'denied';
    return 'not_asked';
  }
  if (r.granted) return 'granted';
  return r.canAskAgain ? 'not_asked' : 'denied';
}

/** Дані сповіщення -> тап (FR-8); чуже чи пошкоджене сповіщення ігноруємо */
export function openOf(r: Notifications.NotificationResponse): PushOpen | null {
  const d = r.notification.request.content.data as Partial<{ type: PushType; target: PushTarget; ref: string; atMs: number }> | undefined;
  if (!d || typeof d.type !== 'string' || typeof d.target !== 'string' || typeof d.atMs !== 'number') return null;
  return { id: r.notification.request.identifier, type: d.type, target: d.target, atMs: d.atMs, ...(typeof d.ref === 'string' ? { ref: d.ref } : {}) };
}

function contentOf(p: PlannedPush): Notifications.NotificationContentInput {
  return { title: p.title, body: p.body, data: { type: p.type, target: p.target, atMs: p.atMs, ...(p.ref ? { ref: p.ref } : {}) } };
}

/** Збій нативного модуля не має зупиняти гру: сповіщення - не головне (без модуля, у тестах, на старій ОС) */
function safe<T>(f: () => T, fallback: T): T {
  try {
    return f();
  } catch {
    return fallback;
  }
}
async function safeAsync<T>(f: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await f();
  } catch {
    return fallback;
  }
}

export const deviceNotifications: NotificationService = {
  initialOpen: () =>
    safe(() => {
      const r = Notifications.getLastNotificationResponse();
      if (!r) return null;
      Notifications.clearLastNotificationResponse();
      return openOf(r);
    }, null),
  listen: (cb) =>
    safe(
      () => {
        const sub = Notifications.addNotificationResponseReceivedListener((r) => {
          const p = openOf(r);
          if (p) cb(p);
          Notifications.clearLastNotificationResponse();
        });
        return () => sub.remove();
      },
      () => {},
    ),
  permission: () => safeAsync(async () => permissionOf(await Notifications.getPermissionsAsync()), 'not_asked' as PushPermission),
  request: () =>
    safeAsync(async () => {
      await ensureChannel();
      return permissionOf(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
    }, 'denied' as PushPermission),
  schedule: (items) =>
    safeAsync(async () => {
      await ensureChannel();
      for (const p of items) {
        await Notifications.scheduleNotificationAsync({ content: contentOf(p), trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.atMs, channelId: CHANNEL } });
      }
    }, undefined),
  cancelAll: () => safeAsync(() => Notifications.cancelAllScheduledNotificationsAsync(), undefined),
  openSystemSettings: () => void Linking.openSettings().catch(() => {}),
};

/** FR-25: політика, звіти й пошта - у зовнішньому браузері чи поштовому клієнті, не у вбудованому */
export const deviceLinks: LinkService = {
  open: (url) => void Linking.openURL(url).catch(() => {}),
  copy: (text) => void Clipboard.setStringAsync(text).catch(() => false),
};

export const deviceReview: ReviewService = {
  request: () => {
    void StoreReview.isAvailableAsync()
      .then((ok) => (ok ? StoreReview.requestReview() : undefined))
      .catch(() => {});
  },
};
