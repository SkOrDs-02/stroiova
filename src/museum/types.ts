// Музей й журнал курйозів (007): стан у записі (схема 7). Час - мітки UTC, мс.
import type { GiftType, Race } from '@/race/types';

/** Звідки прийшов журнал (museum_journal_unlock.source; № 8 береться від джерела сьомого) */
export type JournalSource = 'digitization' | 'telegram' | 'inspection';

export interface OwnedJournal {
  no: number;
  atMs: number;
  source: JournalSource;
  /** Розкриття показано або вкладку «Музей» відкрито (FR-20) */
  seen: boolean;
}

/** Журнал, що чекає розкриття `journal-new` (рішення 79) */
export interface RevealItem {
  no: number;
  /** Номер у групі розкриття й розмір групи: «k з M нових» */
  k: number;
  m: number;
  /** Скільки журналів у музеї після цього (1-8) */
  nAfter: number;
  /** Перевірка в грі: розкриває блок в insp-result, а не модалка (FR-19) */
  via: 'insp' | 'other';
}

export type CurioStatus = 'diligent' | 'formal' | 'drawer' | 'special' | 'info';

export interface CurioEntry {
  /** Наскрізний номер запису (FR-22): не перевикористовується */
  seq: number;
  kind: 'telegram' | 'gift';
  atMs: number;
  telegramId?: string;
  uid?: string;
  choiceId?: string;
  status?: CurioStatus;
  /** Текст запису з контенту (`effects.curio`) */
  text?: string | null;
  gift?: {
    raceId: string;
    raceNo: number;
    type: GiftType;
    level: number;
    steps: Race['steps'];
    stepsDone: number;
    stepsTotal: number;
    marginSec: number;
  };
}

export interface MuseumState {
  owned: OwnedJournal[];
  reveal: RevealItem[];
  curios: CurioEntry[];
  curioSeq: number;
}
