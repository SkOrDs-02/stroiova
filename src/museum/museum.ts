// Музей й журнал курйозів (007): отримання журналів, бонуси для економіки, записи курйозів.
import type { DomainEvent, EconomyConfig, EconomyState } from '@/economy/game/types';
import type { Journals } from '@/race/race';
import { telegram } from '@/telegrams/content';
import type { InboxItem, TelegramState } from '@/telegrams/types';

import { journal, journalNo, MUSEUM_SIZE } from './journals';
import type { CurioEntry, CurioStatus, JournalSource, MuseumState, RevealItem } from './types';

export function newMuseum(): MuseumState {
  return { owned: [], reveal: [], curios: [], curioSeq: 0 };
}

export function has(ms: MuseumState, no: number): boolean {
  return ms.owned.some((o) => o.no === no);
}

/** «N з 8»: журнали № 9 і далі в лічильник не входять (рішення 76) */
export function count(ms: MuseumState): number {
  return ms.owned.filter((o) => o.no <= MUSEUM_SIZE).length;
}

/** Непереглянуті журнали: на вкладці «Музей» горить крапка (FR-20) */
export function unseen(ms: MuseumState): number {
  return ms.owned.filter((o) => !o.seen).length;
}

/** Серію зібрано: у музеї є № 8 (FR-16) */
export function seriesDone(ms: MuseumState): boolean {
  return has(ms, 8);
}

/** Множники економіки з журналів (FR-11): % з конфігу, № 8 подвоює № 1-7. Без журналів - нейтральні. */
export function bonuses(ms: MuseumState, cfg: EconomyConfig): EconomyState['museum'] {
  const p = cfg.params;
  const k = has(ms, 8) ? 2 : 1;
  const unit: Record<string, number> = {};
  if (has(ms, 1)) unit.stroy = 1 + (p.museumUnitPct / 100) * k;
  if (has(ms, 4)) unit.nakladni = 1 + (p.museumUnitPct / 100) * k;
  if (has(ms, 5)) unit.raporty = 1 + (p.museumUnitPct / 100) * k;
  return {
    unit,
    storage: has(ms, 2) ? 1 + (p.museumStoragePct / 100) * k : 1,
    paper: has(ms, 3) ? 1 + (p.museumPaperPct / 100) * k : 1,
  };
}

/** Журнали, що скорочують кроки акта в гонці (005 FR-17) */
export function raceJournals(ms: MuseumState): Journals {
  return { j6: has(ms, 6), j7: has(ms, 7), j8: has(ms, 8) };
}

export interface GrantResult {
  ms: MuseumState;
  eco: EconomyState;
  events: DomainEvent[];
}

/**
 * Додати журнали (FR-3): повторне джерело нічого не змінює. № 8 з'являється в ту саму мить, коли в музеї стає сім інших (FR-9),
 * і йде в те саме розкриття. Журнали з номером більше 8 лише записуються (рішення 76).
 */
export function grant(ms: MuseumState, eco: EconomyState, cfg: EconomyConfig, nos: readonly number[], atMs: number, source: JournalSource, via: RevealItem['via'] = 'other'): GrantResult {
  if (!cfg.params.museum) return { ms, eco, events: [] };
  const fresh = nos.filter((n, i) => journal(n) && !has(ms, n) && nos.indexOf(n) === i);
  if (!fresh.length) return { ms, eco, events: [] };
  const owned = [...ms.owned];
  const add = (no: number) => owned.push({ no, atMs, source, seen: no > MUSEUM_SIZE });
  const shown: number[] = [];
  for (const n of fresh) {
    add(n);
    if (n <= MUSEUM_SIZE) shown.push(n);
  }
  const others = [1, 2, 3, 4, 5, 6, 7].filter((n) => owned.some((o) => o.no === n)).length;
  if (others === 7 && !owned.some((o) => o.no === 8)) {
    add(8);
    shown.push(8);
  }
  const base = ms.owned.filter((o) => o.no <= MUSEUM_SIZE).length;
  const reveal: RevealItem[] = shown.map((no, i) => ({ no, k: i + 1, m: shown.length, nAfter: base + i + 1, via }));
  const events: DomainEvent[] = shown.map((no, i) => {
    const j = journal(no)!;
    return { type: 'museumJournalUnlock', no, journalId: j.id, rarity: j.rarity, source, ownedAfter: base + i + 1, isSeriesComplete: no === 8 };
  });
  const next: MuseumState = { ...ms, owned, reveal: [...ms.reveal, ...reveal] };
  return { ms: next, eco: { ...eco, museum: bonuses(next, cfg) }, events };
}

