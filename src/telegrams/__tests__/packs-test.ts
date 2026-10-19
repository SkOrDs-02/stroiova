// 011 пачки Р3: доставка о 03:00 (AC-11), мішок, окрема телеграма дня, override не в пачці (AC-16), контент пачок (FR-30, AC-20).
import { newGame } from '@/economy/game/state';
import type { EconomyState } from '@/economy/game/types';

import { allPacks, packDef, telegram } from '../content';
import { newCount, tick } from '../schedule';
import { packByNo, packGroups } from '../packs';
import { cfg, p, tgWith } from '../test-utils';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const D0 = Date.UTC(2025, 9, 10);
const at = (h: number, day = 0) => D0 + day * DAY + h * HOUR;

const eco3 = (): EconomyState => ({ ...newGame(cfg, D0), level: 3 });
const ctx = (fromMs: number, nowMs: number, away = true) => ({ cfg, fromMs, nowMs, tzOffsetMin: 0, level: 3, digitizations: 9, raceActive: null, away });

/** Стан Р3: розклад іде, останню пачку вже видано в день `day` */
const start = () => tgWith([], { startMs: at(0, -10) });

describe('доставка (FR-17, FR-18)', () => {
  test('AC-11: о 03:00 одна пачка з 3 телеграм - один рядок у «Нових», події packReceive + 3 telegramReceive, delivery: while_away', () => {
    const tg0 = tick(start(), eco3(), ctx(at(15, 0), at(16, 0), false)).tg; // вхід на Р3 о 15:00 - пачки ще немає
    expect(packGroups(tg0)).toHaveLength(0);
    const r = tick(tg0, eco3(), ctx(at(16, 0), at(5, 1)));
    const g = packGroups(r.tg);
    expect(g).toHaveLength(1);
    expect(g[0]!.no).toBe(1);
    expect(g[0]!.items).toHaveLength(3);
    expect(g[0]!.items.map((i) => i.pack!.index)).toEqual([1, 2, 3]);
    expect(r.tg.inbox.filter((i) => i.pack)).toHaveLength(3);
    expect(newCount(r.tg)).toBeGreaterThanOrEqual(1);
    const rows = r.tg.inbox.filter((i) => i.status === 'new' && !i.pack).length + 1;
    expect(newCount(r.tg)).toBe(rows);
    expect(r.events.filter((e) => e.type === 'packReceive')).toEqual([expect.objectContaining({ no: 1, delivery: 'while_away', isRepeat: false })]);
    expect(r.events.filter((e) => e.type === 'telegramReceive' && packDef(g[0]!.id)!.telegrams.includes(e.telegramId))).toHaveLength(3);
    expect(r.delivered.filter((i) => i.pack)).toHaveLength(3);
  });

  test('пачка однієї доби - один раз, повторний тік і годинник "на 03:00" її не дублюють', () => {
    const tg0 = tick(start(), eco3(), ctx(at(15, 0), at(16, 0), false)).tg;
    const a = tick(tg0, eco3(), ctx(at(16, 0), at(6, 1)));
    const b = tick(a.tg, eco3(), ctx(at(5, 1), at(7, 1)));
    expect(packGroups(b.tg)).toHaveLength(1);
    expect(b.events.filter((e) => e.type === 'packReceive')).toHaveLength(0);
  });

  test('мішок: 20 діб - 20 різних пачок, 21-ша повторюється і не збігається з 20-ю; is_repeat з 21-ї', () => {
    let tg = tick(start(), eco3(), ctx(at(15, 0), at(16, 0), false)).tg;
    const ids: string[] = [];
    let repeats = 0;
    for (let d = 1; d <= 21; d++) {
      // чистимо вхідні: ліміт "Нових" не заважає тесту мішка
      tg = { ...tg, inbox: tg.inbox.map((x) => ({ ...x, status: 'archive' as const })) };
      const r = tick(tg, eco3(), ctx(at(16, d - 1), at(5, d)));
      tg = r.tg;
      ids.push(packGroups(tg)[0]!.id);
      repeats += r.events.filter((e) => e.type === 'packReceive' && e.isRepeat).length;
    }
    expect(new Set(ids.slice(0, 20)).size).toBe(20);
    expect(ids[20]).not.toBe(ids[19]);
    expect(repeats).toBe(1);
    expect(ids[20]).toBeDefined();
  });

  test('у «Нових» уже 5 - пачку пропущено як слот, наступна завтра', () => {
    const full = tgWith(['tg_0002', 'tg_0003', 'tg_0004', 'tg_0005', 'tg_0006'], { startMs: at(0, -10), packs: { day: '2025-10-09', seq: 0 } });
    expect(newCount(full)).toBe(5);
    const r = tick(full, eco3(), ctx(at(16, -1), at(5, 0)));
    expect(packGroups(r.tg)).toHaveLength(0);
    expect(r.tg.packs.day).toBe('2025-10-10');
    const full2 = { ...r.tg, inbox: r.tg.inbox.map((x) => ({ ...x, status: 'archive' as const })) };
    expect(packGroups(tick(full2, eco3(), ctx(at(6, 0), at(5, 1))).tg)).toHaveLength(1);
  });

  test('окрема телеграма дня на Р3: не більше однієї на добу, лише з телеграм рівня 3 без pack, override не входить у пачку', () => {
    let tg = tick(start(), eco3(), ctx(at(15, 0), at(16, 0), false)).tg;
    for (let d = 1; d <= 30; d++) {
      tg = { ...tg, inbox: tg.inbox.map((x) => ({ ...x, status: 'archive' as const })) };
      const r = tick(tg, eco3(), ctx(at(0, d), at(24, d)));
      tg = r.tg;
      const singles = r.delivered.filter((i) => !i.pack && i.kind === 'telegram' && telegram(i.id)?.kind !== 'override');
      expect(singles.length).toBeLessThanOrEqual(1);
      for (const s of singles) {
        expect(telegram(s.id)!.level).toBe(3);
        expect(telegram(s.id)!.pack).toBeUndefined();
      }
    }
    for (const d of allPacks()) for (const id of d.telegrams) expect(telegram(id)!.kind ?? 'standard').not.toBe('override');
  });

  test('на Р2 пачок немає', () => {
    const r = tick(start(), { ...eco3(), level: 2 }, { ...ctx(at(15, 0), at(5, 3)), level: 2 });
    expect(packGroups(r.tg)).toHaveLength(0);
    expect(r.tg.packs.day).toBeNull();
    expect(packByNo(r.tg, 1)).toBeNull();
  });
});

