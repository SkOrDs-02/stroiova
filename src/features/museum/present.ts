// Як показати музей і курйози (007): слоти, підстановки, групи за днями, рядки записів.
import { gendered } from '@/features/onboarding/callsign';
import type { OnboardingState } from '@/features/onboarding/steps';
import { stackT } from '@/features/stack/texts';
import { fill } from '@/features/telegrams/present';
import { t as tgT } from '@/features/telegrams/texts';
import { raceT } from '@/features/race/texts';
import type { Journal } from '@/museum/journals';
import { bonusText, journal, museumJournals, museumSeries, MUSEUM_SIZE, seriesBonusText } from '@/museum/journals';
import { has, visibleCurios } from '@/museum/museum';
import type { CurioEntry, MuseumState, OwnedJournal } from '@/museum/types';
import { color } from '@/theme';
import { packDef, telegram } from '@/telegrams/content';
import type { InboxItem, TelegramState } from '@/telegrams/types';

import { muT } from './texts';

export type Filter = 'all' | 'property' | 'personnel';

/** Кольори рідкостей і обкладинок (токени `rarity*` у темі - аліаси, тут їх розкрито) */
export const RARITY_COLOR = { common: color.muted, rare: color.rarityRare, legendary: color.accent } as const;
export const COVER_COLOR = { olive: color.coverOlive, navy: color.coverNavy, brown: color.coverBrown, earth: color.coverEarth, black: color.coverBlack } as const;

