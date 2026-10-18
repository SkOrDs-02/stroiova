// 008 на екрані й у сторі: магазин (AC-13, 16, 17), шторка бустів (AC-2, 3, 7), офлайн ×2 (AC-4), гонка (AC-5), чекліст (AC-6),
// відмови реклами (AC-8…AC-10), «Без реклами» (AC-12), набір і сховище (AC-14), стартова пропозиція (AC-15), права (AC-18), відновлення (AC-19).
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { multStack } from '@/economy/game/income';
import { needsSaveNow } from '@/features/boot/useBoot';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { fakeAds, fakePurchases } from '@/monetization/test-services';
import { onboardingDone } from '@/save/migrations';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const HOUR = 3_600_000;
const local = (h: number, m = 0, day = 0) => new Date(2025, 9, 10 + day, h, m).getTime();
const T0 = local(12);

function game(opts: { ads?: ReturnType<typeof fakeAds>; shop?: ReturnType<typeof fakePurchases> } = {}) {
  const ads = opts.ads ?? fakeAds();
  const shop = opts.shop ?? fakePurchases();
  const store = createConveyorStore(T0, bundledConfig, { state: undefined as never, effects: [], pinned: null, services: { ads, purchases: shop } } as never);
  const s = store.getState().state;
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    state: { ...s, streamLevels: [40, 10, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, true, false, false], stageClerks: [true, true, true], signatures: 1000 },
  });
  return { store, ads, shop };
}

afterEach(async () => {
  await act(async () => {});
  await cleanup();
});

const open = async (store: ReturnType<typeof game>['store']) => {
  await render(<MainScreen store={store} />);
};