/** Журнали з подій інших фіч: цифровізація (06), `journal` телеграми (03), перша перевірка без зауважень (04). */
export function fromEvents(ms: MuseumState, eco: EconomyState, cfg: EconomyConfig, evs: readonly DomainEvent[], atMs: number, ctx: { offline: boolean; inspAtMs?: number }): GrantResult {
  let cur: GrantResult = { ms, eco, events: [] };
  for (const e of evs) {
    let r: GrantResult | null = null;
    if (e.type === 'digitizationComplete') r = grant(cur.ms, cur.eco, cfg, e.journalsCancelled, atMs, 'digitization');
    else if (e.type === 'journal') {
      const no = journalNo(e.id);
      if (no != null) r = grant(cur.ms, cur.eco, cfg, [no], atMs, 'telegram');
    } else if (e.type === 'inspectionJournal') r = grant(cur.ms, cur.eco, cfg, [7], ctx.inspAtMs ?? atMs, 'inspection', ctx.offline ? 'other' : 'insp');
    if (r) cur = { ms: r.ms, eco: r.eco, events: [...cur.events, ...r.events] };
  }
  return cur;
}

// --- розкриття (рішення 79) ---

/** Перше розкриття для модалки `journal-new`: журнали перевірки в грі показує insp-result */
export function nextReveal(ms: MuseumState): RevealItem | null {
  return ms.reveal.find((r) => r.via === 'other') ?? null;
}

function markSeen(owned: MuseumState['owned'], nos: readonly number[]): MuseumState['owned'] {
  return owned.map((o) => (nos.includes(o.no) ? { ...o, seen: true } : o));
}

/** `journal-new` закрито: журнал переглянуто */
export function closeReveal(ms: MuseumState): MuseumState {
  const r = nextReveal(ms);
  if (!r) return ms;
  return { ...ms, reveal: ms.reveal.filter((x) => x !== r), owned: markSeen(ms.owned, [r.no]) };
}

/** `insp-result` закрито: блок експоната показано */
export function closeInspReveal(ms: MuseumState): MuseumState {
  const items = ms.reveal.filter((r) => r.via === 'insp');
  if (!items.length) return ms;
  return { ...ms, reveal: ms.reveal.filter((r) => r.via !== 'insp'), owned: markSeen(ms.owned, items.map((r) => r.no)) };
}

/** Вкладку «Музей» відкрито: усе переглянуто, крапка гасне (FR-20) */
export function openTab(ms: MuseumState): MuseumState {
  if (!unseen(ms) && !ms.reveal.length) return ms;
  return { ...ms, reveal: [], owned: ms.owned.map((o) => (o.seen ? o : { ...o, seen: true })) };
}

/** Запуск після вбивства посеред розкриття: черга стає тостами, журнали лишаються непереглянутими (AC-18) */
export function interrupted(ms: MuseumState): { ms: MuseumState; nos: number[] } {
  if (!ms.reveal.length) return { ms, nos: [] };
  return { ms: { ...ms, reveal: [] }, nos: ms.reveal.map((r) => r.no) };
}

// --- курйози (FR-21…FR-24) ---

function push(ms: MuseumState, e: Omit<CurioEntry, 'seq'>): MuseumState {
  const seq = ms.curioSeq + 1;
  return { ...ms, curioSeq: seq, curios: [...ms.curios, { ...e, seq }] };
}

const STATUS: Record<string, CurioStatus> = { diligent: 'diligent', formal_reply: 'formal', drawer: 'drawer', special: 'special' };

/** Подія `curio` з телеграм: відповідь на телеграму (будь-який варіант) чи повідомлення без вибору */
export function curioFromTelegram(ms: MuseumState, ev: Extract<DomainEvent, { type: 'curio' }>, tg: TelegramState, atMs: number): MuseumState {
  const item: InboxItem | undefined = tg.inbox.find((x) => x.uid === ev.uid);
  const tel = telegram(ev.telegramId);
  const choice = item?.choiceId ? tel?.choices.find((c) => c.id === item.choiceId) : undefined;
  return push(ms, {
    kind: 'telegram',
    atMs,
    telegramId: ev.telegramId,
    uid: ev.uid,
    choiceId: item?.choiceId,
    status: choice ? (STATUS[choice.kind] ?? 'special') : 'info',
    text: ev.text,
  });
}

/** Програна гонка: запис про подарунок, списаний раніше, ніж поставлений на облік (FR-21) */
export function curioFromRace(ms: MuseumState, ev: Extract<DomainEvent, { type: 'raceCurio' }>): MuseumState {
  return push(ms, {
    kind: 'gift',
    atMs: ev.endMs,
    gift: { raceId: ev.id, raceNo: ev.raceNo, type: ev.giftType, level: ev.level, steps: ev.steps, stepsDone: ev.stepsDone, stepsTotal: ev.stepsTotal, marginSec: ev.marginSec },
  });
}

/** Записи, які видно: телеграму, вилучену оновленням контенту, ховаємо зі списку й підсумку (крайовий випадок spec) */
export function visibleCurios(ms: MuseumState): CurioEntry[] {
  return ms.curios.filter((c) => c.kind === 'gift' || (c.telegramId != null && telegram(c.telegramId) != null));
}

export function curioSummary(ms: MuseumState): { total: number; telegrams: number; gifts: number } {
  const v = visibleCurios(ms);
  return { total: v.length, telegrams: v.filter((c) => c.kind === 'telegram').length, gifts: v.filter((c) => c.kind === 'gift').length };
}
