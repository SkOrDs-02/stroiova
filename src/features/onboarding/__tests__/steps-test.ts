// 002 FR-1, FR-16…FR-20, FR-28, FR-29: кроки онбордингу як чистий стан.
import { complete, newOnboarding, ready, receiveTg1, TELEGRAM_AT_MS, type OnboardingState } from '../steps';

const ctx = { playMs: 0, signatures: 0, raportyPrice: 8.8, stroyClerkPrice: 220, callAtMs: 420_000 };

function at(step: OnboardingState['step']): OnboardingState {
  return { ...newOnboarding(0), step };
}

describe('кроки онбордингу', () => {
  test('FR-1: закривається лише поточний крок; повторний тап нічого не змінює', () => {
    const o1 = complete(newOnboarding(0), 1, 4_000);
    expect(o1.step).toBe(2);
    expect(complete(o1, 1, 5_000)).toBe(o1);
    expect(complete(o1, 3, 5_000)).toBe(o1);
    expect(o1.completed).toEqual([{ step: 1, atPlayMs: 4_000, durationMs: 4_000, skipped: false }]);
  });

  test('AC-2: «Пропустити» на вступі — skipped: true, тривалість від старту кроку', () => {
    const o = complete(complete(newOnboarding(0), 1, 3_000), 2, 5_000, { skipped: true });
    expect(o.step).toBe(3);
    expect(o.completed[1]).toEqual({ step: 2, atPlayMs: 5_000, durationMs: 2_000, skipped: true });
  });

  test('FR-8, крайовий випадок: крок 3 без позивного чи форми не закривається', () => {
    expect(complete(at(3), 3, 1, { callsign: { type: 'excel', text: 'Ексель' } }).step).toBe(3);
    const o = complete(at(3), 3, 1, { callsign: { type: 'custom', text: 'Сисадмін' }, gender: 'f' });
    expect(o).toMatchObject({ step: 4, callsign: { type: 'custom', text: 'Сисадмін' }, gender: 'f' });
  });

  test('FR-16, FR-17: коуч з\'являється, коли підписів вистачає', () => {
    expect(ready(at(6), { ...ctx, signatures: 8 })).toBeNull();
    expect(ready(at(6), { ...ctx, signatures: 16 })).toBe('coachUpgrade');
    expect(ready(at(7), { ...ctx, signatures: 150 })).toBeNull();
    expect(ready(at(7), { ...ctx, signatures: 220 })).toBe('coachHire');
  });

  test('FR-18, FR-29: телеграма № 1 не раніше 300 с ігрового часу, потім коуч на вкладці', () => {
    const o = at(8);
    expect(ready(o, { ...ctx, playMs: TELEGRAM_AT_MS - 1 })).toBeNull();
    expect(ready(o, { ...ctx, playMs: TELEGRAM_AT_MS })).toBe('telegramArrive');
    const got = receiveTg1(o, TELEGRAM_AT_MS);
    expect(got.tg1ReceivedAtPlayMs).toBe(TELEGRAM_AT_MS);
    expect(ready(got, { ...ctx, playMs: TELEGRAM_AT_MS + 1 })).toBe('coachTelegram');
    expect(receiveTg1(got, TELEGRAM_AT_MS + 5)).toBe(got);
  });

  test('FR-20: дзвінок не раніше archiveBonusAtSec ігрового часу', () => {
    expect(ready(at(9), { ...ctx, playMs: 419_999 })).toBeNull();
    expect(ready(at(9), { ...ctx, playMs: 420_000 })).toBe('call');
  });

  test('кроки 10 і далі в етапі 1 нічого не показують (08, 10)', () => {
    expect(ready(at(10), { ...ctx, playMs: 10_000_000, signatures: 1e9 })).toBeNull();
    expect(ready(at('done'), { ...ctx, signatures: 1e9 })).toBeNull();
  });
});
