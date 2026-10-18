// 004 AC-7: дохід 2 100/хв — «Пофарбувати бордюри» 39 900, «Підшити журнали» 186 900; буст ×2 ціни не змінює.
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';

import { baseChecklist } from '../checklist';

jest.mock('@/economy/game/income', () => ({ ...jest.requireActual('@/economy/game/income'), baseIncomePerMin: () => 2100 }));

test('AC-7: ціна = хвилини × 2 100', () => {
  const items = baseChecklist(newGame(bundledConfig, 0), bundledConfig, 1);
  const price = (id: string) => items.find((i) => i.id === id)!.price;
  expect(price('paint_borders')).toBe(39_900);
  expect(price('journals_stitch')).toBe(186_900);
  // ціни рахує baseIncomePerMin без ефектів: буст ×2 чи сповільнення в них не входять (AC-21)
});
