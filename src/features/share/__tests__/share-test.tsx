// 007 етап 2: share-card - картки без позивного (AC-16), «Поділитися» з прев'ю й системним меню, curio_entry_share (AC-15),
// помилка рендеру (app_error_log, тост), грамоти за поширення (016).
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { memoryAnalytics } from '@/analytics/service';
import { bundledConfig } from '@/economy/config';
import { DEFAULT_ENV } from '@/features/conveyor/analytics';
import { createConveyorStore } from '@/features/conveyor/store';
import { CurioDetail } from '@/features/museum/CurioDetail';
import { JournalDetail } from '@/features/museum/JournalDetail';
import { newFinale } from '@/finale/finale';
import { onboardingDone } from '@/save/migrations';
import { SHARE_W } from '@/share/size';
import type { ShareOutcome, ShareService } from '@/share/types';

import { cardOf, scrub } from '../cards';
import { BASE_W, ShareImage } from '../ShareImage';
import { shT } from '../texts';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const T0 = new Date(2025, 9, 10, 12).getTime();
const ME = 'Скрепочка';

function fakeShare(...outcomes: ShareOutcome[]) {
  const calls: { target: unknown; message: string }[] = [];
  const service: ShareService = {
    share: (target, message) => {
      calls.push({ target, message });
      return Promise.resolve(outcomes.shift() ?? { kind: 'shared' });
    },
  };
  return { calls, service };
}

function game(share: ShareService = fakeShare().service) {
  const m = memoryAnalytics();
  const store = createConveyorStore(T0, bundledConfig, { installId: '8f3c1d52-0000-4000-8000-000000000001', env: { ...DEFAULT_ENV, strict: true }, services: { analytics: m.service, share } });
  const s = store.getState();
  store.setState({
    onboarding: { ...onboardingDone(), callsign: { type: 'custom', text: ME }, gender: 'f' },
    museum: {
      ...s.museum,
      owned: [{ no: 5, atMs: T0, source: 'digitization', seen: true }],
      curios: [
        { seq: 1, kind: 'gift', atMs: T0, gift: { type: 'shovel', raceId: 'race_0003', raceNo: 3, steps: ['a', 'b', 'c'], stepsDone: 2, stepsTotal: 3, marginSec: 600 } },
        { seq: 2, kind: 'stack', atMs: T0, stack: { cm: 42 } },
      ] as never,
      curioSeq: 2,
    },
  });
  return { store, m };
}

/** Усі рядки картки одним текстом */
const textOf = (c: NonNullable<ReturnType<typeof cardOf>>) => [...c.meta, c.title, c.body, ...c.rows.flat(), c.signer ?? '', c.stamp, c.date].join('\n');

describe('картки (007 FR-27, AC-16)', () => {
  test('журнал № 5: у грі - позивний, на картинці - sh.j5_flavor; позивного немає ніде', () => {
    const { store } = game();
    const c = cardOf(store.getState(), { kind: 'journal', no: 5 })!;
    expect(c.body).toContain(shT.j5Flavor);
    expect(textOf(c)).not.toContain(ME);
    expect(c.analytics).toEqual({ type: 'journal', id: expect.any(String) });
  });

  test('подарунок: акт зі штампом «СКАСОВАНО», тип подарунка для аналітики', () => {
    const { store } = game();
    const c = cardOf(store.getState(), { kind: 'curio', seq: 1 })!;
    expect(c.stamp).toBe(shT.stamp.cancelled);
    expect(c.rows).toHaveLength(3);
    expect(c.analytics).toEqual({ type: 'gift_written_off', id: 'race_0003', giftType: 'shovel' });
  });

  test('стос: висота в рядку, entry_type stack_meter', () => {
    const { store } = game();
    const c = cardOf(store.getState(), { kind: 'curio', seq: 2 })!;
    expect(c.meta.join(' ')).toContain('42 см');
    expect(c.analytics.type).toBe('stack_meter');
  });

  test('грамота: «Нагороджується» з прочерком і дата-бланк (016 FR-36); неотримана - картки немає', () => {
    const { store } = game();
    expect(cardOf(store.getState(), { kind: 'award', id: 'aw_share_first' })).toBeNull();
    store.setState({ awards: { ...store.getState().awards, got: { aw_share_first: { atMs: T0, seq: 1 } } } });
    const c = cardOf(store.getState(), { kind: 'award', id: 'aw_share_first' })!;
    expect(c.signer).toBe(shT.awardee);
    expect(c.date).toBe(shT.blankDate);
    expect(textOf(c)).not.toContain(ME);
  });

  test('фінальна картка - лише після «Y»; рекорд - лише з Дубля 1', () => {
    const { store } = game();
    expect(cardOf(store.getState(), { kind: 'finale' })).toBeNull();
    expect(cardOf(store.getState(), { kind: 'record' })).toBeNull();
    store.setState({ finale: { ...newFinale(), yMs: T0 } });
    expect(cardOf(store.getState(), { kind: 'finale' })!.stamp).toBe(shT.stamp.digital);
  });

  test('scrub: позивний заміняється прочерком, короткий не чіпаємо', () => {
    expect(scrub(`Стройовик ${ME} доповідає`, ME)).toBe('Стройовик ___ доповідає');
    expect(scrub('а б', 'а')).toBe('а б');
  });
});

