// Аналітика: кожна доменна подія, що є в плані, перетворюється на подію з правильними властивостями (перевірка проти tracking-plan).
import type { DomainEvent } from '@/economy/game/types';
import type { InboxItem } from '@/telegrams/types';

import { log10, mapEvent, newMemory, type MapCtx } from '../mapping';
import { validateEvent } from '../validate';

const T = 1_000_000_000;
const item = (patch: Partial<InboxItem> = {}): InboxItem => ({ uid: 'tg_0005_x#1', id: 'tg_0005_x', kind: 'telegram', receivedAt: T - 100_000, status: 'new', ...patch });

function ctx(patch: Partial<MapCtx> = {}): MapCtx {
  return {
    nowMs: T,
    installMs: T - 86_400_000,
    cycleStartMs: T - 600_000,
    levelStartMs: T - 3_600_000,
    allStreamsOpen: false,
    inbox: [item()],
    reputation: 42,
    openedAtMs: () => null,
    convertAvailableAtMs: () => null,
    digitalStages: null,
    prevCycleMs: null,
    memory: newMemory(),
    newFlowId: (() => {
      let n = 0;
      return () => `flow-${++n}`;
    })(),
    priceOf: () => ({ amount: 99, currency: 'UAH' }),
    store: 'play_store',
    ...patch,
  };
}

