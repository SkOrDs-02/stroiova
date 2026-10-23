// 017: коли настає переїзд (FR-1, FR-2), вікна ящиків (FR-4), втрата паперу (FR-8, FR-10, AC-4).
import { bundledConfig } from '@/economy/config';

import { MOVE_MS, boxAt, finishMove, moveDue, newMove, paperLost } from '../move';

const p = bundledConfig.params;
const ctx = { level: 3, dubN: 0, onboardingDone: true, finaleStarted: false };

describe('moveDue', () => {
  test('FR-1: рівні 3 і 4, раз на рівень', () => {
    expect(p.moveLevels).toEqual([3, 4]);
    expect(moveDue(newMove(), p, ctx)).toBe(true);
    expect(moveDue(newMove(), p, { ...ctx, level: 4 })).toBe(true);
    expect(moveDue(newMove(), p, { ...ctx, level: 2 })).toBe(false);
    expect(moveDue(newMove(), p, { ...ctx, level: 5 })).toBe(false);
    expect(moveDue(finishMove(newMove(), 3), p, ctx)).toBe(false);
    expect(moveDue(finishMove(newMove(), 3), p, { ...ctx, level: 4 })).toBe(true);
  });

  test('FR-2: не в онбордингу, не в Дублях, не у фіналі; нейтральний пресет без ящиків - ніколи', () => {
    expect(moveDue(newMove(), p, { ...ctx, onboardingDone: false })).toBe(false);
    expect(moveDue(newMove(), p, { ...ctx, dubN: 1 })).toBe(false);
    expect(moveDue(newMove(), p, { ...ctx, finaleStarted: true })).toBe(false);
    expect(moveDue(newMove(), { ...p, moveBoxes: 0 }, ctx)).toBe(false);
  });

  test('позначка рівня не дублюється', () => {
    const m = finishMove(finishMove(newMove(), 3), 3);
    expect(m.done).toEqual([3]);
  });
});

describe('boxAt', () => {
  test('FR-4: ящики по одному, кожен у своєму вікні; після 20 с - жодного', () => {
    const w = MOVE_MS / p.moveBoxes;
    expect(boxAt(0, p)).toBe(0);
    expect(boxAt(w - 1, p)).toBe(0);
    expect(boxAt(w, p)).toBe(1);
    expect(boxAt(MOVE_MS - 1, p)).toBe(p.moveBoxes - 1);
    expect(boxAt(MOVE_MS, p)).toBeNull();
    expect(boxAt(-1, p)).toBeNull();
  });
});

describe('paperLost', () => {
  test('FR-8: частка запасу за кожен нескладений ящик; склав усі - нуль', () => {
    expect(paperLost(1000, p.moveBoxes, p)).toBe(0);
    expect(paperLost(1000, p.moveBoxes - 3, p)).toBeCloseTo(1000 * 3 * p.moveLossPerBox);
  });

  test('FR-10: пропуск (0 ящиків) - найбільша втрата: 50 % за пресетом', () => {
    expect(paperLost(1000, 0, p)).toBeCloseTo(500);
  });

  test('AC-4: втрата не більша за запас; паперу нуль - нуль', () => {
    expect(paperLost(1000, 0, { ...p, moveLossPerBox: 0.5 })).toBe(1000);
    expect(paperLost(0, 0, p)).toBe(0);
    expect(paperLost(1000, 99, p)).toBe(0);
    expect(paperLost(1000, -5, p)).toBeCloseTo(500);
  });
});
