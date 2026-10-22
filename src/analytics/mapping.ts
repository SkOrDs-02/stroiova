// Доменні події гри (DomainEvent) -> події плану трекінгу (analytics/tracking-plan.yaml). Чиста функція: усе, чого немає в самій події
// (час від старту циклу, стан вхідних, лічильники прискорень), приходить у контексті. Події інтерфейсу, життєвого циклу, реклами й
// покупок мапляться окремо (хуки стору), бо їх немає серед доменних.
import { levelId } from '@/awards/facts';
import type { DomainEvent } from '@/economy/game/types';
import type { InboxItem } from '@/telegrams/types';
import { STEP_IDS } from '@/features/onboarding/steps';
import { FIRST_TELEGRAM_ID } from '@/telegrams/content';

import type { EventName, EventProps, GlobalProps } from './plan.generated';

/** `globals` - глобальні властивості, що замінюють зібрані зі стану (подія про те, чого вже немає в стані: скидання прогресу) */
export type Call = { [N in EventName]: { name: N; props: EventProps[N]; globals?: Partial<GlobalProps> } }[EventName];

/** Лічильники, що живуть довше за одну подію (порядок подій зберігається, тож мапер їх оновлює сам) */
export interface Memory {
  /** Перевірки, де хоч один пункт закрито рекламою */
  inspAd: Set<string>;
  /** Прискорення гонки за id */
  raceSpeedups: Map<string, number>;
  /** Гонки, де було прискорення рекламою */
  raceAd: Set<string>;
}

export function newMemory(): Memory {
  return { inspAd: new Set(), raceSpeedups: new Map(), raceAd: new Set() };
}

export interface MapCtx {
  nowMs: number;
  installMs: number;
  /** Початок поточного циклу цифровізації та рівня */
  cycleStartMs: number;
  levelStartMs: number;
  /** Усі потоки поточного циклу відкриті */
  allStreamsOpen: boolean;
  inbox: readonly InboxItem[];
  reputation: number;
  /** Мить відкриття телеграми гравцем (`telegram_open`), якщо відома */
  openedAtMs: (uid: string) => number | null;
  /** Мить, коли конвертація № k стала доступною, якщо відома */
  convertAvailableAtMs: (index: number) => number | null;
  /** Цифрових ланок і тривалість попереднього циклу Р5 (013 FR-11): лише на Р5 */
  digitalStages: number | null;
  prevCycleMs: number | null;
  memory: Memory;
}

const sec = (ms: number): number => Math.max(0, Math.round(ms / 1000));
/** Велике число -> log10 з двома знаками (аналітика не шле сум підписів) */
export const log10 = (x: number): number => Math.round(Math.log10(Math.max(1, x)) * 100) / 100;

const FLAG_REASONS = ['hurts_people', 'untrue', 'offensive', 'not_funny'] as const;
const TIER = { low: 'low', norm: 'normal', high: 'high' } as const;
const BRIEF_ID = 'tg_event_brief';
const OVERRIDE_ID = 'tg_override_order';

function unread(inbox: readonly InboxItem[]): number {
  return inbox.filter((x) => x.status === 'new' && x.kind !== 'note').length;
}

