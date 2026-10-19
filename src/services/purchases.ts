// Покупки (008): у збірці без нативного SDK стор недоступний. RevenueCat підключає етап 2 (рішення 80).
import type { PurchaseService } from '@/monetization/types';

export const unavailablePurchases: PurchaseService = {
  status: () => 'no_billing',
  prices: () => ({}),
  purchase: async () => ({ kind: 'error', reason: 'store_problem' }),
  restore: async () => ({ kind: 'error' }),
  rights: async () => null,
};
