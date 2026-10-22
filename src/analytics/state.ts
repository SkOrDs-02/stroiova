// Лічильники аналітики, що переживають перезапуск (схема 19): номер сесії від встановлення, кінець попередньої сесії, чи надіслано перший запуск.
export interface AnalyticsState {
  /** Порядковий номер сесії з моменту встановлення (глобальна властивість `session_number`) */
  sessionNumber: number;
  /** Кінець попередньої сесії, мс (для `sec_since_last_session`); null до першого `session_end` */
  lastSessionEndMs: number | null;
  /** `app_first_open` і `identify` уже виконано для цього встановлення */
  firstOpenSent: boolean;
}

export function newAnalytics(): AnalyticsState {
  return { sessionNumber: 0, lastSessionEndMs: null, firstOpenSent: false };
}
