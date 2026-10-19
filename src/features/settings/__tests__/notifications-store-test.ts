// 010 FR-5, FR-6: перехід у фон планує сповіщення за станом, повернення скасовує (AC-3); налаштування й лічильники переживають збереження.
import { bundledConfig } from '@/economy/config';
import { draftOf } from '@/features/boot/useBoot';
import { createConveyorStore } from '@/features/conveyor/store';
import { fakeNotifications } from '@/notifications/test-services';
import { MIGRATIONS, onboardingDone } from '@/save/migrations';
import { KEY_SAVE, loadSave, serialize } from '@/save/repository';
import { CURRENT_SCHEMA } from '@/save/schema';
import { memoryStorage } from '@/save/storage';

const local = (h: number, m = 0, day = 0) => new Date(2025, 9, 10 + day, h, m).getTime();
const T0 = local(12);

function game(n = fakeNotifications({ permission: 'granted' })) {
  const store = createConveyorStore(T0, bundledConfig, { services: { notifications: n } });
  const s = store.getState().state;
  store.setState({
    onboarding: onboardingDone(),
    lastMs: T0,
    settings: { ...store.getState().settings, pushPermission: 'granted' },
    state: { ...s, streamLevels: [40, 10, 0, 0], stageLevels: [40, 40, 40], streamClerks: [true, true, false, false], stageClerks: [true, true, true] },
  });
  return { store, n };
}

describe('перехід у фон і повернення', () => {
  test('AC-3: у фоні склад заплановано, на передньому плані - скасовано, запланованого в стані немає', async () => {
    const { store, n } = game();
    await store.getState().goBackground(T0);
    const p = n.log.scheduled.find((x) => x.type === 'storage_full');
    expect(p).toBeDefined();
    expect(p!.title).not.toBe('');
    expect(p!.body.length).toBeGreaterThan(0);
    expect(p!.atMs).toBeGreaterThan(T0);
    expect(store.getState().notifications.planned.length).toBeGreaterThan(0);
    await store.getState().comeForeground(T0 + 60_000);
    expect(n.log.scheduled).toEqual([]);
    expect(store.getState().notifications.planned).toEqual([]);
  });

  test('FR-6: без дозволу ОС або з вимкненою категорією нічого не планується', async () => {
    const a = game(fakeNotifications({ permission: 'denied' }));
    a.store.setState({ settings: { ...a.store.getState().settings, pushPermission: 'denied' } });
    await a.store.getState().goBackground(T0);
    expect(a.n.log.scheduled).toEqual([]);
    const b = game();
    b.store.getState().setNotifCategory('storage', false);
    await b.store.getState().goBackground(T0);
    expect(b.n.log.scheduled.find((x) => x.type === 'storage_full')).toBeUndefined();
  });

  test('повернення з відкликаним дозволом - push_permission = denied', async () => {
    const { store, n } = game();
    n.set({ permission: 'denied' });
    await store.getState().comeForeground(T0 + 1000);
    expect(store.getState().settings.pushPermission).toBe('denied');
  });
});

describe('збереження', () => {
  test('налаштування, заплановане й лічильники особової справи переживають запис і читання', async () => {
    const { store } = game();
    store.getState().setSetting('sound', false);
    store.getState().setNotifCategory('boosts', true);
    store.setState({ stats: { inspTotal: 2, inspPassed: 1, drones: 3 } });
    await store.getState().goBackground(T0);
    const d = draftOf(store)!;
    const kv = memoryStorage({ [KEY_SAVE]: serialize(d) });
    const r = loadSave(kv, { current: CURRENT_SCHEMA, migrations: MIGRATIONS });
    if (r.kind !== 'ok') throw new Error(r.kind);
    expect(r.save.game.settings).toMatchObject({ sound: false, pushPermission: 'granted', notif: { boosts: true } });
    expect(r.save.game.stats).toEqual({ inspTotal: 2, inspPassed: 1, drones: 3 });
    expect(r.save.game.notifications.planned.length).toBeGreaterThan(0);
  });
});