describe('шторка бустів', () => {
  test('AC-2: тап по доходу відкриває розбивку M; ролик → буст ×2 на 4 год, лічильник «сьогодні ще 2 з 3»', async () => {
    const { store, ads } = game();
    await open(store);
    await fireEvent.press(screen.getByTestId('income-open'));
    expect(screen.getByTestId('boosts-sheet')).toBeTruthy();
    expect(screen.getByTestId('boost-ad')).toHaveTextContent(/Буст\ ×2\ на\ 4\ год/);
    await fireEvent.press(screen.getByTestId('boost-ad'));
    expect(ads.shown).toEqual(['income_boost']);
    expect(multStack(store.getState().state, store.getState().cfg, T0, store.getState().effects).total).toBe(2);
    expect(store.getState().effects.filter((e) => e.source === 'ad_boost')).toHaveLength(1);
    expect(screen.getByTestId('toast')).toHaveTextContent(/Нагороду\ зараховано:\ ×2\ до\ підписів\ на\ 4\ год\./);
    expect(screen.getByTestId('boosts-sheet')).toHaveTextContent(/сьогодні ще 2 з 3/);
    expect(screen.getByTestId('boost-row-ad_boost')).toBeTruthy();
    expect(screen.getByTestId('boost-row-museum')).toHaveTextContent(/0\ з\ 8/);
  });

  test('AC-2: тричі - 12 год, потім «Ліміт на сьогодні»; при 9 год залишку - «Межа: 12 год»', async () => {
    const { store } = game();
    await open(store);
    await fireEvent.press(screen.getByTestId('income-open'));
    for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByTestId('boost-ad'));
    expect(screen.getByTestId('boost-ad')).toHaveTextContent(/Ліміт на сьогодні/);
    expect(screen.getByTestId('boost-ad')).toBeDisabled();
    // залишок 9 год і ще 2 спроби: межа; 3 з 3 без межі: ліміт
    const { store: s2 } = game();
    s2.setState({ effects: [{ kind: 'mult', source: 'ad_boost', value: 2, startMs: T0 - HOUR, endMs: T0 + 9 * HOUR }] });
    await act(async () => {});
    expect(await s2.getState().watchAd('income_boost')).toBe('blocked');
    const { store: s3 } = game();
    s3.setState({ monetization: { ...s3.getState().monetization, ads: { date: '2025-10-10', boost: 3, race: 0 } } });
    expect(await s3.getState().watchAd('income_boost')).toBe('blocked');
  });

  test('AC-7/10: ролик закрито раніше - нагороди немає, спроба не згоріла, тост; нове число о 00:00', async () => {
    const { store, ads } = game({ ads: fakeAds({ result: { kind: 'closed_early' } }) });
    await open(store);
    expect(await store.getState().watchAd('income_boost')).toBe('closed');
    expect(store.getState().effects).toEqual([]);
    expect(store.getState().monetization.ads.boost).toBe(0);
    expect(store.getState().events.at(-1)).toMatchObject({ type: 'adFail', stage: 'closed_early' });
    expect(ads.shown).toHaveLength(1);
    // 3 з 3 вчора - сьогодні знову 3
    store.setState({ monetization: { ...store.getState().monetization, ads: { date: '2025-10-10', boost: 3, race: 0 } }, lastMs: local(0, 1, 1) });
    ads.set({ result: { kind: 'earned' } });
    expect(await store.getState().watchAd('income_boost')).toBe('granted');
    expect(store.getState().monetization.ads).toEqual({ date: '2025-10-11', boost: 1, race: 0 });
  });

  test.each([
    ['no_fill', 'Ролика зараз немає'],
    ['no_net', "Немає зв'язку"],
    ['no_consent', 'без згоди'],
  ] as const)('AC-8: %s - кнопка вимкнена з причиною, ролик не показується', async (av, text) => {
    const { store, ads } = game({ ads: fakeAds({ availability: av }) });
    await open(store);
    await fireEvent.press(screen.getByTestId('income-open'));
    expect(screen.getByTestId('boost-ad')).toHaveTextContent(/Ролика немає/);
    expect(screen.getByTestId('boost-ad')).toBeDisabled();
    expect(screen.getByTestId('boosts-sheet')).toHaveTextContent(new RegExp(text));
    expect(await store.getState().watchAd('income_boost')).toBe('unavailable');
    expect(ads.shown).toEqual([]);
  });

  test('AC-12: «Без реклами» - «Забрати» без ролика, ті самі ліміти; AdMob не викликається; M ×1,3', async () => {
    const { store, ads, shop } = game();
    await act(async () => store.getState().purchase('no_ads'));
    expect(shop.bought).toEqual(['no_ads']);
    store.getState().closeIapSuccess();
    await open(store);
    expect(multStack(store.getState().state, store.getState().cfg, T0, []).total).toBe(bundledConfig.params.paidMult);
    await fireEvent.press(screen.getByTestId('income-open'));
    expect(screen.getByTestId('boost-ad')).toHaveTextContent(/Забрати\ \+4\ год\ до\ ×2/);
    expect(screen.getByTestId('boosts-sheet')).toHaveTextContent(/Без реклами: без перегляду · сьогодні ще 3 з 3/);
    expect(screen.queryByTestId('boosts-shop')).toBeNull();
    await fireEvent.press(screen.getByTestId('boost-ad'));
    expect(ads.shown).toEqual([]);
    expect(store.getState().effects.some((e) => e.source === 'ad_boost')).toBe(true);
    expect(store.getState().events.some((e) => e.type === 'adRewardGrant' && e.isNoAdsClaim)).toBe(true);
  });
});

