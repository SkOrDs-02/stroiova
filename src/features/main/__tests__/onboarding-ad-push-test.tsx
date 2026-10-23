// 002 кроки 10 і 11: коуч буста, ad-offer-first, push-preprompt (AC-14, AC-16…AC-19; 010 AC-7, AC-8).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { memoryAnalytics } from '@/analytics/service';
import { bundledConfig } from '@/economy/config';
import { T0 } from '@/economy/test-fixtures';
import { DEFAULT_ENV } from '@/features/conveyor/analytics';
import { createConveyorStore } from '@/features/conveyor/store';
import { t as onb } from '@/features/onboarding/texts';
import { adT } from '@/features/monetization/texts';
import { fakeAds } from '@/monetization/test-services';
import type { AdAvailability } from '@/monetization/types';
import { fakeNotifications } from '@/notifications/test-services';
import type { PushPermission } from '@/notifications/types';
import { onboardingDone } from '@/save/migrations';

import { MainScreen } from '../MainScreen';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const H = bundledConfig.params.adHours;

function game(o: { step: 10 | 11; playMs?: number; ads?: AdAvailability; noAds?: boolean; permission?: PushPermission } = { step: 10 }) {
  const m = memoryAnalytics();
  const ads = fakeAds({ availability: o.ads ?? 'ready' });
  const notifications = fakeNotifications({ permission: o.permission ?? 'not_asked' });
  const done = onboardingDone();
  const store = createConveyorStore(T0, bundledConfig, {
    installId: '8f3c1d52-0000-4000-8000-000000000001',
    env: { ...DEFAULT_ENV, strict: true },
    onboarding: { ...done, step: o.step, callsign: { type: 'excel', text: 'Ексель' }, gender: 'f', completed: [] },
    playtimeMs: o.playMs ?? 540_000,
    services: { analytics: m.service, ads, notifications },
  });
  if (o.noAds) store.setState({ state: { ...store.getState().state, hasNoAds: true } });
  return { store, m, ads, notifications };
}
const names = (m: { events: { name: string }[] }) => m.events.map((e) => e.name);

describe('крок 10: ad-offer-first', () => {
  test('AC-14: до 540 с коуча немає; о 540 с коуч на чипі, тап відкриває ad-offer-first, first_ad_offer і ad_offer_show', async () => {
    const g = game({ step: 10, playMs: 539_000 });
    await render(<MainScreen store={g.store} />);
    expect(screen.queryByTestId('coach-boost')).toBeNull();
    await act(async () => g.store.setState({ playtimeMs: 540_000 }));
    expect(screen.getByTestId('coach-boost')).toHaveTextContent(onb.b10Coach(H));
    await fireEvent.press(screen.getByTestId('income-open'));
    expect(screen.getByTestId('ad-offer-first')).toBeTruthy();
    expect(screen.getByTestId('aof-title')).toHaveTextContent(onb.b10Title(H));
    expect(screen.queryByTestId('boosts-sheet')).toBeNull();
    expect(g.store.getState().onboarding.step).toBe(11);
    const step = g.m.events.find((e) => e.name === 'onboarding_step_complete' && e.props.step_id === 'first_ad_offer');
    expect(step).toBeTruthy();
    expect(g.m.events.find((e) => e.name === 'ad_offer_show')!.props).toMatchObject({ placement: 'income_boost', entry_point: 'ad_offer_first', is_ad_ready: true });
  });

  test('ролик переглянуто: ×2 зараховано, модалка закрита, далі push-preprompt', async () => {
    const g = game({ step: 10 });
    await render(<MainScreen store={g.store} />);
    await fireEvent.press(screen.getByTestId('income-open'));
    await act(async () => fireEvent.press(screen.getByTestId('aof-watch')));
    expect(g.ads.shown).toEqual(['income_boost']);
    expect(g.store.getState().effects.some((e) => e.source === 'ad_boost')).toBe(true);
    expect(screen.queryByTestId('ad-offer-first')).toBeNull();
    expect(await screen.findByTestId('push-preprompt')).toBeTruthy();
  });

  test('AC-16: «Без реклами» - b10.sub_na і «Забрати»: ×2 без ролика, is_no_ads_claim, ad_start немає', async () => {
    const g = game({ step: 10, noAds: true });
    await render(<MainScreen store={g.store} />);
    await fireEvent.press(screen.getByTestId('income-open'));
    expect(screen.getByTestId('aof-sub')).toHaveTextContent(onb.b10SubNa);
    expect(screen.getByTestId('aof-watch')).toHaveTextContent(onb.b10CtaNa);
    await act(async () => fireEvent.press(screen.getByTestId('aof-watch')));
    expect(g.ads.shown).toEqual([]);
    expect(g.m.events.find((e) => e.name === 'ad_reward_grant')!.props).toMatchObject({ is_no_ads_claim: true });
    expect(names(g.m)).not.toContain('ad_start');
  });

  test('AC-17: немає мережі - «Ролика немає» з причиною, кнопка неактивна, крок 10 закрито, «Не зараз» відкриває push-preprompt', async () => {
    const g = game({ step: 10, ads: 'no_net' });
    await render(<MainScreen store={g.store} />);
    await fireEvent.press(screen.getByTestId('income-open'));
    expect(screen.getByTestId('aof-title')).toHaveTextContent(onb.b10NaTitle);
    expect(screen.getByTestId('aof-watch')).toBeDisabled();
    expect(screen.getByTestId('ad-offer-first')).toHaveTextContent(new RegExp(adT.naNet));
    expect(g.store.getState().onboarding.step).toBe(11);
    await fireEvent.press(screen.getByTestId('aof-no'));
    expect(await screen.findByTestId('push-preprompt')).toBeTruthy();
  });
});

