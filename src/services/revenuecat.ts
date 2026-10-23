// Покупки на пристрої (008 етап 2): RevenueCat (`react-native-purchases`). Анонімний App User ID, атрибут `$posthogUserId` = `install_id`.
// Одна offering, три non-consumable пакети, entitlement на товар з тим самим id (FR-15, FR-25). Без ключа платформи
// (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`) стор недоступний. SDK передається залежністю (`PurchasesSdk`): у тестах - підробка.
import { Platform } from 'react-native';

import { PRODUCT_IDS, type ProductId, type PurchaseFailReason, type PurchaseResult, type PurchaseService, type Rights, type StoreStatus } from '@/monetization/types';

import { unavailablePurchases } from './purchases';

export interface StoreProduct {
  id: ProductId;
  priceString: string;
  price: number;
  currency: string;
}

/** Помилка SDK: читабельний код RevenueCat (`PURCHASE_CANCELLED_ERROR` тощо) */
export interface SdkError {
  code: string;
  userCancelled?: boolean;
}

export interface PurchasesSdk {
  configure(installId: string): void;
  /** Пакети поточної offering, зведені до наших товарів */
  products(): Promise<StoreProduct[]>;
  /** Активні entitlement з CustomerInfo */
  buy(id: ProductId): Promise<string[]>;
  restore(): Promise<string[]>;
  active(): Promise<string[]>;
  onChange(cb: () => void): () => void;
}

/**
 * Помилка нативного SDK -> ім'я коду `PURCHASES_ERROR_CODE` (`PAYMENT_PENDING_ERROR`). SDK кладе в `code` числовий рядок ("20");
 * `userInfo.readableErrorCode` на Android - назва Kotlin-enum (`PaymentPendingError`), тож звіряємо за числом.
 */
export function sdkError(e: unknown, codes: Record<string, string>): SdkError {
  const u = (e ?? {}) as { code?: unknown; userCancelled?: boolean | null };
  const num = u.code == null ? '' : String(u.code);
  const name = Object.keys(codes).find((k) => codes[k] === num) ?? (num && Object.prototype.hasOwnProperty.call(codes, num) ? num : 'UNKNOWN_ERROR');
  return { code: name, userCancelled: u.userCancelled === true };
}

const NET = new Set(['NETWORK_ERROR', 'OFFLINE_CONNECTION_ERROR', 'PRODUCT_REQUEST_TIMED_OUT_ERROR']);

