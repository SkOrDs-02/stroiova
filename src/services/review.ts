// Системне вікно оцінки (010 FR-24): без нативного модуля нічого не показуємо.
import type { ReviewService } from '@/notifications/types';

export const unavailableReview: ReviewService = {
  request: () => {},
};
