// Фінал у сторі (013 FR-15…FR-22): конвертація № 6 запускає кроки, кроки доставляють сценарні телеграми № 108-111, видають журнал № 24
// і дають тригери сюжету (014 `finale_step`). Чисті функції над знімком стору; повертають патч чи null.
import { makeOffer, type DubState } from '@/dub/dub';
import { complete, current, declineScript, secSinceStart, start, STEPS, type FinaleState, type FinaleStep } from '@/finale/finale';
import type { DomainEvent, EconomyConfig, EconomyState } from '@/economy/game/types';
import { grant } from '@/museum/museum';
import type { MuseumState } from '@/museum/types';
import { deliverScripted } from '@/telegrams/schedule';
import type { TelegramState } from '@/telegrams/types';
import type { StoryState } from '@/story/types';

/** Сценарні телеграми кроків (content/tg/level5.json, `schedule.trigger`) */
const AT_START: Partial<Record<FinaleStep, string>> = { order: 'tg_0108_shutdown_order', script: 'tg_0109_shutdown_yn', endless_offer: 'tg_0112_duplicate_on_paper' };
const AT_COMPLETE: Partial<Record<FinaleStep, string>> = { script: 'tg_0110_mailing_stopped', last_book: 'tg_0111_last_book_delivered' };
/** Крок `call` закривається, коли доставлено (чи пропущено) фінальну розмову Археолога (014) */
export const FINALE_CALL_BEAT = 'st_archaeologist_05';
/** Журнал, що завершує серію «Земля» (016 FR-8) */
export const LAST_BOOK_JOURNAL = 24;

export interface FinaleHost {
  finale: FinaleState;
  /** Дублі (013 FR-23): кінець тижня тиші дає пропозицію Дубля 1 */
  dub: DubState;
  /** Крок, на якому гру було знайдено при запуску: його завершення - `is_resumed` */
  finaleBoot: FinaleStep | null;
  state: EconomyState;
  cfg: EconomyConfig;
  telegrams: TelegramState;
  museum: MuseumState;
  story: StoryState;
  events: DomainEvent[];
  lastMs: number;
}

export type FinalePatch = Partial<Pick<FinaleHost, 'finale' | 'dub' | 'telegrams' | 'museum' | 'state' | 'events'>>;

/** Запустити крок: сценарна телеграма «на старті» і тригер сюжету */
function begin(step: FinaleStep, now: number, acc: { tg: TelegramState; evs: DomainEvent[] }): void {
  const id = AT_START[step];
  if (id) {
    const r = deliverScripted(acc.tg, id, now);
    acc.tg = r.tg;
    acc.evs.push(...r.events);
  }
  acc.evs.push({ type: 'finaleStepStart', step });
}

/**
 * Завершити крок (FR-15). Телеграма «після кроку», подія для аналітики й сюжету, старт наступного кроку.
 * Повертає null, якщо крок не поточний.
 */
export function completeStep(g: FinaleHost, step: FinaleStep, now = g.lastMs): FinalePatch | null {
  const r = complete(g.finale, step, now);
  if (!r.changed) return null;
  const acc = { tg: g.telegrams, evs: [] as DomainEvent[] };
  acc.evs.push({ type: 'finaleStepComplete', step, stepIndex: STEPS.indexOf(step) + 1, secSinceFinaleStart: secSinceStart(g.finale, now), isResumed: g.finaleBoot === step, declinedCount: step === 'script' ? g.finale.scriptNs : 0 });
  const after = AT_COMPLETE[step];
  if (after) {
    const d = deliverScripted(acc.tg, after, now);
    acc.tg = d.tg;
    acc.evs.push(...d.events);
  }
  // наступний крок, що чекає дії чи розмови, стартує одразу; `quiet` - за часом (тиша від Y); `endless_offer` - № 112 і пропозиція Дубля 1 (FR-23)
  const next = STEPS[STEPS.indexOf(step) + 1];
  if (next && next !== 'quiet') begin(next, now, acc);
  const offer = next === 'endless_offer' ? { dub: makeOffer(g.dub, now) } : {};
  return { finale: r.f, ...offer, telegrams: acc.tg, events: [...g.events, ...acc.evs].slice(-40) };
}

/** Старт фіналу: конвертація № 6 (FR-15). Спрацьовує й заднім числом для гравця, що вже має 6 цифрових ланок */
export function startIfDue(g: FinaleHost): FinalePatch | null {
  if (g.finale.startMs != null || g.state.digital.length < g.cfg.params.convert.order.length) return null;
  const f = start(g.finale, g.lastMs);
  const acc = { tg: g.telegrams, evs: [] as DomainEvent[] };
  begin('order', g.lastMs, acc);
  return { finale: f, telegrams: acc.tg, events: [...g.events, ...acc.evs].slice(-40) };
}

/** N на Y/N (FR-18): лічильник відмов, крок лишається незавершеним */
export function decline(g: FinaleHost): FinalePatch | null {
  const f = declineScript(g.finale);
  return f === g.finale ? null : { finale: f };
}

/** Крок `call` і `quiet` закриваються самі: розмову доставлено, тиша сплила (FR-21, FR-22) */
export function autoSteps(g: FinaleHost): FinalePatch | null {
  const f = g.finale;
  if (f.startMs == null) return null;
  if (f.done.last_book != null && f.done.call == null && (g.story.delivered[FINALE_CALL_BEAT] || g.story.skipped.includes(FINALE_CALL_BEAT))) return completeStep(g, 'call');
  if (current(f, g.cfg.params.finaleQuietDays, g.lastMs) === 'quiet') return completeStep(g, 'quiet');
  // запис, що застав тишу вже закритою без пропозиції (вбивство між кроками): пропозиція й № 112 відновлюються
  if (f.done.quiet != null && f.done.endless_offer == null && g.dub.n === 0 && !g.dub.offer) {
    const d = deliverScripted(g.telegrams, AT_START.endless_offer!, g.lastMs);
    return { dub: makeOffer(g.dub, g.lastMs), telegrams: d.tg, events: [...g.events, ...d.events].slice(-40) };
  }
  return null;
}

/** Екран `last-book` відкрито: журнал № 24 віддається (FR-20), церемонія йде через `journal-new` у стані «легендарний» */
export function openLastBook(g: FinaleHost): FinalePatch | null {
  if (g.finale.done.script == null || g.finale.done.last_book != null) return null;
  const r = grant(g.museum, g.state, g.cfg, [LAST_BOOK_JOURNAL], g.lastMs, 'finale');
  if (r.ms === g.museum) return null;
  return { museum: r.ms, state: r.eco, events: [...g.events, ...r.events].slice(-40) };
}