/** По одній події кожного типу, що має відповідник у плані */
const SAMPLES: DomainEvent[] = [
  { type: 'streamUnlock', streamId: 'akty', unlockIndex: 1, cost: 1200, firstTime: true },
  { type: 'purchase', target: { type: 'stream', id: 'raporty' }, levelFrom: 1, levelTo: 3, levelsBought: 2, mode: 'toMilestone', cost: 5000, wasBottleneck: true, incomeBefore: 100, incomeAfter: 130 },
  { type: 'clerkHire', target: { type: 'stage', id: 'stroy' }, cost: 900, isFirstClerk: true, clerksCountAfter: 1 },
  { type: 'milestone', target: { type: 'stream', id: 'akty' }, level: 25, rateMultiplier: 2 },
  { type: 'telegramReceive', telegramId: 'tg_0005_x', uid: 'tg_0005_x#1', delivery: 'live', scripted: false },
  { type: 'telegramAnswer', telegramId: 'tg_0005_x', uid: 'tg_0005_x#1', choiceId: 'diligent', choiceKind: 'diligent', repDelta: 5, chancePct: 10, paper: 2 },
  { type: 'telegramAnswer', telegramId: 'tg_event_brief', uid: 'tg_event_brief#2', choiceId: 'rewrite', choiceKind: 'diligent', repDelta: 0, chancePct: 0, paper: 0 },
  { type: 'telegramAnswer', telegramId: 'tg_override_order', uid: 'tg_override_order#3', choiceId: 'cite_digital', choiceKind: 'special', repDelta: 0, chancePct: 0, paper: 0, packId: 'p1', isPackSummary: false },
  { type: 'telegramFlag', telegramId: 'tg_0005_x', reason: 2, hasComment: true, afterChoice: true },
  { type: 'telegramFlag', telegramId: 'tg_0005_x', reason: null, hasComment: false, afterChoice: false },
  { type: 'packReceive', packId: 'p1', no: 3, isRepeat: false, delivery: 'while_away' },
  { type: 'packResolve', packId: 'p1', no: 3, mode: 'summary', choiceKind: 'diligent', paperSpent: 4, repDelta: 2, chancePct: 20, isBeats: true, secSinceReceived: 90 },
  { type: 'packResolve', packId: 'p1', no: 3, mode: 'separate', paperSpent: 4, repDelta: 2, chancePct: 20, isBeats: false, secSinceReceived: 90 },
  { type: 'kombatFound', how: 'runner' },
  { type: 'meetingFound', how: 'note' },
  { type: 'sedoPrint', stageId: 'kombat', paperSpent: 5 },
  { type: 'reputationTierChange', from: 'norm', to: 'high', value: 60 },
  { type: 'inspectionStart', id: 'insp_0001', no: 1, boss: 'brigade_commission', kind: 'regular', attempt: 1, trigger: 'scheduled', warnSec: 3600, reputation: 40, itemsTotal: 5 },
  { type: 'inspectionStart', id: 'insp_0002', no: 2, boss: 'digital_commission', kind: 'final', attempt: 2, trigger: 'scheduled', warnSec: 3600, reputation: 40, itemsTotal: 6 },
  { type: 'inspectionItemComplete', id: 'insp_0001', itemId: 'paint_borders', method: 'ad', cost: 700, secToDeadline: 600 },
  { type: 'inspectionFinish', id: 'insp_0001', kind: 'final', attempt: 1, mechDone: true, exitUnlocked: true, result: 'passed', level: 2, withoutRemarks: true, itemsDone: 6, itemsTotal: 6, offline: false, secFromStart: 3000 },
  { type: 'raceStart', id: 'race_0001', giftType: 'drone', docSec: 600, resourceSec: 900, winnable: true },
  { type: 'raceSpeedup', id: 'race_0001', method: 'ad', secSaved: 120 },
  { type: 'raceFinish', id: 'race_0001', giftType: 'drone', result: 'fail', marginSec: 30, speedups: 1, offline: true, level: 3 },
  { type: 'digitizationHint', etaSec: 7200, points: 40, pointsTotal: 100, isFirst: false },
  { type: 'digitizationComplete', no: 3, level: 5, points: 55, pointsTotal: 200, multiplier: 5.0123, lifetimeLog10: 9.4567, journalsCancelled: [3, 4], fromHint: true },
  { type: 'levelAdvance', from: 1, to: 2, digitizationCount: 3, pointsTotal: 90 },
  { type: 'museumJournalUnlock', no: 24, journalId: 'j24', rarity: 'legendary', source: 'finale', ownedAfter: 24, isSeriesComplete: true, seriesId: 'land', seriesOwnedAfter: 4, seriesCompleteCount: 5 },
  { type: 'museumOpen', source: 'tab', journalsOwned: 3, journalsUnseen: 1 },
  { type: 'pushPermissionRequest', trigger: 'settings', prePromptResult: 'accepted', osResult: 'granted' },
  { type: 'stageConvert', stageId: 'kombat', convertIndex: 1, costLog10: 9.123, digitizationsOnLevel: 0, secSinceLevelStart: 600 },
  { type: 'stackReach', cm: 100, zpzLevel: 30, zpzSharePct: 12, secSinceSessionStart: 400, offlineSharePct: 5 },
  { type: 'finaleStepComplete', step: 'script', stepIndex: 2, secSinceFinaleStart: 300, isResumed: false, declinedCount: 2 },
  { type: 'finaleStepComplete', step: 'order', stepIndex: 1, secSinceFinaleStart: 100, isResumed: true, declinedCount: 0 },
  { type: 'dubStart', dubNumber: 1, modifier: 'wet_seal', pointsTotal: 1840, secSinceFinale: 640000, secSinceOffer: 3600 },
  { type: 'personalRecordUpdate', recordType: 'dub', value: 3, previous: 2 },
  { type: 'storyBeatDeliver', beatId: 'st_cat_03', arc: 'cat', carrier: 'curio', beatOrder: 3, delaySec: 0, isCatchUp: false, isWhileAway: false },
  { type: 'archiveSheetUnlock', sheetId: 'ar_01', sheetNumber: 1, source: 'gift', sheetsOwnedAfter: 1 },
  { type: 'awardUnlock', awardId: 'aw_dub_1', category: 'progress', awardType: 'gramota', isHidden: false, awardsOwnedAfter: 3, isRetroactive: false, isResolvedOffline: false, isMirrored: false },
  { type: 'awardsWallOpen', source: 'segment', awardsOwned: 3, awardsUnseen: 1 },
];

