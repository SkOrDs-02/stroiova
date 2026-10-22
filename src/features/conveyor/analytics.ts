// Аналітика у сторі (docs/analytics.md): підписка на журнал подій гри, глобальні властивості, запуск (`identify`, `app_first_open`, `session_start`),
// вимикач «Аналітика». Чистих функцій тут більше, ніж побічних ефектів; усе, що шле, іде через `track()`.
import { isSampled } from '@/analytics/sampling';
import { levelId } from '@/awards/facts';
import { count as countAwards } from '@/awards/awards';
import { log10, mapEvent, newMemory, type MapCtx, type Memory } from '@/analytics/mapping';
import type { AnalyticsService } from '@/analytics/service';
import { createTracker, type Tracker } from '@/analytics/track';
import type { EventProps, GlobalProps, UserProps } from '@/analytics/plan.generated';
import { status as digitStatus } from '@/digitization/digitization';
import { prestigeMult } from '@/economy/core/formulas';
import { convertInfo } from '@/economy/game/convert';
import { fuelBonusEndMs, income, zpzInfo } from '@/economy/game/income';
import { itemsFor } from '@/economy/game/state';
import { nextPurchaseEtaSec } from '@/economy/game/purchase';
import type { DomainEvent } from '@/economy/game/types';
import { count as countMuseum } from '@/museum/museum';
import { CURRENT_SCHEMA } from '@/save/schema';
import { dayStart, DAY } from '@/telegrams/clock';
import { repTier } from '@/telegrams/reputation';

import type { ConveyorStore } from './store';

/** Зсув місцевого часу пристрою, хв (той самий, що `tzOffsetAt` у сторі; свій, щоб не мати циклу модулів) */
const tzOffsetAt = (ms: number): number => -new Date(ms).getTimezoneOffset();

type Snap = ReturnType<ConveyorStore['getState']>;

/** Те, що знає лише збірка: версія контенту, канал, мова пристрою (expo-localization), версія застосунку */
export interface AnalyticsEnv {
  contentVersion: string;
  buildChannel: GlobalProps['build_channel'];
  appVersion: string;
  deviceRegion: string;
  deviceLocale: string;
  /** Помилка плану кидається, а не лише повідомляється (тести) */
  strict?: boolean;
}

export const DEFAULT_ENV: AnalyticsEnv = { contentVersion: 'content-dev', buildChannel: 'development', appVersion: '0.0.0', deviceRegion: 'UA', deviceLocale: 'uk-UA' };

