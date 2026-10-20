// Грамоти (016 FR-17…FR-24): лічильники над подіями, умови, видача. Не має доступу до стану економіки (FR-18):
// приймає лише події й знімок `AwardCtx`, повертає лише власний стан.
import { AWARDS, COUNTERS } from './content';
import type { AwardCtx, AwardDef, AwardsState, Condition, CounterDef, Fact, Grant, Where } from './types';

export function newAwards(): AwardsState {
  return { got: {}, counters: {}, sets: {}, seen: [], pendingPlatform: [], lastOrderNo: 0 };
}

/** `where` з awards.json: рівність, `[…]` - одне з, `{gte}`, `{any:[…]}`; порожній збігається завжди */
export function matches(where: Where, props: Fact['props']): boolean {
  for (const [k, want] of Object.entries(where)) {
    if (k === 'any') {
      if (!(want as Where[]).some((w) => matches(w, props))) return false;
      continue;
    }
    const have = props[k];
    if (Array.isArray(want)) {
      if (!want.includes(have)) return false;
    } else if (want && typeof want === 'object') {
      const { gte } = want as { gte?: number };
      if (gte != null && !(typeof have === 'number' && have >= gte)) return false;
    } else if (have !== want) return false;
  }
  return true;
}

const STATE_VALUE: Record<string, (c: AwardCtx) => number | undefined> = {
  zpz_share_max_pct: (c) => c.zpzSharePct,
  curio_entries: (c) => c.curioEntries,
  units_with_clerks: (c) => c.unitsWithClerks,
  diary_lines: (c) => c.diaryLines,
};

function bump(s: AwardsState, id: string, def: CounterDef, f: Fact): AwardsState {
  const cur = s.counters[id] ?? 0;
  if (def.resetOn && def.resetOn.event === f.event && matches(def.resetOn.where, f.props)) return cur === 0 ? s : { ...s, counters: { ...s.counters, [id]: 0 } };
  if (def.on !== f.event || !matches(def.where, f.props)) return s;
  if (def.aggregate?.startsWith('max:')) {
    const v = f.props[def.aggregate.slice(4)];
    return typeof v === 'number' && v > cur ? { ...s, counters: { ...s.counters, [id]: v } } : s;
  }
  if (def.distinct) {
    const v = String(f.props[def.distinct] ?? '');
    const set = s.sets[id] ?? [];
    if (!v || set.includes(v)) return s;
    const next = [...set, v];
    return { ...s, sets: { ...s.sets, [id]: next }, counters: { ...s.counters, [id]: next.length } };
  }
  return { ...s, counters: { ...s.counters, [id]: cur + 1 } };
}

function syncStateCounters(s: AwardsState, ctx: AwardCtx): AwardsState {
  let r = s;
  for (const [id, def] of Object.entries(COUNTERS)) {
    if (def.on !== 'state') continue;
    const v = STATE_VALUE[id]?.(ctx);
    if (v == null) continue;
    const cur = r.counters[id] ?? 0;
    const next = def.aggregate?.startsWith('max:') ? Math.max(cur, v) : v;
    if (next !== cur) r = { ...r, counters: { ...r.counters, [id]: next } };
  }
  return r;
}

/** Чи виконана умова на лічильниках, станових значеннях і подіях цієї пачки */
export function holds(c: Condition, s: AwardsState, facts: readonly Fact[], ctx: AwardCtx): boolean {
  if ('all' in c) return c.all.every((x) => holds(x, s, facts, ctx));
  if ('event' in c) return facts.some((f) => f.event === c.event && matches(c.where, f.props));
  if ('state' in c) return ctx.levelId === c.eq;
  if ('eqUnitsTotal' in c) return ctx.unitsTotal > 0 && (s.counters[c.counter] ?? 0) >= ctx.unitsTotal;
  return (s.counters[c.counter] ?? 0) >= c.gte;
}

export interface Applied {
  s: AwardsState;
  grants: Grant[];
}

/**
 * Події → лічильники → видача (FR-19, FR-21). Лічильники оновлюються тут же, у ту саму мить, що й подія, і не залежать
 * від аналітики. `retro` позначає видачу при завантаженні після оновлення контенту (FR-23).
 */
