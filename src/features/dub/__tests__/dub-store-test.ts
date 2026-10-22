// 013 FR-23…FR-30 у сторі: № 112 і пропозиція після тиші, «Прийняти до виконання» (скидання Р1, масштаб, № 113, розмут),
// закриття Дубля шостою конвертацією, рекорд, збереження.
import { bundledConfig } from '@/economy/config';
import { levelItems } from '@/economy/core';
import { newGame } from '@/economy/game/state';
import { createConveyorStore, gameSave } from '@/features/conveyor/store';
import { onboardingDone } from '@/save/migrations';
import { newFinale } from '@/finale/finale';

const T0 = new Date(2025, 9, 10, 12).getTime();
const DAY = 86_400_000;
const ORDER = bundledConfig.params.convert.order;
const QUIET_DONE = { startMs: T0 - 8 * DAY, yMs: T0 - 7.5 * DAY, scriptNs: 0, done: { order: T0 - 8 * DAY, script: T0 - 7.5 * DAY, last_book: T0 - 7 * DAY, call: T0 - 7 * DAY, credits: T0 - 7 * DAY } };

/** Р5, шість цифрових ланок, фінал дійшов до кінця тижня тиші */
function atOffer(quiet = true) {
  const store = createConveyorStore(T0, bundledConfig, {
    state: { ...newGame(bundledConfig, T0), level: 5, digital: ORDER, prestigePoints: 1840, lifetimeCycle: 5e12, signatures: 123 },
    onboarding: onboardingDone(),
    finale: { ...newFinale(), ...QUIET_DONE, done: quiet ? { ...QUIET_DONE.done, quiet: T0 - 0.5 * DAY } : QUIET_DONE.done },
  });
  store.setState({ lastMs: T0 });
  return store;
}
const ids = (s: ReturnType<typeof atOffer>) => s.getState().telegrams.inbox.map((x) => x.id);

describe('пропозиція Дубля після тижня тиші', () => {
  test('AC-16: тиша минула - приходить № 112 з пропозицією Дубля 1; ліміт «Нових» не займає', () => {
    const store = atOffer(false);
    store.getState().tick(T0 + 60_000);
    expect(store.getState().finale.done.quiet).toBeDefined();
    expect(ids(store)).toContain('tg_0112_duplicate_on_paper');
    const item = store.getState().telegrams.inbox.find((x) => x.id === 'tg_0112_duplicate_on_paper')!;
    expect(item.status).toBe('new');
    expect(store.getState().dub.offer).toMatchObject({ n: 1 });
    expect(store.getState().events.some((e) => e.type === 'finaleStepStart' && e.step === 'endless_offer')).toBe(true);
    // розсилка ще вимкнена: за кілька діб - жодної нової
    const n = store.getState().telegrams.inbox.length;
    for (let d = 1; d <= 3; d++) store.getState().tick(T0 + d * DAY);
    expect(store.getState().telegrams.inbox).toHaveLength(n);
  });

  test('запис, що застав тишу закритою без пропозиції (вбито між кроками), відновлює її й № 112', () => {
    const store = atOffer(true);
    store.getState().tick(T0 + 60_000);
    expect(store.getState().dub.offer).toMatchObject({ n: 1 });
    expect(ids(store)).toContain('tg_0112_duplicate_on_paper');
  });

  test('відкриття № 112 лишає її в «Нових» (keepInNewUntil)', () => {
    const store = atOffer(true);
    store.getState().tick(T0 + 60_000);
    const uid = store.getState().telegrams.inbox.find((x) => x.id === 'tg_0112_duplicate_on_paper')!.uid;
    store.getState().openItem(uid);
    expect(store.getState().telegrams.inbox.find((x) => x.uid === uid)).toMatchObject({ status: 'new', read: true });
  });
});

