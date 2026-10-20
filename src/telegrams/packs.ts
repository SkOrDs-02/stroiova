// Пачки Р3 (011 FR-17…FR-24, рішення 99-101): видача о 03:00, стан, прогноз і зведена відповідь. Чистий домен.
import type { DomainEvent, EconomyConfig, EconomyState, StoredEffect } from '@/economy/game/types';

import { allPacks, type PackDef } from './content';
import { answer, cutHours, paperCost, telegramOf, unitRef, type AnswerCtx } from './effects';
import { applyRep, replyChance, repTier } from './reputation';
import { roller } from './rng';
import type { Choice, ChoiceKind, Effects, InboxItem, ItemResult, TelegramState } from './types';

/** Пачка приходить рівно о 03:00 за часом пристрою (FR-17) */
export const PACK_HOUR = 3;
/** Види, у які можна звести пачку (FR-20) */
export const SUMMARY_KINDS = ['diligent', 'formal_reply', 'drawer'] as const;
export type SummaryKind = (typeof SUMMARY_KINDS)[number];
/** Кидок зведеної відповіді: max(pᵢ) + стільки п. п. (FR-21) */
const MERGE_CHANCE_BONUS = 10;

export type PackStatus = 'new' | 'partial' | 'done';

export interface PackGroup {
  id: string;
  no: number;
  /** Три записи в порядку місць 1-3 */
  items: InboxItem[];
  /** Скільки вже відповіли (шухляда рахується) */
  answered: number;
  status: PackStatus;
  /** Вид зведеної відповіді, якщо пачку зведено */
  summary: ChoiceKind | null;
  /** Закрита сумлінно: зведена diligent або всі три окремі diligent (рішення 100) */
  diligent: boolean;
  mode: 'summary' | 'separate' | 'mixed' | null;
}

function groupOf(items: InboxItem[]): PackGroup {
  const sorted = [...items].sort((a, b) => a.pack!.index - b.pack!.index);
  const answered = sorted.filter((i) => i.status !== 'new').length;
  const summary = sorted.find((i) => i.pack!.summary)?.pack!.summary ?? null;
  const kinds = sorted.map((i) => (i.choiceId ? telegramOf(i)?.choices.find((c) => c.id === i.choiceId)?.kind : undefined));
  const done = answered === sorted.length;
  const diligent = done && (summary ? summary === 'diligent' : kinds.every((k) => k === 'diligent'));
  const mode = !done ? null : summary ? 'summary' : new Set(kinds).size > 1 ? 'mixed' : 'separate';
  return {
    id: sorted[0]!.pack!.id,
    no: sorted[0]!.pack!.no,
    items: sorted,
    answered,
    status: answered === 0 ? 'new' : done ? 'done' : 'partial',
    summary,
    diligent,
    mode,
  };
}

/** Усі пачки у вхідних за номером «Зведення № N» (від нового до старого) */
export function packGroups(tg: TelegramState): PackGroup[] {
  const by = new Map<number, InboxItem[]>();
  for (const i of tg.inbox) if (i.pack) by.set(i.pack.no, [...(by.get(i.pack.no) ?? []), i]);
  return [...by.values()].map(groupOf).sort((a, b) => b.no - a.no);
}

export function packByNo(tg: TelegramState, no: number): PackGroup | null {
  const items = tg.inbox.filter((i) => i.pack?.no === no);
  return items.length ? groupOf(items) : null;
}

/** Де пачка лежить у списку: «Нові», поки є невідповідані; далі шухляда (ще можна відповісти), «На виконанні», архів */
export function packPlace(g: PackGroup): 'new' | 'drawer' | 'work' | 'archive' {
  if (g.items.some((i) => i.status === 'new')) return 'new';
  if (g.items.some((i) => i.status === 'drawer')) return 'drawer';
  if (g.items.some((i) => i.status === 'work')) return 'work';
  return 'archive';
}

/** Остання видана пачка й чи закрита вона сумлінно (пункт механіки `summary_beats`, FR-27) */
export function lastPack(tg: TelegramState): { no: number; closed: boolean; diligent: boolean } | null {
  const g = packGroups(tg)[0];
  return g ? { no: g.no, closed: g.status === 'done', diligent: g.diligent } : null;
}

// ---------- видача ----------

/** Мішок пачок: без повтору до вичерпання всіх, ніколи двічі поспіль (рішення 41); стан - у `lineBags` */
const BAG_KEY = 'pack.bag';

