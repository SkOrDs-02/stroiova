// Аналітика реклами й покупок: ланцюжок ad_flow_id (offer -> start -> complete -> reward), збої, «Забрати», покупки, відновлення, збій збереження.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { saveErrorEvent } from '@/analytics/boot';
import { memoryAnalytics } from '@/analytics/service';
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import { DEFAULT_ENV } from '@/features/conveyor/analytics';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { fakeAds, fakePurchases } from '@/monetization/test-services';
import { onboardingDone } from '@/save/migrations';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const T0 = new Date(2025, 9, 10, 12).getTime();

function game(o: { ads?: ReturnType<typeof fakeAds>; shop?: ReturnType<typeof fakePurchases>; noAds?: boolean; bootEvents?: Parameters<typeof createConveyorStore>[2] extends infer I ? (I extends { bootEvents?: infer B } ? B : never) : never } = {}) {
  const m = memoryAnalytics();
  const ads = o.ads ?? fakeAds();
  const shop = o.shop ?? fakePurchases();
  const store = createConveyorStore(T0, bundledConfig, {
    installId: 'id-1',
    onboarding: onboardingDone(),
    state: { ...newGame(bundledConfig, T0), streamLevels: [40, 10, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, true, false, false], stageClerks: [true, true, true], signatures: 1000, hasNoAds: !!o.noAds },
    env: { ...DEFAULT_ENV, strict: true },
    analytics: { sessionNumber: 0, lastSessionEndMs: null, firstOpenSent: true },
    services: { analytics: m.service, ads, purchases: shop },
    ...(o.bootEvents ? { bootEvents: o.bootEvents } : {}),
  });
  store.setState({ lastMs: T0 });
  return { store, ads, shop, ...m };
}
const names = (m: { events: { name: string }[] }, from = 0) => m.events.slice(from).map((e) => e.name);

describe('реклама', () => {
  test('ланцюжок буста: offer (boosts_sheet) -> start -> complete -> boost_activate -> reward; один ad_flow_id; offer раз на сесію', async () => {
    const g = game();
    await render(<MainScreen store={g.store} />);
    g.events.length = 0;
    await fireEvent.press(screen.getByTestId('income-open'));
    expect(names(g)).toEqual(['ad_offer_show']);
    expect(g.events[0]!.props).toMatchObject({ placement: 'income_boost', entry_point: 'boosts_sheet', is_no_ads_claim: false, is_ad_ready: true, uses_today: 0, daily_limit: 3 });
    await fireEvent.press(screen.getByTestId('boost-ad'));
    expect(names(g)).toEqual(['ad_offer_show', 'ad_start', 'ad_complete', 'boost_activate', 'ad_reward_grant']);
    const ids = new Set(g.events.filter((e) => e.name.startsWith('ad_')).map((e) => e.props.ad_flow_id));
    expect(ids.size).toBe(1);
    expect(g.events.at(-1)!.props).toMatchObject({ reward_unit: 'boost_sec', reward_amount: 4 * 3600, is_no_ads_claim: false });
    expect(g.events.find((e) => e.name === 'boost_activate')!.props).toMatchObject({ source: 'ad', stacked_remaining_sec: 4 * 3600 });
  });

  test('збій: ролик закрито до нагороди - ad_fail з тим самим ad_flow_id', async () => {
    const g = game({ ads: fakeAds({ result: { kind: 'closed_early' } }) });
    await render(<MainScreen store={g.store} />);
    await fireEvent.press(screen.getByTestId('income-open'));
    await fireEvent.press(screen.getByTestId('boost-ad'));
    expect(names(g).slice(-3)).toEqual(['ad_offer_show', 'ad_start', 'ad_fail']);
    const fail = g.events.at(-1)!;
    expect(fail.props).toMatchObject({ stage: 'closed_early' });
    expect(fail.props.ad_flow_id).toBe(g.events.find((e) => e.name === 'ad_offer_show')!.props.ad_flow_id);
  });

  test('«Забрати» (куплено «Без реклами»): offer із is_no_ads_claim, без ad_start і ad_complete, reward із no_ads_pass', async () => {
    const g = game({ noAds: true });
    await render(<MainScreen store={g.store} />);
    g.events.length = 0;
    await fireEvent.press(screen.getByTestId('income-open'));
    await fireEvent.press(screen.getByTestId('boost-ad'));
    expect(names(g)).toEqual(['ad_offer_show', 'boost_activate', 'ad_reward_grant']);
    expect(g.events[0]!.props).toMatchObject({ is_no_ads_claim: true, is_ad_ready: true });
    expect(g.events[1]!.props).toMatchObject({ source: 'no_ads_pass' });
    expect(g.events[2]!.props).toMatchObject({ is_no_ads_claim: true });
  });
});

describe('покупки', () => {
  test('успіх: purchase_start (ціна зі стору, джерело) і purchase_complete', async () => {
    const g = game();
    await g.store.getState().purchase('no_ads');
    expect(names(g).slice(-2)).toEqual(['purchase_start', 'purchase_complete']);
    expect(g.events.at(-2)!.props).toMatchObject({ product_id: 'no_ads', price: 199, currency: 'UAH', source: 'tab' });
    expect(g.events.at(-1)!.props).toMatchObject({ product_id: 'no_ads', price: 199, currency: 'UAH', source: 'tab', is_first_purchase: true, purchase_number: 1, store: 'play_store' });
  });

  test('джерело starter_offer доходить до purchase_complete', async () => {
    const g = game();
    await g.store.getState().purchase('starter_pack', 'starter_offer');
    expect(g.events.at(-1)!.props).toMatchObject({ source: 'starter_offer', price: 79 });
  });

  test('помилка стору: purchase_fail з причиною й кодом', async () => {
    const g = game({ shop: fakePurchases({ result: { kind: 'error', reason: 'network', code: 'E42' } }) });
    await g.store.getState().purchase('storage_24h');
    expect(g.events.at(-1)).toMatchObject({ name: 'purchase_fail', props: { product_id: 'storage_24h', reason: 'network', error_code: 'E42', price: 99 } });
  });

  test('скасовано гравцем: purchase_fail user_cancelled', async () => {
    const g = game({ shop: fakePurchases({ result: { kind: 'cancelled' } }) });
    await g.store.getState().purchase('no_ads');
    expect(g.events.at(-1)).toMatchObject({ name: 'purchase_fail', props: { reason: 'user_cancelled' } });
  });

  test('відновлення: purchase_restore зі списком товарів', async () => {
    const g = game({ shop: fakePurchases({ restore: { kind: 'ok', owned: ['no_ads'] } }) });
    await g.store.getState().restore('shop_button');
    expect(g.events.find((e) => e.name === 'purchase_restore')!.props).toMatchObject({ trigger: 'shop_button', is_success: true, restored_product_ids: ['no_ads'] });
  });
});

describe('збій збереження на запуску', () => {
  test('app_error_log після session_start: відновлено з копії / почато заново; міграція несе схеми', () => {
    const a = game({ bootEvents: [saveErrorEvent({ reason: 'checksum' }, 'backup_slot')] });
    expect(names(a)).toEqual(['session_start', 'app_error_log']);
    expect(a.events[1]!.props).toMatchObject({ source: 'save_load', error_code: 'checksum', is_recovered: true, recovery: 'backup_slot' });
    const b = game({ bootEvents: [saveErrorEvent({ reason: 'migration', from: 17, to: 19 }, 'defaults')] });
    expect(b.events[1]!.props).toMatchObject({ source: 'save_migration', is_recovered: false, recovery: 'defaults', save_schema_from: 17, save_schema_to: 19 });
  });
});
