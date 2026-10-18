// Рішення 41: мішок реплік — без повтору до вичерпання, ніколи двічі поспіль.
import { pickLine } from '../lines';
import { newTelegrams } from '../schedule';
import { p } from '../test-utils';

test('мішок: усі 5 рядків до повтору, на межі кола не двічі поспіль', () => {
  for (const seed of ['a', 'b', 'c']) {
    let tg = newTelegrams(p, seed);
    const seq: number[] = [];
    for (let i = 0; i < 30; i++) {
      const r = pickLine(tg, 'pool', 5);
      tg = r.tg;
      seq.push(r.index!);
    }
    for (let k = 0; k < 6; k++) expect(new Set(seq.slice(k * 5, k * 5 + 5)).size).toBe(5);
    for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
  }
});
