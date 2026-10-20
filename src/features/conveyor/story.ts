// Сюжет у сторі (014): доменні події -> тригери, готові кроки -> носії (записка, тост, курйоз, дзвінок, телеграма, стан персонажа), щоденник.
import type { EconomyConfig, EconomyState, DomainEvent } from '@/economy/game/types';
import type { OnboardingState } from '@/features/onboarding/steps';
import type { DigitizationState } from '@/digitization/types';
import type { InspectionState } from '@/inspections/types';
import { curioFromStory } from '@/museum/museum';
import type { MuseumState } from '@/museum/types';
import { BEATS, DIARY } from '@/story/content';
import { diaryOnSessionStart } from '@/story/diary';
import { confirmTelegram, onEvent, pull, setCharacter } from '@/story/engine';
import { storyText } from '@/story/text';
import type { Carrier, SessionBudget, StoryCtx, StoryEvent, StoryState } from '@/story/types';
import type { TelegramState } from '@/telegrams/types';

import type { Toast } from './store';

/** Носії, екран яких є в збірці (014 етап 1); решта чекає в черзі (FR-28) */
export const SUPPORTED: ReadonlySet<Carrier> = new Set<Carrier>(['telegram', 'note', 'call', 'event_toast', 'curio', 'character_state']);

export const newBudget = (): SessionBudget => ({ interrupting: 0, toasts: 0 });

/** Те, що рушій і носії беруть зі стору (структурно збігається зі Store) */
export interface StoryHost {
  state: EconomyState;
  cfg: EconomyConfig;
  lastMs: number;
  onboarding: OnboardingState;
  digit: DigitizationState;
  telegrams: TelegramState;
  museum: MuseumState;
  inspections: InspectionState;
  story: StoryState;
  storySession: SessionBudget;
  storyCall: string | null;
  diaryToday: string | null;
  events: DomainEvent[];
  showToast: (t: Toast) => void;
}

export function ctxOf(g: StoryHost): StoryCtx {
  return { level: g.state.level, counts: g.digit.counts, conversions: g.state.digital.length, packs: g.telegrams.packs.seq, levelStartMs: g.digit.levelStartMs };
}

type Patch = Partial<Omit<StoryHost, 'showToast'>>;

/** Нові події: усе, що додано після останньої події попереднього стану (за посиланням) */
export function newEvents(prev: readonly DomainEvent[], next: readonly DomainEvent[]): DomainEvent[] {
  if (next === prev || !next.length) return [];
  const last = prev.at(-1);
  const i = last ? next.lastIndexOf(last) : -1;
  return i < 0 ? [...next] : next.slice(i + 1);
}

/** Доменна подія -> подія сюжету (або null) */
export function toStoryEvent(e: DomainEvent, level: number): StoryEvent | null {
  switch (e.type) {
    case 'raceFinish':
      return e.result === 'success' ? { type: 'race_won', gift: e.giftType, level } : null;
    case 'raceStart':
      return { type: 'gift_arrived', level };
    case 'inspectionStart':
      return e.kind === 'final' ? { type: 'boss_announced', level } : null;
    case 'finalPassed':
      return { type: 'boss_passed', level: e.level };
    case 'telegramAnswer':
      return { type: 'telegram_answered', telegramId: e.telegramId, choiceKind: e.choiceKind };
    default:
      return null;
  }
}

/** Події гри -> тригери і підтвердження телеграм. Кроки віддає `run` у безпечний момент. */
export function applyEvents(g: StoryHost, evs: readonly DomainEvent[]): Patch | null {
  if (!evs.length) return null;
  let st = g.story;
  const ctx = ctxOf(g);
  const out: DomainEvent[] = [];
  for (const e of evs) {
    const se = toStoryEvent(e, g.state.level);
    if (se) st = onEvent(st, BEATS, se, g.lastMs, e.type === 'raceFinish' ? e.offline : false);
    if (e.type === 'telegramReceive') {
      const c = confirmTelegram(st, BEATS, ctx, e.telegramId, g.lastMs);
      if (c) {
        st = c.st;
        out.push(deliverEvent(c.beat.id, c.beat.arc, c.beat.carrier, c.beat.order, 0, c.beat.level != null && c.beat.level < ctx.level, c.away || e.delivery === 'while_away'));
      }
    }
  }
  if (st === g.story && !out.length) return null;
  return { story: st, ...(out.length ? { events: [...g.events, ...out].slice(-40) } : {}) };
}

