// Рушій сюжету (014 FR-2…FR-5, FR-7, FR-10): подія й стан на вході, готові кроки на виході.
import type { Beat, Carrier, Pulled, PullOpts, SessionBudget, StoryCtx, StoryEvent, StoryState } from './types';

const HOUR = 3_600_000;
/** Перебивні носії й їхній ліміт за сесію: правило FR-7 (≤ 1), не параметр балансу (рішення 106) */
const INTERRUPTING: readonly Carrier[] = ['call', 'scene'];
const INTERRUPTING_MAX = 1;

export function newStory(): StoryState {
  return { delivered: {}, skipped: [], fired: {}, dispatched: {}, counters: { wins: {}, gifts: {} }, chars: {}, sheets: {}, bosses: [], diary: { got: [], lastDay: null } };
}

/** Стан для запису, що вперше зустрів сюжет: кроки пройдених рівнів закрито, поточний рівень наздоганяє (FR-29). */
export function storyForLevel(beats: readonly Beat[], level: number): StoryState {
  return { ...newStory(), skipped: beats.filter((b) => b.level != null && b.level < level).map((b) => b.id) };
}

const closed = (st: StoryState, b: Beat) => st.delivered[b.id] != null || st.skipped.includes(b.id);

/** Крок пройденого рівня без `required` мовчки пропускається (FR-10) */
const lapsed = (b: Beat, ctx: StoryCtx) => b.level != null && b.level < ctx.level && !b.required;

/** Крок закрито міграцією або він мовчки пропущений з минулим рівнем (FR-10, FR-29) */
function isLapsed(st: StoryState, beats: readonly Beat[], ctx: StoryCtx, id: string): boolean {
  if (st.skipped.includes(id)) return true;
  const b = beats.find((x) => x.id === id);
  return b != null && st.delivered[id] == null && lapsed(b, ctx);
}

const afterMs = (h: number | 'next_day' | undefined) => (typeof h === 'number' ? h * HOUR : 0);

function fire(st: StoryState, id: string, at: number, away: boolean): StoryState {
  return st.fired[id] || st.delivered[id] ? st : { ...st, fired: { ...st.fired, [id]: { at, away } } };
}

/**
 * Тригери, що виводяться зі стану (цифровізації, конвертації, пачки, рівень, доставлений крок): перевіряються на кожному виклику,
 * тож спрацювання не губиться, поки `requires` не виконано (FR-3), і діє ретроспективно після оновлення (FR-29).
 */
export function sync(st: StoryState, beats: readonly Beat[], ctx: StoryCtx, nowMs: number, away = false): StoryState {
  let s = st;
  for (const b of beats) {
    if (closed(s, b) || s.fired[b.id]) continue;
    const t = b.trigger;
    if (t.type === 'digitization_on_level') {
      if (b.level != null && (ctx.counts[String(b.level)] ?? 0) >= t.n) s = fire(s, b.id, nowMs, away);
    } else if (t.type === 'conversion') {
      if (ctx.conversions >= t.k) s = fire(s, b.id, nowMs, away);
    } else if (t.type === 'pack_received') {
      if (ctx.packs >= t.n) s = fire(s, b.id, nowMs, away);
    } else if (t.type === 'level_enter') {
      if (ctx.level === t.level) s = fire(s, b.id, ctx.levelStartMs, away);
      else if (ctx.level > t.level) s = fire(s, b.id, nowMs, away);
    } else if (t.type === 'beat_delivered') {
      const d = s.delivered[t.beat];
      if (d) s = fire(s, b.id, d.at, d.away);
      // крок закрито міграцією чи пропущено з рівнем - залежний крок не лишається назавжди без тригера
      else if (isLapsed(s, beats, ctx, t.beat)) s = fire(s, b.id, nowMs, away);
    }
  }
  return s;
}

/** Подія, яку не вивести зі стану: гонка, подарунок, перевірка, відповідь на телеграму (FR-3). */
export function onEvent(st: StoryState, beats: readonly Beat[], ev: StoryEvent, nowMs: number, away: boolean): StoryState {
  let s = st;
  let nth = 0;
  if (ev.type === 'race_won') {
    const k = `${ev.gift}:${ev.level}`;
    nth = (s.counters.wins[k] ?? 0) + 1;
    s = { ...s, counters: { ...s.counters, wins: { ...s.counters.wins, [k]: nth } } };
  } else if (ev.type === 'gift_arrived') {
    const k = String(ev.level);
    nth = (s.counters.gifts[k] ?? 0) + 1;
    s = { ...s, counters: { ...s.counters, gifts: { ...s.counters.gifts, [k]: nth } } };
  }
  if (ev.type === 'boss_passed' && !s.bosses.includes(ev.level)) s = { ...s, bosses: [...s.bosses, ev.level] };
  for (const b of beats) {
    if (closed(s, b)) continue;
    const t = b.trigger;
    const hit =
      (t.type === 'race_won' && ev.type === 'race_won' && t.gift === ev.gift && t.level === ev.level && nth >= t.nth) ||
      (t.type === 'gift_arrived' && ev.type === 'gift_arrived' && t.level === ev.level && nth >= t.nth) ||
      (t.type === 'boss_announced' && ev.type === 'boss_announced' && b.level === ev.level) ||
      (t.type === 'boss_passed' && ev.type === 'boss_passed' && t.level === ev.level) ||
      (t.type === 'telegram_answered' && ev.type === 'telegram_answered' && t.telegramId === ev.telegramId && (t.choiceKind == null || t.choiceKind === ev.choiceKind)) ||
      (t.type === 'finale_step' && ev.type === 'finale_step' && t.step === ev.step) ||
      (t.type === 'session_first_of_day' && ev.type === 'session_first_of_day');
    if (hit) s = fire(s, b.id, nowMs, away);
  }
  return s;
}

