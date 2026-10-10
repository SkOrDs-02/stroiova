// 009 AC-9, FR-12: годинник сесії рахує монотонний приріст; переведення стінного годинника посеред сесії не впливає.
import { cfgV5 } from '@/economy/test-fixtures';

import { createSessionClock } from '../clock';
import { onboardingDone } from '@/save/migrations';

import { createConveyorStore } from '../store';

describe('годинник сесії', () => {
  test('AC-9: дохід 1 000/хв, стінний годинник +2 год і назад посеред сесії → за 1 хв 1 000 підписів', () => {
    let wall = 1_760_000_000_000;
    let mono = 0;
    const clock = createSessionClock(() => wall, () => mono);
    const cfg = cfgV5((p) => { p.streams[0]!.rate = 1000; for (const g of p.stages) g.rate = 5000; });
    const store = createConveyorStore(clock.now(), cfg);
    store.setState({ onboarding: onboardingDone() }); // гравець уже на конвеєрі (до кінця першого акта конвеєр стоїть, 002)
    for (let s = 1; s <= 60; s++) {
      mono += 1000;
      if (s === 20) wall += 2 * 3_600_000;
      if (s === 40) wall -= 2 * 3_600_000;
      store.getState().tick(clock.now());
    }
    expect(store.getState().state.signatures).toBeCloseTo(1000, 9);
  });
});
