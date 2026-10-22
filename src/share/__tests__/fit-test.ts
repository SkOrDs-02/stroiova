// 007 FR-28, AC-16: кегль 36 -> 28 кроком 2, не менше 28; надлишок обрізається по межі речення з «…».
import { FIT, fitText, wrap } from '../fit';

const BOX = { width: 900, height: 600 };

describe('fitText', () => {
  test('короткий текст - 36 px, без обрізання', () => {
    const r = fitText('Доповідь повернуто.', BOX);
    expect(r).toMatchObject({ fontSize: 36, truncated: false, text: 'Доповідь повернуто.' });
  });

  test('довший текст ужимається кроком 2 px, не нижче 28', () => {
    const t = 'Переносити підпис на наступну сторінку дозволено, якщо на ній не менше двох рядків тексту. '.repeat(6).trim();
    const r = fitText(t, BOX);
    expect(r.truncated).toBe(false);
    expect(r.fontSize).toBeLessThan(36);
    expect(r.fontSize).toBeGreaterThanOrEqual(28);
    expect((36 - r.fontSize) % 2).toBe(0);
  });

  test('AC-16: текст на 2 екрани - 28 px, обрізано по межі речення з «…», і результат влазить', () => {
    const sentence = 'Доповідь закінчено, більше доповісти нічого, але ще один рядок додано для певності. ';
    const t = sentence.repeat(30).trim();
    const r = fitText(t, BOX);
    expect(r.fontSize).toBe(FIT.minFs);
    expect(r.truncated).toBe(true);
    expect(r.text.endsWith('. …')).toBe(true);
    const perLine = Math.floor(BOX.width / (FIT.minFs * FIT.charW));
    expect(wrap(r.text, perLine).length).toBeLessThanOrEqual(Math.floor(BOX.height / (FIT.minFs * FIT.lineH)));
  });

  test('одне величезне речення ріжеться по словах із «…»', () => {
    const t = `${'слово '.repeat(400)}кінець.`;
    const r = fitText(t, BOX);
    expect(r.truncated).toBe(true);
    expect(r.text.endsWith(' …')).toBe(true);
    expect(r.text.length).toBeLessThan(t.length);
  });
});

describe('wrap', () => {
  test('слова в межах ширини, довге слово ріжеться, абзаци зберігаються', () => {
    expect(wrap('а бб ввв', 4)).toEqual(['а бб', 'ввв']);
    expect(wrap('абвгдеє', 3)).toEqual(['абв', 'где', 'є']);
    expect(wrap('а\nб', 10)).toEqual(['а', 'б']);
  });
});
