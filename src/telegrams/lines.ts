// Мішок реплік (рішення 41; 09 FR-36): без повтору до вичерпання пулу, ніколи двічі поспіль; стан — у записі.
import { roller } from './rng';
import type { TelegramState } from './types';

export function pickLine(tg: TelegramState, key: string, size: number): { tg: TelegramState; index: number | null } {
  if (size <= 0) return { tg, index: null };
  const bag = tg.lineBags[key] ?? { used: [], last: null };
  let used = bag.used.filter((i) => i < size);
  let free = Array.from({ length: size }, (_, i) => i).filter((i) => !used.includes(i));
  if (!free.length) {
    used = [];
    free = Array.from({ length: size }, (_, i) => i).filter((i) => size === 1 || i !== bag.last);
  }
  const rng = roller(tg.rng);
  const index = free[Math.floor(rng.next() * free.length)]!;
  return { tg: { ...tg, rng: rng.state, lineBags: { ...tg.lineBags, [key]: { used: [...used, index], last: index } } }, index };
}
