// Текст сповіщення з пулу `push.<type>` мішком (010 FR-2, FR-7; рішення 41): рядок з `item` бере лише свій предмет, підставляє `{місце}` і `{предмет}`.
import lines from '../../../content/lines.json';

import type { Candidate } from '@/notifications/types';
import { pickLine } from '@/telegrams/lines';
import type { TelegramState } from '@/telegrams/types';

import { pushT } from './texts';

interface PushLine {
  title: string;
  text: string;
  item?: string;
}
const POOLS = lines as unknown as Record<string, { lines: PushLine[] }>;

export function pushText(tg: TelegramState, c: Candidate): { tg: TelegramState; title: string; body: string } {
  const pool = POOLS[`push.${c.type}`]?.lines ?? [];
  const allowed = pool.filter((l) => !l.item || l.item === c.item);
  const r = pickLine(tg, `push.${c.type}:${c.item ?? ''}`, allowed.length);
  const line = r.index == null ? undefined : allowed[r.index];
  const fill = (s: string) => s.replace(/\{місце\}/g, pushT.place[c.place ?? ''] ?? '').replace(/\{предмет\}/g, pushT.item[c.item ?? ''] ?? '');
  return { tg: r.tg, title: line ? fill(line.title) : '', body: line ? fill(line.text) : '' };
}
