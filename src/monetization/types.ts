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

/** `waitMs` - від тапу до відкриття ролика (`ad_start.load_wait_ms`); `ad_start` іде лише для ролика, що відкрився */
export type AdResult = { kind: 'earned'; waitMs?: number } | { kind: 'closed_early'; waitMs?: number } | { kind: 'fail'; stage: 'not_ready' | 'load' | 'show' | 'consent_blocked'; code?: string };

/** Стан згоди UMP для `ads_consent_update` (008 FR-13, 010 FR-17) */
export interface ConsentUpdate {
  trigger: 'first_ad_watch' | 'app_launch' | 'privacy_settings';
  status: 'obtained' | 'required' | 'not_required' | 'unknown';
  formShown: boolean;
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
}

/**
 * Реклама за винагороду (AdMob, етап 2). `show` викликається лише з обробника тапу кнопки з нагородою (FR-1).
 * Контракт: промис завершується на ПЕРШІЙ з двох подій - EARNED_REWARD (`earned`) чи закриття ролика (`closed_early`), а не на закритті
 * після нагороди: нагорода має потрапити в запис до того, як гравець закриє ролик (FR-12).
 */
export interface AdService {
  availability(): AdAvailability;
  show(placement: Placement): Promise<AdResult>;
  /** Запуск гри: UMP `requestInfoUpdate` і перший ролик напоготові; з «Без реклами» SDK не чіпаємо (FR-13, FR-14) */
  start?(o: { noAds: boolean }): void;
  /** Форма UMP показана чи статус згоди змінився (`ads_consent_update`) */
  onConsent?(cb: (c: ConsentUpdate) => void): () => void;
  /** 010 FR-17: UMP вимагає рядок «Налаштування реклами» */
  privacyOptionsRequired?(): boolean;
  showPrivacyOptions?(): Promise<void>;
}

export type StoreStatus = 'ready' | 'loading' | 'no_net' | 'no_billing';

export type PurchaseFailReason = 'store_problem' | 'network' | 'product_unavailable' | 'already_owned' | 'not_allowed' | 'unknown';

export type PurchaseResult = { kind: 'success' } | { kind: 'cancelled' } | { kind: 'pending' } | { kind: 'error'; reason: PurchaseFailReason; code?: string };

/**
 * Покупки (RevenueCat, етап 2): ціни - локалізовані рядки стору (FR-21), права - з CustomerInfo (FR-25).
 * Контракт: `success` - лише коли entitlement товару активний; гра ще раз звіряє його через `rights()` перед увімкненням ефекту.
 */
export interface PurchaseService {
  status(): StoreStatus;
  prices(): Partial<Record<ProductId, string>>;
  /** Ціна числом і валюта ISO 4217 для аналітики (`purchase_*`); немає - подія піде з `0` і `XXX` */
  priceInfo?(id: ProductId): { amount: number; currency: string } | null;
  purchase(id: ProductId): Promise<PurchaseResult>;
  restore(): Promise<{ kind: 'ok'; owned: ProductId[] } | { kind: 'error'; code?: string }>;
  /** Актуальні права; null - стор недосяжний (права лишаються за кешем) */
  rights(): Promise<Rights | null>;
  /** Запуск гри: анонімний користувач з атрибутом `$posthogUserId` = `install_id`, ціни з offering */
  start?(installId: string): void;
  /** Права змінились поза покупкою (Ask to Buy підтверджено, повернення коштів): гра звіряє їх ще раз (FR-24, FR-26) */
  onChange?(cb: () => void): () => void;
}