describe('офлайн ×2, гонка, чекліст', () => {
  /** Гравець повернувся після 2 год: довідка є, діловоди працюють */
  function returned(ads = fakeAds()) {
    const g = game({ ads });
    g.store.getState().away(T0, T0 + 2 * HOUR);
    return g;
  }

  test('AC-4: «Забрати ×2» за ролик - рівно подвійно, подія is_doubled; без ролика «Забрати» одинарно', async () => {
    const plain = returned();
    const earned = plain.store.getState().offline!.earned;
    expect(earned).toBeGreaterThan(0);
    const before = plain.store.getState().state.signatures;
    await open(plain.store);
    expect(screen.getByTestId('offline-double')).toHaveTextContent(/Забрати ×2/);
    await fireEvent.press(screen.getByTestId('offline-double'));
    expect(plain.ads.shown).toEqual(['offline_double']);
    expect(plain.store.getState().offline).toBeNull();
    expect(plain.store.getState().state.signatures - before).toBeCloseTo(earned * 2, 3);
    expect(plain.store.getState().events.find((e) => e.type === 'offlineIncomeClaim')).toMatchObject({ isDoubled: true, doubleSource: 'ad' });
    const single = returned();
    const b2 = single.store.getState().state.signatures;
    await open(single.store);
    await fireEvent.press(screen.getByTestId('offline-claim'));
    expect(single.store.getState().state.signatures - b2).toBeCloseTo(earned, 3);
    expect(single.store.getState().state.offlineDoubles.count).toBe(0);
  });

  test('AC-4: 4-те повернення за день - лише «Забрати» і «Ліміт ×2 на сьогодні»', async () => {
    const g = returned();
    g.store.setState({ state: { ...g.store.getState().state, offlineDoubles: { date: '2025-10-10', count: 3 } } });
    await open(g.store);
    expect(screen.getByTestId('offline-double')).toHaveTextContent(/Ліміт\ ×2\ на\ сьогодні/);
    expect(screen.getByTestId('offline-double')).toBeDisabled();
    expect(screen.getByTestId('offline-claim')).toBeTruthy();
  });

  test('AC-5: гонка - «−50% часу акта»: залишок вдвічі менший; після 3 разів за добу - «Ліміт на сьогодні»', async () => {
    const g = game();
    const st = g.store.getState();
    g.store.setState({
      inspections: { ...st.inspections, installMs: local(9) },
      state: { ...st.state, streamLevels: [40, 10, 0, 0] },
    });
    g.store.getState().away(local(12, 5), local(8, 30, 1));
    if (g.store.getState().offline) g.store.getState().claim();
    g.store.setState({ inspections: { ...g.store.getState().inspections, active: null, callPending: false } });
    g.store.getState().ackGift();
    const left = () => g.store.getState().race.active!.actEndMs - g.store.getState().lastMs;
    const was = left();
    expect(await g.store.getState().watchAd('race_speedup')).toBe('granted');
    expect(left()).toBeCloseTo(was / 2, -2);
    expect(g.store.getState().race.active!.sped.at(-1)).toMatchObject({ method: 'ad' });
    await g.store.getState().watchAd('race_speedup');
    await g.store.getState().watchAd('race_speedup');
    expect(await g.store.getState().watchAd('race_speedup')).toBe('blocked');
    await open(g.store);
    await fireEvent.press(screen.getByTestId('race-speed'));
    expect(screen.getByTestId('race-ad')).toHaveTextContent(/Ліміт\ на\ сьогодні/);
  });

  test('AC-6: «Усе за рекламу» - чекліст 5 з 5, раз за перевірку; з «Без реклами» - «Забрати все» без ролика', async () => {
    const g = game();
    g.store.setState({ onboarding: onboardingDone(), state: { ...g.store.getState().state, streamLevels: [40, 0, 0, 0], signatures: 0 } });
    g.store.setState({ lastMs: local(9, 5), inspections: { ...g.store.getState().inspections, installMs: local(9) } });
    g.store.getState().away(local(9, 5), local(17));
    if (g.store.getState().offline) g.store.getState().claim();
    g.store.getState().ackInspCall();
    g.store.getState().ackInspWarning(true);
    await open(g.store);
    expect(screen.getByTestId('insp-ad')).toHaveTextContent(/Усе\ за\ рекламу/);
    await fireEvent.press(screen.getByTestId('insp-ad'));
    expect(g.ads.shown).toEqual(['inspection_checklist']);
    expect(g.store.getState().inspections.active!.items.every((i) => i.done)).toBe(true);
    expect(g.store.getState().events.filter((e) => e.type === 'inspectionItemComplete' && e.method === 'ad').length).toBeGreaterThanOrEqual(3);
    expect(await g.store.getState().watchAd('inspection_checklist')).toBe('blocked');
  });
});

