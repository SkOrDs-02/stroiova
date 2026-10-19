// Сповіщення й налаштування (010): стан у записі (схема 9) і інтерфейс доставки, яку в етапі 2 замінить expo-notifications.
export type PushType =
  | 'storage_full'
  | 'telegram_new'
  | 'inspection'
  | 'inspection_passed'
  | 'race_reminder'
  | 'race_won'
  | 'boost_end'
  | 'fuel_bonus_end'
  | 'kombat_found'
  | 'gift_arrived';

export type PushCategory = 'storage' | 'telegrams' | 'inspections' | 'gifts' | 'boosts';

export type PushPermission = 'not_asked' | 'granted' | 'denied' | 'provisional';

/** Куди веде тап по сповіщенню (010, «Каталог сповіщень») */
export type PushTarget = 'offline-return' | 'tg-detail' | 'insp-prep' | 'main' | 'race-sheet' | 'boosts-sheet' | 'resource-sheet';

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** Категорії сповіщень (FR-15): «Бусти й комбат» вимкнено за замовчуванням */
  notif: Record<PushCategory, boolean>;
  /** Анонімна статистика (FR-16) */
  analytics: boolean;
  pushPermission: PushPermission;
  /** Прихований тестовий перемикач (FR-13) */
  testUser: boolean;
}

/** Заплановане сповіщення: текст обрано при плануванні (мішок), доставляє ОС */
export interface PlannedPush {
  type: PushType;
  atMs: number;
  title: string;
  body: string;
  target: PushTarget;
  /** Телеграма чи гонка, до якої веде тап */
  ref?: string;
}

export interface NotificationsState {
  planned: PlannedPush[];
  /** Скільки сповіщень уже доставлено за місцеву добу (ліміт 2, № 8 - 1): рахується при поверненні в гру */
  sent: { day: string; count: number; fuel: number };
}

/** Сповіщення без тексту: кандидат планувальника */
export interface Candidate {
  type: PushType;
  atMs: number;
  target: PushTarget;
  ref?: string;
  /** Для № 5: де зараз акт; для № 10: який подарунок */
  place?: string;
  item?: string;
}

/** Доставка сповіщень (expo-notifications, етап 2) */
export interface NotificationService {
  permission(): Promise<PushPermission>;
  request(): Promise<PushPermission>;
  schedule(items: readonly PlannedPush[]): Promise<void>;
  cancelAll(): Promise<void>;
  openSystemSettings(): void;
}

/** Зовнішні посилання й буфер (етап 2: браузер і expo-clipboard) */
export interface LinkService {
  open(url: string): void;
  copy(text: string): void;
}