/** Події плану для однієї доменної події; порожній список - для події в плані немає */
export function mapEvent(e: DomainEvent, c: MapCtx): Call[] {
  switch (e.type) {
    case 'streamUnlock':
      return [{ name: 'stream_unlock', props: { stream_id: e.streamId as EventProps['stream_unlock']['stream_id'], unlock_index: e.unlockIndex, cost_log10: log10(e.cost), sec_since_cycle_start: sec(c.nowMs - c.cycleStartMs), is_all_streams_open: c.allStreamsOpen } }];
    case 'purchase':
      return [
        {
          name: 'upgrade_purchase',
          props: {
            target_type: e.target.type,
            target_id: e.target.id as EventProps['upgrade_purchase']['target_id'],
            level_from: e.levelFrom,
            level_to: e.levelTo,
            levels_bought: e.levelsBought,
            buy_mode: e.mode === 'toMilestone' ? 'to_milestone' : e.mode,
            cost_log10: log10(e.cost),
            was_bottleneck: e.wasBottleneck,
            income_before_log10: log10(e.incomeBefore),
            income_after_log10: log10(e.incomeAfter),
          },
        },
      ];
    case 'clerkHire':
      return [{ name: 'clerk_hire', props: { target_type: e.target.type, target_id: e.target.id as EventProps['clerk_hire']['target_id'], cost_log10: log10(e.cost), is_first_clerk: e.isFirstClerk, clerks_count_after: e.clerksCountAfter, sec_since_cycle_start: sec(c.nowMs - c.cycleStartMs) } }];
    case 'milestone':
      return [{ name: 'milestone_reach', props: { target_type: e.target.type, target_id: e.target.id as EventProps['milestone_reach']['target_id'], level: e.level, rate_multiplier: e.rateMultiplier, sec_since_cycle_start: sec(c.nowMs - c.cycleStartMs) } }];
    case 'telegramReceive': {
      const item = c.inbox.find((x) => x.uid === e.uid);
      const earlier = c.inbox.some((x) => x.id === e.telegramId && x.uid !== e.uid);
      return [{ name: 'telegram_receive', props: { telegram_id: e.telegramId, is_first_telegram: e.telegramId === FIRST_TELEGRAM_ID, delivery: e.delivery, is_scripted: e.scripted, is_repeat: earlier && item?.kind !== 'override', inbox_unread_after: unread(c.inbox) } }];
    }
    case 'telegramAnswer': {
      const item = c.inbox.find((x) => x.uid === e.uid);
      const slow = item?.result?.slow[0];
      const opened = c.openedAtMs(e.uid) ?? item?.receivedAt ?? c.nowMs;
      const out: Call[] = [
        {
          name: 'telegram_choice_submit',
          props: {
            telegram_id: e.telegramId,
            choice_id: e.choiceId,
            choice_kind: e.choiceKind as EventProps['telegram_choice_submit']['choice_kind'],
            ...(slow ? { slowdown_target_id: slow.target as EventProps['telegram_choice_submit']['slowdown_target_id'] } : {}),
            slowdown_mult: slow?.mult ?? 1,
            slowdown_sec: slow ? sec(slow.hours * 3_600_000) : 0,
            reputation_delta: e.repDelta,
            reputation_after: item?.result?.repAfter ?? c.reputation,
            inspection_chance_pct: e.chancePct,
            paper_spent: e.paper,
            sec_since_open: sec(c.nowMs - opened),
            ...(e.packId ? { pack_id: e.packId, is_pack_summary: !!e.isPackSummary } : {}),
          },
        },
      ];
      // випадкові події, що розв'язуються відповіддю на телеграму (011 «Доповідь тезово»; «Новий наказ скасовує старий»)
      if (e.telegramId === BRIEF_ID && (e.choiceId === 'rewrite' || e.choiceId === 'formal_reply')) out.push({ name: 'random_event_resolve', props: { event_type: 'brief_onepage', choice: e.choiceId, sec_to_resolve: sec(c.nowMs - opened), slowdown_sec: slow ? sec(slow.hours * 3_600_000) : 0 } });
      if (e.telegramId === OVERRIDE_ID && (e.choiceId === 'redo_documents' || e.choiceId === 'cite_digital' || e.choiceId === 'formal_reply')) out.push({ name: 'random_event_resolve', props: { event_type: 'order_cancels_order', choice: e.choiceId, sec_to_resolve: sec(c.nowMs - opened), slowdown_sec: slow ? sec(slow.hours * 3_600_000) : 0 } });
      return out;
    }
    case 'telegramFlag': {
      const item = c.inbox.find((x) => x.id === e.telegramId);
      void item;
      return [{ name: 'telegram_flag', props: { telegram_id: e.telegramId, is_after_choice: e.afterChoice, reason: e.reason == null ? 'none' : (FLAG_REASONS[e.reason] ?? 'none'), has_comment: e.hasComment } }];
    }
    case 'packReceive':
      return [{ name: 'telegram_pack_receive', props: { pack_id: e.packId, pack_number: e.no, is_repeat: e.isRepeat, delivery: e.delivery } }];
    case 'packResolve':
      return [
        {
          name: 'telegram_pack_resolve',
          props: { pack_id: e.packId, mode: e.mode, ...(e.choiceKind ? { choice_kind: e.choiceKind as EventProps['telegram_pack_resolve']['choice_kind'] } : {}), paper_spent: e.paperSpent, reputation_delta: e.repDelta, inspection_chance_pct: e.chancePct, is_beats: e.isBeats, sec_since_received: e.secSinceReceived },
        },
      ];
    case 'kombatFound':
      return [{ name: 'random_event_resolve', props: { event_type: 'kombat_missing', choice: e.how === 'runner' ? 'send_runner' : 'wait', sec_to_resolve: 0, slowdown_sec: 0 } }];
    case 'meetingFound':
      return [{ name: 'random_event_resolve', props: { event_type: 'meeting_overrun', choice: e.how === 'note' ? 'send_note' : 'wait', sec_to_resolve: 0, slowdown_sec: 0 } }];
    case 'sedoPrint':
      return [{ name: 'random_event_resolve', props: { event_type: 'sedo_failure', choice: 'print', sec_to_resolve: 0, slowdown_sec: 0 } }];
    case 'reputationTierChange':
      return [{ name: 'reputation_tier_change', props: { from_tier: TIER[e.from], to_tier: TIER[e.to], reputation: e.value, source: 'telegram' } }];
    case 'inspectionStart':
      return [
        {
          name: 'inspection_start',
          props: { inspection_id: e.id, inspection_number: e.no, boss_id: e.boss, trigger: e.trigger, warning_sec: e.warnSec, reputation: e.reputation, items_total: e.itemsTotal, inspection_kind: e.kind, ...(e.kind === 'final' ? { attempt_number: e.attempt } : {}) },
        },
      ];
    case 'inspectionItemComplete':
      if (e.method === 'ad') c.memory.inspAd.add(e.id);
      return [{ name: 'inspection_item_complete', props: { inspection_id: e.id, item_id: e.itemId as EventProps['inspection_item_complete']['item_id'], method: e.method, ...(e.method === 'signatures' ? { cost_log10: log10(e.cost) } : {}), sec_to_deadline: e.secToDeadline } }];
    case 'inspectionFinish':
      return [
        {
          name: 'inspection_finish',
          props: {
            inspection_id: e.id,
            result: e.result,
            items_done: e.itemsDone,
            items_total: e.itemsTotal,
            is_completed_via_ad: c.memory.inspAd.has(e.id),
            is_resolved_offline: e.offline,
            sec_from_start: e.secFromStart,
            inspection_kind: e.kind,
            ...(e.mechDone != null ? { is_mechanic_item_done: e.mechDone } : {}),
            ...(e.kind === 'final' ? { is_level_exit_unlocked: e.exitUnlocked } : {}),
            is_without_remarks: e.withoutRemarks,
            level_id: levelId(e.level),
          },
        },
      ];
    case 'raceStart':
      return [{ name: 'race_start', props: { race_id: e.id, gift_type: e.giftType, doc_sec_required: e.docSec, resource_sec_left: e.resourceSec, is_winnable_without_speedup: e.winnable } }];
    case 'raceSpeedup': {
      const n = (c.memory.raceSpeedups.get(e.id) ?? 0) + 1;
      c.memory.raceSpeedups.set(e.id, n);
      if (e.method === 'ad') c.memory.raceAd.add(e.id);
      return [{ name: 'race_speedup_apply', props: { race_id: e.id, method: e.method, sec_saved: e.secSaved, speedups_count_after: n } }];
    }
    case 'raceFinish':
      return [
        {
          name: 'race_finish',
          props: { race_id: e.id, result: e.result, margin_sec: e.result === 'success' ? e.marginSec : -e.marginSec, speedups_count: e.speedups, is_ad_used: c.memory.raceAd.has(e.id), is_resolved_offline: e.offline, gift_type: e.giftType, level_id: levelId(e.level) },
        },
      ];
    case 'digitizationHint':
      return [{ name: 'digitization_hint_show', props: { next_purchase_eta_sec: e.etaSec, points_available: e.points, points_total: e.pointsTotal, is_first_digitization: e.isFirst, sec_since_cycle_start: sec(c.nowMs - c.cycleStartMs) } }];
    case 'digitizationComplete':
      return [
        {
          name: 'digitization_complete',
          props: {
            digitization_number: e.no,
            points_gained: e.points,
            points_total: e.pointsTotal,
            prestige_multiplier: Math.round(e.multiplier * 100) / 100,
            lifetime_signatures_log10: Math.round(e.lifetimeLog10 * 100) / 100,
            sec_since_cycle_start: sec(c.nowMs - c.cycleStartMs),
            sec_since_install: sec(c.nowMs - c.installMs),
            journals_cancelled: e.journalsCancelled.length,
            is_from_hint: e.fromHint,
            ...(e.level >= 5 && c.digitalStages != null ? { digital_stages_count: c.digitalStages } : {}),
            ...(e.level >= 5 && c.prevCycleMs != null ? { cycle_sec_previous: sec(c.prevCycleMs) } : {}),
          },
        },
      ];
    case 'levelAdvance':
      return [{ name: 'level_advance', props: { from_level_id: levelId(e.from) as EventProps['level_advance']['from_level_id'], to_level_id: levelId(e.to) as EventProps['level_advance']['to_level_id'], digitization_count: e.digitizationCount, points_total: e.pointsTotal, sec_since_install: sec(c.nowMs - c.installMs) } }];
    case 'museumJournalUnlock':
      return [
        {
          name: 'museum_journal_unlock',
          props: { journal_id: e.journalId, rarity: e.rarity, source: e.source, journals_owned_after: e.ownedAfter, is_series_complete: e.isSeriesComplete, series_id: e.seriesId as EventProps['museum_journal_unlock']['series_id'], series_owned_after: e.seriesOwnedAfter, series_complete_count: e.seriesCompleteCount },
        },
      ];
    case 'generatorRefuel':
      return [{ name: 'generator_refuel', props: { tank_pct_before: e.tankPctBefore, tank_capacity_sec: e.tankCapacitySec, bonus_off_sec: e.bonusOffSec } }];
    case 'offlineIncomeClaim':
      return [
        {
          name: 'offline_income_claim',
          props: {
            away_sec: e.awaySec,
            storage_cap_sec: e.storageCapSec,
            capped_sec: e.cappedSec,
            earned_log10: log10(e.earned),
            is_doubled: e.isDoubled,
            double_source: e.doubleSource,
            claimed_log10: log10(e.claimed),
            offline_doubles_today: e.offlineDoublesToday,
            clerks_count: e.clerksCount,
            gifts_written_off: e.giftsWrittenOff,
            fuel_bonus_sec: e.fuelBonusSec,
          },
        },
      ];
    case 'boostActivate':
      return [
        {
          name: 'boost_activate',
          props: { boost_type: e.boostType, source: e.source, multiplier: e.mult, duration_sec: Math.round(e.durationSec), stacked_remaining_sec: e.stackedRemainingSec ?? Math.round(e.durationSec), is_capped: e.isCapped ?? false },
        },
      ];
    case 'onboardingStep':
      return [
        {
          name: 'onboarding_step_complete',
          props: {
            step_id: STEP_IDS[e.no - 1]!,
            step_index: e.no,
            sec_since_first_open: sec(c.nowMs - c.installMs),
            step_duration_sec: e.durationSec,
            is_skipped: e.skipped,
            ...(e.no === 3 && e.gender ? { protagonist_gender: e.gender } : {}),
            ...(e.no === 9 && e.bonus != null ? { bonus_signatures_log10: log10(e.bonus) } : {}),
          },
        },
      ];
    case 'settingChange':
      return [
        {
          name: 'setting_change',
          props: { setting_name: e.settingName, new_value: e.newValue === null ? 'done' : e.newValue ? 'on' : 'off' },
          // скидання: лічильники «до стирання» (глобальні властивості зі стану вже нульові)
          ...(e.settingName === 'progress_reset' && e.digitizationCount != null ? { globals: { digitization_count: e.digitizationCount, playtime_sec: e.playtimeSec ?? 0 } } : {}),
        },
      ];
    case 'museumOpen':
      return [{ name: 'museum_open', props: { source: e.source, journals_owned: e.journalsOwned, journals_unseen: e.journalsUnseen, segment: 'journals' } }];
    case 'pushPermissionRequest':
      return [{ name: 'push_permission_request', props: { trigger: e.trigger, pre_prompt_result: e.prePromptResult, os_result: e.osResult } }];
    case 'stageConvert': {
      const avail = c.convertAvailableAtMs(e.convertIndex);
      return [{ name: 'stage_convert', props: { stage_id: e.stageId as EventProps['stage_convert']['stage_id'], convert_index: e.convertIndex, cost_log10: Math.round(e.costLog10 * 100) / 100, digitizations_on_level: e.digitizationsOnLevel, sec_since_level_start: e.secSinceLevelStart, sec_since_available: sec(c.nowMs - (avail ?? c.levelStartMs)) } }];
    }
    case 'stackReach':
      return [{ name: 'stack_meter_reach', props: { zpz_share_pct: e.zpzSharePct, zpz_level: e.zpzLevel, sec_since_session_start: e.secSinceSessionStart, offline_share_pct: e.offlineSharePct } }];
    case 'finaleStepComplete':
      return [{ name: 'finale_step_complete', props: { step_id: e.step, step_index: e.stepIndex, sec_since_finale_start: e.secSinceFinaleStart, is_resumed: e.isResumed, ...(e.step === 'script' ? { declined_count: e.declinedCount } : {}) } }];
    case 'dubStart':
      return [{ name: 'dub_start', props: { dub_number: e.dubNumber, modifier_id: e.modifier, points_total: e.pointsTotal, sec_since_finale: e.secSinceFinale, sec_since_offer: e.secSinceOffer } }];
    case 'personalRecordUpdate':
      return [{ name: 'personal_record_update', props: { record_type: e.recordType, value: e.value, previous_value: e.previous } }];
    case 'storyBeatDeliver':
      return [{ name: 'story_beat_deliver', props: { beat_id: e.beatId, arc: e.arc as EventProps['story_beat_deliver']['arc'], carrier: e.carrier as EventProps['story_beat_deliver']['carrier'], beat_order: e.beatOrder, delay_sec: e.delaySec, is_catch_up: e.isCatchUp, is_while_away: e.isWhileAway } }];
    case 'archiveSheetUnlock':
      return [{ name: 'archive_sheet_unlock', props: { sheet_id: e.sheetId, sheet_number: e.sheetNumber, source: e.source, sheets_owned_after: e.sheetsOwnedAfter } }];
    case 'awardUnlock':
      return [
        {
          name: 'award_unlock',
          props: { award_id: e.awardId, award_category: e.category as EventProps['award_unlock']['award_category'], award_type: e.awardType, is_hidden: e.isHidden, awards_owned_after: e.awardsOwnedAfter, is_retroactive: e.isRetroactive, is_resolved_offline: e.isResolvedOffline, is_mirrored: e.isMirrored, sec_since_install: sec(c.nowMs - c.installMs) },
        },
      ];
    case 'awardsWallOpen':
      return [{ name: 'awards_wall_open', props: { source: e.source, awards_owned: e.awardsOwned, awards_unseen: e.awardsUnseen } }];
    default:
      return [];
  }
}