const S = (type: DomainEvent['type'], i = 0): DomainEvent => SAMPLES.filter((e) => e.type === type)[i]!;

describe('мапінг доменних подій у події плану', () => {
  test.each(SAMPLES.map((e, i) => [`${i}: ${e.type}`, e] as const))('%s: усі отримані події проходять перевірку плану', (_n, e) => {
    const c = ctx({ digitalStages: 4, prevCycleMs: 90_000_000 });
    const calls = mapEvent(e, c);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(validateEvent(call.name, call.props as Record<string, unknown>)).toEqual([]);
  });

  test('події без відповідника в плані не дають нічого', () => {
    for (const e of [{ type: 'kombatRequest', maxMin: 30 }, { type: 'curio', telegramId: 'a', uid: 'b', text: null }, { type: 'finaleStepStart', step: 'order' }, { type: 'dubClosed', dubNumber: 1, cycleSec: 5 }] as DomainEvent[]) expect(mapEvent(e, ctx())).toEqual([]);
  });

  test('log10: два знаки, нуль для менше одиниці', () => {
    expect(log10(186_400)).toBe(5.27);
    expect(log10(0)).toBe(0);
    expect(log10(0.4)).toBe(0);
  });

  test('upgrade_purchase: toMilestone -> to_milestone, log10 цін', () => {
    const [call] = mapEvent(S('purchase'), ctx());
    expect(call).toMatchObject({ name: 'upgrade_purchase', props: { buy_mode: 'to_milestone', cost_log10: 3.7, income_before_log10: 2, income_after_log10: 2.11 } });
  });

  test('telegram_choice_submit: сповільнення з результату запису, sec_since_open від відкриття', () => {
    const inbox = [item({ result: { rep: 5, repAfter: 42, paper: 2, slow: [{ target: 'stroy', mult: 0.5, hours: 1 }], chancePct: 10, inspHit: false, shield: false } })];
    const [call] = mapEvent(S('telegramAnswer'), ctx({ inbox, openedAtMs: () => T - 30_000 }));
    expect(call).toMatchObject({ name: 'telegram_choice_submit', props: { slowdown_target_id: 'stroy', slowdown_mult: 0.5, slowdown_sec: 3600, reputation_after: 42, sec_since_open: 30 } });
    const [bare] = mapEvent(S('telegramAnswer'), ctx());
    expect((bare!.props as { slowdown_mult: number; sec_since_open: number }).slowdown_mult).toBe(1);
    expect((bare!.props as { sec_since_open: number }).sec_since_open).toBe(100);
  });

  test('«Доповідь тезово» і «Новий наказ скасовує старий» дають ще й random_event_resolve', () => {
    expect(mapEvent(S('telegramAnswer', 1), ctx()).map((c) => c.name)).toEqual(['telegram_choice_submit', 'random_event_resolve']);
    expect(mapEvent(S('telegramAnswer', 2), ctx()).map((c) => c.name)).toEqual(['telegram_choice_submit', 'random_event_resolve']);
  });

  test('telegram_flag: причина за номером, null -> none', () => {
    expect(mapEvent(S('telegramFlag'), ctx())[0]).toMatchObject({ props: { reason: 'offensive' } });
    expect(mapEvent(S('telegramFlag', 1), ctx())[0]).toMatchObject({ props: { reason: 'none' } });
  });

  test('telegram_receive: повтор, перший, непрочитані', () => {
    const inbox = [item({ uid: 'tg_0005_x#0', receivedAt: T - 9e6, status: 'archive' }), item(), item({ uid: 'z#1', id: 'z' })];
    expect(mapEvent(S('telegramReceive'), ctx({ inbox }))[0]).toMatchObject({ props: { is_repeat: true, is_first_telegram: false, inbox_unread_after: 2 } });
  });

  test('race: лічильник прискорень і ознака реклами живуть у пам’яті між подіями', () => {
    const c = ctx();
    const sp = mapEvent(S('raceSpeedup'), c);
    expect(sp[0]).toMatchObject({ props: { speedups_count_after: 1 } });
    const fin = mapEvent(S('raceFinish'), c);
    expect(fin[0]).toMatchObject({ props: { is_ad_used: true, margin_sec: -30, level_id: 'komanduvannia' } });
  });

  test('inspection_finish: реклама в пунктах береться з пам’яті', () => {
    const c = ctx();
    mapEvent(S('inspectionItemComplete'), c);
    expect(mapEvent(S('inspectionFinish'), c)[0]).toMatchObject({ props: { is_completed_via_ad: true, is_level_exit_unlocked: true, level_id: 'bryhada' } });
  });

  test('stage_convert: час від моменту доступності, інакше від початку рівня', () => {
    expect(mapEvent(S('stageConvert'), ctx({ convertAvailableAtMs: () => T - 5000 }))[0]).toMatchObject({ props: { sec_since_available: 5 } });
    expect(mapEvent(S('stageConvert'), ctx())[0]).toMatchObject({ props: { sec_since_available: 3600 } });
  });

  test('digitization_complete: цифрові ланки й попередній цикл тільки на Р5', () => {
    const r5 = mapEvent(S('digitizationComplete'), ctx({ digitalStages: 4, prevCycleMs: 90_000_000 }))[0]!.props as Record<string, unknown>;
    expect(r5).toMatchObject({ digital_stages_count: 4, cycle_sec_previous: 90_000, journals_cancelled: 2, prestige_multiplier: 5.01, lifetime_signatures_log10: 9.46 });
    const r1 = mapEvent({ ...(S('digitizationComplete') as DomainEvent & { type: 'digitizationComplete' }), level: 1 }, ctx({ digitalStages: 4, prevCycleMs: 1 }))[0]!.props as Record<string, unknown>;
    expect(r1).not.toHaveProperty('digital_stages_count');
  });

  test('finale_step_complete: declined_count лише для script', () => {
    expect(mapEvent(S('finaleStepComplete'), ctx())[0]!.props).toHaveProperty('declined_count', 2);
    expect(mapEvent(S('finaleStepComplete', 1), ctx())[0]!.props).not.toHaveProperty('declined_count');
  });
});

