// 013 FR-12, AC-8, FR-10: «Збій СЕДО» - лише з цифровими ланками, ≤ 1 на добу й одночасно, «Роздрукувати» за 5 аркушів.
import { newGame } from '@/economy/game/state';
import type { EconomyState } from '@/economy/game/types';

import { printSedo, sedoActive, sedoOnSessionStart } from '../events';
import { seedFrom } from '../rng';
import { cfg, tgWith } from '../test-utils';
import type { TelegramState } from '../types';

const D0 = Date.UTC(2025, 9, 10, 12);
const MIN = 60_000;
const always = { ...cfg, params: { ...cfg.params, sedoFailChance: 1 } };
const e5 = (digital: string[] = ['stroy'], paper = 30): EconomyState => ({ ...newGame(cfg, D0), level: 5, digital, paper });
const start = (patch: Partial<TelegramState> = {}) => tgWith([], { startMs: D0 - 30 * 86_400_000, rng: seedFrom('sedo'), ...patch });

describe('старт (FR-12)', () => {
  test('без цифрових ланок збою немає; з ними (chance = 1) - ×sedoFailMult на sedoFailMin хв на одну з цифрових', () => {
    expect(sedoOnSessionStart(start(), always, e5([]), D0, 0).effect).toBeNull();
    const r = sedoOnSessionStart(start(), always, e5(['stroy', 'fin']), D0, 0);
    expect(r.effect).toMatchObject({ kind: 'factor', source: 'sedo_failure', value: cfg.params.sedoFailMult, startMs: D0, endMs: D0 + cfg.params.sedoFailMin * MIN });
    expect(['stroy', 'fin']).toContain(r.effect!.target!.id);
    expect(r.events).toEqual([expect.objectContaining({ type: 'sedoStart', endMs: D0 + cfg.params.sedoFailMin * MIN })]);
    expect(sedoActive(r.tg, D0 + MIN)).toMatchObject({ stageId: r.effect!.target!.id });
  });

  test('не більше одного одночасно і однієї на добу; наступної доби знову', () => {
    const a = sedoOnSessionStart(start(), always, e5(), D0, 0);
    expect(sedoOnSessionStart(a.tg, always, e5(), D0 + 5 * MIN, 0).effect).toBeNull();
    const ended = sedoOnSessionStart(a.tg, always, e5(), D0 + 60 * MIN, 0);
    expect(ended.effect).toBeNull(); // та сама доба
    expect(sedoOnSessionStart(a.tg, always, e5(), D0 + 24 * 60 * MIN, 0).effect).not.toBeNull();
  });

  test('імовірність sedoFailChance: за 400 спроб потрапляє приблизно десята частина', () => {
    let hits = 0;
    for (let i = 0; i < 400; i++) if (sedoOnSessionStart(start({ rng: seedFrom(`s-${i}`) }), cfg, e5(), D0, 0).effect) hits++;
    expect(hits).toBeGreaterThan(15);
    expect(hits).toBeLessThan(80);
  });
});

describe('«Роздрукувати» (AC-8)', () => {
  const active = () => sedoOnSessionStart(start(), always, e5(), D0, 0).tg;

  test('3 аркуші - «бракує 2»; 5 аркушів - збій знято, папір 0', () => {
    const tg = active();
    expect(printSedo(tg, e5(['stroy'], 3), cfg, D0 + MIN)).toEqual({ error: 'paper', lack: 2 });
    const r = printSedo(tg, e5(['stroy'], 5), cfg, D0 + MIN);
    if ('error' in r) throw new Error(r.error);
    expect(r.eco.paper).toBe(0);
    expect(r.stageId).toBe('stroy');
    expect(sedoActive(r.tg, D0 + MIN)).toBeNull();
    expect(r.events).toEqual([expect.objectContaining({ type: 'sedoPrint', paperSpent: 5 })]);
  });

  test('без активного збою - помилка none', () => {
    expect(printSedo(start(), e5(), cfg, D0)).toEqual({ error: 'none' });
  });
});
