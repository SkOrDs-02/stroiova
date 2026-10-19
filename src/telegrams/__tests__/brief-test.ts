// 012 FR-17, FR-18, AC-13: «Доповідь тезово» - документ від Кави на старті сесії Р4, поза квотою, не частіше за minGapDays.
import { newGame } from '@/economy/game/state';
import type { EconomyState } from '@/economy/game/types';

import { answer } from '../effects';
import { BRIEF_ID, briefOnSessionStart } from '../events';
import { seedFrom } from '../rng';
import { cfg, ctx, tgWith } from '../test-utils';
import type { TelegramState } from '../types';

const D0 = Date.UTC(2025, 9, 10, 9);
const DAY = 86_400_000;
const e4 = (): EconomyState => ({ ...newGame(cfg, D0), level: 4, paper: 30 });
const alwaysCfg = (chance: number) => ({ ...cfg, params: { ...cfg.params, brief: { ...cfg.params.brief, chance } } });
const start = (patch: Partial<TelegramState> = {}) => tgWith([], { startMs: D0 - 10 * DAY, rng: seedFrom('brief'), ...patch });

describe('старт сесії (FR-17)', () => {
  test('на Р1-Р3 події немає; на Р4 з імовірністю 1 - документ від Кави в «Нових», подія telegramReceive', () => {
    const c = alwaysCfg(1);
    expect(briefOnSessionStart(start(), c, { ...e4(), level: 3 }, D0, 0).item).toBeNull();
    const r = briefOnSessionStart(start(), c, e4(), D0, 0);
    expect(r.item).toMatchObject({ id: BRIEF_ID, kind: 'telegram', status: 'new' });
    expect(r.events).toEqual([expect.objectContaining({ type: 'telegramReceive', telegramId: BRIEF_ID })]);
    expect(r.tg.brief.lastDay).not.toBeNull();
  });

  test('не частіше за brief.minGapDays діб; після проміжку знову; поки без відповіді - нового немає', () => {
    const c = alwaysCfg(1);
    const a = briefOnSessionStart(start(), c, e4(), D0, 0);
    const answered = { ...a.tg, inbox: a.tg.inbox.map((x) => ({ ...x, status: 'archive' as const })) };
    expect(briefOnSessionStart(answered, c, e4(), D0 + 2 * DAY, 0).item).toBeNull();
    expect(briefOnSessionStart(answered, c, e4(), D0 + 3 * DAY, 0).item).not.toBeNull();
    expect(briefOnSessionStart(a.tg, c, e4(), D0 + 9 * DAY, 0).item).toBeNull();
  });

  test('імовірність chance: за 400 спроб поза проміжком потрапляє приблизно п\'ята частина', () => {
    const c = alwaysCfg(cfg.params.brief.chance);
    let hits = 0;
    for (let i = 0; i < 400; i++) if (briefOnSessionStart(start({ rng: seedFrom(`b-${i}`) }), c, e4(), D0, 0).item) hits++;
    expect(hits).toBeGreaterThan(40);
    expect(hits).toBeLessThan(130);
  });

  test('до старту розкладу (startMs null) події немає', () => {
    expect(briefOnSessionStart(start({ startMs: null }), alwaysCfg(1), e4(), D0, 0).item).toBeNull();
  });
});

describe('варіанти (FR-18, AC-13)', () => {
  test('«Переписати тезово»: «Доповідь» ×0,5 на 1 год і +5 до репутації; відписка: −5 і шанс позапланової', () => {
    const r = briefOnSessionStart(start({ firstInspectionPassed: true }), alwaysCfg(1), e4(), D0, 0);
    const uid = r.item!.uid;
    const eco = { ...e4(), stageLevels: [1, 1, 1, 1, 1, 1] };
    const rewrite = answer(r.tg, eco, uid, 'rewrite', ctx(D0));
    if ('error' in rewrite) throw new Error(rewrite.error);
    expect(rewrite.effects.find((x) => x.source === 'telegram_slow')).toMatchObject({ value: 0.5, target: { type: 'stage', id: 'dopovid' } });
    expect(rewrite.effects.find((x) => x.source === 'telegram_slow')!.endMs - D0).toBe(3_600_000);
    expect(rewrite.tg.reputation.value - r.tg.reputation.value).toBe(5);
    const reply = answer(r.tg, eco, uid, 'formal_reply', ctx(D0));
    if ('error' in reply) throw new Error(reply.error);
    expect(reply.tg.reputation.value - r.tg.reputation.value).toBe(-5);
    expect(reply.effects.filter((x) => x.source === 'telegram_slow')).toHaveLength(0);
  });

  test('квота телеграм не зменшується: документ не з\'їдає слот planDay', () => {
    const r = briefOnSessionStart(start(), alwaysCfg(1), e4(), D0, 0);
    expect(r.tg.day).toEqual(start().day);
    expect(r.tg.queue).toEqual(start().queue);
  });
});
