// Перевірки (004): стан у записі (схема 4). Час — мітки UTC, мс.
import type { Big } from '@/economy/core/big';

export type InspTrigger = 'scheduled' | 'unscheduled';
export type BossId = 'brigade_commission' | 'command_commission';

export interface ChecklistItem {
  id: string;
  /** Ціна фіксується при оголошенні чи додаванні (FR-13) */
  price: Big;
  /** Лише false → true (FR-14) */
  done: boolean;
  doneAtMs?: number;
  /** Телеграма, що додала пункт (FR-7) */
  fromTelegram?: string;
}

export interface Inspection {
  /** insp_ + 4 цифри номера (FR-28) */
  id: string;
  no: number;
  trigger: InspTrigger;
  boss: BossId;
  level: number;
  annMs: number;
  arrMs: number;
  items: ChecklistItem[];
  /** Позапланова: телеграма-причина (FR-6) */
  reason: { telegramId: string } | null;
  /** Зауваження (№ 16): кидок при оголошенні (FR-18, рішення 66) */
  remark: boolean;
  /** insp-warning уже показано */
  warned: boolean;
  /** Модалка потрібна: перша в історії, позапланова, перша на комісії (FR-8, FR-9) */
  modal: boolean;
}

export interface InspectionOutcome {
  id: string;
  no: number;
  trigger: InspTrigger;
  boss: BossId;
  level: number;
  arrMs: number;
  passed: boolean;
  remark: boolean;
  items: { id: string; done: boolean; fromTelegram?: string }[];
  reason: { telegramId: string } | null;
  /** Вирішено без гравця: рядки довідки замість insp-result (FR-24, FR-25) */
  offline: boolean;
  /** insp-result чи довідку вже показано */
  seen: boolean;
}

export interface InspectionState {
  rng: number;
  installMs: number;
  nextNo: number;
  /** Приїзд наступної планової; null до першої */
  nextArrMs: number | null;
  /** Попередження наступної планової, хв (ціле, FR-4): кидається разом із приїздом */
  nextWarnMin: number;
  active: Inspection | null;
  last: InspectionOutcome | null;
  /** № 16 до найближчого оголошення (FR-18) */
  pendingRemarkPct: number;
  /** Комісії, що вже були (модалка першої на комісії, FR-8) */
  bossesSeen: BossId[];
  /** `call` «Археолога» перед першою ще не показано (FR-2) */
  callPending: boolean;
  /** Журнал № 7 уже дано (FR-20) */
  journalGiven: boolean;
}