describe('«Поділитися» (007 FR-26, FR-29, AC-15)', () => {
  test('журнал: прев\'ю, системне меню з sh.message, curio_entry_share shared, прев\'ю закрито; грамота «Картинку надіслано»', async () => {
    const f = fakeShare({ kind: 'shared', activityType: 'ph.telegra.Telegraph.Share' });
    const { store, m } = game(f.service);
    await render(<JournalDetail store={store} no={5} onClose={() => {}} />);
    await fireEvent.press(screen.getByTestId('share-open'));
    expect(screen.getByTestId('share-card')).toBeTruthy();
    expect(screen.getByTestId('share-card')).not.toHaveTextContent(new RegExp(ME));
    expect(screen.getByTestId('share-card')).toHaveTextContent(new RegExp(shT.note));
    await act(async () => fireEvent.press(screen.getByTestId('share-go')));
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]!.message).toBe(shT.message);
    const ev = m.events.find((e) => e.name === 'curio_entry_share')!;
    expect(ev.props).toMatchObject({ entry_type: 'journal', share_result: 'shared', activity_type: 'ph.telegra.Telegraph.Share' });
    expect(screen.queryByTestId('share-card')).toBeNull();
    expect(store.getState().awards.got.aw_share_first).toBeTruthy();
  });

  test('курйоз: меню закрито без поширення - dismissed, прев\'ю лишається; подвійний тап - одне меню', async () => {
    const f = fakeShare({ kind: 'dismissed' });
    const { store, m } = game(f.service);
    await render(<CurioDetail store={store} seq={1} onClose={() => {}} />);
    await fireEvent.press(screen.getByTestId('share-open'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('share-go'));
      fireEvent.press(screen.getByTestId('share-go'));
    });
    expect(f.calls).toHaveLength(1);
    const shares = m.events.filter((e) => e.name === 'curio_entry_share');
    expect(shares).toHaveLength(1);
    expect(shares[0]!.props).toMatchObject({ entry_type: 'gift_written_off', entry_id: 'race_0003', gift_type: 'shovel', share_result: 'dismissed' });
    expect(shares[0]!.props).not.toHaveProperty('activity_type');
    expect(screen.getByTestId('share-card')).toBeTruthy();
    expect(store.getState().awards.got.aw_share_first).toBeUndefined();
  });

  test('картинка не зібралась: тост sh.err, app_error_log share_render, curio_entry_share немає', async () => {
    const f = fakeShare({ kind: 'error', code: 'render' });
    const { store, m } = game(f.service);
    const r = await store.getState().share({ type: 'stack_meter', id: 'curio_2' }, null);
    expect(r).toEqual({ kind: 'error', code: 'render' });
    expect(store.getState().toast).toEqual({ kind: 'text', text: shT.err });
    expect(m.events.find((e) => e.name === 'app_error_log')!.props).toMatchObject({ source: 'share_render', error_code: 'render', is_recovered: false, recovery: 'none' });
    expect(m.events.some((e) => e.name === 'curio_entry_share')).toBe(false);
  });

  test('запис сюжету не ділиться: кнопки немає', async () => {
    const { store } = game();
    store.setState({ museum: { ...store.getState().museum, curios: [{ seq: 3, kind: 'story', atMs: T0, story: { beatId: 'b', from: 'lina', title: 't', body: 'b' } }] as never } });
    await render(<CurioDetail store={store} seq={3} onClose={() => {}} />);
    expect(screen.queryByTestId('share-open')).toBeNull();
  });
});

/** Картинка в масштабі 1080 px (PixelRatio = 1): усі тексти й найменший кегль */
async function rendered(card: NonNullable<ReturnType<typeof cardOf>>) {
  await render(<ShareImage card={card} scale={SHARE_W / BASE_W} testID="img" />);
  const texts = screen.queryAllByText(/./);
  const all = texts.map((t) => [t.props.children].flat().join('')).join('\n');
  const minFs = Math.min(...texts.map((t) => StyleSheet.flatten(t.props.style).fontSize as number));
  return { all, minFs };
}

describe('рендер картинки (007 AC-16, 016 AC-18)', () => {
  test('AC-16: журнал № 5 з позивним «Ексель» - на картинці ні позивного, ні рівня; текст на 2 екрани - кегль ≥ 28 px', async () => {
    const { store } = game();
    store.setState({ onboarding: { ...store.getState().onboarding, callsign: { type: 'excel', text: 'Ексель' } } });
    const c = cardOf(store.getState(), { kind: 'journal', no: 5 })!;
    const img = await rendered(c);
    expect(img.all).toContain(shT.j5Flavor);
    expect(img.all).not.toContain('Ексель');
    expect(img.all).not.toMatch(/Батальйон|Бригада/);
    const long = await rendered({ ...c, body: 'Рапорт про рапорт подано в трьох примірниках. '.repeat(60) });
    expect(long.minFs).toBeGreaterThanOrEqual(28);
    expect(long.all).toMatch(/…$/m);
  });

  test('AC-18: витяг aw_level_bryhada, «Ексель», стать «вона» - без позивного, «стройовичка» й дати; № наказу, порожній «Нагороджується:», бланк дати', async () => {
    const { store } = game();
    store.setState({
      onboarding: { ...store.getState().onboarding, callsign: { type: 'excel', text: 'Ексель' }, gender: 'f' },
      awards: { ...store.getState().awards, got: { aw_level_bryhada: { atMs: T0, seq: 1, orderNo: 2 } } },
    });
    const img = await rendered(cardOf(store.getState(), { kind: 'award', id: 'aw_level_bryhada' })!);
    expect(img.all).toContain('ВИТЯГ З НАКАЗУ № 2');
    expect(img.all).toContain(shT.awardee);
    expect(img.all).toContain(shT.blankDate);
    expect(img.all).not.toMatch(/Ексель|стройовичка|\d\d\.\d\d\.\d{4}/);
    expect(img.minFs).toBeGreaterThanOrEqual(28);
  });
});
