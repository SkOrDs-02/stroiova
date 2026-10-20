// Музей й журнал курйозів (007): отримання журналів, бонуси для економіки, записи курйозів.
import type { DomainEvent, EconomyConfig, EconomyState } from '@/economy/game/types';
import type { Journals } from '@/race/race';
import { packDef, telegram } from '@/telegrams/content';
import type { InboxItem, TelegramState } from '@/telegrams/types';

import { CLASSIC_SIZE, journal, journalNo, museumSeries, MUSEUM_SIZE, seriesOf, type Series } from './journals';
import type { CurioEntry, CurioStatus, JournalSource, MuseumState, RevealItem } from './types';

export function newMuseum(): MuseumState {
  return { owned: [], reveal: [], curios: [], curioSeq: 0, curiosSeen: 0 };
}

export function has(ms: MuseumState, no: number): boolean {
  return ms.owned.some((o) => o.no === no);
}

/** «N з 24» (016 FR-2): усі журнали музею */
export function count(ms: MuseumState): number {
  return ms.owned.filter((o) => o.no <= MUSEUM_SIZE).length;
}

/** Журнали першої серії для лічильника «N з 8» (07) */
export function classicCount(ms: MuseumState): number {
  return ms.owned.filter((o) => o.no <= CLASSIC_SIZE).length;
}

/** Непереглянуті журнали: на вкладці «Музей» горить крапка (FR-20) */
export function unseen(ms: MuseumState): number {
  return ms.owned.filter((o) => !o.seen).length;
}

/** Серію зібрано: у музеї є № 8 (07 FR-16) */
export function seriesDone(ms: MuseumState): boolean {
  return has(ms, 8);
}

/** Зібрані серії 2-5 (016 FR-12): усі їхні журнали в музеї; серія 1 не рахується */
export function seriesCollected(ms: MuseumState): number {
  return museumSeries().filter((s) => s.no >= 2 && s.journals.every((n) => has(ms, n))).length;
}

/** Серія, яку цей журнал щойно зібрав (останній за часом серед її журналів); серія 1 - № 8 (016 FR-16) */
export function completesSeries(ms: MuseumState, no: number): Series | null {
  const se = seriesOf(no);
  if (!se || !se.journals.every((n) => has(ms, n))) return null;
  const last = se.journals.map((n) => ms.owned.find((o) => o.no === n)!).reduce((a, b) => (b.atMs > a.atMs || (b.atMs === a.atMs && b.no > a.no) ? b : a));
  return last.no === no ? se : null;
}

/** Музей укомплектовано: усі 24 (016 FR-16) */
export function complete(ms: MuseumState): boolean {
  return count(ms) >= MUSEUM_SIZE;
}

/**
 * Множники економіки з журналів (07 FR-11, 016 FR-9…FR-12): % з конфігу. № 8 подвоює № 1-7, № 24 множить на `museumLegendaryMult`
 * бонуси № 9-23; серії 2-5 дають окремий множник M. Без журналів - нейтральні.
 */
export function bonuses(ms: MuseumState, cfg: EconomyConfig): EconomyState['museum'] {
  const p = cfg.params;
  const m24 = p.museum >= 2;
  const k = has(ms, 8) ? 2 : 1;
  const k24 = m24 && has(ms, 24) ? p.museumLegendaryMult : 1;
  const u = p.museumUnitPct / 100;
  const x: Record<string, number> = {};
  const add = (id: string, v: number) => {
    x[id] = (x[id] ?? 0) + v;
  };
  if (has(ms, 1)) add('stroy', u * k);
  if (has(ms, 4)) add('nakladni', u * k);
  if (has(ms, 5)) add('raporty', u * k);
  if (m24) {
    const pairs: [number, string][] = [[9, 'nakazy'], [10, 'kazna'], [13, 'akty'], [15, 'zvedennia'], [17, 'dovidky'], [18, 'dopovid'], [19, 'zpz'], [22, 'fin']];
    for (const [no, id] of pairs) if (has(ms, no)) add(id, u * k24);
    if (has(ms, 16)) add('narada', (p.museumUnitRarePct / 100) * k24);
  }
  const unit: Record<string, number> = {};
  for (const [id, v] of Object.entries(x)) unit[id] = 1 + v;
  const out: EconomyState['museum'] = {
    unit,
    storage: has(ms, 2) ? 1 + (p.museumStoragePct / 100) * k : 1,
    paper: has(ms, 3) ? 1 + (p.museumPaperPct / 100) * k : 1,
  };
  if (m24) {
    const S = seriesCollected(ms);
    if (S > 0) out.series = 1 + (S * p.museumSeriesPct) / 100;
    if (has(ms, 21)) out.digital = u * k24;
    if (has(ms, 11)) out.slowCut = 1 - (p.museumSlowCutPct / 100) * k24;
    if (has(ms, 12)) out.checklist = 1 - (p.museumChecklistCutPct / 100) * k24;
    if (has(ms, 14)) out.kazna = 1 - (p.museumRacePct / 100) * k24;
    if (has(ms, 20)) out.service = 1 + (p.museumGiftServicePct / 100) * k24;
    if (has(ms, 23)) out.convert = 1 - (p.museumConvertCutPct / 100) * k24;
  }
  return out;
}

/** Журнали, що скорочують кроки акта в гонці (005 FR-17); № 14 і № 20 - 016 (разом із № 24 множником) */
export function raceJournals(ms: MuseumState, cfg?: EconomyConfig): Journals {
  const b = cfg ? bonuses(ms, cfg) : null;
  return { j6: has(ms, 6), j7: has(ms, 7), j8: has(ms, 8), ...(b?.kazna != null ? { kazna: b.kazna } : {}), ...(b?.service != null ? { service: b.service } : {}) };
}

