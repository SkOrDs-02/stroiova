// Музей й журнал курйозів (007): стан у записі (схема 7). Час - мітки UTC, мс.
import type { GiftType, Race } from '@/race/types';

/** Звідки прийшов журнал (museum_journal_unlock.source; № 8 береться від джерела сьомого) */
export type JournalSource = 'digitization' | 'telegram' | 'inspection' | 'final_inspection' | 'conversion' | 'story' | 'finale';

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
  kind: 'telegram' | 'gift' | 'pack' | 'stack' | 'story';
  atMs: number;
  telegramId?: string;
  uid?: string;
  choiceId?: string;
  status?: CurioStatus;
  /** Текст запису з контенту (`effects.curio`) */
  text?: string | null;
  /** Запис від сюжету (014): носій `curio` */
  story?: { beatId: string; from: string; title: string; body: string };
  /** «Метр звітів» (012 FR-15): висота на мить запису, см */
  stack?: { cm: number };
  /** Одна відповідь пачкою Р3 = один запис (011 FR-24) */
  pack?: { packId: string; no: number; kind: 'diligent' | 'formal_reply' | 'drawer'; uids: string[] };
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
  /** Номер останнього запису, який гравець бачив у списку: бейдж «нове» в меню (010 FR-30, рішення 89) */
  curiosSeen: number;
}
