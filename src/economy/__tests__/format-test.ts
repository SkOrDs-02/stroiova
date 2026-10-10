// 001 AC-18, AC-4 (округлення), FR-10, FR-30.
import { formatBig, formatCountdown, formatDuration, formatMult, formatRate } from '../format';

const n = (s: string) => s.replace(/ /g, ' ');

describe('формат чисел', () => {
  test('AC-18: 9 999; 186 тис.; 2,41 млн; 1 aa; 12,3 ab', () => {
    expect(formatBig(9999)).toBe(n('9 999'));
    expect(formatBig(186400)).toBe(n('186 тис.'));
    expect(formatBig(2412000)).toBe(n('2,41 млн'));
    expect(formatBig(999_990_000_000)).toBe(n('1 aa'));
    expect(formatBig(1.23e16)).toBe(n('12,3 ab'));
  });

  test('AC-18: лічильник у шапці — повне до 10 млн, далі два знаки', () => {
    expect(formatBig(1_248_360, 'counter')).toBe(n('1 248 360'));
    expect(formatBig(12_480_000, 'counter')).toBe(n('12,48 млн'));
  });

  test('AC-4: ціна вгору, баланс униз (8,96 → «9», 8,99 → «8»); Акти 10 → 11 «361»', () => {
    expect(formatBig(8.96, 'price')).toBe('9');
    expect(formatBig(8.99, 'balance')).toBe('8');
    expect(formatBig(360.49, 'price')).toBe('361');
    expect(formatBig(945.24, 'price')).toBe('946');
    expect(formatBig(140.39, 'price')).toBe('141');
  });

  test('розряди після млрд: aa, ab … az, ba', () => {
    expect(formatBig(1e12)).toBe(n('1 aa'));
    expect(formatBig(1e15)).toBe(n('1 ab'));
    expect(formatBig(1e12 * 1000 ** 25)).toBe(n('1 az'));
    expect(formatBig(1e12 * 1000 ** 26)).toBe(n('1 ba'));
  });

  test('швидкість, множник, тривалість, відлік', () => {
    expect(formatRate(412)).toBe('+412/хв');
    expect(formatMult(1.5)).toBe('×1,5');
    expect(formatMult(5.72)).toBe('×5,72');
    expect(formatDuration(5 * 3600 + 12 * 60)).toBe(n('5 год 12 хв'));
    expect(formatCountdown(3 * 3600 + 41 * 60 + 12)).toBe('3:41:12');
  });
});
