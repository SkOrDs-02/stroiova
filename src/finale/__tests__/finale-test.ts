// 013 FR-15…FR-22: стан-машина фіналу.
import { complete, current, declineScript, finished, mailingStopped, newFinale, pendingAction, quietLeftMs, start, STEPS } from '../finale';

const T = 1_000_000;
const DAY = 86_400_000;

describe('фінал', () => {
  test('не почато: нічого не чекає', () => {
    const f = newFinale();
    expect(current(f, 7, T)).toBeNull();
    expect(pendingAction(f)).toBeNull();
    expect(complete(f, 'order', T).changed).toBe(false);
  });

  test('AC-11: конвертація № 6 стартує фінал з кроку order; повторний старт нічого не міняє', () => {
    const f = start(newFinale(), T);
    expect(f.startMs).toBe(T);
    expect(start(f, T + 5)).toBe(f);
    expect(current(f, 7, T)).toBe('order');
    expect(pendingAction(f)).toBe('order');
  });

  test('кроки йдуть по порядку: script не завершити до order', () => {
    const f = start(newFinale(), T);
    expect(complete(f, 'script', T).changed).toBe(false);
    const a = complete(f, 'order', T + 1);
    expect(a.changed).toBe(true);
    expect(complete(a.f, 'order', T + 2).changed).toBe(false);
    expect(current(a.f, 7, T + 2)).toBe('script');
  });

  test('FR-18: N нічого не завершує; Y фіксує мітку, від якої тиша й вимкнена розсилка', () => {
    let f = complete(start(newFinale(), T), 'order', T).f;
    f = declineScript(declineScript(f));
    expect(f.scriptNs).toBe(2);
    expect(f.done.script).toBeUndefined();
    expect(mailingStopped(f)).toBe(false);
    f = complete(f, 'script', T + 10).f;
    expect(f.yMs).toBe(T + 10);
    expect(mailingStopped(f)).toBe(true);
    expect(declineScript(f)).toBe(f);
  });

  test('AC-12: убито на script - при запуску поточний крок script, банер веде на нього', () => {
    const f = complete(start(newFinale(), T), 'order', T).f;
    expect(pendingAction(f)).toBe('script');
    expect(current(f, 7, T + 1)).toBe('script');
  });

  test('FR-22, AC-16: тиша спливає за часом від Y; quiet стає поточним лише після спливання; годинник назад не скорочує', () => {
    let f = start(newFinale(), T);
    for (const s of ['order', 'script', 'last_book', 'call', 'credits'] as const) f = complete(f, s, T + 1).f;
    const y = f.yMs!;
    expect(pendingAction(f)).toBeNull();
    expect(current(f, 7, y + 5 * DAY)).toBeNull();
    expect(quietLeftMs(f, 7, y + 5 * DAY)).toBe(2 * DAY);
    // годинник назад: залишок більший, не менший
    expect(quietLeftMs(f, 7, y - DAY)).toBe(8 * DAY);
    expect(current(f, 7, y + 7 * DAY)).toBe('quiet');
    f = complete(f, 'quiet', y + 7 * DAY).f;
    expect(current(f, 7, y + 7 * DAY)).toBe('endless_offer');
    expect(finished(f)).toBe(false);
    f = complete(f, 'endless_offer', y + 7 * DAY).f;
    expect(finished(f)).toBe(true);
    expect(STEPS).toHaveLength(7);
  });
});
