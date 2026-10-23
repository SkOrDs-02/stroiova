// 010 на екрані й у сторі: меню й профіль (AC-20), налаштування (AC-9, AC-10, AC-13), скидання (AC-14), «Про гру», звіти, ліцензії (AC-18, AC-19).
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { isHapticsEnabled, isSoundEnabled, setHapticsEnabled, setSoundEnabled } from '@/features/onboarding/haptics';
import { fakePurchases } from '@/monetization/test-services';
import { fakeLinks, fakeNotifications } from '@/notifications/test-services';
import { onboardingDone } from '@/save/migrations';

import pkg from '../../../../package.json';
import { aboutCfg, libraryRows } from '../data';
import { setT } from '../texts';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

/** Рядковий матчер у RNTL точний: для підрядка потрібен регулярний вираз */
const has = (t: string) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const local = (h: number, m = 0, day = 0) => new Date(2025, 9, 10 + day, h, m).getTime();
const T0 = local(15);

function game(opts: { notifications?: ReturnType<typeof fakeNotifications>; links?: ReturnType<typeof fakeLinks>; shop?: ReturnType<typeof fakePurchases>; gender?: 'm' | 'f'; callsign?: string; permission?: 'granted' | 'denied' | 'not_asked' } = {}) {
  const notifications = opts.notifications ?? fakeNotifications({ permission: 'granted' });
  const links = opts.links ?? fakeLinks();
  const shop = opts.shop ?? fakePurchases();
  const store = createConveyorStore(T0, bundledConfig, { installId: 'id-1234', services: { notifications, links, purchases: shop } });
  const s = store.getState().state;
  store.setState({
    onboarding: { ...onboardingDone(), callsign: { type: 'custom', text: opts.callsign ?? 'Ексель' }, gender: opts.gender ?? 'm' },
    lastMs: T0,
    inspections: { ...store.getState().inspections, installMs: local(9, 0, -3) },
    settings: { ...store.getState().settings, pushPermission: opts.permission ?? 'granted' },
    state: { ...s, level: 1, streamLevels: [40, 10, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, true, false, false], stageClerks: [true, true, true], signatures: 1000 },
  });
  return { store, notifications, links, shop };
}
afterEach(async () => {
  await act(async () => {});
  await cleanup();
  setHapticsEnabled(true);
  setSoundEnabled(true);
});

const openMenu = async (store: ReturnType<typeof game>['store']) => {
  await render(<MainScreen store={store} />);
  await fireEvent.press(screen.getByTestId('menu-open'));
};

describe('меню', () => {
  test('шапка «позивний · посада», чотири пункти, підвал з версією; «Меню» на головному', async () => {
    const { store } = game();
    await openMenu(store);
    expect(screen.getByTestId('menu-who')).toHaveTextContent(has('Ексель · начальник стройової частини'));
    for (const id of ['menu-profile', 'menu-curios', 'menu-settings', 'menu-about']) expect(screen.getByTestId(id)).toBeTruthy();
    expect(screen.getByTestId('menu-foot')).toHaveTextContent(/Stroiova\ .+\ ·\ прогрес\ зберігається\ на\ телефоні/);
    expect(screen.queryByTestId('menu-curios-badge')).toBeNull();
  });

  test('AC-20: новий запис курйозів - бейдж «нове»; після перегляду списку бейджа немає', async () => {
    const { store } = game();
    const tg = store.getState().telegrams;
    store.setState({
      state: { ...store.getState().state, level: 2 },
      telegrams: { ...tg, startMs: T0, inbox: [{ uid: 'tg_0015_paper_copy#1', id: 'tg_0015_paper_copy', kind: 'telegram', receivedAt: T0, status: 'new' }], deliveries: 1 },
    });
    store.getState().answerTelegram('tg_0015_paper_copy#1', 'diligent');
    expect(store.getState().museum.curios.length).toBe(1);
    await openMenu(store);
    expect(screen.getByTestId('menu-curios-badge')).toHaveTextContent(has('нове'));
    await fireEvent.press(screen.getByTestId('menu-curios'));
    expect(screen.getByTestId('curios-summary')).toBeTruthy();
    expect(store.getState().museum.curiosSeen).toBe(1);
    await fireEvent.press(screen.getByTestId('tab-stroyova'));
    await fireEvent.press(screen.getByTestId('menu-open'));
    expect(screen.queryByTestId('menu-curios-badge')).toBeNull();
  });
});

