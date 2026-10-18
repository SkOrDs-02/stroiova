// «Комбата шукають» (003 FR-28, FR-29): «Резолюції комбата» ×kombatMult не довше kombatMaxMin; чекати або посильний.
import { baseIncomePerMin } from '@/economy/game/income';
import type { DomainEvent, EconomyConfig, EconomyState, StoredEffect } from '@/economy/game/types';

import { dayKey } from './clock';
import { roller } from './rng';
import type { TelegramState } from './types';

const MIN = 60_000;
export const KOMBAT_STAGE = 'kombat';

export interface KombatStart {
  tg: TelegramState;
  effect: StoredEffect | null;
  events: DomainEvent[];
}

/** Почати подію на maxMin хвилин (тривалість — випадкова в kombatMinMin…maxMin); чинна подія продовжується до більшого із залишків. */
function start(tg0: TelegramState, cfg: EconomyConfig, nowMs: number, tz: number, maxMin: number): KombatStart {
  const p = cfg.params;
  const rng = roller(tg0.rng);
  const lo = Math.min(p.kombatMinMin, maxMin);
  const endMs = nowMs + Math.round((lo + rng.next() * (maxMin - lo)) * MIN);
  const cur = tg0.kombat.active;
  const startMs = cur && cur.endMs > nowMs ? cur.startMs : nowMs;
  const end = cur && cur.endMs > nowMs ? Math.max(cur.endMs, endMs) : endMs;
  const tg: TelegramState = { ...tg0, rng: rng.state, kombat: { lastDayKey: dayKey(nowMs, tz), active: { startMs, endMs: end, runnerAtMs: null } } };
  const effect: StoredEffect = { kind: 'factor', source: 'kombat_away', value: p.kombatMult, target: { type: 'stage', id: KOMBAT_STAGE }, startMs: nowMs, endMs: end };
  return { tg, effect, events: [{ type: 'kombatStart', endMs: end }] };
}

/** Старт сесії (FR-29): не в першій сесії, ≤ 1 на добу, з імовірністю kombatChance. */
export function onSessionStart(tg0: TelegramState, cfg: EconomyConfig, nowMs: number, tz: number, firstSession: boolean): KombatStart {
  const p = cfg.params;
  if (firstSession || tg0.startMs == null || tg0.kombat.lastDayKey === dayKey(nowMs, tz)) return { tg: tg0, effect: null, events: [] };
  const rng = roller(tg0.rng);
  const hit = rng.next() < p.kombatChance;
  const tg = { ...tg0, rng: rng.state };
  return hit ? start(tg, cfg, nowMs, tz, p.kombatMaxMin) : { tg, effect: null, events: [] };
}

/** «Покласти комбату на стіл» (№ 18): кидок уже випав в ефектах, тут — сама подія до maxMin. */
export function fromTelegram(tg: TelegramState, cfg: EconomyConfig, nowMs: number, tz: number, maxMin: number): KombatStart {
  return start(tg, cfg, nowMs, tz, Math.min(maxMin, cfg.params.kombatMaxMin));
}

/** Ціна посильного: kombatRunnerCostMin хвилин базового доходу, без тимчасових множників (ВП-9). */
export function runnerCost(eco: EconomyState, cfg: EconomyConfig): number {
  return Math.ceil(cfg.params.kombatRunnerCostMin * baseIncomePerMin(eco, cfg));
}

/** «Відправити посильного» (FR-28): за підписи, комбата знайдуть за kombatRunnerMin хвилин. Повторний тап нічого не робить. */
export function sendRunner(tg: TelegramState, eco: EconomyState, cfg: EconomyConfig, nowMs: number): { tg: TelegramState; eco: EconomyState; endMs: number } | { error: 'none' | 'money' | 'sent' } {
  const a = tg.kombat.active;
  if (!a || a.endMs <= nowMs) return { error: 'none' };
  if (a.runnerAtMs != null) return { error: 'sent' };
  const cost = runnerCost(eco, cfg);
  if (eco.signatures < cost) return { error: 'money' };
  const endMs = Math.min(a.endMs, nowMs + cfg.params.kombatRunnerMin * MIN);
  return { tg: { ...tg, kombat: { ...tg.kombat, active: { ...a, endMs, runnerAtMs: nowMs } } }, eco: { ...eco, signatures: eco.signatures - cost }, endMs };
}