describe('магазин і покупки', () => {
  test('AC-16: ціни зі стору, три картки, «Відновити покупки»; без мережі - банер, кнопки вимкнено', async () => {
    const { store, shop } = game();
    await open(store);
    await fireEvent.press(screen.getByTestId('tab-shop'));
    expect(screen.getByTestId('buy-no_ads')).toHaveTextContent(/Купити\ ·\ 199\ ₴/);
    expect(screen.getByTestId('buy-starter_pack')).toHaveTextContent(/Купити\ ·\ 79\ ₴/);
    expect(screen.getByTestId('buy-storage_24h')).toHaveTextContent(/Купити\ ·\ 99\ ₴/);
    expect(screen.getByTestId('shop-restore')).toBeTruthy();
    expect(screen.queryByTestId('shop-banner')).toBeNull();
    await act(async () => shop.set({ status: 'no_net' }));
    await fireEvent.press(screen.getByTestId('tab-stroyova'));
    await fireEvent.press(screen.getByTestId('tab-shop'));
    expect(screen.getByTestId('shop-banner')).toHaveTextContent(/Немає зв'язку/);
    expect(screen.getByTestId('buy-no_ads')).toBeDisabled();
    expect(screen.getByTestId('shop-restore')).toBeDisabled();
    expect(screen.getByTestId('shop-boost-ad')).toBeTruthy();
  });

  test('ціни ще вантажаться - «Завантажуємо ціну»; стор недоступний - «Покупка недоступна»', async () => {
    const { store } = game({ shop: fakePurchases({ status: 'loading', prices: {} }) });
    await open(store);
    await fireEvent.press(screen.getByTestId('tab-shop'));
    expect(screen.getByTestId('buy-no_ads')).toHaveTextContent(/Завантажуємо\ ціну/);
    const g2 = game({ shop: fakePurchases({ status: 'no_billing', prices: {} }) });
    await render(<MainScreen store={g2.store} />);
  });

  test('AC-14/17: «Стартовий набір» - +50 000, бак 12 год, iap-success; картка зникає з магазину', async () => {
    const { store, shop } = game();
    await open(store);
    await fireEvent.press(screen.getByTestId('tab-shop'));
    const before = store.getState().state.signatures;
    await fireEvent.press(screen.getByTestId('buy-starter_pack'));
    expect(shop.bought).toEqual(['starter_pack']);
    expect(store.getState().state.signatures - before).toBe(50_000);
    expect(store.getState().state.fuelCapacityMs).toBe(12 * HOUR);
    expect(screen.getByTestId('iap-success')).toHaveTextContent(/Стартовий набір.*Підписи\+50 000.*Бак генератора12 год/);
    await fireEvent.press(screen.getByTestId('iap-ok'));
    expect(screen.queryByTestId('iap-success')).toBeNull();
    expect(screen.queryByTestId('product-starter_pack')).toBeNull();
    expect(store.getState().events.some((e) => e.type === 'purchaseComplete' && e.productId === 'starter_pack')).toBe(true);
  });

  test('AC-17: скасування - без тосту; помилка - «Покупка не пройшла. Гроші не списано.»; Ask to Buy - тост і позначка', async () => {
    const { store, shop } = game();
    await open(store);
    await fireEvent.press(screen.getByTestId('tab-shop'));
    shop.set({ result: { kind: 'cancelled' } });
    await fireEvent.press(screen.getByTestId('buy-no_ads'));
    expect(screen.queryByTestId('toast')).toBeNull();
    expect(store.getState().events.at(-1)).toMatchObject({ type: 'purchaseFail', reason: 'user_cancelled' });
    shop.set({ result: { kind: 'error', reason: 'store_problem' } });
    await fireEvent.press(screen.getByTestId('buy-no_ads'));
    expect(screen.getByTestId('toast')).toHaveTextContent(/Покупка\ не\ пройшла\.\ Гроші\ не\ списано\./);
    await act(async () => store.getState().clearToast());
    shop.set({ result: { kind: 'pending' } });
    await fireEvent.press(screen.getByTestId('buy-storage_24h'));
    expect(screen.getByTestId('toast')).toHaveTextContent(/Покупка\ очікує\ підтвердження/);
    expect(screen.getByTestId('pending-storage_24h')).toHaveTextContent(/Очікує\ підтвердження/);
    expect(screen.getByTestId('buy-storage_24h')).toBeDisabled();
    expect(store.getState().state.storageHours).toBe(8);
    // схвалено, поки гра була закрита: права з CustomerInfo на запуску
    shop.set({ rights: { no_ads: false, starter_pack: false, storage_24h: true } });
    await act(async () => store.getState().syncPurchases());
    expect(store.getState().state.storageHours).toBe(24);
    expect(store.getState().monetization.pending).toEqual([]);
    expect(screen.getByTestId('iap-success')).toHaveTextContent(/Розширене сховище/);
  });

  test('AC-19: «Відновити покупки» - «Відновлено: «Без реклами». ×1,3 уже діє.»; порожній акаунт; помилка', async () => {
    const { store, shop } = game();
    await open(store);
    await fireEvent.press(screen.getByTestId('tab-shop'));
    shop.set({ restore: { kind: 'ok', owned: [] } });
    await fireEvent.press(screen.getByTestId('shop-restore'));
    expect(screen.getByTestId('toast')).toHaveTextContent(/Покупок\ на\ цьому\ акаунті\ не\ знайдено\./);
    await act(async () => store.getState().clearToast());
    shop.set({ restore: { kind: 'error' } });
    await fireEvent.press(screen.getByTestId('shop-restore'));
    expect(screen.getByTestId('toast')).toHaveTextContent(/Не\ вдалося\ відновити\.\ Перевір\ зв’язок\ і\ спробуй\ ще\./);
    await act(async () => store.getState().clearToast());
    shop.set({ restore: { kind: 'ok', owned: ['no_ads'] } });
    await fireEvent.press(screen.getByTestId('shop-restore'));
    expect(screen.getByTestId('toast')).toHaveTextContent(/Відновлено:\ «Без\ реклами»\.\ ×1,3\ уже\ діє\./);
    expect(store.getState().state.hasNoAds).toBe(true);
    // відновлення без iap-success
    expect(store.getState().monetization.success).toEqual([]);
    expect(store.getState().events.some((e) => e.type === 'purchaseRestore' && e.isSuccess)).toBe(true);
  });

  test('AC-18: права з кешу діють без мережі; refund онлайн вимикає ефект', async () => {
    const { store, shop } = game();
    await act(async () => store.getState().purchase('no_ads'));
    expect(store.getState().state.hasNoAds).toBe(true);
    shop.set({ rights: null, status: 'no_net' });
    await act(async () => store.getState().syncPurchases());
    expect(store.getState().state.hasNoAds).toBe(true);
    shop.set({ rights: { no_ads: false, starter_pack: false, storage_24h: false }, status: 'ready' });
    await act(async () => store.getState().syncPurchases());
    expect(store.getState().state.hasNoAds).toBe(false);
  });

  test('AC-20: у магазині, наборі й успіху немає слів про фонд, відсоток, допомогу чи пожертви', async () => {
    const { store } = game();
    await open(store);
    await fireEvent.press(screen.getByTestId('tab-shop'));
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/фонд|пожертв|допомог|%/i);
  });
});