/** Код SDK -> причина `purchase_fail` */
export function failReason(code: string): PurchaseFailReason {
  if (NET.has(code)) return 'network';
  if (code === 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR') return 'product_unavailable';
  // чек іншого App User ID (RECEIPT_ALREADY_IN_USE) - не «уже куплено»: entitlement у цього гравця неактивний
  if (code === 'PRODUCT_ALREADY_PURCHASED_ERROR') return 'already_owned';
  if (code === 'PURCHASE_NOT_ALLOWED_ERROR' || code === 'INSUFFICIENT_PERMISSIONS_ERROR') return 'not_allowed';
  if (code === 'STORE_PROBLEM_ERROR' || code === 'RECEIPT_ALREADY_IN_USE_ERROR') return 'store_problem';
  return 'unknown';
}

const rightsOf = (active: string[]): Rights => ({ no_ads: active.includes('no_ads'), starter_pack: active.includes('starter_pack'), storage_24h: active.includes('storage_24h') });
const codeOf = (e: unknown): string => (e && typeof e === 'object' && 'code' in e ? String((e as SdkError).code) : 'UNKNOWN_ERROR');

export function revenueCatPurchases(sdk: PurchasesSdk | null): PurchaseService {
  if (!sdk) return unavailablePurchases;
  const rc = sdk;
  let status: StoreStatus = 'loading';
  let started = false;
  let products: StoreProduct[] = [];

  const loadProducts = async () => {
    status = 'loading';
    try {
      products = await rc.products();
      status = products.length ? 'ready' : 'no_billing';
    } catch (e) {
      status = NET.has(codeOf(e)) ? 'no_net' : 'no_billing';
    }
  };

  return {
    start: (installId) => {
      if (started) return;
      started = true;
      try {
        rc.configure(installId);
      } catch {
        status = 'no_billing';
        return;
      }
      void loadProducts();
    },
    onChange: (cb) => rc.onChange(cb),
    status: () => status,
    prices: () => Object.fromEntries(products.map((p) => [p.id, p.priceString])),
    priceInfo: (id) => {
      const p = products.find((x) => x.id === id);
      return p ? { amount: p.price, currency: p.currency } : null;
    },
    purchase: async (id): Promise<PurchaseResult> => {
      try {
        const active = await rc.buy(id);
        return active.includes(id) ? { kind: 'success' } : { kind: 'error', reason: 'product_unavailable' };
      } catch (e) {
        const code = codeOf(e);
        if (code === 'PURCHASE_CANCELLED_ERROR' || (e as SdkError | null)?.userCancelled) return { kind: 'cancelled' };
        if (code === 'PAYMENT_PENDING_ERROR') return { kind: 'pending' };
        return { kind: 'error', reason: failReason(code), code };
      }
    },
    restore: async () => {
      try {
        const active = await rc.restore();
        return { kind: 'ok', owned: PRODUCT_IDS.filter((id) => active.includes(id)) };
      } catch (e) {
        return { kind: 'error', code: codeOf(e) };
      }
    },
    rights: async () => {
      // «Повторити» в магазині (FR-29): права звіряються, а ціни, яких не було, вантажаться ще раз
      if (started && status !== 'ready') void loadProducts();
      try {
        return rightsOf(await rc.active());
      } catch {
        return null;
      }
    },
  };
}

/** Справжній SDK; без ключа платформи чи нативного модуля - null */
export function nativePurchasesSdk(apiKey: string | undefined = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY): PurchasesSdk | null {
  if (!apiKey) return null;
  const key = apiKey;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const P = (require('react-native-purchases') as typeof import('react-native-purchases')).default;
    type Info = Awaited<ReturnType<typeof P.getCustomerInfo>>;
    const active = (info: Info) => Object.keys(info.entitlements.active);
    const codes = P.PURCHASES_ERROR_CODE as unknown as Record<string, string>;
    const readable = (e: unknown): never => {
      throw sdkError(e, codes);
    };
    const packages = async () => (await P.getOfferings()).current?.availablePackages ?? [];
    const idOf = (identifier: string): ProductId | undefined => PRODUCT_IDS.find((id) => id === identifier);
    return {
      configure: (installId) => {
        P.configure({ apiKey: key });
        void P.setAttributes({ $posthogUserId: installId }).catch(() => {});
      },
      products: async () => {
        try {
          return (await packages()).flatMap((p) => {
            const id = idOf(p.product.identifier) ?? idOf(p.identifier);
            return id ? [{ id, priceString: p.product.priceString, price: p.product.price, currency: p.product.currencyCode }] : [];
          });
        } catch (e) {
          return readable(e);
        }
      },
      buy: async (id) => {
        try {
          const pkg = (await packages()).find((p) => (idOf(p.product.identifier) ?? idOf(p.identifier)) === id);
          if (!pkg) throw { code: codes.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR };
          return active((await P.purchasePackage(pkg)).customerInfo);
        } catch (e) {
          return readable(e);
        }
      },
      restore: async () => {
        try {
          return active(await P.restorePurchases());
        } catch (e) {
          return readable(e);
        }
      },
      active: async () => {
        try {
          return active(await P.getCustomerInfo());
        } catch (e) {
          return readable(e);
        }
      },
      onChange: (cb) => {
        const l = () => cb();
        P.addCustomerInfoUpdateListener(l);
        return () => void P.removeCustomerInfoUpdateListener(l);
      },
    };
  } catch {
    return null;
  }
}

export function devicePurchases(): PurchaseService {
  return revenueCatPurchases(nativePurchasesSdk());
}