describe('«Прийняти до виконання» (AC-17, AC-18)', () => {
  function accepted() {
    const store = atOffer(true);
    store.getState().tick(T0 + 60_000);
    store.setState({
      digit: { ...store.getState().digit, counts: { '1': 3, '2': 4 }, levelExitAllowed: true, total: 20 },
      effects: [{ kind: 'factor', source: 'sedo_failure', value: 0.5, target: { type: 'stage', id: 'kombat' }, startMs: T0, endMs: T0 + 1e6 }],
    });
    store.getState().tick(T0 + 120_000);
    return store;
  }

  test('без пропозиції прийняти не можна', () => {
    const store = createConveyorStore(T0, bundledConfig);
    expect(store.getState().dubAccept()).toBe(false);
  });

  test('FR-24: Р1, нуль підписів, рівні й діловоди скинуто, цифрових ланок немає, лічильники цифровізацій і вихід скинуто; P_total і музей лишились', () => {
    const store = accepted();
    const g0 = store.getState();
    const museum0 = g0.museum;
    const rep0 = g0.telegrams.reputation.value;
    expect(store.getState().dubAccept()).toBe(true);
    const g = store.getState();
    expect(g.state).toMatchObject({ level: 1, signatures: 0, lifetimeCycle: 0, digital: [], prestigePoints: 1840 });
    expect(g.state.streamLevels).toEqual([1, 0, 0, 0]);
    expect(g.state.streamClerks.every((c) => !c)).toBe(true);
    expect(g.digit).toMatchObject({ counts: {}, levelExitAllowed: false, total: 20, ceremony: null });
    expect(g.museum).toBe(museum0);
    expect(g.telegrams.reputation.value).toBe(rep0);
    expect(g.dub).toMatchObject({ n: 1, offer: null, closed: null });
    expect(g.dub.earned).toBe(5e12);
    expect(g.dub.record).toMatchObject({ dub: 1 });
    expect(g.effects.some((e) => e.source === 'sedo_failure')).toBe(false);
  });

  test('№ 113 приходить, № 112 іде в архів, крок endless_offer закрито, розсилка знову йде', () => {
    const store = accepted();
    store.getState().dubAccept();
    const g = store.getState();
    expect(ids(store)).toContain('tg_0113_mailing_resumed');
    expect(g.telegrams.inbox.find((x) => x.id === 'tg_0112_duplicate_on_paper')).toMatchObject({ status: 'archive' });
    expect(g.finale.done.endless_offer).toBeDefined();
    expect(g.events.some((e) => e.type === 'finaleStepComplete' && e.step === 'endless_offer')).toBe(true);
    const ev = g.events.find((e) => e.type === 'dubStart');
    expect(ev).toMatchObject({ type: 'dubStart', dubNumber: 1, pointsTotal: 1840 });
    expect(g.events.some((e) => e.type === 'personalRecordUpdate')).toBe(false);
    // телеграми знову приходять за розкладом (розмут)
    const n = g.telegrams.inbox.length;
    store.setState({ telegrams: { ...g.telegrams, startMs: T0 - 30 * DAY } });
    for (let d = 1; d <= 4; d++) store.getState().tick(T0 + 120_000 + d * DAY);
    expect(store.getState().telegrams.inbox.length).toBeGreaterThan(n);
  });

  test('AC-18: після прийняття виробіток «Рапортів» ×dup.mult, дільник і вихід з рівня масштабовано; конфіг-основа не змінена', () => {
    const store = accepted();
    const base = bundledConfig.params;
    store.getState().dubAccept();
    const c = store.getState().cfg;
    expect(c.dub).toMatchObject({ n: 1 });
    const a = levelItems(base, 1).streams[0]!;
    const b = levelItems(c.params, 1).streams[0]!;
    expect(b.rate / a.rate).toBeCloseTo(base.dup.mult, 6);
    expect(c.params.levels[0]!.exitDigitizations).toBe(base.dup.exitDigitizations);
    expect(c.params.levels[0]!.prestigeDivisor).toBeCloseTo(base.levels[0]!.prestigeDivisor * base.dup.divisorMult, 6);
    expect(bundledConfig.dub).toBeUndefined();
  });

  test('FR-24: другий Дубль не повторює фінал і не доставляє № 113 вдруге', () => {
    const store = accepted();
    store.getState().dubAccept();
    store.setState({ state: { ...store.getState().state, digital: ORDER, lifetimeCycle: 7e12 } });
    expect(store.getState().finale.startMs).toBe(QUIET_DONE.startMs);
    expect(store.getState().dub.closed).toMatchObject({ n: 1, seen: false });
    expect(store.getState().dub.offer).toMatchObject({ n: 2 });
    const before = ids(store).filter((x) => x === 'tg_0113_mailing_resumed').length;
    expect(store.getState().dubAccept()).toBe(true);
    expect(ids(store).filter((x) => x === 'tg_0113_mailing_resumed')).toHaveLength(before);
    expect(store.getState().dub.n).toBe(2);
  });
});

