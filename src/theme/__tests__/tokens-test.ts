import { color, size } from '@/theme';

// Інваріанти дизайн-системи, на які спираються рішення й конституція.
describe('токени теми', () => {
  test('штамп синьо-фіолетовий (рішення 4)', () => {
    expect(color.stamp).toBe('#4a3d9e');
    expect(color.stampOnDark).toBe('#c2baf8');
  });

  test('ціль дотику не менша за 44 px (принцип VI)', () => {
    expect(size.touchMin).toBeGreaterThanOrEqual(44);
  });
});
