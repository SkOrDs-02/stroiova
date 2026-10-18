// Цифровізація (006): стан у записі (схема 6).
export interface Ceremony {
  /** Наскрізний номер цифровізації (digitization_number) */
  no: number;
  /** Рівень, на якому цифровізувалися */
  level: number;
  /** Скільки це вже цифровізація на рівні (1, 2, 3…) */
  levelCount: number;
  atMs: number;
  /** L за цикл */
  lifetime: number;
  points: number;
  pointsTotal: number;
  multBefore: number;
  multAfter: number;
  /** Номери скасованих журналів (музей — 007) */
  journals: number[];
  /** 3-тя на Р1: після акта — level-up */
  levelUp: boolean;
  /** Що ще не показано: акт, потім наказ про переведення */
  step: 'result' | 'levelUp';
}

export interface DigitizationState {
  /** Цифровізацій на кожному рівні: ключ — рівень */
  counts: Record<string, number>;
  total: number;
  /** Картку «Як це працює» уже показано (FR-12) */
  howSeen: boolean;
  /** Церемонія, що чекає показу або закриття (FR-22) */
  ceremony: Ceremony | null;
  /** Мітка початку поточного циклу (sec_since_cycle_start) */
  cycleStartMs: number;
}
