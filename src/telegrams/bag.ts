// Мішок телеграм (003 FR-5, FR-6, FR-31; рішення 27, 41; 09 FR-36): черга, неотримані з виконаними умовами, далі повтор архівних.
import { endlessPool, poolFor, telegram } from './content';
import type { Telegram, TelegramState } from './types';

const DAY = 86_400_000;

export interface BagCtx {
  nowMs: number;
  level: number;
  digitizations: number;
  /** Конвертацій ланок Р5 (013): умова `requires.conversionsMin`, перші `fading` після № 4 */
  conversions?: number;
  month: number;
  raceActive: string | null;
  repeatMinDays: number;
  /** Поточний Дубль (013 FR-28): умови пулу Дублів `requires.dubMin`/`dubModifier`; немає - Дублів не було */
  dub?: { n: number; modifier: string | null };
}

const SUMMER = [6, 7, 8];
/** Після скількох конвертацій телеграми «згасають» і приходять першими */
export const FADING_FROM = 4;

function conditionsMet(t: Telegram, c: BagCtx): boolean {
  const s = t.schedule ?? {};
  if (s.season === 'summer' && !SUMMER.includes(c.month)) return false;
  const r = s.requires ?? {};
  if (r.digitizationsMin != null && c.digitizations < r.digitizationsMin) return false;
  if (r.raceActive != null && (c.raceActive == null || (typeof r.raceActive === 'string' && r.raceActive !== c.raceActive))) return false;
  if (r.conversionsMin != null && (c.conversions ?? 0) < r.conversionsMin) return false;
  if (r.dubMin != null && (c.dub?.n ?? 0) < r.dubMin) return false;
  if (r.dubModifier != null && c.dub?.modifier !== r.dubModifier) return false;
  return true;
}

function lastReceived(tg: TelegramState, id: string): number | null {
  let t: number | null = null;
  for (const x of tg.inbox) if (x.id === id && (t == null || x.receivedAt > t)) t = x.receivedAt;
  return t;
}

/** Наступна телеграма слоту або null — слот пропускається (FR-31). `rand` — число 0…1 з генератора стану. */
export function pick(tg: TelegramState, c: BagCtx, rand: () => number): { id: string; fromQueue: boolean } | null {
  // queueNext (№ 5): ще не отримані з черги — першими (FR-6)
  for (const id of tg.queue) {
    const t = telegram(id);
    if (t && lastReceived(tg, id) == null) return { id, fromQueue: true };
  }
  const fresh = poolFor(c.level).filter((t) => {
    if (!conditionsMet(t, c)) return false;
    const last = lastReceived(tg, t.id);
    if (last == null) return true;
    const every = t.schedule?.repeatEveryDays;
    // № 13 повторюється, лише коли попередня вже відповіла (не лежить у «Нових» чи шухляді)
    const open = tg.inbox.some((x) => x.id === t.id && x.status !== 'archive');
    return every != null && !open && c.nowMs - last >= every * DAY;
  });
  // Р5 після конвертації № 4: спершу телеграми, що «згасають» (013 FR-14, пропозиція level5.sources.md п. 4)
  const fading = (c.conversions ?? 0) >= FADING_FROM ? fresh.filter((t) => t.schedule?.fading) : [];
  const among = fading.length ? fading : fresh;
  if (among.length) return { id: among[Math.floor(rand() * among.length)]!.id, fromQueue: false };
  // другий прохід: архівна з найдавнішою відповіддю, не частіше ніж раз на repeatMinDays (FR-31)
  // Дубль (013 FR-28, ВП-9): неотримані телеграми пулу Дублів - у спільному мішку з архівними повторами
  const endless = c.dub && c.dub.n >= 1 ? endlessPool().filter((t) => conditionsMet(t, c)) : [];
  const unseen = endless.filter((t) => lastReceived(tg, t.id) == null).map((t) => t.id);
  const pool = new Set([...poolFor(c.level), ...endless].filter((t) => conditionsMet(t, c)).map((t) => t.id));
  let best: { id: string; at: number } | null = null;
  const lastAnswer = new Map<string, number>();
  for (const x of tg.inbox) {
    if (!pool.has(x.id)) continue;
    if (x.status !== 'archive' || x.answeredAt == null) {
      lastAnswer.set(x.id, Infinity); // ще у вхідних — не повторюємо
      continue;
    }
    const prev = lastAnswer.get(x.id);
    if (prev !== Infinity) lastAnswer.set(x.id, Math.max(prev ?? -Infinity, x.answeredAt));
  }
  for (const [id, at] of lastAnswer) {
    if (at === Infinity || c.nowMs - at < c.repeatMinDays * DAY) continue;
    const recv = lastReceived(tg, id) ?? 0;
    if (c.nowMs - recv < c.repeatMinDays * DAY) continue;
    if (!best || at < best.at) best = { id, at };
  }
  const bag = best ? [...unseen, best.id] : unseen;
  return bag.length ? { id: bag[Math.floor(rand() * bag.length)]!, fromQueue: false } : null;
}
