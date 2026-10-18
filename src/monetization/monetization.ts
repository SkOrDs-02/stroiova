// Реклама й покупки (008): добові ліміти п'яти місць, буст ×2 з накопиченням, права на товари, разова видача набору.
import { offlineDoublesLeft } from '@/economy/game/advance';
import type { DomainEvent, EconomyConfig, EconomyState, StoredEffect } from '@/economy/game/types';

import type { MonetizationState, ProductId, Rights } from './types';
import { PRODUCT_IDS } from './types';

const HOUR = 3_600_000;

export const NO_RIGHTS: Rights = { no_ads: false, starter_pack: false, storage_24h: false };

export function newMonetization(): MonetizationState {
  return { rights: NO_RIGHTS, rightsAt: null, starterGranted: false, offer: 'wait', pending: [], ads: { date: '', boost: 0, race: 0 }, inspAdId: null, purchases: 0, success: [] };
}

// --- добові лічильники (FR-7) ---

/** Лічильник скидається, лише коли дата пізніша за збережену: переведений назад годинник ліміт не обнуляє (09 FR-15) */
function used(ms: MonetizationState, key: 'boost' | 'race', date: string): number {
  return date > ms.ads.date ? 0 : ms.ads[key];
}

/** Лічильник росте лише з видачею нагороди (FR-7) */
export function bump(ms: MonetizationState, key: 'boost' | 'race', date: string): MonetizationState {
  const d = date > ms.ads.date ? date : ms.ads.date;
  return { ...ms, ads: { ...(date > ms.ads.date ? { boost: 0, race: 0 } : ms.ads), date: d, [key]: used(ms, key, date) + 1 } };
}

// --- буст підписів (FR-2) ---

/** Скільки ще діє буст, мс: ланцюжок ефектів іде впритул один до одного */
export function boostLeftMs(effects: readonly StoredEffect[], now: number): number {
  let end = now;
  for (const e of effects) if (e.source === 'ad_boost' && e.endMs > end) end = e.endMs;
  return end - now;
}

/** Ще один буст: +adHours після кінця поточного */
export function addBoost(effects: readonly StoredEffect[], now: number, cfg: EconomyConfig): StoredEffect[] {
  const p = cfg.params;
  const start = now + boostLeftMs(effects, now);
  return [...effects, { kind: 'mult', source: 'ad_boost', value: p.adMult, startMs: start, endMs: start + p.adHours * HOUR }];
}

// --- стан кнопки за рекламу (FR-8): доменна частина; «вантажиться», «немає ролика» додає сервіс ---

export type AdButton = 'ready' | 'claim' | 'limit' | 'cap';

export interface AdView {
  button: AdButton;
  /** «сьогодні ще N з M» */
  left: number;
  limit: number;
  /** Для 'cap': скільки лишилось буста, мс */
  boostLeftMs?: number;
}

export function boostView(ms: MonetizationState, effects: readonly StoredEffect[], now: number, date: string, cfg: EconomyConfig, noAds: boolean): AdView {
  const p = cfg.params;
  const left = Math.max(0, p.adsPerDay - used(ms, 'boost', date));
  const rest = boostLeftMs(effects, now);
  if (left === 0) return { button: 'limit', left, limit: p.adsPerDay };
  if (rest > (p.adCapHours - p.adHours) * HOUR) return { button: 'cap', left, limit: p.adsPerDay, boostLeftMs: rest };
  return { button: noAds ? 'claim' : 'ready', left, limit: p.adsPerDay };
}

export function offlineView(eco: EconomyState, cfg: EconomyConfig, date: string): AdView {
  const left = offlineDoublesLeft(eco, cfg, date);
  const limit = cfg.params.offlineAdPerDay;
  return { button: left === 0 ? 'limit' : eco.hasNoAds ? 'claim' : 'ready', left, limit };
}

export function raceAdView(ms: MonetizationState, eco: EconomyState, cfg: EconomyConfig, date: string): AdView {
  const limit = cfg.params.raceAdPerDay;
  const left = Math.max(0, limit - used(ms, 'race', date));
  return { button: left === 0 ? 'limit' : eco.hasNoAds ? 'claim' : 'ready', left, limit };
}

/** «Усе за рекламу»: раз за перевірку (FR-6) */
export function inspAdView(ms: MonetizationState, inspId: string, eco: EconomyState): AdView {
  const spent = ms.inspAdId === inspId;
  return { button: spent ? 'limit' : eco.hasNoAds ? 'claim' : 'ready', left: spent ? 0 : 1, limit: 1 };
}

