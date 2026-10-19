// Каталог сповіщень (010, «Каталог сповіщень»): категорія, пріоритет, ціль переходу.
import type { PushCategory, PushTarget, PushType } from './types';

export interface PushDef {
  type: PushType;
  category: PushCategory;
  /** 0 - найвищий: перевірка → гонка → склад → решта (FR-4) */
  priority: number;
  target: PushTarget;
}

export const CATALOG: readonly PushDef[] = [
  { type: 'storage_full', category: 'storage', priority: 2, target: 'offline-return' },
  { type: 'telegram_new', category: 'telegrams', priority: 3, target: 'tg-detail' },
  { type: 'inspection', category: 'inspections', priority: 0, target: 'insp-prep' },
  { type: 'inspection_passed', category: 'inspections', priority: 0, target: 'main' },
  { type: 'race_reminder', category: 'gifts', priority: 1, target: 'race-sheet' },
  { type: 'race_won', category: 'gifts', priority: 1, target: 'main' },
  { type: 'boost_end', category: 'boosts', priority: 3, target: 'boosts-sheet' },
  { type: 'fuel_bonus_end', category: 'storage', priority: 3, target: 'resource-sheet' },
  { type: 'kombat_found', category: 'boosts', priority: 3, target: 'main' },
  { type: 'gift_arrived', category: 'gifts', priority: 1, target: 'race-sheet' },
];

const BY_TYPE = new Map(CATALOG.map((d) => [d.type, d]));

export function def(type: PushType): PushDef {
  return BY_TYPE.get(type)!;
}

/**
 * Сповіщення, чий час прив'язаний до події або чий текст має строк («×3 ще 2 години», «поки служить»): у тихі години
 * не надсилаються, а не переносяться на 08:00 (рішення 86, 92)
 */
export const DROP_IN_QUIET: readonly PushType[] = ['inspection', 'inspection_passed', 'race_reminder', 'race_won'];

/** За скільки до події йдуть № 3 (комісія) і № 5 (кінець таймера ресурсу): spec 010 «Параметри» */
export const LEAD_MS = 2 * 3_600_000;
/** Як далеко наперед шукаємо подарунок для № 10: у межах доби планування, рішення 92 */
export const GIFT_HORIZON_MS = 3 * 86_400_000;

/** Ліміти (FR-3): 2 на добу, № 8 - 1 на добу */
export const DAILY_LIMIT = 2;
export const FUEL_DAILY_LIMIT = 1;

/** Тихі години за часом пристрою (рішення 86) */
export const QUIET_FROM_HOUR = 22;
export const QUIET_TO_HOUR = 8;