describe('крок 11: push-preprompt', () => {
  test('AC-18: «Пізніше» - без системного запиту, declined / not_shown, онбординг завершено, шторка не вертається', async () => {
    const g = game({ step: 11 });
    await render(<MainScreen store={g.store} />);
    await fireEvent.press(await screen.findByTestId('pp-later'));
    expect(g.notifications.log.requests).toBe(0);
    expect(g.m.events.find((e) => e.name === 'push_permission_request')!.props).toMatchObject({ trigger: 'onboarding_session_end', pre_prompt_result: 'declined', os_result: 'not_shown' });
    expect(g.store.getState().onboarding.step).toBe('done');
    expect(screen.queryByTestId('push-preprompt')).toBeNull();
  });

  test('010 AC-7: «Так, сповіщати» - системний запит лише після шторки, trigger onboarding_session_end', async () => {
    const g = game({ step: 11 });
    await render(<MainScreen store={g.store} />);
    expect(g.notifications.log.requests).toBe(0);
    await act(async () => fireEvent.press(await screen.findByTestId('pp-yes')));
    expect(g.notifications.log.requests).toBe(1);
    expect(g.m.events.find((e) => e.name === 'push_permission_request')!.props).toMatchObject({ trigger: 'onboarding_session_end', pre_prompt_result: 'accepted', os_result: 'granted' });
    expect(g.store.getState().onboarding.step).toBe('done');
    expect(g.store.getState().settings.pushPermission).toBe('granted');
  });

  test('AC-19: вихід після кроку 10 - у наступній сесії шторка відкривається на main без модалок', async () => {
    const g = game({ step: 11 });
    g.store.setState({ offline: null });
    await render(<MainScreen store={g.store} />);
    expect(await screen.findByTestId('push-preprompt')).toBeTruthy();
  });

  test('010 AC-8: дозвіл є без запиту (Android 12) - шторки немає, крок 11 закрито', async () => {
    const g = game({ step: 11, permission: 'granted' });
    await render(<MainScreen store={g.store} />);
    await act(async () => {});
    expect(screen.queryByTestId('push-preprompt')).toBeNull();
    expect(g.store.getState().onboarding.step).toBe('done');
    expect(g.notifications.log.requests).toBe(0);
  });

  test('черга модалок: поки шторка відкрита, «Комбата шукають» чекає; після відповіді відкривається', async () => {
    const g = game({ step: 11 });
    await render(<MainScreen store={g.store} />);
    expect(await screen.findByTestId('push-preprompt')).toBeTruthy();
    const tg = g.store.getState().telegrams;
    await act(async () => g.store.setState({ telegrams: { ...tg, kombat: { ...tg.kombat, active: { startMs: T0, endMs: T0 + 3_600_000, runnerAtMs: null } } } }));
    expect(screen.queryByTestId('kombat-sheet')).toBeNull();
    await fireEvent.press(screen.getByTestId('pp-later'));
    expect(screen.getByTestId('kombat-sheet')).toBeTruthy();
  });
});

test('AC-14: boosts-sheet у тій самій сесії не забирає ad_offer_show у ad-offer-first; новий ad_flow_id', async () => {
  const g = game({ step: 10, playMs: 100_000 });
  await render(<MainScreen store={g.store} />);
  await fireEvent.press(screen.getByTestId('income-open'));
  expect(screen.getByTestId('boosts-sheet')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('boosts-close'));
  await act(async () => g.store.setState({ playtimeMs: 540_000 }));
  await fireEvent.press(screen.getByTestId('income-open'));
  const offers = g.m.events.filter((e) => e.name === 'ad_offer_show');
  expect(offers.map((e) => e.props.entry_point)).toEqual(['boosts_sheet', 'ad_offer_first']);
  expect(offers[1]!.props.ad_flow_id).not.toBe(offers[0]!.props.ad_flow_id);
});
