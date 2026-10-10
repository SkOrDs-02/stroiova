// Запуск (009 FR-28…FR-30): читання й перевірка запису, маршрут, автозапис, знімок на початку сесії.
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { bundledConfig } from '@/economy/config';
import { isNewSession } from '@/economy/game/time';
import type { EconomyConfig, EconomyState, Effect } from '@/economy/game/types';
import { createConveyorStore, gameSave, type ConveyorStore } from '@/features/conveyor/store';
import { MIGRATIONS } from '@/save/migrations';
import { reportCorruptSave } from '@/save/report';
import { installId, KEY_SAVE, loadSave, restoreFromBackup, snapshot, writeSave, type LoadResult, type SaveDraft } from '@/save/repository';
import { CURRENT_SCHEMA, type SaveFile } from '@/save/schema';
import type { KeyValue } from '@/save/storage';

import { createAutosave } from './autosave';

/** Версія пакета контенту. До завантажувача контенту (003) — дата контенту в репо. */
export const CONTENT_VERSION = 'content-2026.10.10';
const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

export type Route =
  | { kind: 'boot'; migrating: boolean }
  | { kind: 'newer'; installed: string; required: string }
  | { kind: 'error'; corrupt: Extract<LoadResult, { kind: 'corrupt' }>; atMs: number }
  | { kind: 'game'; store: ConveyorStore };

const opts = (onMigrating?: () => void) => ({ current: CURRENT_SCHEMA, migrations: MIGRATIONS, onMigrating });

/** Чи треба міграція — щоб показати «міграція» до самої роботи (FR-10). */
function needsMigration(kv: KeyValue): boolean {
  try {
    const v = JSON.parse(kv.getString(KEY_SAVE) ?? 'null')?.schemaVersion;
    return typeof v === 'number' && v < CURRENT_SCHEMA;
  } catch {
    return false;
  }
}

export function draftOf(store: ConveyorStore, now: number): SaveDraft {
  const g = gameSave(store);
  return {
    schemaVersion: CURRENT_SCHEMA,
    savedAt: now,
    appVersion: APP_VERSION,
    contentVersion: CONTENT_VERSION,
    economyConfig: g.pinned as SaveFile['economyConfig'],
    game: { economy: g.economy, effects: g.effects },
  };
}

/** Стан гри з запису: закріплений конфіг має пріоритет над вбудованим (FR-22, source cached). */
function startGame(kv: KeyValue, save: SaveFile | null, now: number): ConveyorStore {
  if (!save) {
    const store = createConveyorStore(now, bundledConfig);
    writeSave(kv, draftOf(store, now));
    return store;
  }
  const pinned = save.economyConfig as EconomyConfig | null;
  const cfg: EconomyConfig = pinned ? { ...pinned, source: 'cached' } : bundledConfig;
  const store = createConveyorStore(save.savedAt, cfg, {
    state: save.game.economy as EconomyState,
    effects: save.game.effects as Effect[],
    pinned,
  });
  snapshot(kv); // новий холодний старт — нова сесія (FR-4)
  store.getState().away(save.savedAt, now); // офлайн чи годинник назад (01, FR-13, FR-14)
  return store;
}

export function useBoot(kv: KeyValue, clock: () => number = Date.now): { route: Route; restore(): void; startNew(): void; report(): void } {
  const [route, setRoute] = useState<Route>(() => ({ kind: 'boot', migrating: needsMigration(kv) }));

  useEffect(() => {
    installId(kv, Crypto.randomUUID);
    // на наступному тіку, щоб boot встиг показати «міграцію»
    const id = setTimeout(() => {
      const r = loadSave(kv, opts());
      if (r.kind === 'newer') setRoute({ kind: 'newer', installed: APP_VERSION, required: r.appVersion });
      else if (r.kind === 'corrupt') setRoute({ kind: 'error', corrupt: r, atMs: clock() });
      else setRoute({ kind: 'game', store: startGame(kv, r.kind === 'ok' ? r.save : null, clock()) });
    }, 0);
    return () => clearTimeout(id);
  }, [kv, clock]);

  // автозапис і знімок на початку сесії після повернення ≥ 120 с (FR-2, FR-4)
  const store = route.kind === 'game' ? route.store : null;
  useEffect(() => {
    if (!store) return;
    const auto = createAutosave(kv, () => draftOf(store, clock()));
    auto.start();
    let leftAt: number | null = null;
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') leftAt ??= clock();
      else {
        if (isNewSession(leftAt, clock())) snapshot(kv);
        leftAt = null;
      }
    });
    return () => {
      auto.saveNow();
      auto.stop();
      sub.remove();
    };
  }, [kv, store, clock]);

  return useMemo(
    () => ({
      route,
      restore() {
        const b = restoreFromBackup(kv, opts());
        if (b) setRoute({ kind: 'game', store: startGame(kv, b, clock()) });
      },
      startNew() {
        // «Почати заново» (FR-7): новий прогрес, той самий install_id; онбординг — 002, покупки — 08
        setRoute({ kind: 'game', store: startGame(kv, null, clock()) });
      },
      report() {
        if (route.kind !== 'error') return;
        const c = route.corrupt;
        reportCorruptSave({ reason: c.reason, schemaVersion: c.schemaVersion, sizeBytes: c.sizeBytes, hasBackup: c.backup != null });
      },
    }),
    [route, kv, clock],
  );
}
