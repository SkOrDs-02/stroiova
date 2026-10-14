// 002 FR-12, R3: «Пташка» онбордингу — множник у multStack і на тапах, як ad_boost.
import { tap } from '../game/actions';
import { multStack } from '../game/income';
import type { Effect } from '../game/types';
import { cfgV5, game, T0 } from '../test-fixtures';

const bird: Effect = { kind: 'mult', source: 'onboarding_bird', value: 2, startMs: T0, endMs: T0 + 60_000 };

test('multStack: рядок onboarding_bird першим, ×2 лише в межах ефекту', () => {
  const cfg = cfgV5();
  const s = game(cfg);
  expect(multStack(s, cfg, T0 + 1, [bird]).rows[0]).toMatchObject({ source: 'onboarding_bird', value: 2 });
  expect(multStack(s, cfg, T0 + 60_000, [bird]).total).toBe(1);
});

test('tap: «Пташка» подвоює підписи за тап', () => {
  const cfg = cfgV5();
  const s = game(cfg);
  const plain = tap(s, cfg, T0 + 1, []).state.signatures;
  const doubled = tap(s, cfg, T0 + 1, [bird]).state.signatures;
  expect(plain).toBeGreaterThan(0);
  expect(doubled).toBe(plain * 2);
});
