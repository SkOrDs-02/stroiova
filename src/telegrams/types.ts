// Телеграми й репутація (003): типи контенту й стану. Дані — content/telegrams.json і content/tg/*.json (09 FR-35).

export type ChoiceKind = 'diligent' | 'formal_reply' | 'drawer' | 'special';

export interface Slow {
  target: string;
  mult: number;
  hours: number;
}

/** Ключі ефектів варіанта (spec 003 «Модель даних»). */
export interface Effects {
  paper?: number;
  slow?: Slow[];
  rep?: number;
  durationMin?: number;
  inspPct?: number;
  inspExtraItem?: string;
  inspRemarkPct?: number;
  inspRollAfterHours?: number;
  digitalShield?: boolean;
  roll?: { pct: number; effects: Effects; text?: string };
  delayed?: { afterHours: number; effects: Effects; text?: string }[];
  returnsAfterHours?: number;
  race?: Record<string, unknown>;
  fuel?: { refuelBlockedHours?: number; fillAfterHours?: number; fillTank?: boolean };
  kombat?: { pct: number; maxMin: number };
  clerkAway?: { target: string; hours: number };
  setFlag?: string;
  ifFlag?: { flag: string; effects: Effects };
  clearFlag?: boolean;
  ifNoClerk?: { target: string; effects: Effects };
  queueNext?: string[];
  curio?: string;
  curioAfterFollowUp?: string;
  arc?: string;
  journal?: string;
  cancelInspRollOf?: string;
  /** Підпис до ефекту (`ifNoClerk`) у tg-result */
  text?: string;
}

export interface Choice {
  id: string;
  kind: ChoiceKind;
  title: string;
  effects: Effects;
  result?: string;
  note?: string;
  isNew?: boolean;
  requires?: { digitalPoints?: number };
  disabledReason?: string;
}

export interface Telegram {
  id: string;
  no?: string;
  level?: number;
  kind?: 'standard' | 'override' | 'notice' | 'event';
  docType?: 'telegram' | 'message';
  stamp?: string;
  kicker?: string;
  from?: string;
  to?: string;
  title: string;
  body: string;
  deadline?: [string, string, string][] | 'std';
  schedule?: {
    scripted?: boolean;
    season?: string;
    repeatEveryDays?: number;
    outsideQuota?: boolean;
    endless?: boolean;
    requires?: { raceActive?: boolean | string; digitizationsMin?: number; conversionsMin?: number };
    fromDay?: number;
    minGapDays?: number;
    orderNoStart?: number;
  };
  followUps?: { id: string; afterHours: number; ifChoice?: string[] }[];
  effects?: Effects;
  choices: Choice[];
}

export type ItemStatus = 'new' | 'work' | 'drawer' | 'archive';
export type ItemKind = 'telegram' | 'notice' | 'override' | 'note';

export interface ItemResult {
  rep: number;
  repAfter: number;
  paper: number;
  slow: Slow[];
  chancePct: number;
  inspHit: boolean;
  rollText?: string;
  shield: boolean;
}

export interface InboxItem {
  uid: string;
  id: string;
  kind: ItemKind;
  receivedAt: number;
  status: ItemStatus;
  choiceId?: string;
  answeredAt?: number;
  workUntil?: number;
  read?: boolean;
  flagged?: boolean;
  /** Номери наказу override: {n}, {n1} */
  vars?: { n: number; n1: number };
  result?: ItemResult;
}

export type TimerKind = 'delayed' | 'return' | 'followUp' | 'fill' | 'kombatEnd' | 'runner' | 'inspRoll';

export interface Timer {
  atMs: number;
  kind: TimerKind;
  itemUid: string;
  /** delayed: ефекти; followUp: id телеграми; inspRoll: шанс */
  effects?: Effects;
  telegramId?: string;
  pct?: number;
}

export interface TelegramState {
  rng: number;
  /** План поточної місцевої доби: слоти (мс) і скільки вже оброблено */
  day: { key: string; slots: number[]; used: number } | null;
  /** Початок доби 1 (закрито крок 7 онбордингу); до того розклад стоїть */
  startMs: number | null;
  inbox: InboxItem[];
  queue: string[];
  timers: Timer[];
  flags: Record<string, true>;
  reputation: { value: number; history: { delta: number; atMs: number; uid: string }[] };
  /** Ставить 04: до першої пройденої планової перевірки шанс відписки 0 (FR-15) */
  firstInspectionPassed: boolean;
  unscheduledDays: string[];
  refuelBlockedUntil: number;
  override: { lastDayKey: string | null; nextNo: number };
  kombat: { lastDayKey: string | null; active: { startMs: number; endMs: number; runnerAtMs: number | null } | null };
  deliveries: number;
}
