// Грамоти (016 FR-17…FR-24, FR-45): стан у записі й спільні типи. Чистий домен: без годинника й React.

export type AwardType = 'gramota' | 'podyaka' | 'nakaz';
export type AwardCategory = 'progress' | 'telegrams' | 'inspections' | 'race' | 'museum' | 'curios' | 'cat' | 'clerks' | 'hidden';

/** Умова з `content/awards.json`: лічильник, подія, станова умова чи їх сукупність */
export type Condition =
  | { counter: string; gte: number }
  | { counter: string; eqUnitsTotal: true }
  | { event: string; where: Where }
  | { state: 'level_id'; eq: string }
  | { all: Condition[] };

export type Where = Record<string, unknown>;

export interface AwardDef {
  no: number;
  id: string;
  category: AwardCategory;
  type: AwardType;
  title: string;
  text: string;
  condition: Condition;
  progress: { counter: string; target: number } | null;
  hint: string | null;
  hidden: boolean;
  hiddenKind: string | null;
  mirror: { enabled: boolean; points: number; platformHidden: boolean };
  estDayAds: number;
}

export interface CounterDef {
  on: string;
  where: Where;
  resetOn?: { event: string; where: Where };
  distinct?: string;
  aggregate?: string;
}

/** Подія аналітики, розкладена для лічильників: назва з tracking-plan і її властивості (FR-19) */
export interface Fact {
  event: string;
  props: Record<string, string | number | boolean>;
  /** Мітка події, якщо відрізняється від мітки пачки (перевірка без гравця, FR-34) */
  atMs?: number;
  /** Подія сталась без гравця (FR-34) */
  offline?: boolean;
}

export interface GotAward {
  atMs: number;
  /** Номер наказу серед отриманих `nakaz` (FR-24) */
  orderNo?: number;
  /** Видано заднім числом після оновлення контенту (FR-23) */
  retro?: boolean;
  /** Умову виконала подія без гравця (FR-34) */
  offline?: boolean;
}

export interface AwardsState {
  got: Record<string, GotAward>;
  counters: Record<string, number>;
  /** Значення для `distinct`-лічильників */
  sets: Record<string, string[]>;
  /** Грамоти, яких гравець уже бачив на стіні (FR-29) */
  seen: string[];
  /** Черга звіту в платформу (FR-40) */
  pendingPlatform: string[];
  /** Останній виданий номер наказу (FR-24) */
  lastOrderNo: number;
}

/** Стан гри, потрібний умовам, що не є подіями (`on: "state"`) */
export interface AwardCtx {
  levelId: string;
  zpzSharePct: number;
  curioEntries: number;
  unitsWithClerks: number;
  unitsTotal: number;
  /** Рядки щоденника (014); немає, поки сюжет не підключено */
  diaryLines?: number;
  /** Аркушів Археолога (014) */
  archiveSheets?: number;
}

export interface Grant {
  id: string;
  atMs: number;
  retro: boolean;
  offline: boolean;
}
