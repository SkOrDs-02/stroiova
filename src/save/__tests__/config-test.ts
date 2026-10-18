// 009 FR-22, AC-15: вбудований конфіг закріплюється на першій покупці рівня; після запуску — закріплений (cached).
import { bundledConfig, withBundled } from '@/economy/config';
import { cfgV5, T0 } from '@/economy/test-fixtures';
import { createConveyorStore, gameSave } from '@/features/conveyor/store';

describe('закріплення конфігу', () => {
  test('до першої покупки рівня null; перша покупка закріплює конфіг; відкриття потоку — ні', () => {
    const cfg = cfgV5();
    const store = createConveyorStore(T0, cfg);
    expect(gameSave(store).pinned).toBeNull();
    store.setState({ state: { ...store.getState().state, signatures: 1e6 } });
    store.getState().buy({ type: 'stream', id: 'akty' }, T0); // відкриття потоку — не покупка рівня
    expect(gameSave(store).pinned).toBeNull();
    store.getState().buy({ type: 'stream', id: 'raporty' }, T0);
    expect(gameSave(store).pinned).toEqual(cfg);
  });

  test('закріплений конфіг лишається, навіть коли вбудований інший (оновлення застосунку)', () => {
    const pinned = { ...cfgV5(), version: 'econ-old' };
    const store = createConveyorStore(T0, { ...pinned, source: 'cached' }, { state: createConveyorStore(T0, pinned).getState().state, effects: [], pinned });
    store.setState({ state: { ...store.getState().state, signatures: 1e6 } });
    store.getState().buy({ type: 'stream', id: 'raporty' }, T0);
    expect(gameSave(store).pinned?.version).toBe('econ-old');
    expect(store.getState().cfg.source).toBe('cached');
  });

  test('закріплений конфіг зі старого запису: числа економіки свої, нових параметрів (004) бракує — з вбудованого', () => {
    const { inspItems: _i, inspMinPrice: _m, ...oldParams } = bundledConfig.params;
    const pinned = { ...bundledConfig, version: 'econ-old', params: { ...oldParams, tapValue: 7 } as typeof bundledConfig.params };
    const cfg = withBundled(pinned);
    expect(cfg.source).toBe('cached');
    expect(cfg.version).toBe('econ-old');
    expect(cfg.params.tapValue).toBe(7);
    expect(cfg.params.inspItems).toEqual(bundledConfig.params.inspItems);
    expect(cfg.params.inspMinPrice).toBe(50);
  });
});
