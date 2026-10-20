// Конвертації ланок Р5 (013 FR-4…FR-8, рішення 31, 105): ланка стає цифровою за підписи, виробіток ×convert.mult. Чисті функції.
import { baseIncomePerMin } from './income';
import { itemsFor } from './state';
import type { Big, DomainEvent, EconomyConfig, EconomyState } from './types';

/** Стан конвертації за порядком: яка наступна і чому (не) доступна */
export type ConvertStatus = 'available' | 'locked_cycle' | 'locked_streams' | 'done' | 'none';

export interface ConvertInfo {
  status: ConvertStatus;
  /** Наступна за порядком (1-based індекс) і її ланка; null, коли конвертацій немає або всі виконано */
  next: { index: number; stageId: string } | null;
  /** Скільки вже оцифровано */
  done: number;
  total: number;
  /** Ціна наступної на мить розрахунку, підписи */
  price: Big;
}

/** На рівні є конвертації (`convert: 1` у блоці рівня, Р5) */
export function hasConversions(state: EconomyState, cfg: EconomyConfig): boolean {
  const L = cfg.params.levels[state.level - 1];
  return !!L && (L as { convert?: number }).convert === 1;
}

/** Ціна: ⌈convert.costMin × базовий дохід⌉ (013 FR-6, як `convCost()` у sim.js); журнал № 23 здешевлює (016 FR-10) */
export function convertPrice(state: EconomyState, cfg: EconomyConfig): Big {
  return Math.ceil(cfg.params.convert.costMin * baseIncomePerMin(state, cfg) * (state.museum.convert ?? 1));
}

/**
 * Наступна конвертація № k доступна, щойно відкрито всі потоки в циклі і k ≤ 1 + цифровізацій на рівні (FR-5, як `convOpen()` у sim.js);
 * доступна, але не куплена лишається, наступна за порядком раніше за попередню не відкривається.
 */
export function convertInfo(state: EconomyState, cfg: EconomyConfig, levelCount: number): ConvertInfo {
  const order = cfg.params.convert.order;
  const total = order.length;
  const done = state.digital.length;
  const price = convertPrice(state, cfg);
  if (!hasConversions(state, cfg)) return { status: 'none', next: null, done, total, price };
  if (done >= total) return { status: 'done', next: null, done, total, price };
  const stageId = order[done]!;
  const next = { index: done + 1, stageId };
  const open = itemsFor(state, cfg).streams.every((_, i) => (state.streamLevels[i] ?? 0) > 0);
  if (done >= 1 + levelCount) return { status: 'locked_cycle', next, done, total, price };
  return { status: open ? 'available' : 'locked_streams', next, done, total, price };
}

export interface ConvertResult {
  state: EconomyState;
  events: DomainEvent[];
  stageId: string;
  index: number;
  price: Big;
}

/**
 * Оцифрувати наступну ланку. `price` - ціна, яку гравець бачив у шторці (ВП-1: тримається, поки шторка відкрита);
 * без неї береться ціна на мить виклику. Підписи списуються, бали не чіпаються.
 */
export function convertStage(
  state: EconomyState,
  cfg: EconomyConfig,
  levelCount: number,
  ctx: { levelStartMs: number; nowMs: number },
  price?: Big,
): ConvertResult | { error: 'unavailable' | 'signatures' } {
  const info = convertInfo(state, cfg, levelCount);
  if (info.status !== 'available' || !info.next) return { error: 'unavailable' };
  const cost = price ?? info.price;
  if (state.signatures < cost) return { error: 'signatures' };
  const next: EconomyState = { ...state, signatures: state.signatures - cost, digital: [...state.digital, info.next.stageId] };
  return {
    state: next,
    stageId: info.next.stageId,
    index: info.next.index,
    price: cost,
    events: [
      {
        type: 'stageConvert',
        stageId: info.next.stageId,
        convertIndex: info.next.index,
        costLog10: Math.log10(Math.max(1, cost)),
        digitizationsOnLevel: levelCount,
        secSinceLevelStart: Math.max(0, Math.round((ctx.nowMs - ctx.levelStartMs) / 1000)),
      },
    ],
  };
}
