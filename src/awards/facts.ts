// Доменні події → факти для лічильників грамот (016 FR-19): назви й властивості - з analytics/tracking-plan.yaml.
// «Це не смішно» (`telegramFlag`) не дає жодного факту (FR-20).
import type { DomainEvent } from '@/economy/game/types';

import type { Fact } from './types';

/** Ідентифікатори рівнів у tracking-plan і awards.json за номером рівня */
export const LEVEL_IDS = ['batalion', 'bryhada', 'komanduvannia', 'henshtab', 'bez_paperu'] as const;

export function levelId(level: number): string {
  return LEVEL_IDS[Math.min(Math.max(level, 1), LEVEL_IDS.length) - 1]!;
}

/** Документ події «Доповідь тезово» (012) і його варіант «Переписати тезово» */
const BRIEF_ID = 'tg_event_brief';

export interface FactOpts {
  /** Мітка приїзду перевірки та кінця гонки за id: для подій без гравця грамота дістає мітку події (FR-34) */
  inspAt?: (id: string) => number | undefined;
  raceAt?: (id: string) => number | undefined;
}

export function factsOf(evs: readonly DomainEvent[], opts: FactOpts = {}): Fact[] {
  const out: Fact[] = [];
  for (const e of evs) {
    switch (e.type) {
      case 'telegramAnswer':
        out.push({ event: 'telegram_choice_submit', props: { choice_kind: e.choiceKind } });
        if (e.telegramId === BRIEF_ID && e.choiceId === 'rewrite') out.push({ event: 'random_event_resolve', props: { event_type: 'brief_onepage', choice: 'rewrite' } });
        break;
      case 'packResolve':
        out.push({ event: 'telegram_pack_resolve', props: { is_beats: e.isBeats } });
        break;
      case 'sedoPrint':
        out.push({ event: 'random_event_resolve', props: { event_type: 'sedo_failure', choice: 'print' } });
        break;
      case 'inspectionFinish':
        out.push({
          event: 'inspection_finish',
          props: { result: e.result, inspection_kind: e.kind, level_id: levelId(e.level), is_without_remarks: e.withoutRemarks },
          ...(e.offline ? { offline: true, atMs: opts.inspAt?.(e.id) } : {}),
        });
        break;
      case 'raceFinish':
        // у tracking-plan запас від'ємний, коли не встигли; у домені - завжди модуль
        out.push({ event: 'race_finish', props: { result: e.result, margin_sec: e.result === 'success' ? e.marginSec : -e.marginSec, gift_type: e.giftType, level_id: levelId(e.level) }, ...(e.offline ? { offline: true, atMs: opts.raceAt?.(e.id) } : {}) });
        break;
      case 'digitizationComplete':
        out.push({ event: 'digitization_complete', props: { digitization_number: e.no, level_id: levelId(e.level) } });
        break;
      case 'levelAdvance':
        out.push({ event: 'level_advance', props: { from_level_id: levelId(e.from), to_level_id: levelId(e.to) } });
        break;
      case 'stageConvert':
        out.push({ event: 'stage_convert', props: { stage_id: e.stageId, convert_index: e.convertIndex } });
        break;
      case 'museumJournalUnlock':
        out.push({ event: 'museum_journal_unlock', props: { journal_id: e.journalId, series_id: e.seriesId, is_series_complete: e.isSeriesComplete, journals_owned_after: e.ownedAfter } });
        break;
      case 'clerkHire':
        out.push({ event: 'clerk_hire', props: { target_id: e.target.id } });
        break;
      case 'finaleStepComplete':
        out.push({ event: 'finale_step_complete', props: { step_id: e.step } });
        break;
      case 'stackReach':
        out.push({ event: 'stack_meter_reach', props: { cm: e.cm } });
        break;
      default:
        break;
    }
  }
  return out;
}