describe('особова справа', () => {
  test('AC-20: 16 знаків «вона» - позивний повністю, форма «Вона · прибула», рівень, цифровізації «n з 3», дата прибуття', async () => {
    const { store } = game({ gender: 'f', callsign: 'Ексель-на-папері' });
    await openMenu(store);
    expect(screen.getByTestId('menu-who')).toHaveTextContent(has('Ексель-на-папері'));
    await fireEvent.press(screen.getByTestId('menu-profile'));
    expect(screen.getByTestId('pf-callsign')).toHaveTextContent(has('Ексель-на-папері'));
    expect(screen.getByTestId('pf-form')).toHaveTextContent(has('Вона · прибула'));
    expect(screen.getByTestId('pf-level')).toHaveTextContent(has('1 · Батальйон'));
    expect(screen.getByTestId('pf-digit')).toHaveTextContent(has('0 з 3'));
    expect(screen.getByTestId('pf-arrival')).toHaveTextContent(has('07.10.2025'));
    expect(screen.getByTestId('pf-points')).toHaveTextContent(has('0'));
    expect(screen.getByTestId('pf-insp')).toHaveTextContent(has('-'));
    expect(screen.getByTestId('pf-drones')).toHaveTextContent(has('0'));
  });

  test('лічильники: закриті телеграми й шухляда, перевірки «n з m», дрони', async () => {
    const { store } = game();
    const tg = store.getState().telegrams;
    store.setState({
      telegrams: {
        ...tg,
        inbox: [
          { uid: 'a#1', id: 'a', kind: 'telegram', receivedAt: T0, status: 'archive' },
          { uid: 'b#2', id: 'b', kind: 'telegram', receivedAt: T0, status: 'drawer' },
          { uid: 'c#3', id: 'c', kind: 'telegram', receivedAt: T0, status: 'new' },
        ],
      },
      stats: { inspTotal: 4, inspPassed: 3, drones: 5 },
    });
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-profile'));
    expect(screen.getByTestId('pf-tg')).toHaveTextContent(has('2'));
    expect(screen.getByTestId('profile')).toHaveTextContent(has('з них 1 у шухляді'));
    expect(screen.getByTestId('pf-insp')).toHaveTextContent(has('3 з 4'));
    expect(screen.getByTestId('pf-drones')).toHaveTextContent(has('5'));
    expect(screen.getByTestId('profile')).toHaveTextContent(has('дронів введено'));
  });

  test('«Рапорт на зміну позивного»: правила 02, форма в наказах міняється разом із позивним', async () => {
    const { store } = game();
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-profile'));
    await fireEvent.press(screen.getByTestId('pf-report'));
    await fireEvent.changeText(screen.getByTestId('callsign-field'), 'А');
    expect(screen.getByTestId('o3-sheet-cta')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('callsign-field'), 'Скрепка');
    await fireEvent.press(screen.getByTestId('o3-sheet-cta'));
    await fireEvent.press(screen.getByTestId('pf-gender-f'));
    await fireEvent.press(screen.getByTestId('pf-gender-ok'));
    expect(store.getState().onboarding.callsign).toEqual({ type: 'custom', text: 'Скрепка' });
    expect(store.getState().onboarding.gender).toBe('f');
    expect(screen.getByTestId('pf-callsign')).toHaveTextContent(has('Скрепка'));
    expect(screen.getByTestId('pf-form')).toHaveTextContent(has('Вона · прибула'));
  });
});

