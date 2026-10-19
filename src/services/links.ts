// Зовнішні посилання й буфер обміну (010 FR-25, FR-27): у збірці без нативних модулів нічого не робимо. Браузер і expo-clipboard - етап 2.
import type { LinkService } from '@/notifications/types';

export const unavailableLinks: LinkService = {
  open: () => {},
  copy: () => {},
};
