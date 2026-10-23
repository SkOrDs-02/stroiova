// Доставка локальних сповіщень (010): у збірці без нативного модуля нічого не доставляємо. expo-notifications - етап 2 (рішення 85).
import type { NotificationService } from '@/notifications/types';

export const unavailableNotifications: NotificationService = {
  initialOpen: () => null,
  listen: () => () => {},
  permission: async () => 'not_asked',
  request: async () => 'denied',
  schedule: async () => {},
  cancelAll: async () => {},
  openSystemSettings: () => {},
};
