// Гонка з часом (005): стан у записі (схема 5). Час — мітки UTC, мс.
export type GiftType = 'drone' | 'shovel' | 'generator';
export type RouteUnit = 'akty' | 'kombat' | 'stroy' | 'fin' | 'kazna' | 'narada';
export type SpeedMethod = 'digital_bonus' | 'telegram' | 'ad';

export interface Race {
  /** race_ + 4 цифри */
  id: string;
  no: number;
  type: GiftType;
  /** Рівень на мить старту: маршрут не змінюється до кінця (FR-8) */
  level: number;
  startMs: number;
  svcEndMs: number;
  steps: { unit: RouteUnit; sec: number }[];
  /** Сума кроків + додане телеграмою № 20 */
  actTotalSec: number;
  /** Прогноз кінця акта; під час паузи зсувається при знятті */
  actEndMs: number;
  /** № 20 у шухляді: акт стоїть (FR-18) */
  pausedAtMs: number | null;
  digUsed: boolean;
  /** Прискорення й затримки: метод і секунди (− — швидше) */
  sped: { method: SpeedMethod; sec: number }[];
  /** gift-arrived показано */
  seen: boolean;
}

export interface RaceOutcome {
  id: string;
  no: number;
  type: GiftType;
  level: number;
  won: boolean;
  endMs: number;
  /** Скільки йшов акт (перемога) */
  tookSec: number;
  /** Перемога: скільки ще служить; поразка: скільки бракувало */
  marginSec: number;
  /** Маршрут гонки, як на старті (FR-8) */
  steps: Race['steps'];
  stepsDone: number;
  stepsTotal: number;
  speedups: number;
  offline: boolean;
  seen: boolean;
}

export interface RaceState {
  rng: number;
  giftIdx: number;
  /** Місцева доба останнього подарунка: не більше одного на добу */
  lastGiftDayKey: string | null;
  lastRaceEndMs: number | null;
  active: Race | null;
  last: RaceOutcome | null;
}