function pickPack(tg: TelegramState, rand: () => number): { tg: TelegramState; def: PackDef; isRepeat: boolean } | null {
  const packs = allPacks();
  if (!packs.length) return null;
  const bag = tg.lineBags[BAG_KEY] ?? { used: [], last: null };
  let used = bag.used.filter((i) => i < packs.length);
  let free = packs.map((_, i) => i).filter((i) => !used.includes(i));
  let wrapped = false;
  if (!free.length) {
    used = [];
    wrapped = true;
    free = packs.map((_, i) => i).filter((i) => packs.length === 1 || i !== bag.last);
  }
  const index = free[Math.floor(rand() * free.length)]!;
  const lineBags = { ...tg.lineBags, [BAG_KEY]: { used: [...used, index], last: index } };
  return { tg: { ...tg, lineBags }, def: packs[index]!, isRepeat: wrapped || tg.packs.seq >= packs.length };
}

/** Скільки місць у «Нових» займають телеграми: пачка - одне місце (FR-18) */
export function newRows(tg: TelegramState): number {
  const packNos = new Set<number>();
  let n = 0;
  for (const x of tg.inbox) {
    if (x.status !== 'new' || x.kind === 'note') continue;
    if (x.pack) {
      if (!packNos.has(x.pack.no)) {
        packNos.add(x.pack.no);
        n++;
      }
    } else n++;
  }
  return n;
}

/** Видати пачку о `atMs`: три записи з полем `pack` і події (FR-17, FR-18) */
export function deliverPack(tg0: TelegramState, atMs: number, rand: () => number, delivery: 'live' | 'while_away'): { tg: TelegramState; items: InboxItem[]; events: DomainEvent[] } | null {
  const pk = pickPack(tg0, rand);
  if (!pk) return null;
  const no = pk.tg.packs.seq + 1;
  let tg: TelegramState = { ...pk.tg, packs: { ...pk.tg.packs, seq: no } };
  const items: InboxItem[] = [];
  const events: DomainEvent[] = [{ type: 'packReceive', packId: pk.def.id, no, isRepeat: pk.isRepeat, delivery }];
  pk.def.telegrams.forEach((id, i) => {
    const item: InboxItem = { uid: `${id}#${tg.deliveries + 1}`, id, kind: 'telegram', receivedAt: atMs, status: 'new', pack: { id: pk.def.id, no, index: i + 1 } };
    tg = { ...tg, inbox: [...tg.inbox, item], deliveries: tg.deliveries + 1 };
    items.push(item);
    events.push({ type: 'telegramReceive', telegramId: id, uid: item.uid, delivery, scripted: false });
  });
  return { tg, items, events };
}

// ---------- зведена відповідь ----------

/** Плоскі ефекти варіанта для суми: папір, репутація, кидок (з урахуванням прапорця `ifFlag`) */
function flat(e: Effects, flags: Record<string, true>): { paper: number; rep: number; pct: number; extra: string | null } {
  const f = e.ifFlag && flags[e.ifFlag.flag] ? e.ifFlag.effects : null;
  return { paper: paperCost(e, flags), rep: (e.rep ?? 0) + (f?.rep ?? 0), pct: Math.max(e.inspPct ?? 0, f?.inspPct ?? 0), extra: e.inspExtraItem ?? f?.inspExtraItem ?? null };
}

/** Зведені числа (FR-21): папір - сума мінус `saving` = `pack.size − 1` (≥ 0, як у sim.js); репутація - половина суми з відкиданням дробу до нуля; кидок - max(pᵢ) + 10 п. п. (≤ 100), 0 без жодного pᵢ */
export function mergeNumbers(items: { paper: number; rep: number; pct: number }[], saving: number): { paper: number; rep: number; pct: number } {
  const sumPaper = items.reduce((n, x) => n + x.paper, 0);
  const sumRep = items.reduce((n, x) => n + x.rep, 0);
  const top = Math.max(0, ...items.map((x) => x.pct));
  return { paper: Math.max(0, sumPaper - saving), rep: Math.trunc(sumRep / 2), pct: top > 0 ? Math.min(100, top + MERGE_CHANCE_BONUS) : 0 };
}

export interface KindForecast {
  kind: SummaryKind;
  available: boolean;
  /** 'kind' - немає в усіх трьох; 'paper' - бракує аркушів */
  reason?: 'kind' | 'paper';
  lackPaper?: number;
  /** Зведені: аркушів, зміна репутації, шанс позапланової (%), сповільнення «Нарада» */
  paper: number;
  rep: number;
  chancePct: number;
  slow: { mult: number; hours: number } | null;
  /** Сума окремих відповідей для порівняння */
  separate: { paper: number; rep: number; slows: number; chances: number[] };
}

