// 001 FR-5, FR-7, FR-8: формули й контрольні значення специфікації (фікстура preset-v5, рішення 52).
import P5 from '../../../../balance/preset-v5.json';
import P7 from '../../../../balance/preset-v7.json';
import { capAt, levelItems, milestoneTarget, packPrice, points, prestigeMult, priceAt, withDefaults } from '..';

const p5 = withDefaults(P5.params);
const p7 = withDefaults(P7.params);
const unit = (p: typeof p5, id: string, level = 1) => {
  const it = levelItems(p, level);
  const u = [...it.streams, ...it.stages].find((x) => x.id === id);
  if (!u) throw new Error(id);
  return u;
};

describe('формули', () => {
  test('ціни Рапортів і Актів (контрольні значення 001)', () => {
    const r = unit(p5, 'raporty');
    expect(priceAt(r, 1)).toBe(8);
    expect(priceAt(r, 24)).toBeCloseTo(108.42, 2);
    expect(packPrice(r, 1, 10)).toBeCloseTo(140.39, 2);
    expect(packPrice(r, 1, 24)).toBeCloseTo(945.24, 2);
    expect(priceAt(unit(p5, 'akty'), 10)).toBeCloseTo(360.49, 2);
    expect(priceAt(unit(p5, 'akty'), 0)).toBe(300);
  });

  test('виробіток з віхами ×2 кожні 25 рівнів', () => {
    const r = unit(p5, 'raporty');
    expect(capAt(r, 0, p5)).toBe(0);
    expect(capAt(r, 24, p5)).toBe(144);
    expect(capAt(r, 25, p5)).toBe(300);
    expect(capAt(r, 50, p5)).toBe(1200);
  });

  test('«до віхи» — найближчий рівень, кратний 25', () => {
    expect(milestoneTarget(1, p5)).toBe(25);
    expect(milestoneTarget(24, p5)).toBe(25);
    expect(milestoneTarget(25, p5)).toBe(50);
  });

  test('Р2 «Бригада» (AC-19): виробіток ×10, ціни ×5, діловоди ×1', () => {
    expect(capAt(unit(p5, 'raporty', 2), 1, p5)).toBe(60);
    expect(priceAt(unit(p5, 'raporty', 2), 1)).toBe(40);
    expect(capAt(unit(p5, 'kazna', 2), 1, p5)).toBe(210);
    expect(unit(p5, 'kazna', 2).manager).toBe(400);
    expect(priceAt(unit(p5, 'nakazy', 2), 0)).toBe(15_000_000);
  });

  test('бали й множник цифровізації', () => {
    expect(prestigeMult(38, p5)).toBeCloseTo(1.76, 10);
    expect(points(75000 * 900, 75000, p5)).toBe(30);
  });

  test('preset-v7: ті самі формули, інші числа (рішення 52)', () => {
    expect(priceAt(unit(p7, 'raporty'), 1)).toBeCloseTo(8.8, 10);
    expect(capAt(unit(p7, 'raporty'), 1, p7)).toBeCloseTo(3.96, 10);
  });
});
