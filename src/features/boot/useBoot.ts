// Запуск (009 FR-28…FR-30): читання й перевірка запису, маршрут, автозапис, знімок на початку сесії.
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { bundledConfig, withBundled } from '@/economy/config';
import { isNewSession } from '@/economy/game/time';
import type { EconomyConfig, EconomyState } from '@/economy/game/types';
import { createConveyorStore, gameSave, type ConveyorStore, type StoredEffect } from '@/features/conveyor/store';
import type { OnboardingState } from '@/features/onboarding/steps';
import type { InspectionState } from '@/inspections/types';
import type { DigitizationState } from '@/digitization/types';
import type { MonetizationState } from '@/monetization/types';
import type { MuseumState } from '@/museum/types';
import type { NotificationsState, Settings } from '@/notifications/types';
import { bonuses as museumBonuses } from '@/museum/museum';
import type { Stats } from '@/profile/stats';
import { setHapticsEnabled, setSoundEnabled } from '@/features/onboarding/haptics';
import type { RaceState } from '@/race/types';
import type { TelegramState } from '@/telegrams/types';
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
  | { kind: 'newer'; installed: string; required: string; atMs: number }
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

/**
 * Запис зі стану стору. savedAt — мітка, до якої дохід уже нараховано (lastMs, монотонна система відліку, FR-12).
 * Поки довідка повернення не забрана, не пишемо: інакше після вбивства застосунку офлайн за відсутність пропав би.
 */
export function draftOf(store: ConveyorStore): SaveDraft | null {
  const st = store.getState();
  if (st.offline) return null;
  const g = gameSave(store);
  return {
    schemaVersion: CURRENT_SCHEMA,
    savedAt: st.lastMs,
    appVersion: APP_VERSION,
    contentVersion: CONTENT_VERSION,
    economyConfig: g.pinned as SaveFile['economyConfig'],
    game: { economy: g.economy, effects: g.effects, playtimeMs: g.playtimeMs, onboarding: g.onboarding, telegrams: g.telegrams as SaveFile['game']['telegrams'], inspections: g.inspections, race: g.race, digitization: g.digitization, museum: g.museum, monetization: g.monetization, settings: g.settings, notifications: g.notifications, stats: g.stats },
  };
}

/** Звук і вібрація з налаштувань (010 FR-3): прапорці живуть у модулі haptics. */
function applySettingsToDevice(st: Settings): void {
  setSoundEnabled(st.sound);
  setHapticsEnabled(st.haptics);
}

/** Стан гри з запису: закріплений конфіг має пріоритет над вбудованим (FR-22, source cached). */
export function startGame(kv: KeyValue, save: SaveFile | null, now: number, opts: { snapshotted?: boolean } = {}): ConveyorStore {
  const id = installId(kv, Crypto.randomUUID).id;
  if (!save) {
    const store = createConveyorStore(now, bundledConfig, { installId: id });
    const d = draftOf(store);
    if (d) writeSave(kv, d);
    return store;
  }
  const pinned = save.economyConfig as EconomyConfig | null;
  const cfg: EconomyConfig = pinned ? withBundled(pinned) : bundledConfig;
  const store = createConveyorStore(save.savedAt, cfg, {
    // 016: бонуси журналів виводяться з музею (формули й відсотки можуть змінитись оновленням), тож рахуємо їх заново
    state: { ...(save.game.economy as EconomyState), museum: museumBonuses(save.game.museum as MuseumState, cfg) },
    effects: save.game.effects as StoredEffect[],
    pinned,
    playtimeMs: save.game.playtimeMs,
    onboarding: save.game.onboarding as OnboardingState,
    telegrams: save.game.telegrams as TelegramState,
    inspections: save.game.inspections as InspectionState,
    race: save.game.race as RaceState,
    digit: save.game.digitization as DigitizationState,
    museum: save.game.museum as MuseumState,
    monetization: save.game.monetization as MonetizationState,
    settings: save.game.settings as Settings,
    notifications: save.game.notifications as NotificationsState,
    stats: save.game.stats as Stats,
    installId: id,
  });
  applySettingsToDevice(store.getState().settings);
  // новий холодний старт — нова сесія (FR-4); після міграції знімок уже зроблено в loadSave
  if (!opts.snapshotted) snapshot(kv);
  store.getState().away(save.savedAt, now); // офлайн чи годинник назад (01, FR-13, FR-14)
  return store;
}

/**
 * Зміни, які пишемо одразу, не чекаючи 5 с автозапису (002 FR-28, 003 «вбивство посеред вибору», 004 FR-28, 005, 006 FR-16, 007 рішення 79):
 * крок онбордингу, відповідь чи нова телеграма, перевірка, гонка, цифровізація, журнал або запис курйозу.
 */