describe('контент пачок (FR-30, AC-20)', () => {
  test('20 пачок по pack.size телеграм рівня 3 без override, кожна телеграма має pack з її id та місцем, спільна packDetail', () => {
    const packs = allPacks();
    expect(packs).toHaveLength(20);
    for (const d of packs) {
      expect(d.telegrams).toHaveLength(p.pack.size);
      expect(d.packDetail.length).toBeGreaterThan(0);
      d.telegrams.forEach((id, i) => {
        const t = telegram(id)!;
        expect(t).toBeDefined();
        expect(t.level).toBe(3);
        expect(t.kind ?? 'standard').toBe('standard');
        expect(t.pack).toEqual({ id: d.id, index: i + 1 });
      });
    }
  });

  test('summary має тексти рівно для видів, спільних для всіх трьох телеграм', () => {
    for (const d of allPacks()) {
      const common = ['diligent', 'formal_reply', 'drawer'].filter((k) => d.telegrams.every((id) => telegram(id)!.choices.some((c) => c.kind === k && !c.requires)));
      expect(Object.keys(d.summary).sort()).toEqual(common.sort());
      for (const k of common) {
        const s = d.summary[k as 'diligent']!;
        if (k === 'drawer') expect(s.note ?? s.reply).toBeTruthy();
        else expect(s.reply && s.result).toBeTruthy();
      }
    }
  });
});
