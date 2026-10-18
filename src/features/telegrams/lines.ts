// Рядки з пулів content/lines.json (рішення 41): порожні стани й репліки; вибір мішком за лічильником доставок.
// Порожні стани не входять у ліміт 2 реплік за сесію (рішення 45).
import lines from '../../../content/lines.json';

import type { TelegramState } from '@/telegrams/types';

type Pool = { lines: { id: string; text: string; speaker?: string }[] };
const POOLS = lines as unknown as Record<string, Pool>;

export function poolSize(key: string): number {
  return POOLS[key]?.lines.length ?? 0;
}

/** Порожній стан вхідних (не репліка персонажа): стабільний між рендерами, змінюється з новою доставкою. */
export function emptyLine(tg: TelegramState, key: string): string {
  const pool = POOLS[key]?.lines ?? [];
  if (!pool.length) return '';
  return pool[tg.deliveries % pool.length]!.text;
}

export function lineAt(key: string, n: number): string {
  const pool = POOLS[key]?.lines ?? [];
  return pool.length ? pool[((n % pool.length) + pool.length) % pool.length]!.text : '';
}

/** Хто каже репліку (пули, де є поле `speaker`): шукаємо за текстом, бо стор зберігає лише текст. */
export function speakerOf(key: string, text: string): string | null {
  return POOLS[key]?.lines.find((l) => l.text === text)?.speaker ?? null;
}
