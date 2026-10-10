// 002 FR-6, FR-7, FR-9; рішення 58.
import { gendered, validateCallsign } from '../callsign';

const err = (s: string) => {
  const r = validateCallsign(s);
  return r.ok ? 'ok' : r.error;
};

describe('позивний', () => {
  test('FR-6: довжина 2–16', () => {
    expect(err('')).toBe('empty');
    expect(err('   ')).toBe('empty');
    expect(err('Я')).toBe('tooShort');
    expect(err('Ексель-на-папері')).toBe('ok');
    expect(err('Ексель-на-паперіх')).toBe('tooLong');
  });

  test('рішення 58: літери, цифри, дефіс, пробіл', () => {
    expect(err('Друкар 2')).toBe('ok');
    expect(err('Printer')).toBe('ok');
    expect(err('Скріпка!')).toBe('chars');
    expect(err('Кіт🐈')).toBe('chars');
    expect(err('Ї_ґ')).toBe('chars');
  });

  test('FR-7, AC-4: стоп-слова за підрядком без регістру, з латинськими й цифровими двійниками', () => {
    expect(err('зсу-1')).toBe('stopword');
    expect(err('ЗСУшник')).toBe('stopword');
    expect(err('ЗCУ')).toBe('stopword'); // C латинська
    expect(err('3СУ')).toBe('stopword'); // 3 цифра
    expect(err('З С У')).toBe('stopword');
    expect(err('УПА')).toBe('stopword');
    expect(err('Сисадмін')).toBe('ok');
    expect(err('СЗЧ')).toBe('stopword');
    expect(err('єблан')).toBe('stopword');
    expect(err('XYI')).toBe('stopword'); // латиниця, що читається як мат
  });

  test('рішення 58: основи не ловлять звичайні слова', () => {
    for (const ok of ['Дебаг', 'Кебаб', 'Мебляр', 'Підорожник', 'Себастьян', 'Вебадмін']) expect(err(ok)).toBe('ok');
  });

  test('FR-9: шаблон {m:…|f:…}', () => {
    const s = 'Цього разу {m:встиг|f:встигла} за хвилину. Далі буде довше.';
    expect(gendered(s, 'f')).toBe('Цього разу встигла за хвилину. Далі буде довше.');
    expect(gendered(s, 'm')).toBe('Цього разу встиг за хвилину. Далі буде довше.');
  });
});
