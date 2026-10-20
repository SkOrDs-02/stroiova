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
  /** Пачка Р3 (011 FR-18): id пачки й місце 1-3 */
  pack?: { id: string; index: number };
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
    /** Р5 (013 FR-14): приходить першою після конвертації № 4 */
    fading?: boolean;
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
  /** Телеграма з пачки Р3 (011 FR-18): no - номер «Зведення № N»; summary - вид зведеної відповіді (FR-21) */
  pack?: { id: string; no: number; index: number; summary?: ChoiceKind };
  result?: ItemResult;
}

export type TimerKind = 'delayed' | 'return' | 'followUp' | 'fill' | 'inspRoll';

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
  kombat: { lastDayKey: string | null; active: { startMs: number; endMs: number; runnerAtMs: number | null; found?: boolean } | null };
  /** «Нарада затягнулась» (011 FR-25): той самий шаблон на ланці «Нарада» (Р3+); runnerAtMs - записка */
  meeting: { lastDayKey: string | null; active: { startMs: number; endMs: number; runnerAtMs: number | null; found?: boolean } | null };
  /** Пачки Р3 (011 FR-17): остання доба доставки (РРРР-ММ-ДД) і скільки видано */
  packs: { day: string | null; seq: number };
  /** «Доповідь тезово» (012 FR-17): останній день події (індекс місцевої доби) для `brief.minGapDays` */
  brief: { lastDay: number | null };
  /** «Збій СЕДО» (013 FR-12): цифрова ланка ×sedoFailMult; stageId - яка */
  sedo: { lastDayKey: string | null; active: { startMs: number; endMs: number; stageId: string } | null };
  deliveries: number;
  /** Мішки реплік за пулами content/lines.json (рішення 41) */
  lineBags: Record<string, { used: number[]; last: number | null }>;
}
