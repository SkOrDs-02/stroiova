// 008: добові ліміти й буст (AC-2, AC-7), права й товари (AC-14, AC-18), стартова пропозиція (AC-15), гонка й чекліст за рекламу (AC-5, AC-6).
import { bundledConfig } from '@/economy/config';
import { claimOffline, offline } from '@/economy/game/advance';
import { multStack } from '@/economy/game/income';
import { newGame } from '@/economy/game/state';
import type { StoredEffect } from '@/economy/game/types';
import { completeAll, newInspections } from '@/inspections/lifecycle';
import type { Inspection } from '@/inspections/types';
import { adSpeedup, newRace, view } from '@/race/race';
import type { Race } from '@/race/types';

import { addBoost, addPending, adBlocked, applyRights, boostLeftMs, boostView, bump, grantProduct, inspAdView, newMonetization, offerDue, offerShown, offlineView, raceAdView, syncRights } from '../monetization';

const cfg = bundledConfig;
const HOUR = 3_600_000;
const T = new Date(2026, 9, 10, 12).getTime();
const eco = () => newGame(cfg, T);

describe('буст за рекламу (FR-2, FR-8)', () => {
  test('AC-2: з 0 тричі за день - залишок 4, 8, 12 год; кнопка активна, поки ≤ 8 год; 3 з 3 - ліміт', () => {
    let ms = newMonetization();
    let fx: StoredEffect[] = [];
    const left: number[] = [];
    for (let i = 0; i < 3; i++) {
      expect(boostView(ms, fx, T, '2026-10-10', cfg, false).button).toBe('ready');
      fx = addBoost(fx, T, cfg);
      ms = bump(ms, 'boost', '2026-10-10');
      left.push(boostLeftMs(fx, T) / HOUR);
    }
    expect(left).toEqual([4, 8, 12]);
    expect(boostView(ms, fx, T, '2026-10-10', cfg, false)).toMatchObject({ button: 'limit', left: 0, limit: 3 });
  });

  test('AC-2: залишок 9 год - «Межа: 12 год»; рівно 8 год - ще можна', () => {
    const at = (h: number): StoredEffect[] => [{ kind: 'mult', source: 'ad_boost', value: 2, startMs: T - HOUR, endMs: T + h * HOUR }];
    expect(boostView(newMonetization(), at(9), T, '2026-10-10', cfg, false).button).toBe('cap');
    expect(boostView(newMonetization(), at(8), T, '2026-10-10', cfg, false).button).toBe('ready');
    expect(adBlocked(boostView(newMonetization(), at(9), T, '2026-10-10', cfg, false))).toBe(true);
  });

  test('буст ×2 множить дохід, лише доки діє; ланцюжок йде впритул', () => {
    const fx = addBoost(addBoost([], T, cfg), T, cfg);
    expect(fx.map((e) => [e.startMs - T, e.endMs - T])).toEqual([[0, 4 * HOUR], [4 * HOUR, 8 * HOUR]]);
    expect(multStack(eco(), cfg, T + HOUR, fx).total).toBe(2);
    expect(multStack(eco(), cfg, T + 5 * HOUR, fx).total).toBe(2);
    expect(multStack(eco(), cfg, T + 9 * HOUR, fx).total).toBe(1);
  });

  test('«Без реклами»: кнопка «Забрати» з тими самими лімітами (FR-14)', () => {
    expect(boostView(newMonetization(), [], T, '2026-10-10', cfg, true)).toMatchObject({ button: 'claim', left: 3 });
  });
});