export interface GrantResult {
  ms: MuseumState;
  eco: EconomyState;
  events: DomainEvent[];
}

/**
 * Додати журнали (FR-3): повторне джерело нічого не змінює. № 8 з'являється в ту саму мить, коли в музеї стає сім інших (FR-9),
 * і йде в те саме розкриття. Журнали № 9-24 видаються лише в економіці з музеєм на 24 (`museum` >= 2, 016 FR-4).
 */
export function grant(ms: MuseumState, eco: EconomyState, cfg: EconomyConfig, nos: readonly number[], atMs: number, source: JournalSource, via: RevealItem['via'] = 'other'): GrantResult {
  if (!cfg.params.museum) return { ms, eco, events: [] };
  const m24 = cfg.params.museum >= 2;
  const fresh = nos.filter((n, i) => journal(n) && (n <= CLASSIC_SIZE || m24) && !has(ms, n) && nos.indexOf(n) === i);
  if (!fresh.length) return { ms, eco, events: [] };
  const owned = [...ms.owned];
  const add = (no: number) => owned.push({ no, atMs, source, seen: false });
  const shown: number[] = [];
  for (const n of fresh) {
    add(n);
    shown.push(n);
  }
  const others = [1, 2, 3, 4, 5, 6, 7].filter((n) => owned.some((o) => o.no === n)).length;
  if (others === 7 && !owned.some((o) => o.no === 8)) {
    add(8);
    shown.push(8);
  }
  const base = ms.owned.filter((o) => o.no <= MUSEUM_SIZE).length;
  const reveal: RevealItem[] = shown.map((no, i) => ({ no, k: i + 1, m: shown.length, nAfter: base + i + 1, via }));
  const next: MuseumState = { ...ms, owned, reveal: [...ms.reveal, ...reveal] };
  const seriesAfter = seriesCollected(next);
  const events: DomainEvent[] = shown.map((no, i) => {
    const j = journal(no)!;
    const se = seriesOf(no);
    // серія зібрана саме цим журналом: усі її журнали в музеї, а цей - останній за часом у групі
    const done = se != null && se.journals.every((n) => owned.some((o) => o.no === n)) && !se.journals.every((n) => ms.owned.some((o) => o.no === n)) && se.journals.filter((n) => !ms.owned.some((o) => o.no === n)).at(-1) === no;
    return { type: 'museumJournalUnlock', no, journalId: j.id, rarity: j.rarity, source, ownedAfter: base + i + 1, isSeriesComplete: done, seriesId: se?.id ?? '', seriesCompleteCount: (se?.no === 1 ? (has(next, 8) ? 1 : 0) : 0) + seriesAfter };
  });
  return { ms: next, eco: { ...eco, museum: bonuses(next, cfg) }, events };
}

const FINAL_JOURNAL: Record<number, number> = { 2: 12, 3: 16, 4: 20 };
const CONVERT_JOURNAL: Record<number, number> = { 2: 21, 4: 22, 5: 23 };

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
    // 016 FR-5: підсумкова Р2 -> № 12, Р3 -> № 16, «Аудит усього» Р4 -> № 20; конвертації № 2, 4, 5 -> № 21, 22, 23
    else if (e.type === 'finalPassed') {
      const no = FINAL_JOURNAL[e.level];
      if (no != null) r = grant(cur.ms, cur.eco, cfg, [no], ctx.inspAtMs ?? atMs, 'inspection', ctx.offline ? 'other' : 'insp');
    } else if (e.type === 'stageConvert') {
      const no = CONVERT_JOURNAL[e.convertIndex];
      if (no != null) r = grant(cur.ms, cur.eco, cfg, [no], atMs, 'conversion');
    }
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

/** Зведена відповідь пачки: один запис на пачку, а не три (011 FR-24, 07 FR-21) */
export function curioFromPack(ms: MuseumState, ev: Extract<DomainEvent, { type: 'packCurio' }>, atMs: number): MuseumState {
  return push(ms, { kind: 'pack', atMs, pack: { packId: ev.packId, no: ev.no, kind: ev.kind, uids: ev.uids }, status: ev.kind === 'formal_reply' ? 'formal' : ev.kind });
}

/** «Метр звітів» (012 FR-15): один запис на цикл цифровізації */
export function curioFromStack(ms: MuseumState, ev: Extract<DomainEvent, { type: 'stackReach' }>, atMs: number): MuseumState {
  return push(ms, { kind: 'stack', atMs, stack: { cm: ev.cm }, status: 'info' });
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
  return ms.curios.filter((c) => c.kind === 'gift' || c.kind === 'stack' || (c.kind === 'pack' && c.pack != null && packDef(c.pack.packId) != null) || (c.telegramId != null && telegram(c.telegramId) != null));
}

export function curioSummary(ms: MuseumState): { total: number; telegrams: number; gifts: number; packs: number; stacks: number } {
  const v = visibleCurios(ms);
  return { total: v.length, telegrams: v.filter((c) => c.kind === 'telegram').length, gifts: v.filter((c) => c.kind === 'gift').length, packs: v.filter((c) => c.kind === 'pack').length, stacks: v.filter((c) => c.kind === 'stack').length };
}

/** Список курйозів відкрито: усе побачено, бейдж «нове» гасне (010 FR-30) */
export function markCuriosSeen(ms: MuseumState): MuseumState {
  return ms.curiosSeen === ms.curioSeq ? ms : { ...ms, curiosSeen: ms.curioSeq };
}

/** Є запис, якого гравець ще не бачив у списку (і він видимий) */
export function hasNewCurio(ms: MuseumState): boolean {
  return visibleCurios(ms).some((c) => c.seq > ms.curiosSeen);
}
