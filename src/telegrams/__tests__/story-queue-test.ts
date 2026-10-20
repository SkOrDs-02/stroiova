// 014 FR-9, FR-13: сюжетна телеграма з черги займає слот і приходить як notice; підпис телеграм.
import { signOf } from '@/features/telegrams/TelegramDetail';
import { T0 } from '@/economy/test-fixtures';

import { telegram } from '../content';
import { tick } from '../schedule';
import { cfg, eco, tgWith, DAY } from '../test-utils';

describe('сюжетна телеграма з черги', () => {
  test('слот доби віддає її першою (замість звичайної) як notice', () => {
    const tg0 = { ...tgWith([]), queue: ['tg_notice_kopiyka_numbering'] };
    const r = tick(tg0, eco(), { cfg, fromMs: T0, nowMs: T0 + 2 * DAY, tzOffsetMin: 0, level: 2, digitizations: 1, raceActive: null, away: false });
    const first = r.tg.inbox[0]!;
    expect(first).toMatchObject({ id: 'tg_notice_kopiyka_numbering', kind: 'notice' });
    expect(r.tg.queue).toEqual([]);
    expect(r.tg.inbox.filter((x) => x.id === 'tg_notice_kopiyka_numbering')).toHaveLength(1);
    expect(r.events.some((e) => e.type === 'telegramReceive' && e.telegramId === 'tg_notice_kopiyka_numbering')).toBe(true);
  });
});

describe('підпис (FR-13, AC-9)', () => {
  test('звичайна телеграма - «Оператор ЕОМ № 1»; notice від персонажа - без підпису; sign: kava і auto', () => {
    expect(signOf(telegram('tg_0001_sergeants')!)).toBe('Оператор ЕОМ № 1');
    expect(signOf(telegram('tg_notice_kopiyka_numbering')!)).toBeNull();
    expect(signOf({ ...telegram('tg_0001_sergeants')!, sign: 'kava' })).toBe('Начштабу «Кава»');
    expect(signOf({ ...telegram('tg_0001_sergeants')!, sign: 'auto' })).toBeNull();
  });
});