function choiceOfKind(item: InboxItem, kind: SummaryKind): Choice | undefined {
  return telegramOf(item)?.choices.find((c) => c.kind === kind && !c.requires);
}

export function packForecast(tg: TelegramState, eco: EconomyState, cfg: EconomyConfig, no: number): KindForecast[] {
  const g = packByNo(tg, no);
  if (!g) return [];
  const p = cfg.params;
  return SUMMARY_KINDS.map((kind) => {
    const choices = g.items.map((i) => choiceOfKind(i, kind));
    const sep = { paper: 0, rep: 0, slows: 0, chances: [] as number[] };
    const base: KindForecast = { kind, available: false, paper: 0, rep: 0, chancePct: 0, slow: null, separate: sep };
    if (choices.some((c) => !c)) return { ...base, reason: 'kind' as const };
    const fl = choices.map((c) => flat(c!.effects, tg.flags));
    for (let i = 0; i < choices.length; i++) {
      sep.paper += fl[i]!.paper;
      // цифровий щит окремої відповіді гасить мінус репутації (як в `answer`); зведена відповідь щит не використовує (рішення 100)
      sep.rep += fl[i]!.rep < 0 && choices[i]!.effects.digitalShield && eco.prestigePoints >= 1 ? 0 : fl[i]!.rep;
      sep.slows += (choices[i]!.effects.slow ?? []).length;
      sep.chances.push(Math.round(replyChance(tg, p, fl[i]!.pct, !!choices[i]!.effects.digitalShield, eco.prestigePoints) * 100));
    }
    const m = mergeNumbers(fl, p.pack.size - 1);
    const paper = m.paper;
    const rep = m.rep;
    const chancePct = Math.round(replyChance(tg, p, m.pct, false, eco.prestigePoints) * 100);
    const slow = kind === 'diligent' && (p.pack.slowMult > 0) && unitRef(eco, cfg, 'narada') ? { mult: p.pack.slowMult, hours: p.pack.slowHours } : null;
    const have = Math.floor(eco.paper);
    const ok = paper <= have;
    return { kind, available: ok, ...(ok ? {} : { reason: 'paper' as const, lackPaper: paper - have }), paper, rep, chancePct, slow, separate: sep };
  });
}

export interface PackAnswer {
  tg: TelegramState;
  eco: EconomyState;
  effects: StoredEffect[];
  events: DomainEvent[];
}

/**
 * «Звести в одну відповідь» (FR-19…FR-24): ефекти кожної телеграми без паперу, репутації, сповільнень і кидка, а потім
 * зведені: папір - сума мінус 2, репутація - половина суми до нуля, один кидок, для `diligent` одне сповільнення «Нарада» і баф.
 */