describe('налаштування', () => {
  test('AC-10: «Звук» і «Вібрація» вимкнено - хаптики й звуку немає, дві setting_change; тестовий режим ставить testUser', async () => {
    const { store } = game();
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    expect(isSoundEnabled()).toBe(true);
    await fireEvent.press(screen.getByTestId('set-sound'));
    await fireEvent.press(screen.getByTestId('set-haptics'));
    expect(isSoundEnabled()).toBe(false);
    expect(isHapticsEnabled()).toBe(false);
    expect(store.getState().settings).toMatchObject({ sound: false, haptics: false });
    expect(store.getState().events.filter((e) => e.type === 'settingChange')).toEqual([
      { type: 'settingChange', settingName: 'sound', newValue: false },
      { type: 'settingChange', settingName: 'haptics', newValue: false },
    ]);
    await act(async () => store.getState().setSetting('testUser', true));
    expect(store.getState().settings.testUser).toBe(true);
    expect(store.getState().events.filter((e) => e.type === 'settingChange')).toHaveLength(2);
  });

  test('FR-13: чотири розділи в порядку; 5 перемикачів категорій, «Бусти й комбат» вимкнено; зміна категорії - setting_change', async () => {
    const { store } = game();
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    for (const c of ['storage', 'telegrams', 'inspections', 'gifts', 'boosts']) expect(screen.getByTestId(`set-notif-${c}`)).toBeTruthy();
    expect(screen.getByTestId('set-notif-boosts').props.accessibilityState.checked).toBe(false);
    expect(screen.getByTestId('set-notif-gifts').props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByTestId('set-notif-boosts'));
    expect(store.getState().settings.notif.boosts).toBe(true);
    expect(store.getState().events.at(-1)).toEqual({ type: 'settingChange', settingName: 'notif_boosts', newValue: true });
    for (const t of [setT.sectionSound, setT.sectionNotif, setT.sectionPrivacy, setT.sectionPurchases]) expect(screen.getByText(t)).toBeTruthy();
  });

  test('AC-9: сповіщення заборонені - стан «вимкнено в телефоні», кнопка відкриває налаштування ОС; дозвіл повернули - 5 перемикачів', async () => {
    const n = fakeNotifications({ permission: 'denied' });
    const { store } = game({ notifications: n, permission: 'denied' });
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    expect(screen.getByTestId('set-denied')).toHaveTextContent(has(setT.deniedTitle));
    expect(screen.queryByTestId('set-notif-storage')).toBeNull();
    await fireEvent.press(screen.getByTestId('set-open-os'));
    expect(n.log.opened).toBe(1);
    n.set({ permission: 'granted' });
    await act(async () => store.getState().comeForeground(T0 + 60_000));
    expect(store.getState().settings.pushPermission).toBe('granted');
    expect(screen.queryByTestId('set-denied')).toBeNull();
    expect(screen.getByTestId('set-notif-storage')).toBeTruthy();
  });

  test('FR-10: ввімкнення категорії до відповіді ОС відкриває push-preprompt; «Так, сповіщати» - системний запит; «Пізніше» у сесії не перепитує', async () => {
    const n = fakeNotifications({ permission: 'not_asked', requestResult: 'granted' });
    const { store } = game({ notifications: n, permission: 'not_asked' });
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    // рішення 92: перший тап по будь-якій категорії, навіть по вимкненню
    await fireEvent.press(screen.getByTestId('set-notif-storage'));
    expect(screen.getByTestId('push-preprompt')).toBeTruthy();
    expect(n.log.requests).toBe(0);
    await fireEvent.press(screen.getByTestId('pp-later'));
    expect(screen.queryByTestId('push-preprompt')).toBeNull();
    expect(n.log.requests).toBe(0);
    expect(store.getState().events.at(-1)).toMatchObject({ type: 'pushPermissionRequest', trigger: 'settings', prePromptResult: 'declined', osResult: 'not_shown' });
    await fireEvent.press(screen.getByTestId('set-notif-telegrams'));
    await fireEvent.press(screen.getByTestId('set-notif-telegrams'));
    expect(screen.queryByTestId('push-preprompt')).toBeNull();
    // меню закрили й відкрили знову - «Пізніше» діє на всю сесію
    await fireEvent.press(screen.getByTestId('settings-back'));
    await fireEvent.press(screen.getByTestId('menu-close'));
    await fireEvent.press(screen.getByTestId('menu-open'));
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await fireEvent.press(screen.getByTestId('set-notif-gifts'));
    expect(screen.queryByTestId('push-preprompt')).toBeNull();
    expect(n.log.requests).toBe(0);
    // прямий запит (налаштування -> «Так»)
    await act(async () => {
      await store.getState().requestPush('settings');
    });
    expect(n.log.requests).toBe(1);
    expect(store.getState().settings.pushPermission).toBe('granted');
    expect(store.getState().events.at(-1)).toMatchObject({ type: 'pushPermissionRequest', prePromptResult: 'accepted', osResult: 'granted' });
  });

  test('AC-13: «Відновити покупки» - тост «Відновлено: «Без реклами». ×1,3 уже діє.», purchase_restore (settings_button); повторний тап під час запиту нічого не робить', async () => {
    const shop = fakePurchases({ restore: { kind: 'ok', owned: ['no_ads'] } });
    const { store } = game({ shop });
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    await fireEvent.press(screen.getByTestId('set-restore'));
    expect(store.getState().state.hasNoAds).toBe(true);
    expect(screen.getByTestId('toast')).toHaveTextContent(has('Відновлено: «Без реклами». ×1,3 уже діє.'));
    expect(store.getState().events.filter((e) => e.type === 'purchaseRestore')).toEqual([{ type: 'purchaseRestore', trigger: 'settings_button', isSuccess: true, restoredProductIds: ['no_ads'] }]);
    // поки запит триває, кнопка неактивна
    await act(async () => {
      store.setState({ busy: 'purchase' });
    });
    expect(screen.getByTestId('set-restore')).toBeDisabled();
  });

  test('AC-13: другий тап під час реального запиту не дає другого виклику й другої події', async () => {
    const shop = fakePurchases();
    let calls = 0;
    let release: () => void = () => {};
    shop.restore = () => {
      calls++;
      return new Promise((res) => {
        release = () => res({ kind: 'ok', owned: ['no_ads'] });
      });
    };
    const { store } = game({ shop });
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    await fireEvent.press(screen.getByTestId('set-restore'));
    expect(screen.getByTestId('set-restore')).toBeDisabled();
    await store.getState().restore('settings_button');
    await act(async () => release());
    expect(calls).toBe(1);
    expect(store.getState().events.filter((e) => e.type === 'purchaseRestore')).toHaveLength(1);
  });

  test('анонімна статистика: вимкнення пише setting_change (analytics, off) і лишається в записі', async () => {
    const { store } = game();
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    await fireEvent.press(screen.getByTestId('set-analytics'));
    expect(store.getState().settings.analytics).toBe(false);
    expect(store.getState().events.at(-1)).toEqual({ type: 'settingChange', settingName: 'analytics', newValue: false });
  });
});