export function adBlocked(view: AdView): boolean {
  return view.button === 'limit' || view.button === 'cap';
}

// --- права й товари (FR-16…FR-18, FR-25, FR-26) ---

/** Ефекти прав на економіку: «Без реклами» ×paidMult, сховище 24 год, бак 12 год. Ідемпотентно. */
export function applyRights(eco: EconomyState, rights: Rights, cfg: EconomyConfig): EconomyState {
  const p = cfg.params;
  return {
    ...eco,
    hasNoAds: rights.no_ads,
    storageHours: rights.storage_24h ? 24 : p.storageHours,
    fuelCapacityMs: (rights.starter_pack ? p.starterFuelHours : p.fuelHours) * HOUR,
  };
}

export interface PurchaseOutcome {
  ms: MonetizationState;
  eco: EconomyState;
  events: DomainEvent[];
}

/** Товар отримано (оплата, відновлення чи схвалення Ask to Buy): права, ефект, разова видача набору. */
export function grantProduct(ms: MonetizationState, eco: EconomyState, cfg: EconomyConfig, id: ProductId, nowMs: number, opts: { silent?: boolean } = {}): PurchaseOutcome {
  if (ms.rights[id]) return { ms, eco, events: [] };
  const p = cfg.params;
  const rights = { ...ms.rights, [id]: true };
  let e = applyRights(eco, rights, cfg);
  let starterGranted = ms.starterGranted;
  if (id === 'starter_pack') {
    // бак - повний завжди, 50 000 - раз на збереження (відновлення на новому збереженні не дублює)
    e = { ...e, fuelEndMs: nowMs + e.fuelCapacityMs };
    if (!starterGranted) {
      starterGranted = true;
      e = { ...e, signatures: e.signatures + p.starterSignatures };
    }
  }
  const next: MonetizationState = {
    ...ms,
    rights,
    rightsAt: nowMs,
    starterGranted,
    pending: ms.pending.filter((x) => x !== id),
    purchases: ms.purchases + 1,
    success: opts.silent ? ms.success : [...ms.success, id],
    // купили набір - пропозиція більше не потрібна
    offer: id === 'starter_pack' ? 'done' : ms.offer,
  };
  return { ms: next, eco: e, events: [] };
}

/**
 * Права з стору (CustomerInfo, FR-25, FR-26): нові вмикаємо (як покупку: iap-success), відкликані (повернення коштів) вимикаємо.
 * `null` - стор недосяжний: кеш лишається.
 */
export function syncRights(ms: MonetizationState, eco: EconomyState, cfg: EconomyConfig, rights: Rights | null, nowMs: number): PurchaseOutcome {
  if (!rights) return { ms, eco, events: [] };
  let cur: PurchaseOutcome = { ms, eco, events: [] };
  for (const id of PRODUCT_IDS) {
    if (rights[id] && !cur.ms.rights[id]) {
      const r = grantProduct(cur.ms, cur.eco, cfg, id, nowMs);
      cur = { ms: r.ms, eco: r.eco, events: [...cur.events, ...r.events] };
    }
  }
  const revoked = PRODUCT_IDS.filter((id) => !rights[id] && cur.ms.rights[id]);
  if (revoked.length) {
    const nextRights = { ...cur.ms.rights };
    for (const id of revoked) nextRights[id] = false;
    // видані підписи лишаються, ефекти вимикаються без повідомлення
    cur = { ms: { ...cur.ms, rights: nextRights }, eco: applyRights(cur.eco, nextRights, cfg), events: cur.events };
  }
  return { ...cur, ms: { ...cur.ms, rightsAt: nowMs } };
}

export function addPending(ms: MonetizationState, id: ProductId): MonetizationState {
  return ms.pending.includes(id) ? ms : { ...ms, pending: [...ms.pending, id] };
}

/** iap-success показано */
export function closeSuccess(ms: MonetizationState): MonetizationState {
  return ms.success.length ? { ...ms, success: ms.success.slice(1) } : ms;
}

/** starter-offer: першого результату перевірки гравець ще не бачив → чекаємо; побачив → час показати (FR-19) */
export function offerDue(ms: MonetizationState): MonetizationState {
  return ms.offer === 'wait' && !ms.rights.starter_pack ? { ...ms, offer: 'due' } : ms;
}

export function offerShown(ms: MonetizationState): MonetizationState {
  return ms.offer === 'due' ? { ...ms, offer: 'done' } : ms;
}