export function answerPack(tg0: TelegramState, eco0: EconomyState, no: number, kind: SummaryKind, ctx: AnswerCtx): PackAnswer | { error: 'state' | 'kind' | 'paper' } {
  const g = packByNo(tg0, no);
  if (!g || g.status !== 'new') return { error: 'state' };
  const f = packForecast(tg0, eco0, ctx.cfg, no).find((x) => x.kind === kind)!;
  if (!f.available) return { error: f.reason === 'paper' ? 'paper' : 'kind' };

  const { cfg, nowMs } = ctx;
  const p = cfg.params;
  let tg = tg0;
  let eco = eco0;
  const effects: StoredEffect[] = [];
  const events: DomainEvent[] = [];
  const tierBefore = repTier(tg.reputation.value, p);
  const fl = g.items.map((i) => flat(choiceOfKind(i, kind)!.effects, tg0.flags));
  for (const i of g.items) {
    const r = answer(tg, eco, i.uid, choiceOfKind(i, kind)!.id, { ...ctx, merge: true });
    if ('error' in r) return { error: r.error === 'paper' ? 'paper' : 'state' };
    tg = r.tg;
    eco = r.eco;
    effects.push(...r.effects);
    events.push(...r.events);
  }

  // зведені ефекти
  eco = { ...eco, paper: Math.max(0, eco.paper - f.paper) };
  if (f.rep) tg = applyRep(tg, f.rep, nowMs, g.items[0]!.uid);
  let workEnd = 0;
  if (f.slow) {
    const ref = unitRef(eco, cfg, 'narada')!;
    const slowHours = cutHours(f.slow.hours, eco);
    workEnd = nowMs + slowHours * 3_600_000;
    effects.push({ kind: 'factor', source: 'telegram_slow', value: f.slow.mult, target: ref, startMs: nowMs, endMs: workEnd });
  }
  let hit = false;
  if (f.chancePct > 0) {
    const rng = roller(tg.rng);
    const used = tg.unscheduledDays.filter((d) => d === ctx.dayKey).length;
    if (rng.next() < f.chancePct / 100 && used < p.unscheduledPerDay) {
      hit = true;
      tg = { ...tg, unscheduledDays: [...tg.unscheduledDays, ctx.dayKey].slice(-7) };
      const extra = fl.map((x) => x.extra).find((x) => x != null) ?? null;
      events.push({ type: 'unscheduledInspection', telegramId: g.items[0]!.id, warnSec: p.unscheduledWarnH * 3600, extraItem: extra });
      if (extra) events.push({ type: 'inspItem', telegramId: g.items[0]!.id, item: extra, remarkPct: 0 });
    }
    tg = { ...tg, rng: rng.state };
  }

  const repAfter = tg.reputation.value;
  const zeroResult: ItemResult = { rep: 0, repAfter, paper: 0, slow: [], chancePct: 0, inspHit: false, shield: false };
  const mergedResult: ItemResult = { ...zeroResult, rep: f.rep, paper: f.paper, chancePct: f.chancePct, inspHit: hit, slow: f.slow ? [{ target: 'narada', mult: f.slow.mult, hours: cutHours(f.slow.hours, eco) }] : [] };
  // записи пачки: вид зведеної відповіді; діти в роботі, поки триває сповільнення
  const uids = new Set(g.items.map((i) => i.uid));
  tg = {
    ...tg,
    inbox: tg.inbox.map((x) => {
      if (!x.pack || !uids.has(x.uid)) return x;
      const work = workEnd > nowMs && x.status !== 'drawer';
      // зведені числа лежать на першій телеграмі пачки: tg-result складає з них рядки, решта нулі
      const result = x.pack.index === 1 ? mergedResult : { ...zeroResult };
      return { ...x, pack: { ...x.pack, summary: kind }, result, ...(work ? { status: 'work' as const, workUntil: Math.max(x.workUntil ?? 0, workEnd) } : {}) };
    }),
  };

  const tierAfter = repTier(tg.reputation.value, p);
  if (tierAfter !== tierBefore) events.push({ type: 'reputationTierChange', from: tierBefore, to: tierAfter, value: tg.reputation.value });
  events.push({ type: 'packResolve', packId: g.id, no, mode: 'summary', choiceKind: kind, paperSpent: f.paper, repDelta: f.rep, chancePct: f.chancePct, isBeats: kind === 'diligent', secSinceReceived: Math.max(0, Math.round((nowMs - g.items[0]!.receivedAt) / 1000)) });
  events.push({ type: 'packCurio', packId: g.id, no, kind, uids: g.items.map((i) => i.uid) });
  if (kind === 'diligent') {
    effects.push({ kind: 'factor', source: 'pack_beats', value: p.pack.summaryBuff, target: { type: 'stream', id: 'zvedennia' }, startMs: nowMs, endMs: nowMs + p.pack.summaryBuffHours * 3_600_000 });
    events.push({ type: 'packBeats', mult: p.pack.summaryBuff, hours: p.pack.summaryBuffHours });
  }
  return { tg, eco, effects, events };
}

/**
 * Пачку закрито окремими відповідями: подія `packResolve` (mode separate / mixed) — щойно відповіли на останню з трьох (FR-19, ВП-4).
 * Викликається після кожної окремої відповіді на телеграму пачки.
 */
export function resolvedSeparately(tg: TelegramState, uid: string, nowMs: number): DomainEvent | null {
  const item = tg.inbox.find((x) => x.uid === uid);
  if (!item?.pack || item.pack.summary) return null;
  const g = packByNo(tg, item.pack.no);
  if (!g || g.status !== 'done' || !g.mode) return null;
  const paper = g.items.reduce((n, i) => n + (i.result?.paper ?? 0), 0);
  const rep = g.items.reduce((n, i) => n + (i.result?.rep ?? 0), 0);
  const chance = Math.max(0, ...g.items.map((i) => i.result?.chancePct ?? 0));
  return { type: 'packResolve', packId: g.id, no: g.no, mode: g.mode === 'mixed' ? 'mixed' : 'separate', paperSpent: paper, repDelta: rep, chancePct: chance, isBeats: g.diligent, secSinceReceived: Math.max(0, Math.round((nowMs - g.items[0]!.receivedAt) / 1000)) };
}