export const p2 = (n: number) => String(n).padStart(2, '0');
export function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
export function ddmmyyyy(ms: number): string {
  const d = new Date(ms);
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
}
const dayKey = (ms: number) => {
  const d = new Date(ms);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

export interface Slot {
  no: number;
  journal: Journal;
  owned: OwnedJournal | null;
}

/** 24 слоти в порядку № 1-24; фільтр показує лише знайдені журнали категорії (07 FR-14) */
export function slots(ms: MuseumState, filter: Filter): Slot[] {
  return museumJournals()
    .map((j) => ({ no: j.no, journal: j, owned: ms.owned.find((o) => o.no === j.no) ?? null }))
    .filter((s) => filter === 'all' || (s.owned != null && s.journal.category === filter));
}

/** Флейвор з позивним і формами «він / вона» (№ 5) */
export function flavorOf(j: Journal, o: OnboardingState): string {
  if (j.flavor.includes('{позивний}') && !o.callsign?.text) return muT.flavorNoCallsign;
  return gendered(j.flavor.replace(/\{позивний\}/g, o.callsign?.text ?? ''), o.gender);
}

/** Підказка незнайденого журналу: № 7 до першої цифровізації - окрема (hint.insp_pre) */
export function hintOf(j: Journal, digitizations: number): string {
  return j.hintPre && digitizations < 1 ? j.hintPre : j.hint;
}

export function titleOf(no: number): string {
  return journal(no)?.title ?? `№ ${no}`;
}

export interface CurioRow {
  entry: CurioEntry;
  num: string;
  status: string;
  title: string;
  meta: string;
}

function tgRow(e: CurioEntry, inbox: InboxItem[], g: OnboardingState['gender']): CurioRow | null {
  const tel = e.telegramId ? telegram(e.telegramId) : undefined;
  if (!tel) return null;
  const item = inbox.find((x) => x.uid === e.uid);
  const choice = e.choiceId ? tel.choices.find((c) => c.id === e.choiceId) : undefined;
  const text = e.text ?? choice?.result ?? (e.status === 'info' ? tel.body : choice?.title ?? '');
  const fillIt = (x: string) => (item ? fill(x, item, g) : gendered(x, g));
  return {
    entry: e,
    num: muT.tgNum(tel.no ?? '', hhmm(e.atMs)),
    status: muT.status[e.status ?? 'info'],
    title: fillIt(tel.title),
    meta: fillIt(text),
  };
}

function packRow(e: CurioEntry): CurioRow | null {
  const pk = e.pack;
  const def = pk ? packDef(pk.packId) : undefined;
  if (!pk || !def) return null;
  const sum = def.summary[pk.kind];
  return { entry: e, num: muT.packNum(pk.no, hhmm(e.atMs)), status: muT.status[e.status ?? 'info'], title: tgT.pkResultTitle(pk.no), meta: sum?.result ?? sum?.note ?? sum?.reply ?? '' };
}

function stackRow(e: CurioEntry): CurioRow {
  return { entry: e, num: muT.stackNum(hhmm(e.atMs)), status: muT.status.info, title: muT.stackTitle, meta: stackT.share(e.stack?.cm ?? 0) };
}

function giftRow(e: CurioEntry): CurioRow {
  const gft = e.gift!;
  return { entry: e, num: muT.actNum(gft.raceNo, hhmm(e.atMs)), status: muT.status.gift, title: raceT.lostTitle, meta: raceT.item[gft.type] };
}

export interface CurioGroup {
  day: string;
  items: CurioRow[];
}

/** Нові зверху за наскрізним номером; групи за днями (FR-22); «Сьогодні» й «Учора» - від поточного годинника */
export function curioGroups(ms: MuseumState, tg: TelegramState, gender: OnboardingState['gender'], nowMs: number): CurioGroup[] {
  const today = dayKey(nowMs);
  const yesterday = dayKey(nowMs - 86_400_000);
  const rows = visibleCurios(ms)
    .slice()
    .sort((a, b) => b.seq - a.seq)
    .map((e) => (e.kind === 'gift' ? giftRow(e) : e.kind === 'pack' ? packRow(e) : e.kind === 'stack' ? stackRow(e) : tgRow(e, tg.inbox, gender)))
    .filter((r): r is CurioRow => r != null);
  const groups: CurioGroup[] = [];
  for (const r of rows) {
    const k = dayKey(r.entry.atMs);
    const label = k === today ? `${muT.today} · ${ddmmyyyy(r.entry.atMs)}` : k === yesterday ? `${muT.yesterday} · ${ddmmyyyy(r.entry.atMs)}` : ddmmyyyy(r.entry.atMs);
    const last = groups.at(-1);
    if (last && last.day === label) last.items.push(r);
    else groups.push({ day: label, items: [r] });
  }
  return groups;
}

/** Рядок «Музей журналів» шторки множників (FR-12): «N з 8» і позначка «окремо»; у «Разом» не входить */
export function multRow(ms: MuseumState, params: object): { count: string; note: string; targets: string[] } {
  const n = ms.owned.filter((o) => o.no <= MUSEUM_SIZE).length;
  return { count: muT.countText(n), note: muT.multNote, targets: museumJournals().filter((j) => has(ms, j.no)).map((j) => bonusText(j, params)) };
}

export interface Section {
  seriesId: string;
  no: number;
  title: string;
  slots: Slot[];
  owned: number;
  total: number;
  /** Серія зібрана: усі її журнали в музеї */
  done: boolean;
  /** Рівень серії гравець ще не відвідав: слоти замкнені (016 FR-15) */
  locked: boolean;
  /** Ім'я рівня для «Відкриється на рівні «…»» */
  levelName: string;
  bonus: string;
}

/** Секції серій для фільтра «Усі» (016 FR-15, FR-16): заголовок «Назва · N з M», замкнені серії наступних рівнів */
export function sections(ms: MuseumState, level: number, levelNames: readonly string[], params: object): Section[] {
  return museumSeries().map((se) => {
    const sl = se.journals.map((n) => ({ no: n, journal: journal(n)!, owned: ms.owned.find((o) => o.no === n) ?? null })).filter((x) => x.journal != null);
    const owned = sl.filter((x) => x.owned != null).length;
    return {
      seriesId: se.id,
      no: se.no,
      title: se.title,
      slots: sl,
      owned,
      total: sl.length,
      done: owned === sl.length,
      locked: se.no > level,
      levelName: levelNames[se.no - 1] ?? '',
      bonus: seriesBonusText(se, params),
    };
  });
}

/** Перший рівень, на якому існує ціль бонусу журналу (потік чи ланка), або 1, якщо ціль є з початку (016 FR-11) */
export function bonusLevel(j: Journal, params: { streams: { id: string }[]; stages: { id: string }[]; levels: { stream?: { id: string } | null; stage?: { id: string } | null; convert?: number }[] }): number {
  const t = j.bonus.target as unknown[];
  if (j.bonus.kind === 'unit_rate' || j.bonus.kind === 'race_step_time') {
    if (t[0] === 'digital_stages') return Math.max(1, params.levels.findIndex((l) => l.convert === 1) + 1);
    const id = t[0] as string;
    if (params.streams.some((u) => u.id === id) || params.stages.some((u) => u.id === id)) return 1;
    const i = params.levels.findIndex((l) => l.stream?.id === id || l.stage?.id === id);
    return i < 0 ? 1 : i + 1;
  }
  if (j.bonus.kind === 'convert_cost') return Math.max(1, params.levels.findIndex((l) => l.convert === 1) + 1);
  return 1;
}