describe('налаштування реклами (FR-17, AC-12)', () => {
  const withAds = (required: boolean, noAds = false) => {
    const g = game();
    const shown: number[] = [];
    const ads = {
      ...g.store.getState().services.ads,
      privacyOptionsRequired: () => required,
      showPrivacyOptions: async () => {
        shown.push(1);
        g.store.getState().adsConsent({ trigger: 'privacy_settings', status: 'obtained', formShown: true, canRequestAds: true, privacyOptionsRequired: true });
      },
    };
    g.store.setState({ services: { ...g.store.getState().services, ads }, state: { ...g.store.getState().state, hasNoAds: noAds } });
    return { ...g, shown };
  };

  test('UMP вимагає точку входу - рядок є, тап відкриває форму й шле ads_consent_update privacy_settings', async () => {
    const { store, shown } = withAds(true);
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    expect(screen.getByTestId('set-ad-privacy')).toHaveTextContent(/Налаштування реклами/);
    await fireEvent.press(screen.getByTestId('set-ad-privacy'));
    await act(async () => {});
    expect(shown).toHaveLength(1);
    expect(store.getState().events.at(-1)).toMatchObject({ type: 'adsConsentUpdate', trigger: 'privacy_settings' });
  });

  test('UMP не вимагає (Україна) чи куплено «Без реклами» - рядка немає', async () => {
    const ua = withAds(false);
    await openMenu(ua.store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    expect(screen.queryByTestId('set-ad-privacy')).toBeNull();
  });

  test('з «Без реклами» рядка немає навіть у ЄЕЗ (FR-14)', async () => {
    const paid = withAds(true, true);
    await openMenu(paid.store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    expect(screen.queryByTestId('set-ad-privacy')).toBeNull();
  });
});

describe('скидання прогресу', () => {
  const sign = async (store: ReturnType<typeof game>['store']) => {
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    await fireEvent.press(screen.getByTestId('set-reset'));
  };

  test('AC-14: два кроки; «Не скидати» на кроці 2 нічого не змінює', async () => {
    const { store } = game();
    await sign(store);
    expect(screen.getByTestId('rc-step')).toHaveTextContent(has('Крок 1 з 2'));
    expect(screen.getByTestId('reset-confirm')).toHaveTextContent(/Зникне/);
    await fireEvent.press(screen.getByTestId('rc-next'));
    expect(screen.getByTestId('rc-step')).toHaveTextContent(has('Крок 2 з 2'));
    expect(screen.getByTestId('rc-act-body')).toHaveTextContent(has('Особову справу позивного «Ексель» списати.'));
    const before = store.getState().state;
    await fireEvent.press(screen.getByTestId('rc-cancel'));
    expect(screen.queryByTestId('reset-confirm')).toBeNull();
    expect(store.getState().state).toBe(before);
    expect(store.getState().onboarding.step).toBe('done');
  });

  test('AC-14: «Підписати й скинути» - підписів 0, онбординг з кроку 1, сповіщення скасовано, «Без реклами» діє, подія progress_reset', async () => {
    const n = fakeNotifications({ permission: 'granted' });
    const { store } = game({ notifications: n });
    store.setState({ state: { ...store.getState().state, signatures: 5000, hasNoAds: true }, monetization: { ...store.getState().monetization, rights: { ...store.getState().monetization.rights, no_ads: true } } });
    store.setState({ digit: { ...store.getState().digit, total: 2 }, playtimeMs: 90_500 });
    await sign(store);
    await fireEvent.press(screen.getByTestId('rc-next'));
    const cancels = n.log.cancels;
    await fireEvent.press(screen.getByTestId('rc-sign'));
    const st = store.getState();
    expect(st.state.signatures).toBe(0);
    expect(st.state.hasNoAds).toBe(true);
    expect(st.onboarding.step).toBe(1);
    expect(st.onboarding.callsign).toBeNull();
    expect(st.monetization.rights.no_ads).toBe(true);
    expect(st.settings.sound).toBe(true);
    expect(st.events.at(-1)).toEqual({ type: 'settingChange', settingName: 'progress_reset', newValue: null, digitizationCount: 2, playtimeSec: 90 });
    expect(n.log.cancels).toBeGreaterThan(cancels);
    expect(st.museum.curios).toEqual([]);
    expect(st.stats).toEqual({ inspTotal: 0, inspPassed: 0, drones: 0 });
  });

  test('AC-14: зі «Стартовим набором» після онбордингу на рахунку знову 50 000', async () => {
    const { store } = game();
    store.setState({ monetization: { ...store.getState().monetization, rights: { ...store.getState().monetization.rights, starter_pack: true }, starterGranted: true } });
    store.getState().resetProgress();
    expect(store.getState().monetization.starterGranted).toBe(false);
    expect(store.getState().state.signatures).toBe(0);
    // онбординг пройдено
    store.setState({ onboarding: onboardingDone() });
    await act(async () => store.getState().tick(T0 + 1000));
    expect(store.getState().monetization.starterGranted).toBe(true);
    expect(store.getState().state.signatures).toBeGreaterThanOrEqual(50_000);
  });
});

describe('Про гру', () => {
  const toAbout = async (store: ReturnType<typeof game>['store']) => {
    await openMenu(store);
    await fireEvent.press(screen.getByTestId('menu-about'));
  };

  test('AC-18: «Про відсоток» з плейсхолдерами, версія, анонімний ID; «Скопіювати ID» кладе install_id у буфер', async () => {
    const links = fakeLinks();
    const { store } = game({ links });
    await toAbout(store);
    expect(screen.getByTestId('about-percent')).toHaveTextContent(has(`${aboutCfg.percent}% чистого виторгу гри я щомісяця перераховую на ${aboutCfg.fund}`));
    expect(screen.getByTestId('about-version')).toHaveTextContent(/Версія\ /);
    expect(screen.getByTestId('about-id')).toHaveTextContent(has('id-1234'));
    await fireEvent.press(screen.getByTestId('about-copy'));
    expect(links.log.copied).toEqual(['id-1234']);
  });

  test('приховане: 7 тапів по версії вмикають тестовий режим (is_test_user), раніше - ні; у налаштуваннях з\'являється перемикач', async () => {
    const { store } = game();
    await toAbout(store);
    for (let i = 0; i < 6; i++) await fireEvent.press(screen.getByTestId('about-version'));
    expect(store.getState().settings.testUser).toBe(false);
    await fireEvent.press(screen.getByTestId('about-version'));
    expect(store.getState().settings.testUser).toBe(true);
    await fireEvent.press(screen.getByTestId('about-back'));
    await fireEvent.press(screen.getByTestId('menu-settings'));
    await act(async () => {});
    expect(screen.getByTestId('set-test')).toBeTruthy();
  });

  test('AC-18: політика приватності й лист розробнику - у зовнішньому браузері через LinkService', async () => {
    const links = fakeLinks();
    const { store } = game({ links });
    await toAbout(store);
    await fireEvent.press(screen.getByTestId('about-privacy'));
    await fireEvent.press(screen.getByTestId('about-contact'));
    expect(links.log.opened).toEqual([aboutCfg.privacyUrl, `mailto:${aboutCfg.email}`]);
  });

  test('AC-18: fund-reports без звітів - порожній стан; про фонд немає ні в шторці бустів, ні в магазині, ні в меню', async () => {
    const { store } = game();
    await toAbout(store);
    await fireEvent.press(screen.getByTestId('about-reports'));
    expect(screen.getByTestId('fr-empty')).toHaveTextContent(has('Перший звіт - після першого місяця продажів.'));
    await fireEvent.press(screen.getByTestId('fund-reports-back'));
    await fireEvent.press(screen.getByTestId('about-back'));
    expect(screen.getByTestId('menu')).not.toHaveTextContent(/\[ФОНД\]|\[N\]%/);
    await fireEvent.press(screen.getByTestId('menu-close'));
    await fireEvent.press(screen.getByTestId('tab-shop'));
    expect(screen.queryByText(/\[ФОНД\]|\[N\]%/)).toBeNull();
  });

  test('AC-19: ліцензії - шрифти з копірайтом і повним текстом OFL 1.1, машинописний шрифт не «TT2020», бібліотеки = production-залежності', async () => {
    const { store } = game();
    await toAbout(store);
    await fireEvent.press(screen.getByTestId('about-licenses'));
    const lic = screen.getByTestId('licenses');
    expect(lic).toHaveTextContent(/SIL OFL 1\.1/);
    expect(lic).toHaveTextContent(has('© The Unbounded Project Authors'));
    expect(lic).toHaveTextContent(has('© IBM Corp.'));
    expect(lic).toHaveTextContent(has('© The Caveat Project Authors'));
    expect(lic).toHaveTextContent(has('Змінена версія TT2020 Style E, © Fredrick R. Brennan'));
    expect(screen.getByTestId('li-ofl')).toHaveTextContent(/SIL OPEN FONT LICENSE Version 1\.1/);
    expect(screen.getByTestId('li-ofl')).toHaveTextContent(/THE FONT SOFTWARE IS PROVIDED "AS IS"/);
    expect(screen.queryByTestId('li-font-TT2020')).toBeNull();
    const names = libraryRows().map((l) => l.name);
    expect(names).toEqual(Object.keys(pkg.dependencies).sort());
    for (const n of names) expect(screen.getByTestId(`li-lib-${n}`)).toBeTruthy();
    expect(libraryRows().every((l) => l.license !== '')).toBe(true);
  });
});
