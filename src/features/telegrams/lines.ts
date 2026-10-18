// Рядки з пулів content/lines.json (рішення 41): порожні стани й репліки; вибір мішком за лічильником доставок.
// Порожні стани не входять у ліміт 2 реплік за сесію (рішення 45).
import lines from '../../../content/lines.json';

import type { TelegramState } from '@/telegrams/types';

type Pool = { lines: { id: string; text: string }[] };
const POOLS = lines as unknown as Record<string, Pool>;

/** Рядок пулу: по колу без повтору підряд, крок — кількість доставок (детерміновано, без годинника). */
export function emptyLine(tg: TelegramState, key: string): string {
  const pool = POOLS[key]?.lines ?? [];
  if (!pool.length) return '';
  return pool[tg.deliveries % pool.length]!.text;
}

export function lineAt(key: string, n: number): string {
  const pool = POOLS[key]?.lines ?? [];
  return pool.length ? pool[((n % pool.length) + pool.length) % pool.length]!.text : '';
}