describe('закриття Дубля (AC-21) і рекорд (AC-20)', () => {
  function inDub(n = 1) {
    const store = atOffer(true);
    store.getState().tick(T0 + 60_000);
    store.getState().dubAccept();
    for (let i = 1; i < n; i++) {
      store.setState({ state: { ...store.getState().state, digital: ORDER, lifetimeCycle: 1e13 } });
      store.getState().dubAccept();
    }
    return store;
  }

  test('AC-21: шоста конвертація в Дублі - акт «Дубль N закрито» і пропозиція Дубля N+1 з іншим модифікатором, фінал не стартує', () => {
    const store = inDub(1);
    const mod = store.getState().dub.modifier;
    store.setState({ state: { ...store.getState().state, digital: ORDER.slice(0, 5) } });
    expect(store.getState().dub.closed).toBeNull();
    store.setState({ state: { ...store.getState().state, digital: ORDER } });
    const d = store.getState().dub;
    expect(d.closed).toMatchObject({ n: 1, seen: false });
    expect(d.offer).toMatchObject({ n: 2 });
    expect(d.offer!.modifier).not.toBe(mod);
    expect(store.getState().events.some((e) => e.type === 'dubClosed')).toBe(true);
    store.getState().dubAck();
    expect(store.getState().dub.closed!.seen).toBe(true);
  });

  test('AC-20: старт Дубля 3 з рекордом «Дубль 2» - тост і personalRecordUpdate', () => {
    const store = inDub(2);
    store.setState({ state: { ...store.getState().state, digital: ORDER, lifetimeCycle: 1e14 } });
    expect(store.getState().dub.record.dub).toBe(2);
    store.getState().clearToast();
    store.getState().dubAccept();
    expect(store.getState().dub).toMatchObject({ n: 3 });
    expect(store.getState().events.filter((e) => e.type === 'personalRecordUpdate').at(-1)).toMatchObject({ recordType: 'dub', value: 3, previous: 2 });
    expect(store.getState().toast).toMatchObject({ kind: 'text', text: 'Новий особистий рекорд' });
  });

  test('цифровізація в Дублі додає цикл у «підписів за весь час»', () => {
    const store = inDub(1);
    const earned0 = store.getState().dub.earned;
    store.setState({ state: { ...store.getState().state, streamLevels: [1, 1, 1, 1], signatures: 1e9, lifetimeCycle: 4e18 } });
    expect(store.getState().digitize()).toBe(true);
    expect(store.getState().dub.earned).toBeCloseTo(earned0 + 4e18, -8);
  });
});

describe('FR-30: збереження', () => {
  test('gameSave віддає dub, а новий стор відновлює масштаб cfg з нього', () => {
    const store = atOffer(true);
    store.getState().tick(T0 + 60_000);
    store.getState().dubAccept();
    const save = gameSave(store);
    expect(save.dub).toMatchObject({ n: 1 });
    const again = createConveyorStore(T0 + 1, bundledConfig, { state: save.economy, dub: save.dub, onboarding: onboardingDone(), finale: save.finale });
    expect(again.getState().cfg.dub).toMatchObject({ n: 1 });
    expect(again.getState().cfg.params.levels[0]!.rateMult).toBeCloseTo(bundledConfig.params.levels[0]!.rateMult * bundledConfig.params.dup.mult, 6);
  });

  test('скидання прогресу забуває Дублі й повертає базовий конфіг', () => {
    const store = atOffer(true);
    store.getState().tick(T0 + 60_000);
    store.getState().dubAccept();
    store.getState().resetProgress();
    expect(store.getState().dub.n).toBe(0);
    expect(store.getState().cfg).toBe(bundledConfig);
  });
});

describe('AC-18, AC-19: вихід з рівня, пальне, перевірки', () => {
  function inDub1() {
    const store = atOffer(true);
    store.getState().tick(T0 + 60_000);
    store.getState().dubAccept();
    return store;
  }

  test('AC-18: на Р1 у Дублі вихід - після dup.exitDigitizations цифровізацій; онбординг не повертається', () => {
    const store = inDub1();
    const exit = bundledConfig.params.dup.exitDigitizations;
    store.setState({ state: { ...store.getState().state, streamLevels: [1, 1, 1, 1], lifetimeCycle: 4e18 } });
    for (let i = 1; i < exit; i++) {
      expect(store.getState().digitize()).toBe(true);
      expect(store.getState().state.level).toBe(1);
      store.getState().closeDigitStep();
      store.getState().closeDigitStep();
      store.setState({ state: { ...store.getState().state, streamLevels: [1, 1, 1, 1], lifetimeCycle: 4e18 } });
    }
    expect(store.getState().digitize()).toBe(true);
    expect(store.getState().state.level).toBe(2);
    expect(store.getState().onboarding.step).toBe('done');
  });

  test('AC-19: «Без Діда» - повний бак дає ×fuelMult; «Мокра печатка» - планова перераховується від старту Дубля', () => {
    const store = atOffer(true);
    store.getState().tick(T0 + 60_000);
    store.setState({ dub: { ...store.getState().dub, offer: { ...store.getState().dub.offer!, modifier: 'no_did' } } });
    store.getState().dubAccept();
    const c = store.getState().cfg;
    expect(c.params.fuelBonus).toBe(bundledConfig.params.dup.noDid.fuelMult);

    const w = atOffer(true);
    w.getState().tick(T0 + 60_000);
    w.setState({
      dub: { ...w.getState().dub, offer: { ...w.getState().dub.offer!, modifier: 'wet_seal' } },
      inspections: { ...w.getState().inspections, nextArrMs: T0 + 100 * DAY },
    });
    w.getState().dubAccept();
    const next = w.getState().inspections.nextArrMs!;
    expect(next).toBeLessThan(T0 + 100 * DAY);
    expect(w.getState().cfg.params.inspIntervalMaxH).toBeCloseTo(bundledConfig.params.inspIntervalMaxH * bundledConfig.params.dup.wetSeal.intervalMult, 6);
  });
});
