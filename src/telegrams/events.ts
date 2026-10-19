// «Комбата шукають» (003 FR-28, FR-29) і «Нарада затягнулась» (011 FR-25): ланка ×mult не довше maxMin; чекати або посильний / записка.
// Той самий шаблон: параметри «Наради» - naradaChance, naradaMult, naradaMinMin, naradaMaxMin (рішення 94); посильний і записка коштують однаково.
import { baseIncomePerMin } from '@/economy/game/income';
import type { DomainEvent, EconomyConfig, EconomyState, StoredEffect } from '@/economy/game/types';

import { dayKey } from './clock';
import { roller } from './rng';
import type { TelegramState } from './types';

const MIN = 60_000;
export const KOMBAT_STAGE = 'kombat';
export const MEETING_STAGE = 'narada';

/** Яка з двох подій: «Комбата шукають» чи «Нарада затягнулась» */
export type EventKey = 'kombat' | 'meeting';

const other = (k: EventKey): EventKey => (k === 'kombat' ? 'meeting' : 'kombat');

function params(k: EventKey, cfg: EconomyConfig) {
  const p = cfg.params;
  return k === 'kombat'
    ? { chance: p.kombatChance, mult: p.kombatMult, minMin: p.kombatMinMin, maxMin: p.kombatMaxMin, stage: KOMBAT_STAGE, source: 'kombat_away' as const }
    : { chance: p.naradaChance, mult: p.naradaMult, minMin: p.naradaMinMin, maxMin: p.naradaMaxMin, stage: MEETING_STAGE, source: 'meeting_overrun' as const };
}

/** Ланка події є на рівні гравця: «Нарада» - з Р3 */
export function hasStage(k: EventKey, eco: EconomyState): boolean {
  return k === 'kombat' || eco.level >= 3;
}

export interface KombatStart {
  tg: TelegramState;
  effect: StoredEffect | null;
  events: DomainEvent[];
}

/** Активна подія цього виду на мить `nowMs` */
export function activeAt(tg: TelegramState, k: EventKey, nowMs: number) {
  const a = tg[k].active;
  return a && a.endMs > nowMs ? a : null;
}

/**
 * Почати подію на maxMin хвилин (тривалість - випадкова в minMin…maxMin); чинна подія цього виду продовжується до більшого із залишків.
 * Поки йде інша (комбат ↔ нарада), нова не стартує: дві такі події одночасно не йдуть (011 FR-25, AC-17).
 */
function start(k: EventKey, tg0: TelegramState, cfg: EconomyConfig, nowMs: number, tz: number, maxMin: number): KombatStart {
  const q = params(k, cfg);
  if (activeAt(tg0, other(k), nowMs)) return { tg: tg0, effect: null, events: [] };
  const rng = roller(tg0.rng);
  const lo = Math.min(q.minMin, maxMin);
  const endMs = nowMs + Math.round((lo + rng.next() * (maxMin - lo)) * MIN);
  const cur = tg0[k].active;
  const startMs = cur && cur.endMs > nowMs ? cur.startMs : nowMs;
  const end = cur && cur.endMs > nowMs ? Math.max(cur.endMs, endMs) : endMs;
  const tg: TelegramState = { ...tg0, rng: rng.state, [k]: { lastDayKey: dayKey(nowMs, tz), active: { startMs, endMs: end, runnerAtMs: null } } };
  const effect: StoredEffect = { kind: 'factor', source: q.source, value: q.mult, target: { type: 'stage', id: q.stage }, startMs: nowMs, endMs: end };
  return { tg, effect, events: [k === 'kombat' ? { type: 'kombatStart', endMs: end } : { type: 'meetingStart', endMs: end }] };
}

/** Старт сесії (FR-29): не в першій сесії, ≤ 1 на добу, з імовірністю chance. */
export function onSessionStart(tg0: TelegramState, cfg: EconomyConfig, nowMs: number, tz: number, firstSession: boolean, k: EventKey = 'kombat'): KombatStart {
  const q = params(k, cfg);
  if (firstSession || tg0.startMs == null || tg0[k].lastDayKey === dayKey(nowMs, tz)) return { tg: tg0, effect: null, events: [] };
  const rng = roller(tg0.rng);
  const hit = rng.next() < q.chance;
  const tg = { ...tg0, rng: rng.state };
  return hit ? start(k, tg, cfg, nowMs, tz, q.maxMin) : { tg, effect: null, events: [] };
}

/** «Покласти комбату на стіл» (№ 18): кидок уже випав в ефектах, тут - сама подія до maxMin. */
export function fromTelegram(tg: TelegramState, cfg: EconomyConfig, nowMs: number, tz: number, maxMin: number): KombatStart {
  return start('kombat', tg, cfg, nowMs, tz, Math.min(maxMin, cfg.params.kombatMaxMin));
}

/** Ціна посильного й записки: kombatRunnerCostMin хвилин базового доходу, без тимчасових множників (ВП-9). */
export function runnerCost(eco: EconomyState, cfg: EconomyConfig): number {
  return Math.ceil(cfg.params.kombatRunnerCostMin * baseIncomePerMin(eco, cfg));
}

/** «Відправити посильного» / «Передати записку» (FR-28): за підписи, подія скінчиться за kombatRunnerMin хвилин. Повторний тап нічого не робить. */
export function sendRunner(tg: TelegramState, eco: EconomyState, cfg: EconomyConfig, nowMs: number, k: EventKey = 'kombat'): { tg: TelegramState; eco: EconomyState; endMs: number } | { error: 'none' | 'money' | 'sent' } {
  const a = tg[k].active;
  if (!a || a.endMs <= nowMs) return { error: 'none' };
  if (a.runnerAtMs != null) return { error: 'sent' };
  const cost = runnerCost(eco, cfg);
  if (eco.signatures < cost) return { error: 'money' };
  const endMs = Math.min(a.endMs, nowMs + cfg.params.kombatRunnerMin * MIN);
  return { tg: { ...tg, [k]: { ...tg[k], active: { ...a, endMs, runnerAtMs: nowMs } } }, eco: { ...eco, signatures: eco.signatures - cost }, endMs };
}