export function applyFacts(s0: AwardsState, facts: readonly Fact[], ctx: AwardCtx, atMs: number, opts: { retro?: boolean } = {}): Applied {
  let s = s0;
  const offline = facts.some((f) => f.offline);
  for (const f of facts) for (const [id, def] of Object.entries(COUNTERS)) s = bump(s, id, def, f);
  s = syncStateCounters(s, ctx);
  const at = facts.length ? Math.max(...facts.map((f) => f.atMs ?? atMs)) : atMs;
  const grants: Grant[] = [];
  let got = s.got;
  let lastOrderNo = s.lastOrderNo;
  const pending = [...s.pendingPlatform];
  for (const a of AWARDS) {
    if (got[a.id] || !holds(a.condition, s, facts, ctx)) continue;
    const orderNo = a.type === 'nakaz' ? ++lastOrderNo : undefined;
    got = { ...got, [a.id]: { atMs: at, seq: Object.keys(got).length + 1, toast: true as const, ...(orderNo != null ? { orderNo } : {}), ...(opts.retro ? { retro: true } : {}), ...(offline ? { offline: true } : {}) } };
    if (a.mirror.enabled) pending.push(a.id);
    grants.push({ id: a.id, atMs: at, retro: !!opts.retro, offline });
  }
  return { s: grants.length ? { ...s, got, lastOrderNo, pendingPlatform: pending } : s, grants };
}

/** Перевірка при завантаженні: умови над наявними лічильниками (FR-23); подій у пачці немає */
export function retroactive(s: AwardsState, ctx: AwardCtx, atMs: number): Applied {
  return applyFacts(s, [], ctx, atMs, { retro: true });
}

/** Грамоти з непоказаним тостом: після вбивства застосунку між записом і тостом черга відновлюється */
export function pendingToasts(s: AwardsState): Grant[] {
  return AWARDS.filter((a) => s.got[a.id]?.toast)
    .map((a) => ({ id: a.id, atMs: s.got[a.id]!.atMs, retro: !!s.got[a.id]!.retro, offline: !!s.got[a.id]!.offline }))
    .sort((a, b) => (s.got[a.id]!.seq ?? 0) - (s.got[b.id]!.seq ?? 0));
}

/** Тости показано (або скасовано скиданням): позначку знято */
export function toastsShown(s: AwardsState, ids: readonly string[]): AwardsState {
  if (!ids.some((id) => s.got[id]?.toast)) return s;
  const got: AwardsState['got'] = {};
  for (const [id, g] of Object.entries(s.got)) {
    got[id] = ids.includes(id) && g.toast ? { atMs: g.atMs, ...(g.orderNo != null ? { orderNo: g.orderNo } : {}), ...(g.retro ? { retro: true } : {}), ...(g.offline ? { offline: true } : {}), ...(g.seq != null ? { seq: g.seq } : {}) } : g;
  }
  return { ...s, got };
}

export function count(s: AwardsState): number {
  return AWARDS.filter((a) => s.got[a.id]).length;
}

export function unseen(s: AwardsState): string[] {
  return AWARDS.filter((a) => s.got[a.id] && !s.seen.includes(a.id)).map((a) => a.id);
}

/** Показ сегмента «Грамоти» позначає всі грамоти переглянутими (FR-29) */
export function markSeen(s: AwardsState): AwardsState {
  const u = unseen(s);
  return u.length ? { ...s, seen: [...s.seen, ...u] } : s;
}

/** «k з n» для неотриманої відкритої грамоти (FR-26) */
export function progressOf(s: AwardsState, a: AwardDef): { k: number; n: number } | null {
  if (!a.progress) return null;
  return { k: Math.min(s.counters[a.progress.counter] ?? 0, a.progress.target), n: a.progress.target };
}

/** Лічильники обнуляються при «Скинути прогрес», грамоти й номер наказу лишаються (FR-22) */
export function resetProgress(s: AwardsState): AwardsState {
  return { ...s, counters: {}, sets: {} };
}

/** Звіт у платформу виконано (FR-41) */
export function platformReported(s: AwardsState, ids: readonly string[]): AwardsState {
  return { ...s, pendingPlatform: s.pendingPlatform.filter((x) => !ids.includes(x)) };
}
