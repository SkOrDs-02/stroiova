// 013 на екрані: endless-intro (AC-17), «Дубль N закрито» (AC-21), чип модифікатора (AC-19), рекорд на digital і в profile (AC-20), короткий level-up.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import { createConveyorStore } from '@/features/conveyor/store';
import { MainScreen } from '@/features/main/MainScreen';
import { onboardingDone } from '@/save/migrations';
import { newFinale } from '@/finale/finale';

jest.mock('@/features/conveyor/useGameLoop', () => ({ useGameLoop: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  performAndroidHapticsAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
  AndroidHaptics: { Keyboard_Tap: 'k', Confirm: 'c' },
}));

const T0 = new Date(2025, 9, 10, 12).getTime();
const DAY = 86_400_000;
const ORDER = bundledConfig.params.convert.order;
const FIN = { startMs: T0 - 8 * DAY, yMs: T0 - 7.5 * DAY, scriptNs: 0, done: { order: T0 - 8 * DAY, script: T0 - 7.5 * DAY, last_book: T0 - 7 * DAY, call: T0 - 7 * DAY, credits: T0 - 7 * DAY, quiet: T0 - 0.5 * DAY } };

function game() {
  const store = createConveyorStore(T0, bundledConfig, {
    state: { ...newGame(bundledConfig, T0), level: 5, digital: ORDER, prestigePoints: 1840, lifetimeCycle: 5e12 },
    onboarding: { ...onboardingDone(), callsign: { type: 'custom', text: 'Ексель' }, gender: 'f' },
    finale: { ...newFinale(), ...FIN },
  });
  store.setState({ lastMs: T0 });
  store.getState().tick(T0 + 60_000);
  return store;
}

describe('endless-intro', () => {
  test('AC-17: банер веде на наказ; «Пізніше» лишає на Р5, пропозиція чекає', async () => {
    const store = game();
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('dub-banner')).toHaveTextContent('Наказ про Дубль 1 чекає');
    await fireEvent.press(screen.getByTestId('dub-banner'));
    expect(screen.getByTestId('ei-title')).toHaveTextContent('Дубль 1');
    expect(screen.getByTestId('ei-hold')).toHaveTextContent('Утримуй: рівні й підписи почнуться з батальйону');
    await fireEvent.press(screen.getByTestId('ei-later'));
    expect(screen.queryByTestId('endless-intro')).toBeNull();
    expect(store.getState().dub.n).toBe(0);
    expect(store.getState().state.level).toBe(5);
    expect(screen.getByTestId('dub-banner')).toBeTruthy();
  });

  test.each([
    ['two_copies', /У двох примірниках\. Телеграми коштують удвічі більше паперу і дають удвічі більше репутації\./],
    ['wet_seal', /Мокра печатка\. Перевірки частіше, ×3 після них триває довше\./],
    ['no_did', /Без Діда\. Генератор дає ×1,15 замість ×1,25\./],
  ] as const)('модифікатор %s на наказі має свій текст', async (mod, text) => {
    const store = game();
    store.setState({ dub: { ...store.getState().dub, offer: { ...store.getState().dub.offer!, modifier: mod } } });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('dub-banner'));
    expect(screen.getByTestId(`ei-mod-${mod}`)).toHaveTextContent(text);
  });

  test('AC-17: утримання «Прийняти до виконання» 1,2 с запускає Дубль 1: Р1, чип модифікатора в шапці', async () => {
    jest.useFakeTimers();
    try {
      const store = game();
      await render(<MainScreen store={store} />);
      await fireEvent.press(screen.getByTestId('dub-banner'));
      // раніше відпустили - нічого
      await fireEvent(screen.getByTestId('ei-accept'), 'pressIn');
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      await fireEvent(screen.getByTestId('ei-accept'), 'pressOut');
      expect(store.getState().dub.n).toBe(0);
      await fireEvent(screen.getByTestId('ei-accept'), 'pressIn');
      await act(async () => {
        jest.advanceTimersByTime(1300);
      });
      expect(store.getState().dub).toMatchObject({ n: 1, offer: null });
      expect(store.getState().state.level).toBe(1);
      expect(screen.queryByTestId('endless-intro')).toBeNull();
      expect(screen.getByTestId('dub-chip')).toHaveTextContent(/^Дубль 1 · /);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('«Дубль N закрито»', () => {
  test('AC-21: шоста конвертація в Дублі - акт, потім наказ про Дубль 2 з іншим модифікатором', async () => {
    const store = game();
    store.getState().dubAccept();
    const mod1 = store.getState().dub.modifier;
    store.setState({ state: { ...store.getState().state, digital: ORDER } });
    await render(<MainScreen store={store} />);
    expect(screen.getByTestId('dc-title')).toHaveTextContent('Дубль 1 закрито. Наказ про наступний уже друкують.');
    expect(screen.getByTestId('dc-cycle')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('dc-next'));
    expect(screen.queryByTestId('dub-closed')).toBeNull();
    expect(screen.getByTestId('ei-title')).toHaveTextContent('Дубль 2');
    expect(store.getState().dub.offer!.modifier).not.toBe(mod1);
  });
});

describe('рекорд', () => {
  test('AC-20: на digital і в profile - «Дубль N · підписів за весь час: 10^x»', async () => {
    const store = game();
    store.getState().dubAccept();
    store.setState({ state: { ...store.getState().state, lifetimeCycle: 1e10 } });
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-digital'));
    expect(screen.getByTestId('digit-record')).toBeTruthy();
    expect(screen.getByTestId('digit-record-line')).toHaveTextContent(/^Дубль 1 · підписів за весь час: 10\^\d+,\d\d$/);
  });
});

describe('Дубль: короткий level-up, № 112 і profile', () => {
  test('FR-28: перехід Р1 -> Р2 у Дублі - короткий наказ «Дубль N», без розповіді', async () => {
    const store = game();
    store.getState().dubAccept();
    // п'ята цифровізація вже зроблена, шоста (dup.exitDigitizations) виводить з Р1
    store.setState({
      state: { ...store.getState().state, streamLevels: [1, 1, 1, 1], lifetimeCycle: 4e18 },
      digit: { ...store.getState().digit, counts: { '1': bundledConfig.params.dup.exitDigitizations - 1 } },
    });
    expect(store.getState().digitize()).toBe(true);
    expect(store.getState().state.level).toBe(2);
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('digit-result-ok'));
    expect(screen.getByTestId('level-up-dub')).toBeTruthy();
    expect(screen.queryByTestId('level-up-r3')).toBeNull();
    expect(screen.getByTestId('level-points')).toBeTruthy();
  });

  test('FR-23: відкриття № 112 з вхідних показує endless-intro', async () => {
    const store = game();
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('tab-telegrams'));
    const uid = store.getState().telegrams.inbox.find((x) => x.id === 'tg_0112_duplicate_on_paper')!.uid;
    await fireEvent.press(screen.getByTestId(`tg-row-${uid}`));
    expect(screen.getByTestId('endless-intro')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('ei-later'));
    expect(store.getState().telegrams.inbox.find((x) => x.uid === uid)).toMatchObject({ status: 'new' });
  });

  test('profile: рядок рекорду з’являється, коли Дубль уже був', async () => {
    const store = game();
    store.getState().dubAccept();
    await render(<MainScreen store={store} />);
    await fireEvent.press(screen.getByTestId('menu-open'));
    await fireEvent.press(screen.getByTestId('menu-profile'));
    expect(screen.getByTestId('pf-record-line')).toHaveTextContent(/^Дубль 1 · підписів за весь час: 10\^\d+,\d\d$/);
  });
});