function digitChanged(a: ReturnType<ConveyorStore['getState']>['digit'], b: ReturnType<ConveyorStore['getState']>['digit']): boolean {
  if (a === b) return false;
  const { stack: sa, ...ra } = a;
  const { stack: sb, ...rb } = b;
  return sa.reached !== sb.reached || (Object.keys(ra) as (keyof typeof ra)[]).some((k) => ra[k] !== rb[k]);
}

export function needsSaveNow(st: ReturnType<ConveyorStore['getState']>, prev: ReturnType<ConveyorStore['getState']>): boolean {
  return (
    st.onboarding.step !== prev.onboarding.step ||
    st.telegrams.inbox !== prev.telegrams.inbox ||
    st.telegrams.kombat !== prev.telegrams.kombat ||
    st.telegrams.meeting !== prev.telegrams.meeting ||
    st.telegrams.sedo !== prev.telegrams.sedo ||
    // 013 FR-7: конвертація ланки зберігається атомарно, в мить підтвердження
    st.state.digital !== prev.state.digital ||
    st.inspections.active !== prev.inspections.active ||
    st.inspections.last !== prev.inspections.last ||
    st.race.active !== prev.race.active ||
    st.race.last !== prev.race.last ||
    // стос росте щотіка: у запис «одразу» йде лише його прапорець, висоту пише автозапис (012)
    digitChanged(st.digit, prev.digit) ||
    // журнал записується в мить джерела: вбивство застосунку в наступні 5 с його не губить
    st.museum.owned !== prev.museum.owned ||
    st.museum.curios !== prev.museum.curios ||
    // 008: нагорода за ролик і куплений товар - у мить події, не за 5 с (FR-12, крайовий випадок «Вбивство під час оплати»)
    st.monetization !== prev.monetization ||
    st.effects !== prev.effects ||
    // ×2 за офлайн-ролик змінює лише підписи, лічильник доби й довідку
    st.state.offlineDoubles !== prev.state.offlineDoubles ||
    st.offline !== prev.offline ||
    // 010: налаштування й планувальник - зміна одразу (вбивство застосунку не губить вимкнений пуш)
    st.settings !== prev.settings ||
    st.notifications !== prev.notifications
  );
}

export function useBoot(kv: KeyValue, clock: () => number = Date.now): { route: Route; restore(): void; startNew(): void; report(): void } {
  const [route, setRoute] = useState<Route>(() => ({ kind: 'boot', migrating: needsMigration(kv) }));

  useEffect(() => {
    installId(kv, Crypto.randomUUID);
    // на наступному тіку, щоб boot встиг показати «міграцію»
    const id = setTimeout(() => {
      let r: LoadResult;
      try {
        r = loadSave(kv, opts());
      } catch {
        // сховище недоступне: показуємо save-error без копії, щоб boot не завис
        r = { kind: 'corrupt', reason: 'parse', schemaVersion: null, sizeChars: 0, backup: null };
      }
      if (r.kind === 'newer') setRoute({ kind: 'newer', installed: APP_VERSION, required: r.appVersion, atMs: clock() });
      else if (r.kind === 'corrupt') setRoute({ kind: 'error', corrupt: r, atMs: clock() });
      else setRoute({ kind: 'game', store: startGame(kv, r.kind === 'ok' ? r.save : null, clock(), { snapshotted: r.kind === 'ok' && r.migratedFrom != null }) });
    }, 0);
    return () => clearTimeout(id);
  }, [kv, clock]);

  // автозапис і знімок на початку сесії після повернення ≥ 120 с (FR-2, FR-4)
  const store = route.kind === 'game' ? route.store : null;
  useEffect(() => {
    if (!store) return;
    const auto = createAutosave(kv, () => draftOf(store));
    auto.start();
    // 002 FR-28: прогрес онбордингу пишеться одразу після кожного закритого кроку;
    // 003 «вбивство посеред вибору»: відповідь, нова телеграма, посильний — теж одразу, не чекаючи 5 с
    const unsubStep = store.subscribe((st, prev) => {
      if (needsSaveNow(st, prev)) auto.saveNow();
    });
    let leftAt: number | null = null;
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') {
        leftAt ??= clock();
        // inactive (шторка, системне вікно) не вихід з гри: мішок пулів витрачаємо лише на background
        if (s === 'background') void store.getState().goBackground(clock());
      } else {
        if (isNewSession(leftAt, clock())) snapshot(kv);
        leftAt = null;
        void store.getState().comeForeground(clock());
      }
    });
    return () => {
      auto.saveNow();
      auto.stop();
      sub.remove();
      unsubStep();
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
        reportCorruptSave({ reason: c.reason, schemaVersion: c.schemaVersion, sizeChars: c.sizeChars, hasBackup: c.backup != null, from: c.from, to: c.to });
      },
    }),
    [route, kv, clock],
  );
}
