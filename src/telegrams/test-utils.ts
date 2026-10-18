// Фікстури тестів 003: конфіг v7.2, стан телеграм і економіки.
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import type { EconomyState } from '@/economy/game/types';
import { T0 } from '@/economy/test-fixtures';

import { newTelegrams } from './schedule';
import type { InboxItem, ItemKind, TelegramState } from './types';

export const cfg = bundledConfig;
export const p = cfg.params;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export function eco(patch: Partial<EconomyState> = {}): EconomyState {
  return { ...newGame(cfg, T0), paper: 30, ...patch };
}

export function tgWith(ids: string[], patch: Partial<TelegramState> = {}, kind: ItemKind = 'telegram'): TelegramState {
  const inbox: InboxItem[] = ids.map((id, i) => ({ uid: `${id}#${i + 1}`, id, kind, receivedAt: T0, status: 'new' }));
  return { ...newTelegrams(p, 'test'), startMs: T0, inbox, deliveries: ids.length, ...patch };
}

export const ctx = (nowMs = T0) => ({ cfg, nowMs, dayKey: '2025-10-09' });
