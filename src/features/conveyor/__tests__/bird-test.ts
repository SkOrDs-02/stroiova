// 002 FR-12, AC-6 (друга частина), рішення 57: перший акт і «Пташка» за ігровим часом.
import { bundledConfig } from '@/economy/config';
import { multStack } from '@/economy/game/income';
import { HOUR, MIN, T0 } from '@/economy/test-fixtures';

import { ACT_TAPS, birdEffect, createConveyorStore } from '../store';

function atAct() {
  const store = createConveyorStore(T0, bundledConfig);
  const s = store.getState();
  s.onbComplete(1);
  s.onbComplete(2);
  s.onbComplete(3, { callsign: { type: 'excel', text: 'Ексель' }, gender: 'f' });
  return store;
}

const birdMult = (store: ReturnType<typeof atAct>) => {
  const st = store.getState();
  return multStack(st.state, st.cfg, st.lastMs, birdEffect(st.cfg, st.onboarding, st.lastMs)).rows.find((r) => r.source === 'onboarding_bird')?.value;
};

describe('перший акт і «Пташка»', () => {
  test('AC-6: 7 з 8 і ще 3 тапи — зараховано рівно 8, + 8 × tapValue підписів, крок 4 один раз', () => {
    const store = atAct();
    const s = store.getState();
    for (let i = 0; i < 7; i++) s.actSign();
    expect(store.getState().state.signatures).toBe(0);
    for (let i = 0; i < 3; i++) s.actSign();
    const st = store.getState();
    expect(st.actTaps).toBe(ACT_TAPS);
    expect(st.state.signatures).toBe(ACT_TAPS * bundledConfig.params.tapValue);
    expect(st.onboarding.step).toBe(5);
    expect(st.onboarding.completed.filter((c) => c.step === 4)).toHaveLength(1);
  });

  test('FR-12: ПОГОДЖЕНО — «Пташка» ×2 на onboardingBirdMin хв ігрового часу; фон її не зменшує', () => {
    const store = atAct();
    for (let i = 0; i < ACT_TAPS; i++) store.getState().actSign();
    store.getState().stamp();
    store.getState().stamp(); // повторний кінець анімації — крок 5 один раз
    const p = bundledConfig.params;
    expect(store.getState().onboarding).toMatchObject({ step: 6, birdLeftMs: p.onboardingBirdMin * MIN });
    expect(birdMult(store)).toBe(p.onboardingBirdMult);

    // 10 хв гри, 2 год у фоні, ще 10 хв гри
    for (let m = 1; m <= 10; m++) store.getState().tick(T0 + m * MIN);
    store.getState().away(T0 + 10 * MIN, T0 + 10 * MIN + 2 * HOUR);
    expect(store.getState().onboarding.birdLeftMs).toBe(10 * MIN);
    expect(store.getState().playtimeMs).toBe(10 * MIN);
    const back = T0 + 10 * MIN + 2 * HOUR;
    for (let m = 1; m <= 10; m++) store.getState().tick(back + m * MIN);
    expect(store.getState().onboarding.birdLeftMs).toBe(0);
    expect(store.getState().playtimeMs).toBe(20 * MIN);
    expect(birdMult(store)).toBeUndefined();
  });

  test('FR-12: «Пташка» множить онлайн-дохід і не потрапляє в запис', () => {
    const run = (withBird: boolean) => {
      const store = atAct();
      for (let i = 0; i < ACT_TAPS; i++) store.getState().actSign();
      if (withBird) store.getState().stamp();
      store.getState().tick(T0 + MIN);
      return store;
    };
    const a = run(false).getState();
    const b = run(true).getState();
    const base = a.state.signatures - ACT_TAPS * bundledConfig.params.tapValue;
    const bird = b.state.signatures - ACT_TAPS * bundledConfig.params.tapValue;
    expect(base).toBeGreaterThan(0);
    expect(bird).toBeCloseTo(base * bundledConfig.params.onboardingBirdMult, 9);
    expect(b.effects.some((e) => (e.source as string) === 'onboarding_bird')).toBe(false);
  });
});