describe('значення, які типи не ловлять', () => {
  test('reputation_after - з результату запису, а не з поточної репутації стору', () => {
    const inbox = [item({ result: { rep: 5, repAfter: 33, paper: 2, slow: [], chancePct: 10, inspHit: false, shield: false } })];
    expect(mapEvent(S('telegramAnswer'), ctx({ inbox, reputation: 99 }))[0]).toMatchObject({ props: { reputation_after: 33 } });
  });

  test('inspection_item_complete: cost_log10 лише для методу signatures', () => {
    const e = { type: 'inspectionItemComplete', id: 'i', itemId: 'paint_borders', method: 'no_ads_pass', cost: 0, secToDeadline: 5 } as DomainEvent;
    expect(mapEvent(e, ctx())[0]!.props).not.toHaveProperty('cost_log10');
    expect(mapEvent({ ...e, method: 'signatures', cost: 100 } as DomainEvent, ctx())[0]!.props).toHaveProperty('cost_log10', 2);
  });

  test('progress_reset: лічильники «до стирання» замінюють глобальні', () => {
    const e = { type: 'settingChange', settingName: 'progress_reset', newValue: null, digitizationCount: 7, playtimeSec: 5000 } as DomainEvent;
    expect(mapEvent(e, ctx())[0]).toMatchObject({ props: { setting_name: 'progress_reset', new_value: 'done' }, globals: { digitization_count: 7, playtime_sec: 5000 } });
  });
});