describe('добові лічильники (FR-7)', () => {
  test('AC-7: о 00:00 лічильник скидається; переведений назад годинник його не обнуляє', () => {
    let ms = newMonetization();
    for (let i = 0; i < 3; i++) ms = bump(ms, 'boost', '2026-10-10');
    expect(boostView(ms, [], T, '2026-10-10', cfg, false).left).toBe(0);
    expect(boostView(ms, [], T, '2026-10-11', cfg, false).left).toBe(3);
    // годинник назад: дата менша за збережену - ліміт тримається
    expect(boostView(ms, [], T, '2026-10-09', cfg, false).left).toBe(0);
    expect(bump(ms, 'boost', '2026-10-11').ads).toEqual({ date: '2026-10-11', boost: 1, race: 0 });
  });

  test('гонка: 3 на добу всі гонки разом; офлайн ×2: 3 на добу з економіки', () => {
    let ms = newMonetization();
    const e = eco();
    for (let i = 0; i < 3; i++) ms = bump(ms, 'race', '2026-10-10');
    expect(raceAdView(ms, e, cfg, '2026-10-10')).toMatchObject({ button: 'limit', left: 0 });
    expect(raceAdView(ms, e, cfg, '2026-10-11').button).toBe('ready');
    const res = offline({ ...e, streamClerks: [true, false, false, false] }, cfg, T, T + 2 * HOUR);
    let s = e;
    for (let i = 0; i < 3; i++) {
      const r = claimOffline(s, cfg, res, true, '2026-10-10');
      if ('error' in r) throw new Error('limit');
      s = r.state;
    }
    expect(offlineView(s, cfg, '2026-10-10')).toMatchObject({ button: 'limit', left: 0 });
    expect(offlineView(s, cfg, '2026-10-11').button).toBe('ready');
  });
});

describe('гонка й чекліст за рекламу (FR-5, FR-6)', () => {
  const race = (actLeftH: number): Race => ({ id: 'race_0001', no: 1, type: 'drone', level: 1, startMs: T - HOUR, svcEndMs: T + 8 * HOUR, steps: [{ unit: 'akty', sec: 3600 }], actTotalSec: 3600, actEndMs: T + actLeftH * HOUR, pausedAtMs: null, digUsed: false, sped: [], seen: true });

  test('AC-5: залишок акта 5 год 12 хв - після ролика 2 год 36 хв', () => {
    const s = { ...newRace('x'), active: race(5.2) };
    const r = adSpeedup(s, T, cfg);
    if ('error' in r) throw new Error(r.error);
    expect(view(r.s.active!, T).actLeftMs).toBe(2.6 * HOUR);
    expect(r.s.active!.sped).toEqual([{ method: 'ad', sec: -9360 }]);
    expect(r.events).toEqual([{ type: 'raceSpeedup', id: 'race_0001', method: 'ad', secSaved: 9360 }]);
    expect(adSpeedup({ ...s, active: null }, T, cfg)).toEqual({ error: 'no_race' });
  });

  test('AC-6: чекліст 2 з 5 - усе виконано, подія на кожен пункт з method = ad; раз за перевірку; пункти, додані пізніше, коштують', () => {
    const mk = (done: boolean, i: number) => ({ id: `it${i}`, price: 100, done });
    const insp: Inspection = { id: 'insp_0001', no: 1, trigger: 'scheduled', boss: 'brigade_commission', level: 1, annMs: T - HOUR, arrMs: T + 2 * HOUR, items: [mk(true, 0), mk(true, 1), mk(false, 2), mk(false, 3), mk(false, 4)], reason: null, remark: false, warned: true, modal: false };
    const s = { ...newInspections(T, 'x'), active: insp };
    const r = completeAll(s, T, 'ad');
    if ('error' in r) throw new Error(r.error);
    expect(r.s.active!.items.every((i) => i.done)).toBe(true);
    expect(r.events.map((e) => (e.type === 'inspectionItemComplete' ? e.method : null))).toEqual(['ad', 'ad', 'ad']);
    expect(completeAll(r.s, T, 'ad')).toEqual({ error: 'done' });
    // нова нагорода лише раз за перевірку
    const ms = { ...newMonetization(), inspAdId: 'insp_0001' };
    expect(inspAdView(ms, 'insp_0001', eco()).button).toBe('limit');
    expect(inspAdView(ms, 'insp_0002', eco()).button).toBe('ready');
    expect(inspAdView(newMonetization(), 'insp_0001', { ...eco(), hasNoAds: true }).button).toBe('claim');
  });
});

