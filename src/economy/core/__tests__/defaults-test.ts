// Порт withDefaults/levelItems дає те саме, що sim.js до рефакторингу (знімок balance/golden/core.json).
import core from '../../../../balance/golden/core.json';
import { DEFAULTS, SCENARIOS, levelItems, reachableLevels, withDefaults } from '..';

const presets = {
   
  'preset-v5': require('../../../../balance/preset-v5.json'),
   
  'preset-v6': require('../../../../balance/preset-v6.json'),
   
  'preset-v7': require('../../../../balance/preset-v7.json'),
};
type Name = keyof typeof presets;

const strip = <T extends object>(x: T) => {
  const { tapRateMax: _t, offlineReturnMin: _o, ...rest } = x as T & { tapRateMax?: number; offlineReturnMin?: number };
  return rest;
};

describe('параметри', () => {
  test('DEFAULTS і SCENARIOS як у sim.js; нові лише tapRateMax = 10 (FR-16) і offlineReturnMin = 5 (FR-25)', () => {
    expect(strip(DEFAULTS)).toEqual(core.DEFAULTS);
    expect(DEFAULTS.tapRateMax).toBe(10);
    expect(DEFAULTS.offlineReturnMin).toBe(5);
    expect(SCENARIOS).toEqual(core.SCENARIOS);
  });

  test.each(Object.keys(presets) as Name[])('%s: withDefaults і levelItems як у sim.js', (name) => {
    const p = withDefaults(presets[name].params);
    expect(strip(p)).toEqual(core.withDefaults[name]);
    const items = [];
    for (let l = 1; l <= reachableLevels(p); l++) items.push(levelItems(p, l));
    expect(items).toEqual(core.levelItems[name]);
  });
});

describe('пункти чекліста (04)', () => {
  test('базові пункти рівня в сумі дають inspChecklistMin (Р1 129, Р2 51)', () => {
    for (const level of [1, 2]) {
      const sum = DEFAULTS.inspItems.filter((i) => i.level === level && !i.added).reduce((a, i) => a + i.min, 0);
      expect(sum).toBe(DEFAULTS.levels[level - 1]!.inspChecklistMin);
    }
  });
});
