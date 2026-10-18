// Місцевий час пристрою для розкладу (003 FR-2): зсув зони передає застосунок, домен Date не читає.
export const DAY = 86_400_000;
export const HOUR = 3_600_000;

/** tzOffsetMin = місцевий час − UTC, хв (= −Date.getTimezoneOffset()). */
export function localMs(ms: number, tzOffsetMin: number): number {
  return ms + tzOffsetMin * 60_000;
}

/** Початок місцевої доби (мс UTC). */
export function dayStart(ms: number, tzOffsetMin: number): number {
  const l = localMs(ms, tzOffsetMin);
  return l - (((l % DAY) + DAY) % DAY) - tzOffsetMin * 60_000;
}

/** РРРР-ММ-ДД місцевої доби, без Date: цивільний календар з номера доби. */
export function dayKey(ms: number, tzOffsetMin: number): string {
  const days = Math.floor(localMs(ms, tzOffsetMin) / DAY);
  const { y, m, d } = civil(days);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p2(m)}-${p2(d)}`;
}

/** Місяць 1–12 місцевої доби (сезонні телеграми, № 4 «лише влітку»). */
export function monthOf(ms: number, tzOffsetMin: number): number {
  return civil(Math.floor(localMs(ms, tzOffsetMin) / DAY)).m;
}

// Howard Hinnant, days_from_civil навпаки: номер доби від 1970-01-01 → рік, місяць, день
function civil(z0: number): { y: number; m: number; d: number } {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m, d };
}