/** Ідентифікатор ігрової сесії: UUID-подібний рядок, не потребує нативного модуля */
export function newSessionId(nowMs: number, rand: () => number = Math.random): string {
  const h = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-${'89ab'[Math.floor(rand() * 4)]}${h(3)}-${(nowMs % 1e12).toString(16).padStart(12, '0').slice(-12)}`;
}

/** ISO-тиждень РРРР-Www дати (місцевої): для когорт `install_week` */
export function isoWeek(ms: number, tzOffsetMin: number): string {
  const d = new Date(ms + tzOffsetMin * 60_000);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / DAY + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

export function dateOf(ms: number, tzOffsetMin: number): string {
  return new Date(ms + tzOffsetMin * 60_000).toISOString().slice(0, 10);
}

/** Глобальні властивості кожної події (analytics/tracking-plan.yaml, `global_properties`) */
export function globalsOf(s: Snap, env: AnalyticsEnv, sessionId: string): Omit<GlobalProps, 'analytics_plan_version'> {
  const now = s.lastMs;
  const tz = tzOffsetAt(now);
  return {
    economy_config_version: s.cfg.version,
    economy_config_source: s.cfg.source,
    content_version: env.contentVersion,
    save_schema_version: CURRENT_SCHEMA,
    game_session_id: sessionId,
    session_number: s.analytics.sessionNumber,
    playtime_sec: Math.floor(s.playtimeMs / 1000),
    days_since_install: Math.max(0, Math.round((dayStart(now, tz) - dayStart(s.inspections.installMs, tz)) / DAY)),
    level_id: levelId(s.state.level),
    dub_number: s.dub.n,
    is_finale_done: s.finale.yMs != null,
    awards_owned: countAwards(s.awards),
    digitization_count: s.digit.total,
    has_no_ads: s.state.hasNoAds,
    is_payer: s.monetization.purchases > 0,
    is_econ_detail_sampled: isSampled(s.installId),
    build_channel: env.buildChannel,
    is_test_user: s.settings.testUser,
  };
}

/** Властивості користувача, що змінюються (analytics/tracking-plan.yaml, `user_properties` з `set: set`); те, чого гра ще не знає, не шлемо */
export function userPropsOf(s: Snap): Partial<UserProps> {
  const tier = repTier(s.telegrams.reputation.value, s.cfg.params);
  return {
    ...(s.onboarding.callsign ? { callsign_type: s.onboarding.callsign.type } : {}),
    ...(s.onboarding.gender ? { protagonist_gender: s.onboarding.gender } : {}),
    is_onboarding_complete: s.onboarding.step === 'done',
    current_level_id: levelId(s.state.level),
    digitization_count: s.digit.total,
    digital_points_total: s.state.prestigePoints,
    prestige_multiplier: Math.round(prestigeMult(s.state.prestigePoints, s.cfg.params) * 100) / 100,
    reputation_tier: tier === 'norm' ? 'normal' : tier,
    museum_journals_count: countMuseum(s.museum),
    has_no_ads: s.state.hasNoAds,
    has_extended_storage: s.monetization.rights.storage_24h,
    has_starter_pack: s.monetization.rights.starter_pack,
    is_payer: s.monetization.purchases > 0,
    purchases_count: s.monetization.purchases,
    push_permission: s.settings.pushPermission === 'not_asked' ? 'not_asked' : s.settings.pushPermission,
    economy_config_version: s.cfg.version,
    is_econ_detail_sampled: isSampled(s.installId),
    is_test_user: s.settings.testUser,
  };
}

/** Нові події журналу: журнал обрізається з голови, тож різницю шукаємо за посиланням на останню відому подію */
export function freshEvents(prev: readonly DomainEvent[], next: readonly DomainEvent[]): DomainEvent[] {
  if (prev === next) return [];
  const last = prev[prev.length - 1];
  if (last === undefined) return [...next];
  const i = next.lastIndexOf(last);
  return i < 0 ? [...next] : next.slice(i + 1);
}

/** Повернення з фону раніше за стільки мс продовжує сесію (docs/analytics.md, `session_start`) */
export const SESSION_GAP_MS = 120_000;

/** Лічильники однієї сесії для `session_end` (накопичувально, між короткими поверненнями з фону) */
interface Agg {
  taps: number;
  catTaps: number;
  tapEarned: number;
  earned: number;
  purchases: number;
  levelsBought: number;
  clerks: number;
  paperEmptyMs: number;
  fuelBonusMs: number;
}

const zeroAgg = (): Agg => ({ taps: 0, catTaps: 0, tapEarned: 0, earned: 0, purchases: 0, levelsBought: 0, clerks: 0, paperEmptyMs: 0, fuelBonusMs: 0 });

/** Тік довший за це - не ігровий час, а стрибок годинника або повернення з фону: у лічильники часу не йде */
const MAX_TICK_MS = 10_000;

/** Дані кінця сесії зі знімка стору (`session_end`) */
export function sessionEndProps(s: Snap, agg: Agg, durationSec: number, segments: number, now: number): EventProps['session_end'] {
  const inc = income(s.state, s.cfg, now, s.effects);
  const idle = income(s.state, s.cfg, now, s.effects, { idle: true });
  const it = itemsFor(s.state, s.cfg);
  const levels: Record<string, number> = {};
  it.streams.forEach((u, i) => (levels[u.id] = s.state.streamLevels[i] ?? 0));
  it.stages.forEach((u, j) => (levels[u.id] = s.state.stageLevels[j] ?? 0));
  const zpz = s.state.level >= 4 ? zpzInfo(s.state, s.cfg, now, s.effects) : null;
  return {
    duration_sec: durationSec,
    segment_count: segments,
    taps_count: agg.taps,
    cat_taps_count: agg.catTaps,
    tap_signatures_share_pct: agg.earned > 0 ? Math.min(100, Math.round((agg.tapEarned / agg.earned) * 100)) : 0,
    signatures_earned_log10: log10(agg.earned),
    signatures_balance_log10: log10(s.state.signatures),
    income_per_min_log10: log10(inc.perMin),
    idle_income_per_min_log10: log10(idle.perMin),
    purchases_count: agg.purchases,
    levels_bought: agg.levelsBought,
    clerks_hired_count: agg.clerks,
    bottleneck_id: (inc.bottleneck === 'streams' ? 'streams' : inc.bottleneck.id) as EventProps['session_end']['bottleneck_id'],
    next_purchase_eta_sec: Math.round(nextPurchaseEtaSec(s.state, s.cfg, now, s.effects) ?? 0),
    digital_points_available: digitStatus(s.state, s.digit, s.cfg, now, s.effects).points,
    levels,
    paper_empty_sec: Math.round(agg.paperEmptyMs / 1000),
    fuel_bonus_sec: Math.round(agg.fuelBonusMs / 1000),
    ...(zpz ? { zpz_share_pct: Math.round(zpz.share * 1000) / 10 } : {}),
    ...(s.state.level === 4 ? { stack_cm: Math.min(999, Math.floor(s.digit.stack.cm)) } : {}),
  };
}

export interface Analytics {
  tracker: Tracker;
  memory: Memory;
  /** Мить відкриття телеграми гравцем (для `sec_since_open`); true, якщо це перше відкриття цього запису */
  noteOpened: (uid: string, atMs: number) => boolean;
}

/**
 * Підключити аналітику до стору: перший запуск і початок сесії, потім усе, що відбувається. Вимикач «Аналітика» (010 FR-14):
 * подію вимкнення ще шлемо, робимо `flush()`, і лише потім `optOut`.
 */
export function attachAnalytics(store: ConveyorStore, service: AnalyticsService, env: AnalyticsEnv = DEFAULT_ENV): Analytics {
  const memory = newMemory();
  const opened = new Map<string, number>();
  const available = new Map<number, number>();
  let sessionId = newSessionId(store.getState().lastMs);
  // сесія: початок ігрового часу, відрізки, лічильники; `bgAt` - коли пішли у фон
  const sess = { startPlayMs: store.getState().playtimeMs, segments: 1, agg: zeroAgg(), bgAt: null as number | null };
  let allowed = store.getState().settings.analytics;
  let pendingOff = false;
  let lastUser = '';
  service.optOut(!allowed);

  const tracker = createTracker({
    service,
    globals: () => globalsOf(store.getState(), env, sessionId),
    enabled: () => allowed,
    sampled: () => isSampled(store.getState().installId),
    strict: env.strict,
    onInvalid: (name, errors) => {
      if (__DEV__) console.warn(`track(${name}): ${errors.join('; ')}`);
    },
  });

  const ctxOf = (s: Snap, e: DomainEvent): MapCtx => ({
    nowMs: s.lastMs,
    installMs: s.inspections.installMs,
    // цифровізація вже почала новий цикл: тривалість того, що закінчився, лежить у церемонії
    cycleStartMs: e.type === 'digitizationComplete' ? s.lastMs - (s.digit.ceremony?.cycleMs ?? 0) : s.digit.cycleStartMs,
    levelStartMs: s.digit.levelStartMs,
    allStreamsOpen: s.state.streamLevels.every((l) => l > 0),
    inbox: s.telegrams.inbox,
    reputation: s.telegrams.reputation.value,
    openedAtMs: (uid) => opened.get(uid) ?? null,
    convertAvailableAtMs: (i) => available.get(i) ?? null,
    digitalStages: s.state.level >= 5 ? s.state.digital.length : null,
    prevCycleMs: s.digit.ceremony?.prevCycleMs ?? null,
    memory,
  });

  const syncUser = (s: Snap) => {
    if (!allowed) return;
    const props = userPropsOf(s);
    const key = JSON.stringify(props);
    if (key === lastUser) return;
    lastUser = key;
    service.setUserProps(props);
  };

  // перший запуск: identify + app_first_open, потім початок сесії
  {
    const s = store.getState();
    const tz = tzOffsetAt(s.lastMs);
    if (allowed && s.installId && !s.analytics.firstOpenSent) {
      service.identify(s.installId, {
        install_date: dateOf(s.inspections.installMs, tz),
        install_week: isoWeek(s.inspections.installMs, tz),
        install_app_version: env.appVersion,
        install_economy_config_version: s.cfg.version,
        install_build_channel: env.buildChannel,
        first_device_region: env.deviceRegion,
      });
      tracker.track('app_first_open', { device_region: env.deviceRegion, device_locale: env.deviceLocale });
      store.setState({ analytics: { ...s.analytics, firstOpenSent: true } });
    }
    const a = store.getState().analytics;
    const tz2 = tzOffsetAt(s.lastMs);
    tracker.track('session_start', {
      is_cold_start: true,
      ...(a.lastSessionEndMs != null ? { sec_since_last_session: Math.max(0, Math.round((s.lastMs - a.lastSessionEndMs) / 1000)) } : {}),
      local_hour: new Date(s.lastMs + tz2 * 60_000).getUTCHours(),
      entry_point: 'icon',
      is_clock_skew_detected: false,
    });
    syncUser(store.getState());
  }

  store.subscribe((s, prev) => {
    // перемикач «Аналітика»: увімкнення діє одразу, вимкнення - після події `setting_change` (її ще шлемо)
    if (s.settings.analytics !== prev.settings.analytics) {
      if (s.settings.analytics) {
        allowed = true;
        pendingOff = false;
        service.optOut(false);
      } else pendingOff = true;
    }
    // коли конвертація стала доступною (для `sec_since_available`)
    if (s.state.level >= 5 && s.state !== prev.state) {
      const info = convertInfo(s.state, s.cfg, s.digit.counts[String(s.state.level)] ?? 0);
      if (info.next && info.status === 'available' && !available.has(info.next.index)) available.set(info.next.index, s.lastMs);
    }
    // лічильники сесії зі змін стану: тап, тап по коту, зароблене, час без паперу й під бонусом пального
    const a0 = sess.agg;
    if (s.state.tapTimes !== prev.state.tapTimes && s.state.signatures > prev.state.signatures) {
      a0.taps++;
      a0.tapEarned += s.state.signatures - prev.state.signatures;
    }
    if (s.state.catBonusAtMs != null && s.state.catBonusAtMs !== prev.state.catBonusAtMs) a0.catTaps++;
    if (s.state.lifetimeCycle > prev.state.lifetimeCycle) a0.earned += s.state.lifetimeCycle - prev.state.lifetimeCycle;
    const dt = s.playtimeMs - prev.playtimeMs;
    if (dt > 0 && dt <= MAX_TICK_MS) {
      if (s.state.paper < 1) a0.paperEmptyMs += dt;
      a0.fuelBonusMs += Math.min(dt, Math.max(0, Math.min(fuelBonusEndMs(s.state, s.cfg), s.lastMs) - prev.lastMs));
    }
    const evs = freshEvents(prev.events, s.events);
    let turnedOff = false;
    for (const e of evs) {
      if (e.type === 'settingChange' && e.settingName === 'analytics' && e.newValue === false) turnedOff = true;
      if (e.type === 'purchase') {
        sess.agg.purchases++;
        sess.agg.levelsBought += e.levelsBought;
      }
      if (e.type === 'clerkHire') sess.agg.clerks++;
      if (e.type === 'appBackground') {
        const dur = Math.max(0, Math.floor((s.playtimeMs - sess.startPlayMs) / 1000));
        tracker.track('session_end', sessionEndProps(s, sess.agg, dur, sess.segments, e.atMs));
        sess.bgAt = e.atMs;
        store.setState({ analytics: { ...store.getState().analytics, lastSessionEndMs: e.atMs } });
      } else if (e.type === 'appForeground' && sess.bgAt != null) {
        const gap = e.atMs - sess.bgAt;
        if (gap >= SESSION_GAP_MS) {
          // нова сесія: новий game_session_id, номер +1, лічильники з нуля
          sessionId = newSessionId(e.atMs);
          sess.segments = 1;
          sess.startPlayMs = s.playtimeMs;
          sess.agg = zeroAgg();
          store.setState({ analytics: { ...store.getState().analytics, sessionNumber: store.getState().analytics.sessionNumber + 1 } });
          tracker.track('session_start', { is_cold_start: false, sec_since_last_session: Math.round(gap / 1000), local_hour: new Date(e.atMs + tzOffsetAt(e.atMs) * 60_000).getUTCHours(), entry_point: 'other', is_clock_skew_detected: false });
        } else sess.segments++;
        sess.bgAt = null;
      }
      for (const c of mapEvent(e, ctxOf(s, e))) tracker.track(c.name, c.props as never, c.globals);
    }
    if (pendingOff && turnedOff) {
      allowed = false;
      pendingOff = false;
      // приватність: вимикаємо SDK, навіть якщо flush не вдався; а якщо гравець уже встиг увімкнути знову - не вимикаємо
      void service
        .flush()
        .catch(() => {})
        .then(() => {
          if (!allowed) service.optOut(true);
        });
    }
    if (evs.length || s.lastMs - prev.lastMs > 59_000) syncUser(s);
  });

  return {
    tracker,
    memory,
    noteOpened: (uid, atMs) => {
      if (opened.has(uid)) return false;
      opened.set(uid, atMs);
      return true;
    },
  };
}
