// Реклама й покупки (008): стан у записі (схема 8) і інтерфейси сервісів, які в етапі 2 замінить справжній SDK.
export type ProductId = 'no_ads' | 'starter_pack' | 'storage_24h';
export const PRODUCT_IDS: readonly ProductId[] = ['no_ads', 'starter_pack', 'storage_24h'];

export type Placement = 'income_boost' | 'offline_double' | 'race_speedup' | 'inspection_checklist';

export type Rights = Record<ProductId, boolean>;

export interface MonetizationState {
  /** Кеш прав: діє офлайн, знімає лише онлайн-відповідь стору (FR-26) */
  rights: Rights;
  rightsAt: number | null;
  /** 50 000 підписів уже видано в цьому збереженні (FR-17) */
  starterGranted: boolean;
  /** starter-offer: чекає першого результату перевірки, час показувати, показано (FR-19) */
  offer: 'wait' | 'due' | 'done';
  /** Покупки, що чекають підтвердження (Ask to Buy, FR-24) */
  pending: ProductId[];
  /** Добові лічильники: дата місцева, РРРР-ММ-ДД; не скидаються «Скинути прогрес» */
  ads: { date: string; boost: number; race: number };
  /** Перевірка, для якої «Усе за рекламу» вже використано (FR-6) */
  inspAdId: string | null;
  /** Скільки покупок зроблено (purchase_number) */
  purchases: number;
  /** Покупки, для яких iap-success ще не показано (FR-23, FR-24) */
  success: ProductId[];
}

// --- сервіси ---

export type AdAvailability = 'ready' | 'loading' | 'no_fill' | 'no_net' | 'no_consent';

export type AdResult = { kind: 'earned' } | { kind: 'closed_early' } | { kind: 'fail'; stage: 'not_ready' | 'load' | 'show' | 'consent_blocked'; code?: string };

/** Реклама за винагороду (AdMob, етап 2). `show` викликається лише з обробника тапу кнопки з нагородою (FR-1). */
export interface AdService {
  availability(): AdAvailability;
  show(placement: Placement): Promise<AdResult>;
}

export type StoreStatus = 'ready' | 'loading' | 'no_net' | 'no_billing';

export type PurchaseFailReason = 'store_problem' | 'network' | 'product_unavailable' | 'already_owned' | 'not_allowed' | 'unknown';

export type PurchaseResult = { kind: 'success' } | { kind: 'cancelled' } | { kind: 'pending' } | { kind: 'error'; reason: PurchaseFailReason; code?: string };

/** Покупки (RevenueCat, етап 2): ціни - локалізовані рядки стору (FR-21), права - з CustomerInfo (FR-25). */
export interface PurchaseService {
  status(): StoreStatus;
  prices(): Partial<Record<ProductId, string>>;
  purchase(id: ProductId): Promise<PurchaseResult>;
  restore(): Promise<{ kind: 'ok'; owned: ProductId[] } | { kind: 'error' }>;
  /** Актуальні права; null - стор недосяжний (права лишаються за кешем) */
  rights(): Promise<Rights | null>;
}
