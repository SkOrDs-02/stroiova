// Поширення (007 FR-26…FR-29): що ділимо, чим закінчилось системне меню, сервіс рендеру й меню.

/** Що саме ділимо: запис курйозу, телеграма зі вхідних, експонат, грамота, фінальна картка, особистий рекорд */
export type ShareEntry =
  | { kind: 'curio'; seq: number }
  | { kind: 'telegram'; uid: string }
  | { kind: 'journal'; no: number }
  | { kind: 'award'; id: string }
  | { kind: 'finale' }
  | { kind: 'record' };

/** `curio_entry_share.entry_type` (analytics/tracking-plan.yaml) */
export type ShareEntryType = 'telegram' | 'gift_written_off' | 'journal' | 'pack' | 'stack_meter' | 'finale_card' | 'personal_record' | 'ptashka' | 'award';

/** Що піде в `curio_entry_share`: тип і id запису, тип подарунка */
export interface ShareCardInfo {
  type: ShareEntryType;
  id: string;
  giftType?: 'drone' | 'shovel' | 'generator';
}

export type ShareOutcome = { kind: 'shared' | 'dismissed'; activityType?: string } | { kind: 'error'; code: string };

/**
 * Рендер картинки й системне меню (`share-system`): знімок вью 1080×1350 у тимчасовий PNG, меню ОС, видалення файлу після закриття.
 * `target` - вью картинки (ref), `message` - рядок `sh.message`.
 */
export interface ShareService {
  share(target: unknown, message: string): Promise<ShareOutcome>;
}

/** Без пристрою (тести, web): меню немає */
export const unavailableShare: ShareService = {
  share: () => Promise.resolve({ kind: 'error', code: 'unavailable' }),
};
