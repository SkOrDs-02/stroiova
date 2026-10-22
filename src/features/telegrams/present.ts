// Як показати телеграму (003 FR-12, FR-19): рядок наслідків варіанта, рядки результату, підстановки.
import { formatDuration, formatMult } from '@/economy/format';
import type { EconomyConfig, EconomyState } from '@/economy/game/types';
import { gendered } from '@/features/onboarding/callsign';
import type { Gender } from '@/features/onboarding/steps';
import { cvT } from '@/features/convert/texts';
import { canChoose, copiesK, cutHours, paperCost, scaledRep } from '@/telegrams/effects';
import { BRIEF_ID } from '@/telegrams/events';
import { replyChance } from '@/telegrams/reputation';
import type { Choice, InboxItem, Telegram, TelegramState } from '@/telegrams/types';

import { lineAt, poolSize } from './lines';
import { hoursText, t } from './texts';

const HOUR = 3_600_000;

export function unitName(cfg: EconomyConfig, id: string): string {
  const p = cfg.params;
  const lv = p.levels.map((l) => [l.stream, l.stage]).flat();
  return [...p.streams, ...p.stages, ...lv].find((u) => u && (u as { id: string }).id === id)?.name ?? id;
}

/** «Стройова частина» → «Стройова», як на артбордах. */
export const short = (name: string) => name.split(' ')[0] ?? name;

/** Підстановки: {n}, {n1} override і форма «він / вона». */
export function fill(text: string, item: InboxItem, gender: Gender | null): string {
  const v = item.vars;
  const s = v ? text.replace(/\{n1\}/g, String(v.n1)).replace(/\{n\}/g, String(v.n)) : text;
  return gendered(s, gender);
}

export interface ChoiceView {
  choice: Choice;
  summary: string;
  disabled: string | null;
}

/** Варіант із рядком ефекту ≤ 60 знаків (FR-12) і причиною неактивності (FR-18, FR-25). */
export function choiceView(c: Choice, tg: TelegramState, eco: EconomyState, cfg: EconomyConfig, fromDrawer: boolean): ChoiceView {
  const e = c.effects;
  const parts: string[] = [];
  if (e.durationMin) parts.push(t.minutes(e.durationMin));
  const k = copiesK(cfg);
  const paper = paperCost(e, tg.flags, k);
  if (paper) parts.push(t.sheets(paper));
  for (const s of e.slow ?? []) {
    // 013 FR-9: на цифровій ланці сповільнення немає
    if (eco.digital.includes(s.target)) parts.push(cvT.immuneNote);
    else parts.push(t.slow(short(unitName(cfg, s.target)), formatMult(s.mult), cutHours(s.hours, eco)));
  }
  const shield = !!e.digitalShield && eco.prestigePoints >= 1;
  if (shield) parts.push(t.shield);
  else {
    if (e.rep) parts.push(t.rep(scaledRep(e.rep, k)));
    // шанс показуємо лише коли він є (FR-15: до першої планової — без рядка)
    if (e.inspPct) {
      const pr = replyChance(tg, cfg.params, e.inspPct, !!e.digitalShield, eco.prestigePoints);
      if (pr > 0) parts.push(t.insp(Math.round(pr * 100)));
    }
  }
  const summary = parts.length ? parts.join(' · ') : (c.note ?? '');
  const av = canChoose(tg, eco, c, fromDrawer, k);
  const disabled = av.ok ? null : av.reason === 'paper' ? t.noPaper(av.n) : (c.disabledReason ?? t.ovDisabled);
  return { choice: c, summary, disabled };
}

/** Рядки tg-result (FR-19, AC-14): рішення, ефекти, репутація з рівнем, шанс. */
export function resultRows(item: InboxItem, tel: Telegram, cfg: EconomyConfig, tierWord: string): [string, string][] {
  const c = tel.choices.find((x) => x.id === item.choiceId);
  const r = item.result;
  if (!c || !r) return [];
  const rows: [string, string][] = [[t.resDecision, t.kind[c.kind] ?? c.title]];
  for (const s of r.slow) rows.push([unitName(cfg, s.target), `${formatMult(s.mult)} на ${hoursText(s.hours)} год`]);
  for (const id of r.immune ?? []) rows.push([unitName(cfg, id), cvT.immuneNote]);
  if (c.effects.durationMin) rows.push([t.resSpent, t.minutes(c.effects.durationMin)]);
  if (r.paper) rows.push([t.resPaper, t.sheets(r.paper)]);
  if (r.rep || c.kind !== 'drawer') rows.push([t.resRep, `${r.rep > 0 ? '+' : r.rep < 0 ? '−' : ''}${Math.abs(r.rep)} · ${tierWord}`]);
  if (r.chancePct > 0) rows.push([t.resChance, `${r.chancePct}%`]);
  return rows;
}

export function inspWarn(cfg: EconomyConfig): string {
  return formatDuration(cfg.params.unscheduledWarnH * HOUR / 1000);
}

/** Рядок прогнозу: «−3 аркуші · +5 до репутації · 20% шанс перевірки» */
export function forecastLine(paper: number, rep: number, chancePct: number): string {
  const parts: string[] = [];
  if (paper) parts.push(t.sheets(paper));
  if (rep) parts.push(t.rep(rep));
  if (chancePct > 0) parts.push(t.insp(chancePct));
  return parts.length ? parts.join(' · ') : t.pkNothing;
}

/** Рядок суми окремих відповідей: кидок на кожну телеграму окремо */
export function separateLine(sep: { paper: number; rep: number; chances: number[] }): string {
  const parts: string[] = [];
  if (sep.paper) parts.push(t.sheets(sep.paper));
  if (sep.rep) parts.push(t.rep(sep.rep));
  const ch = sep.chances.filter((c) => c > 0);
  if (ch.length) parts.push(t.pkChances(ch.map((c) => `${c}%`).join(', ')));
  return parts.length ? parts.join(' · ') : t.pkNothing;
}

/** Рядки tg-result зведеної відповіді: числа лежать на першій телеграмі пачки (`answerPack`) */
export function packResultRows(first: InboxItem, kind: string, cfg: EconomyConfig, tierWord: string): [string, string][] {
  const r = first.result;
  if (!r) return [];
  const rows: [string, string][] = [[t.resDecision, t.kind[kind] ?? kind]];
  for (const s of r.slow) rows.push([unitName(cfg, s.target), `${formatMult(s.mult)} на ${hoursText(s.hours)} год`]);
  if (r.paper) rows.push([t.resPaper, t.sheets(r.paper)]);
  rows.push([t.resRep, `${r.rep > 0 ? '+' : r.rep < 0 ? '−' : ''}${Math.abs(r.rep)} · ${tierWord}`]);
  if (r.chancePct > 0) rows.push([t.resChance, `${r.chancePct}%`]);
  return rows;
}

/** Текст документа: у події «Доповідь тезово» - рядок пулу `ev.brief_body`, стабільний для документа (012 «Тексти») */
export function bodyOf(item: InboxItem, tel: Telegram): string {
  if (tel.id === BRIEF_ID && poolSize('ev.brief_body') > 0) {
    const n = Number(item.uid.split('#')[1] ?? 1);
    return lineAt('ev.brief_body', Math.max(0, n - 1));
  }
  return tel.body;
}