/** Мить, відколи крок готовий: тригер + затримка, усі `requires` + їхні затримки; null - ще ні (FR-3, FR-4). */
function readyAtMs(st: StoryState, beats: readonly Beat[], b: Beat, ctx: StoryCtx): number | null {
  const f = st.fired[b.id];
  if (!f) return null;
  let at = f.at + afterMs(b.trigger.afterHours);
  for (const r of b.requires ?? []) {
    const d = st.delivered[r.beat];
    if (d) at = Math.max(at, d.at + afterMs(r.afterHours));
    // залежність, закрита міграцією чи пропущена з рівнем, виконаною вважається без затримки (FR-29)
    else if (!isLapsed(st, beats, ctx, r.beat)) return null;
  }
  // кроки арки йдуть за `order`: усі попередні мають бути доставлені чи пропущені (FR-4)
  for (const p of beats) {
    if (p.arc === b.arc && p.order < b.order && !closed(st, p) && !lapsed(p, ctx)) return null;
  }
  return at;
}

const levelOk = (b: Beat, ctx: StoryCtx) => b.level == null || b.level === ctx.level || (b.required === true && b.level < ctx.level);

export interface ReadyBeat {
  beat: Beat;
  readyAt: number;
  catchUp: boolean;
}

/** Готові кроки в порядку показу: наздоганяння першими (FR-10), далі за мить готовності. */
export function ready(st: StoryState, beats: readonly Beat[], ctx: StoryCtx, nowMs: number, supports: ReadonlySet<Carrier>): ReadyBeat[] {
  const out: ReadyBeat[] = [];
  for (const b of beats) {
    if (closed(st, b) || st.dispatched[b.id] != null || lapsed(b, ctx) || !levelOk(b, ctx) || !supports.has(b.carrier)) continue;
    const at = readyAtMs(st, beats, b, ctx);
    if (at == null || at > nowMs) continue;
    out.push({ beat: b, readyAt: at, catchUp: b.level != null && b.level < ctx.level });
  }
  return out.sort((a, b) => Number(b.catchUp) - Number(a.catchUp) || a.readyAt - b.readyAt || a.beat.order - b.beat.order || a.beat.id.localeCompare(b.beat.id));
}

/**
 * Віддати готові кроки, поки вистачає лімітів сесії (FR-7). Телеграма лише ставиться в чергу (`dispatchOnly`): доставленою вона вважається,
 * коли прийшла (`confirm`). Кроки, що не влізли в ліміт, лишаються готовими до наступної сесії.
 */
export function pull(st0: StoryState, beats: readonly Beat[], ctx: StoryCtx, nowMs: number, session: SessionBudget, opts: PullOpts): { st: StoryState; out: Pulled[]; session: SessionBudget } {
  let st = sync(st0, beats, ctx, nowMs);
  let budget = session;
  const out: Pulled[] = [];
  for (let guard = 0; guard < beats.length + 1; guard++) {
    const next = ready(st, beats, ctx, nowMs, opts.supports).find((r) => {
      if (INTERRUPTING.includes(r.beat.carrier)) return budget.interrupting < INTERRUPTING_MAX;
      if (r.beat.carrier === 'event_toast') return budget.toasts < opts.maxToasts;
      return true;
    });
    if (!next) break;
    const b = next.beat;
    const fired = st.fired[b.id]!;
    const dispatchOnly = b.carrier === 'telegram';
    out.push({ beat: b, catchUp: next.catchUp, away: fired.away, delaySec: Math.max(0, Math.round((nowMs - next.readyAt) / 1000)), dispatchOnly });
    if (INTERRUPTING.includes(b.carrier)) budget = { ...budget, interrupting: budget.interrupting + 1 };
    if (b.carrier === 'event_toast') budget = { ...budget, toasts: budget.toasts + 1 };
    if (dispatchOnly) st = { ...st, dispatched: { ...st.dispatched, [b.id]: nowMs } };
    else st = deliverMark(st, beats, ctx, b, nowMs, next.catchUp, fired.away);
  }
  return { st, out, session: budget };
}

function deliverMark(st: StoryState, beats: readonly Beat[], ctx: StoryCtx, b: Beat, nowMs: number, catchUp: boolean, away: boolean): StoryState {
  return sync({ ...st, delivered: { ...st.delivered, [b.id]: { at: nowMs, rev: b.rev, catchUp, away } } }, beats, ctx, nowMs);
}

/** Телеграма кроку прийшла: крок доставлено (вона була в черзі телеграм). Повертає null, якщо така не очікується. */
export function confirmTelegram(st: StoryState, beats: readonly Beat[], ctx: StoryCtx, telegramId: string, nowMs: number): { st: StoryState; beat: Beat; away: boolean } | null {
  const b = beats.find((x) => x.carrier === 'telegram' && st.dispatched[x.id] != null && (x.payload as { telegramId?: string }).telegramId === telegramId);
  if (!b) return null;
  const { [b.id]: _gone, ...rest } = st.dispatched;
  const away = st.fired[b.id]?.away ?? false;
  return { st: deliverMark({ ...st, dispatched: rest }, beats, ctx, b, nowMs, b.level != null && b.level < ctx.level, away), beat: b, away };
}

/** Запам'ятати стан персонажа (`character_state`, FR-21) */
export function setCharacter(st: StoryState, character: string, state: string): StoryState {
  return { ...st, chars: { ...st.chars, [character]: state } };
}