describe('стартова пропозиція (AC-15)', () => {
  test('після першого побаченого акта перевірки - один раз starter-offer без таймера; «Не зараз» закриває; набір лежить у магазині', async () => {
    const { store } = game();
    store.setState({ onboarding: onboardingDone(), state: { ...store.getState().state, streamLevels: [40, 0, 0, 0] }, inspections: { ...store.getState().inspections, installMs: local(9) }, lastMs: local(9, 5) });
    store.getState().away(local(9, 5), local(17));
    if (store.getState().offline) store.getState().claim();
    store.getState().ackInspCall();
    store.getState().ackInspWarning(false);
    const a = store.getState().inspections.active!;
    store.getState().tick(a.arrMs + 1000);
    await open(store);
    expect(screen.getByTestId('insp-result')).toBeTruthy();
    expect(screen.queryByTestId('starter-offer')).toBeNull();
    await fireEvent.press(screen.getByTestId('insp-result-ok'));
    const so = screen.getByTestId('starter-offer');
    expect(so).toHaveTextContent(/Стартовий набір.*50 000.*12 год замість 6.*79 ₴/);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/лише зараз|Найпопулярніше/);
    await fireEvent.press(screen.getByTestId('so-later'));
    expect(screen.queryByTestId('starter-offer')).toBeNull();
    expect(store.getState().monetization.offer).toBe('done');
    await fireEvent.press(screen.getByTestId('tab-shop'));
    expect(screen.getByTestId('product-starter_pack')).toBeTruthy();
  });
});

describe('запис у мить події', () => {
  test('нагорода за ролик і куплений товар вимагають негайного запису, не 5 с автозапису', async () => {
    const { store } = game();
    let urgent = 0;
    store.subscribe((st, prev) => {
      if (needsSaveNow(st, prev)) urgent++;
    });
    await store.getState().watchAd('income_boost');
    expect(urgent).toBeGreaterThan(0);
    const before = urgent;
    await store.getState().purchase('storage_24h');
    expect(urgent).toBeGreaterThan(before);
  });
});

describe('збірка без SDK', () => {
  test('типові сервіси: ролика немає, покупка недоступна, гра працює далі', async () => {
    const store = createConveyorStore(T0, bundledConfig);
    store.setState({ onboarding: onboardingDone() });
    await open(store);
    await fireEvent.press(screen.getByTestId('income-open'));
    expect(screen.getByTestId('boost-ad')).toHaveTextContent(/Ролика\ немає/);
    await fireEvent.press(screen.getByTestId('boosts-close'));
    await fireEvent.press(screen.getByTestId('tab-shop'));
    expect(screen.getByTestId('shop-banner')).toBeTruthy();
    expect(screen.getByTestId('buy-no_ads')).toBeDisabled();
  });
});
