// Телеграма № 1 «Про сержантів» (002 FR-18, FR-19; 03 FR-1): дані з content/telegrams.json, ефект `slow` як Effect 001.
// Репутацію, перевірки (inspPct) і час відписки (durationMin) застосує 03/04: вибір лежить в onboarding.tg1.
import data from '../../../content/telegrams.json';

import { formatMult } from '@/economy/format';
import type { EconomyConfig } from '@/economy/game/types';
import type { StoredEffect } from '@/features/conveyor/store';

import { t } from './texts';

const HOUR = 3_600_000;

export interface TgChoice {
  id: string;
  kind: string;
  title: string;
  effects: { slow?: { target: string; mult: number; hours: number }[]; rep?: number; durationMin?: number; inspPct?: number };
  result?: string;
  note?: string;
}

export interface Telegram {
  id: string;
  no: string;
  stamp: string;
  from: string;
  to: string;
  title: string;
  body: string;
  deadline: [string, string, string][];
  choices: TgChoice[];
}

const all = ((data as { telegrams?: unknown }).telegrams ?? data) as Telegram[];

export const FIRST_TELEGRAM_ID = 'tg_0001_sergeants';
export const firstTelegram: Telegram = all.find((x) => x.id === FIRST_TELEGRAM_ID)!;

function unitName(cfg: EconomyConfig, id: string): string {
  const p = cfg.params;
  return [...p.streams, ...p.stages].find((u) => u.id === id)?.name ?? id;
}

/** Коротко про наслідки варіанта, як на артборді TgDetail. */
export function choiceSummary(c: TgChoice, cfg: EconomyConfig): string {
  const e = c.effects;
  const parts: string[] = [];
  if (e.durationMin) parts.push(t.minutes(e.durationMin));
  for (const s of e.slow ?? []) parts.push(t.slow(shortName(unitName(cfg, s.target)), formatMult(s.mult), s.hours));
  if (e.rep) parts.push(t.rep(e.rep));
  if (e.inspPct) parts.push(t.insp(e.inspPct));
  return parts.length ? parts.join(' · ') : (c.note ?? '');
}

/** «Стройова частина» → «Стройова», як на артбордах. */
function shortName(name: string): string {
  return name.split(' ')[0] ?? name;
}

/** Ефекти, які гра застосовує вже зараз: сповільнення ланки (рішення 13), стінні мітки як у 001. */
export function choiceEffects(c: TgChoice, cfg: EconomyConfig, nowMs: number): StoredEffect[] {
  const p = cfg.params;
  return (c.effects.slow ?? []).map((s) => ({
    kind: 'factor' as const,
    source: 'telegram_slow' as const,
    value: s.mult,
    target: { type: p.stages.some((u) => u.id === s.target) ? ('stage' as const) : ('stream' as const), id: s.target },
    startMs: nowMs,
    endMs: nowMs + s.hours * HOUR,
  }));
}

/** Рядки tg-result: рішення, наслідок, репутація (артборд TgResult). */
export function resultRows(c: TgChoice, cfg: EconomyConfig): [string, string][] {
  const e = c.effects;
  const rows: [string, string][] = [[t.resDecision, t.kind[c.kind] ?? c.kind]];
  for (const s of e.slow ?? []) rows.push([unitName(cfg, s.target), t.slowFor(formatMult(s.mult), s.hours)]);
  if (e.durationMin) rows.push([t.resSpent, t.minutes(e.durationMin)]);
  if (e.rep) rows.push([t.resRep, e.rep > 0 ? `+${e.rep}` : `−${Math.abs(e.rep)}`]);
  return rows;
}
