// Кроки онбордингу (002 FR-1, FR-28…FR-30): чистий стан без годинника й React. Час — ігровий (playtime, мс).

export const STEP_IDS = [
  'title_arrive',
  'intro_finish',
  'callsign_choose',
  'first_act_sign',
  'first_stamp',
  'conveyor_first_upgrade',
  'first_clerk_hire',
  'first_telegram_answer',
  'archaeologist_call',
  'first_ad_offer',
  'push_prompt',
] as const;

export type StepNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type Step = StepNo | 'done';
export type CallsignType = 'excel' | 'skrepka' | 'drukar' | 'custom';
export type Gender = 'm' | 'f';

/** Телеграма № 1 приходить не раніше 300 с ігрового часу (FR-18). */
export const TELEGRAM_AT_MS = 300_000;
/** Кроки 1–5 — повноекранні, таббар з'являється на кроці 6 (FR-13). */
export const FIRST_MAIN_STEP = 6;

export interface CompletedStep {
  step: StepNo;
  atPlayMs: number;
  durationMs: number;
  skipped: boolean;
}

export interface OnboardingState {
  step: Step;
  callsign: { type: CallsignType; text: string } | null;
  gender: Gender | null;
  /** Скільки ігрового часу ще служить «Пташка» (FR-12) */
  birdLeftMs: number;
  /** Один запис на крок за встановлення: дані для onboarding_step_complete (етап 5) */
  completed: CompletedStep[];
  stepStartedAtPlayMs: number;
  /** Коли прийшла телеграма № 1 (бейдж, коуч на вкладці) */
  tg1ReceivedAtPlayMs: number | null;
  /** Вибір у телеграмі № 1; ефекти репутації й перевірок застосує 03/04 */
  tg1: { choiceId: string; atPlayMs: number } | null;
  /** Скільки зараховано бонусом архіву на кроці 9 */
  archiveBonus: number | null;
}

export function newOnboarding(playMs = 0): OnboardingState {
  return {
    step: 1,
    callsign: null,
    gender: null,
    birdLeftMs: 0,
    completed: [],
    stepStartedAtPlayMs: playMs,
    tg1ReceivedAtPlayMs: null,
    tg1: null,
    archiveBonus: null,
  };
}

export interface CompleteExtra {
  skipped?: boolean;
  callsign?: { type: CallsignType; text: string };
  gender?: Gender;
}

/**
 * Закрити крок. Лише поточний: повторний тап чи застаріла подія нічого не змінюють (FR-1, «Повторний тап»).
 * Позивний і форма записуються тільки разом із кроком 3 (крайовий випадок «вбито посеред кроку»).
 */
export function complete(o: OnboardingState, step: StepNo, playMs: number, extra: CompleteExtra = {}): OnboardingState {
  if (o.step !== step) return o;
  if (step === 3 && (!extra.callsign || !extra.gender)) return o;
  const rec: CompletedStep = { step, atPlayMs: playMs, durationMs: Math.max(0, playMs - o.stepStartedAtPlayMs), skipped: !!extra.skipped };
  const next: Step = step === 11 ? 'done' : ((step + 1) as StepNo);
  return {
    ...o,
    step: next,
    completed: o.completed.some((c) => c.step === step) ? o.completed : [...o.completed, rec],
    stepStartedAtPlayMs: playMs,
    ...(step === 3 ? { callsign: extra.callsign!, gender: extra.gender! } : {}),
  };
}

export function isDone(o: OnboardingState, step: StepNo): boolean {
  return o.step === 'done' || o.step > step;
}

export type Ready = 'coachUpgrade' | 'coachHire' | 'telegramArrive' | 'coachTelegram' | 'call' | null;

export interface ReadyCtx {
  playMs: number;
  signatures: number;
  /** Ціна наступного рівня Рапортів (001, рішення 51) */
  raportyPrice: number;
  /** Ціна діловода «Стройової частини» (рішення 56) */
  stroyClerkPrice: number;
  /** archiveBonusAtSec × 1000 з конфігу */
  callAtMs: number;
}

/** Що онбординг хоче показати на `main` зараз (FR-16…FR-20); null — нічого. */
export function ready(o: OnboardingState, c: ReadyCtx): Ready {
  switch (o.step) {
    case 6:
      return c.signatures >= c.raportyPrice ? 'coachUpgrade' : null;
    case 7:
      return c.signatures >= c.stroyClerkPrice ? 'coachHire' : null;
    case 8:
      if (o.tg1ReceivedAtPlayMs == null) return c.playMs >= TELEGRAM_AT_MS ? 'telegramArrive' : null;
      return 'coachTelegram';
    case 9:
      return c.playMs >= c.callAtMs ? 'call' : null;
    default:
      return null;
  }
}

/** Отримано телеграму № 1 (крок 8 ще відкритий). */
export function receiveTg1(o: OnboardingState, playMs: number): OnboardingState {
  return o.step === 8 && o.tg1ReceivedAtPlayMs == null ? { ...o, tg1ReceivedAtPlayMs: playMs } : o;
}

