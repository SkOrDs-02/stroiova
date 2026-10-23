// Сюжет (014): модель кроку, стан рушія й вхідні події. Чистий домен без React і I/O.

export const CARRIERS = ['telegram', 'note', 'call', 'event_toast', 'curio', 'scene', 'archive_sheet', 'share_card', 'insp_act_line', 'credits_line', 'character_state'] as const;
export type Carrier = (typeof CARRIERS)[number];

export const ARCS = ['who_writes', 'archaeologist', 'ptashka', 'kombat_leave', 'cat', 'tumbochkin', 'transition', 'finale'] as const;
export type Arc = (typeof ARCS)[number];

export type Trigger =
  | { type: 'level_enter'; level: number; afterHours?: number }
  | { type: 'digitization_on_level'; n: number; afterHours?: number }
  | { type: 'boss_announced'; afterHours?: number }
  | { type: 'boss_passed'; level: number; afterHours?: number }
  | { type: 'pack_received'; n: number; afterHours?: number }
  | { type: 'race_won'; gift: string; level: number; nth: number; afterHours?: number }
  | { type: 'gift_arrived'; level: number; nth: number; afterHours?: number }
  | { type: 'conversion'; k: number; afterHours?: number }
  | { type: 'finale_step'; step: string; afterHours?: number | 'next_day' }
  | { type: 'session_first_of_day'; afterHours?: number }
  | { type: 'telegram_answered'; telegramId: string; choiceKind?: string; afterHours?: number }
  | { type: 'beat_delivered'; beat: string; afterHours?: number };

export interface Beat {
  id: string;
  rev: number;
  arc: Arc;
  order: number;
  level?: number;
  trigger: Trigger;
  requires?: { beat: string; afterHours?: number }[];
  carrier: Carrier;
  payload: Record<string, unknown>;
  required?: boolean;
  outsideQuota?: boolean;
  minAppVersion?: string;
  review?: boolean;
  effects?: { journal?: number; characterState?: string };
}

export interface DiaryLine {
  id: string;
  level?: number;
  quiet?: boolean;
  order: number;
  key: boolean;
  text: string;
  review?: boolean;
}

export interface Delivered {
  at: number;
  rev: number;
  /** Крок з минулого рівня, доставлений наздоганянням (FR-10) */
  catchUp: boolean;
  /** Тригер спрацював без гравця (FR-8) */
  away: boolean;
}

export interface DiaryGot {
  id: string;
  atMs: number;
  /** Номер дня гри на мить рядка (День {n}) */
  day: number;
}

export interface StoryState {
  delivered: Record<string, Delivered>;
  /** Кроки пройдених рівнів, закриті міграцією (FR-29) */
  skipped: string[];
  fired: Record<string, { at: number; away: boolean }>;
  /** Телеграма кроку вже в черзі телеграм, але ще не отримана: id кроку -> мить відправки */
  dispatched: Record<string, number>;
  counters: { wins: Record<string, number>; gifts: Record<string, number> };
  /** Стани персонажів (`character_state`): лише вигляд */
  chars: Record<string, string>;
  /** Аркуші Археолога, які гравець має: id -> мить (014 FR-16, FR-17) */
  sheets: Record<string, number>;
  /** Рівні, чия підсумкова пройдена (джерело аркушів `boss`) */
  bosses: number[];
  diary: { got: DiaryGot[]; lastDay: string | null };
}

/** Знімок стану гри, потрібний рушієві (усе виводиться зі збереження, рушій не читає стор) */
export interface StoryCtx {
  level: number;
  /** Цифровізацій на кожному рівні (`digit.counts`) */
  counts: Record<string, number>;
  /** Цифрових ланок Р5 */
  conversions: number;
  /** Скільки пачок Р3 отримано (`telegrams.packs.seq`) */
  packs: number;
  /** Початок поточного рівня, мс (час для `level_enter`) */
  levelStartMs: number;
  /** Підсумкова поточного рівня пройдена, перехід дозволено (`digit.levelExitAllowed`) */
  exitAllowed: boolean;
  /** Зсув місцевого часу, хв: для `afterHours: next_day` (перша мить наступної календарної доби); 0 - UTC */
  tzOffsetMin?: number;
  /** Рівні, на яких переїзд (017) уже відбувся; немає - збірка без 017 */
  moves?: number[];
}

export type StoryEvent =
  | { type: 'race_won'; gift: string; level: number }
  | { type: 'gift_arrived'; level: number }
  | { type: 'boss_announced'; level: number }
  | { type: 'boss_passed'; level: number }
  | { type: 'telegram_answered'; telegramId: string; choiceKind: string }
  | { type: 'finale_step'; step: string }
  | { type: 'session_first_of_day' };

/** Скільки перебивних кроків і тостів уже було за сесію (FR-7); лише в пам'яті */
export interface SessionBudget {
  interrupting: number;
  toasts: number;
}

export interface PullOpts {
  /** Носії, екран яких є в збірці; решта чекає в черзі (FR-28) */
  supports: ReadonlySet<Carrier>;
  maxToasts: number;
}

/** Аркуш Археолога (`content/archive.json`) */
export interface Sheet {
  id: string;
  no: number;
  level: number;
  title: string;
  tabs: { name: string; columns: string[]; rows: string[][] }[];
  footnote: string;
  arcHint: string;
  source: { kind: 'gift'; level: number; nth: number } | { kind: 'move'; level: number } | { kind: 'boss'; level: number } | { kind: 'conversion'; k: number };
  review?: boolean;
}

export type SheetSource = 'gift' | 'move' | 'boss' | 'conversion' | 'catch_up';

export interface Pulled {
  beat: Beat;
  catchUp: boolean;
  away: boolean;
  /** Секунд від готовності до показу */
  delaySec: number;
  /** Телеграма: лише поставлено в чергу, доставка підтвердиться при отриманні */
  dispatchOnly: boolean;
}
