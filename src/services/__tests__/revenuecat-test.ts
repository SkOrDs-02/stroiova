// 008 етап 2: адаптер RevenueCat на підробленому SDK (FR-15, FR-21, FR-23…FR-27, AC-13).
import type { ProductId } from '@/monetization/types';

import { unavailablePurchases } from '../purchases';
import { failReason, revenueCatPurchases, type PurchasesSdk, type StoreProduct } from '../revenuecat';

const PRODUCTS: StoreProduct[] = [
  { id: 'no_ads', priceString: '199,00 ₴', price: 199, currency: 'UAH' },
  { id: 'starter_pack', priceString: '79,00 ₴', price: 79, currency: 'UAH' },
  { id: 'storage_24h', priceString: '99,00 ₴', price: 99, currency: 'UAH' },
];

function fakeSdk(o: Partial<PurchasesSdk> = {}) {
  const log: { configured: string[] } = { configured: [] };
  let active: string[] = [];
  const sdk: PurchasesSdk = {
    configure: (id) => void log.configured.push(id),
    products: async () => PRODUCTS,
    buy: async (id: ProductId) => (active = [...active, id]),
    restore: async () => active,
    active: async () => active,
    onChange: () => () => {},
    ...o,
  };
  return { sdk, log, setActive: (a: string[]) => (active = a) };
}
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
const err = (code: string, userCancelled = false) => ({ code, userCancelled });

describe('revenueCatPurchases', () => {
  test('без ключа чи SDK - стор недоступний', () => {
    expect(revenueCatPurchases(null)).toBe(unavailablePurchases);
  });

  test('FR-21: до відповіді стору - «вантажиться», далі локалізовані ціни й ціна для аналітики; install_id - у configure', async () => {
    const f = fakeSdk();
    const p = revenueCatPurchases(f.sdk);
    p.start!('install-1');
    expect(p.status()).toBe('loading');
    await settle();
    expect(f.log.configured).toEqual(['install-1']);
    expect(p.status()).toBe('ready');
    expect(p.prices()).toEqual({ no_ads: '199,00 ₴', starter_pack: '79,00 ₴', storage_24h: '99,00 ₴' });
    expect(p.priceInfo!('starter_pack')).toEqual({ amount: 79, currency: 'UAH' });
  });

  test('FR-29: без мережі - no_net; немає товарів чи білінгу - no_billing; «Повторити» вантажить ціни ще раз', async () => {
    let fail = true;
    const f = fakeSdk({
      products: async () => {
        if (fail) throw err('NETWORK_ERROR');
        return PRODUCTS;
      },
    });
    const p = revenueCatPurchases(f.sdk);
    p.start!('i');
    await settle();
    expect(p.status()).toBe('no_net');
    fail = false;
    await p.rights();
    await settle();
    expect(p.status()).toBe('ready');
    const empty = revenueCatPurchases(fakeSdk({ products: async () => [] }).sdk);
    empty.start!('i');
    await settle();
    expect(empty.status()).toBe('no_billing');
  });

  test('FR-23, FR-25: успіх лише з активним entitlement товару', async () => {
    const ok = revenueCatPurchases(fakeSdk().sdk);
    await expect(ok.purchase('no_ads')).resolves.toEqual({ kind: 'success' });
    const noEnt = revenueCatPurchases(fakeSdk({ buy: async () => [] }).sdk);
    await expect(noEnt.purchase('no_ads')).resolves.toEqual({ kind: 'error', reason: 'product_unavailable' });
  });

  test('FR-23, FR-24: скасування, відкладена оплата, помилки з кодом', async () => {
    const thrower = (e: object) =>
      revenueCatPurchases(
        fakeSdk({
          buy: async () => {
            throw e;
          },
        }).sdk,
      );
    await expect(thrower(err('PURCHASE_CANCELLED_ERROR', true)).purchase('no_ads')).resolves.toEqual({ kind: 'cancelled' });
    await expect(thrower(err('PAYMENT_PENDING_ERROR')).purchase('no_ads')).resolves.toEqual({ kind: 'pending' });
    await expect(thrower(err('NETWORK_ERROR')).purchase('no_ads')).resolves.toEqual({ kind: 'error', reason: 'network', code: 'NETWORK_ERROR' });
    await expect(thrower(err('PRODUCT_ALREADY_PURCHASED_ERROR')).purchase('no_ads')).resolves.toMatchObject({ reason: 'already_owned' });
  });

  test('failReason: коди RevenueCat -> причини плану аналітики', () => {
    expect(failReason('STORE_PROBLEM_ERROR')).toBe('store_problem');
    expect(failReason('PURCHASE_NOT_ALLOWED_ERROR')).toBe('not_allowed');
    expect(failReason('PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR')).toBe('product_unavailable');
    expect(failReason('OFFLINE_CONNECTION_ERROR')).toBe('network');
    expect(failReason('SOMETHING_NEW')).toBe('unknown');
  });

  test('FR-27: відновлення - лише наші товари; збій - error', async () => {
    const f = fakeSdk();
    f.setActive(['no_ads', 'legacy_thing']);
    await expect(revenueCatPurchases(f.sdk).restore()).resolves.toEqual({ kind: 'ok', owned: ['no_ads'] });
    const bad = fakeSdk({
      restore: async () => {
        throw err('NETWORK_ERROR');
      },
    });
    await expect(revenueCatPurchases(bad.sdk).restore()).resolves.toEqual({ kind: 'error' });
  });

  test('FR-26, AC-13: права з entitlement; стор недосяжний - null (кеш лишається)', async () => {
    const f = fakeSdk();
    f.setActive(['storage_24h']);
    await expect(revenueCatPurchases(f.sdk).rights()).resolves.toEqual({ no_ads: false, starter_pack: false, storage_24h: true });
    const off = fakeSdk({
      active: async () => {
        throw err('NETWORK_ERROR');
      },
    });
    await expect(revenueCatPurchases(off.sdk).rights()).resolves.toBeNull();
  });

  test('збій configure - стор недоступний, гра працює далі', () => {
    const p = revenueCatPurchases(
      fakeSdk({
        configure: () => {
          throw new Error('bad key');
        },
      }).sdk,
    );
    p.start!('i');
    expect(p.status()).toBe('no_billing');
  });
});
