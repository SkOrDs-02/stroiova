// 001 AC-1, принцип II: симулятор рахує модулем економіки й дає ті самі результати, що до рефакторингу.
// Повний набір відбитків (27) — `npm run golden -- --check` у CI; тут — швидкий підбір.
import fingerprints from '../../../balance/golden/fingerprints.json';
import P5 from '../../../balance/preset-v5.json';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const S = require('../../../balance/sim.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHash } = require('crypto');

const H = 3600;
const DAY = 24 * H;

function run(preset: { params: object }, seed: number, scenario: number) {
  const p = S.withDefaults(preset.params);
  p.seed = seed;
  return S.simulate(p, S.SCENARIOS[scenario]);
}

describe('симулятор на модулі економіки', () => {
  test('AC-1: preset-v5, «Дивиться рекламу», 21 день — віхи summary ±1%', () => {
    const r = run(P5, 1, 1);
    expect(r.out.firstClerk / 60).toBeCloseTo(P5.summary.firstClerkMin, 1); // 3,07 хв
    expect(Math.abs(r.out.prestiges[0].t / DAY - P5.summary.firstPrestigeDays)).toBeLessThan(P5.summary.firstPrestigeDays * 0.01);
    expect(Math.abs(r.out.level2At / DAY - P5.summary.level2Day)).toBeLessThan(P5.summary.level2Day * 0.01);
  });

  test.each([0, 1, 2])('відбиток preset-v5, зерно 1, сценарій %i не змінився', (sc) => {
    const r = run(P5, 1, sc);
    const body = JSON.stringify({ simulate: r, levelStats: S.levelStats(r), eventStats: S.eventStats(r) });
    const key = `preset-v5/seed1/${S.SCENARIOS[sc].id}` as keyof typeof fingerprints;
    expect(createHash('sha1').update(body).digest('hex')).toBe(fingerprints[key]);
  });

  test('sim.js бере параметри й формули з модуля', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const E = require('../core');
    expect(S.DEFAULTS.streams).toEqual(E.DEFAULTS.streams);
    expect(S.withDefaults(P5.params)).toEqual(E.withDefaults(P5.params));
  });
});
