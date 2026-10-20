// 013 FR-15…FR-22 у сторі: старт від конвертації № 6, кроки, сценарні телеграми № 108-111, журнал № 24, вимкнена розсилка, тиша.
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import { createConveyorStore } from '@/features/conveyor/store';
import { onboardingDone } from '@/save/migrations';

const T0 = new Date(2025, 9, 10, 12).getTime();
const DAY = 86_400_000;
const ORDER = bundledConfig.params.convert.order;

function game(digital: string[] = ORDER) {
  const store = createConveyorStore(T0, bundledConfig);
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    state: { ...newGame(bundledConfig, T0), level: 5, digital },
  });
  return store;
}
const ids = (s: ReturnType<typeof game>) => s.getState().telegrams.inbox.map((x) => x.id);
const kinds = (s: ReturnType<typeof game>) => s.getState().events.map((e) => (e.type === 'finaleStepStart' || e.type === 'finaleStepComplete' ? `${e.type}:${e.step}` : e.type));

describe('фінал у сторі', () => {
  test('AC-11: п’ять конвертацій фінал не стартують, шоста - стартує з кроку order і приносить № 108', () => {
    const store = game(ORDER.slice(0, 5));
    store.getState().tick(T0 + 60_000);
    expect(store.getState().finale.startMs).toBeNull();
    store.setState({ state: { ...store.getState().state, digital: ORDER } });
    expect(store.getState().finale.startMs).not.toBeNull();
    expect(ids(store)).toContain('tg_0108_shutdown_order');
    expect(kinds(store)).toContain('finaleStepStart:order');
  });

  test('кроки йдуть по порядку; order -> № 109 і script; Y -> № 110, тиша від Y, готовий last_book', () => {
    const store = game();
    store.getState().tick(T0 + 60_000);
    expect(store.getState().finaleComplete('script')).toBe(false);
    expect(store.getState().finaleComplete('order')).toBe(true);
    expect(ids(store)).toContain('tg_0109_shutdown_yn');
    store.getState().finaleDecline();
    store.getState().finaleDecline();
    expect(store.getState().finale.scriptNs).toBe(2);
    expect(store.getState().finale.yMs).toBeNull();
    expect(store.getState().finaleComplete('script')).toBe(true);
    expect(store.getState().finale.yMs).toBe(store.getState().lastMs);
    expect(ids(store)).toContain('tg_0110_mailing_stopped');
    expect(kinds(store)).toEqual(expect.arrayContaining(['finaleStepComplete:order', 'finaleStepComplete:script', 'finaleStepStart:last_book']));
    const done = store.getState().events.find((e) => e.type === 'finaleStepComplete' && e.step === 'script');
    expect(done).toMatchObject({ stepIndex: 2, declinedCount: 2, isResumed: false });
  });

  test('FR-19, AC-13: після Y телеграми за розкладом не приходять, наявні лишаються', () => {
    const store = game();
    store.getState().tick(T0 + 60_000);
    store.getState().finaleComplete('order');
    store.getState().finaleComplete('script');
    const before = store.getState().telegrams.inbox.length;
    for (let d = 1; d <= 3; d++) store.getState().tick(T0 + d * DAY);
    expect(store.getState().telegrams.inbox).toHaveLength(before);
  });

  test('AC-14: last_book віддає журнал № 24 з source finale, потім № 111; step завершено лише раз', () => {
    const store = game();
    store.getState().tick(T0 + 60_000);
    store.getState().finaleComplete('order');
    store.getState().finaleComplete('script');
    store.getState().finaleOpenLastBook();
    expect(store.getState().museum.owned.find((o) => o.no === 24)).toMatchObject({ source: 'finale' });
    expect(store.getState().events.some((e) => e.type === 'museumJournalUnlock' && e.no === 24 && e.source === 'finale')).toBe(true);
    // повторне відкриття нічого не дає
    const n = store.getState().museum.owned.length;
    store.getState().finaleOpenLastBook();
    expect(store.getState().museum.owned).toHaveLength(n);
    expect(store.getState().finaleComplete('last_book')).toBe(true);
    expect(ids(store)).toContain('tg_0111_last_book_delivered');
    expect(store.getState().finaleComplete('last_book')).toBe(false);
  });

  test('FR-21: call закривається, коли розмову Археолога доставлено; далі стартує credits', () => {
    const store = game();
    store.getState().tick(T0 + 60_000);
    for (const s of ['order', 'script', 'last_book'] as const) store.getState().finaleComplete(s);
    expect(store.getState().finale.done.call).toBeUndefined();
    store.setState({ story: { ...store.getState().story, delivered: { ...store.getState().story.delivered, st_archaeologist_05: { at: T0, rev: 1, catchUp: false, away: false } } } });
    expect(store.getState().finale.done.call).toBeDefined();
    expect(kinds(store)).toContain('finaleStepStart:credits');
  });

  test('FR-22, AC-16: тиша спливає за часом від Y, потім quiet закривається і лишається endless_offer; нагороди за script і quiet', () => {
    const store = game();
    store.getState().tick(T0 + 60_000);
    for (const s of ['order', 'script', 'last_book'] as const) store.getState().finaleComplete(s);
    store.setState({ story: { ...store.getState().story, skipped: [...store.getState().story.skipped, 'st_archaeologist_05'] } });
    store.getState().finaleComplete('credits');
    const y = store.getState().finale.yMs!;
    store.getState().tick(y + 5 * DAY);
    expect(store.getState().finale.done.quiet).toBeUndefined();
    store.getState().tick(y + 7 * DAY + 60_000);
    expect(store.getState().finale.done.quiet).toBeDefined();
    expect(store.getState().finale.done.endless_offer).toBeUndefined();
    const aw = store.getState().awards.got;
    expect(aw.aw_finale).toBeDefined();
    expect(aw.aw_quiet_week).toBeDefined();
  });

  test('is_resumed: крок, на якому гру знайдено при запуску', () => {
    const a = game();
    a.getState().tick(T0 + 60_000);
    const b = createConveyorStore(T0 + DAY, bundledConfig, { finale: a.getState().finale });
    expect(b.getState().finaleBoot).toBe('order');
  });
});