describe('товари й права (FR-15…FR-18, FR-24…FR-26)', () => {
  test('AC-14: «Стартовий набір» - +50 000, бак 12 год і повний; відновлення на тому ж збереженні не дублює підписи', () => {
    const e = { ...eco(), signatures: 1000 };
    const a = grantProduct(newMonetization(), e, cfg, 'starter_pack', T);
    expect(a.eco.signatures).toBe(51_000);
    expect(a.eco.fuelCapacityMs).toBe(12 * HOUR);
    expect(a.eco.fuelEndMs).toBe(T + 12 * HOUR);
    expect(a.ms).toMatchObject({ starterGranted: true, offer: 'done', purchases: 1, success: ['starter_pack'] });
    // покупку відкликано й відновлено в тому самому збереженні
    const revoked = syncRights(a.ms, a.eco, cfg, { no_ads: false, starter_pack: false, storage_24h: false }, T + 1);
    expect(revoked.eco.fuelCapacityMs).toBe(6 * HOUR);
    expect(revoked.eco.signatures).toBe(51_000);
    const again = grantProduct(revoked.ms, revoked.eco, cfg, 'starter_pack', T + 2, { silent: true });
    expect(again.eco.signatures).toBe(51_000);
    expect(again.eco.fuelCapacityMs).toBe(12 * HOUR);
  });

  test('AC-14: «Розширене сховище» - 24 год; відсутній 13 год - зараховано всі 13', () => {
    const a = grantProduct(newMonetization(), eco(), cfg, 'storage_24h', T);
    expect(a.eco.storageHours).toBe(24);
    const res = offline({ ...a.eco, streamClerks: [true, false, false, false] }, cfg, T, T + 13 * HOUR);
    expect(res.creditedMs).toBe(13 * HOUR);
    const base = offline({ ...eco(), streamClerks: [true, false, false, false] }, cfg, T, T + 13 * HOUR);
    expect(base.creditedMs).toBe(8 * HOUR);
  });

  test('«Без реклами» множить весь дохід на paidMult (FR-16)', () => {
    const a = grantProduct(newMonetization(), eco(), cfg, 'no_ads', T);
    expect(a.eco.hasNoAds).toBe(true);
    expect(multStack(a.eco, cfg, T, []).total).toBe(cfg.params.paidMult);
  });

  test('AC-18: права з кешу діють офлайн (стор недосяжний - null); повернення коштів онлайн вимикає ефект, підписи лишаються', () => {
    const a = grantProduct(newMonetization(), eco(), cfg, 'no_ads', T);
    const offlineSync = syncRights(a.ms, a.eco, cfg, null, T + 1);
    expect(offlineSync.eco.hasNoAds).toBe(true);
    expect(offlineSync.ms).toBe(a.ms);
    const refund = syncRights(a.ms, a.eco, cfg, { no_ads: false, starter_pack: false, storage_24h: false }, T + 2);
    expect(refund.eco.hasNoAds).toBe(false);
    expect(refund.ms.rights.no_ads).toBe(false);
  });

  test('AC-17: схвалення Ask to Buy на наступному запуску вмикає ефект і ставить iap-success; pending знімається', () => {
    let ms = addPending(newMonetization(), 'storage_24h');
    expect(ms.pending).toEqual(['storage_24h']);
    const r = syncRights(ms, eco(), cfg, { no_ads: false, starter_pack: false, storage_24h: true }, T);
    expect(r.eco.storageHours).toBe(24);
    expect(r.ms.pending).toEqual([]);
    expect(r.ms.success).toEqual(['storage_24h']);
    ms = r.ms;
    expect(applyRights(eco(), ms.rights, cfg).storageHours).toBe(24);
  });

  test('AC-15: starter-offer - чекає, після першого побаченого результату перевірки «час», показується раз; після покупки набору не потрібен', () => {
    let ms = newMonetization();
    expect(ms.offer).toBe('wait');
    ms = offerDue(ms);
    expect(ms.offer).toBe('due');
    ms = offerShown(ms);
    expect(ms.offer).toBe('done');
    expect(offerDue(ms).offer).toBe('done');
    const bought = grantProduct(offerDue(newMonetization()), eco(), cfg, 'starter_pack', T);
    expect(bought.ms.offer).toBe('done');
    expect(offerDue({ ...newMonetization(), rights: { no_ads: false, starter_pack: true, storage_24h: false } }).offer).toBe('wait');
  });
});