function deliverEvent(beatId: string, arc: string, carrier: string, beatOrder: number, delaySec: number, isCatchUp: boolean, isWhileAway: boolean): DomainEvent {
  return { type: 'storyBeatDeliver', beatId, arc, carrier, beatOrder, delaySec, isCatchUp, isWhileAway };
}

/**
 * Віддати готові кроки гравцеві. Викликати лише в безпечний момент (FR-6): без модалок, церемоній, результатів і онбордингу.
 * Повертає зміни стору або null.
 */
export function run(g: StoryHost): Patch | null {
  const o = g.onboarding;
  if (o.step !== 'done') return null;
  const ctx = ctxOf(g);
  const r = pull(g.story, BEATS, ctx, g.lastMs, g.storySession, { supports: SUPPORTED, maxToasts: g.cfg.params.storyMaxToasts });
  if (!r.out.length && r.st === g.story) return null;
  let tg = g.telegrams;
  let museum = g.museum;
  let call = g.storyCall;
  let story = r.st;
  const events: DomainEvent[] = [];
  const toasts: Toast[] = [];
  const gender = o.gender;
  const me = o.callsign?.text ?? '';
  // {n}: скільки паперових ланок лишилось (тост «Шлях наказу»)
  const left = g.cfg.params.convert.order.length - g.state.digital.length;
  for (const p of r.out) {
    const b = p.beat;
    const pl = b.payload as Record<string, string | string[]>;
    if (b.carrier === 'note') {
      const uid = `${b.id}#1`;
      tg = { ...tg, inbox: [...tg.inbox, { uid, id: b.id, kind: 'note' as const, receivedAt: g.lastMs, status: 'archive' as const, read: false }] };
    } else if (b.carrier === 'event_toast') {
      toasts.push({ kind: 'story', from: pl.from as string, title: storyText(pl.title as string, gender, me), body: storyText(pl.body as string, gender, me, left) });
    } else if (b.carrier === 'curio') {
      museum = curioFromStory(museum, { beatId: b.id, from: pl.from as string, title: pl.title as string, body: pl.body as string }, g.lastMs);
    } else if (b.carrier === 'call') {
      call = b.id;
    } else if (b.carrier === 'telegram') {
      const id = pl.telegramId as string;
      if (!tg.queue.includes(id)) tg = { ...tg, queue: [...tg.queue, id] };
    } else if (b.carrier === 'character_state') {
      story = setCharacter(story, pl.character as string, pl.state as string);
    }
    // для телеграми подія піде при отриманні (`applyEvents`)
    if (!p.dispatchOnly) events.push(deliverEvent(b.id, b.arc, b.carrier, b.order, p.delaySec, p.catchUp, p.away));
  }
  for (const t of toasts) g.showToast(t);
  return { story, storySession: r.session, telegrams: tg, museum, storyCall: call, ...(events.length ? { events: [...g.events, ...events].slice(-40) } : {}) };
}

/** Нова сесія: щоденник дає рядок першої сесії доби (FR-24) */
export function diaryStart(g: StoryHost, tz: number): Patch | null {
  if (g.onboarding.step !== 'done') return null;
  const install = g.inspections.installMs > 0 ? g.inspections.installMs : (g.telegrams.startMs ?? g.lastMs);
  const r = diaryOnSessionStart(g.story, DIARY, g.state.level, install, g.lastMs, tz);
  if (r.st === g.story) return null;
  const text = r.line ? storyText(r.line.text, g.onboarding.gender, g.onboarding.callsign?.text ?? '') : null;
  return { story: r.st, diaryToday: text };
}
