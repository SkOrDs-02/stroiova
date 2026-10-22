// Вибірка детальних економічних подій (analytics/tracking-plan.yaml, `sampling.econ_detail`): hash(install_id) mod 100 < відсоток.
import { seedFrom } from '@/telegrams/rng';

/** Відсоток за замовчуванням, поки віддаленого ключа `econ_detail_sample_pct` немає (етап 5; план: 100) */
export const ECON_DETAIL_DEFAULT_PCT = 100;

/** Детермінована вибірка: той самий install_id завжди в тій самій групі */
export function isSampled(installId: string, pct: number = ECON_DETAIL_DEFAULT_PCT): boolean {
  return seedFrom(`econ-detail:${installId}`) % 100 < pct;
}
