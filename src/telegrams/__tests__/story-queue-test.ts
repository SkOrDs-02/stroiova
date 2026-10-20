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
    expect(r.events.find((e) => e.type === 'telegramReceive' && e.telegramId === 'tg_notice_kopiyka_numbering')).toMatchObject({ scripted: true });
  });
});

describe('ВП-2: «Нових» уже п’ять', () => {
  test('слот пропущено, сюжетна лишається в черзі й приходить, щойно є місце', () => {
    const ids = ['tg_0001_sergeants', 'tg_0002_less_paper', 'tg_0003_acquaint', 'tg_0004_snow', 'tg_0005_pc_literacy'];
    const tg0 = { ...tgWith(ids), queue: ['tg_notice_kopiyka_numbering'] };
    const full = tick(tg0, eco(), { cfg, fromMs: T0, nowMs: T0 + DAY, tzOffsetMin: 0, level: 2, digitizations: 1, raceActive: null, away: false });
    expect(full.tg.inbox.some((x) => x.id === 'tg_notice_kopiyka_numbering')).toBe(false);
    expect(full.tg.queue).toEqual(['tg_notice_kopiyka_numbering']);
    const freed = { ...full.tg, inbox: full.tg.inbox.map((x) => ({ ...x, status: 'archive' as const })) };
    const later = tick(freed, eco(), { cfg, fromMs: T0 + DAY, nowMs: T0 + 3 * DAY, tzOffsetMin: 0, level: 2, digitizations: 1, raceActive: null, away: false });
    expect(later.tg.inbox.some((x) => x.id === 'tg_notice_kopiyka_numbering')).toBe(true);
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
