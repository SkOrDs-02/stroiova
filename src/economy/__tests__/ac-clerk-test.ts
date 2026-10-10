// 001 AC-6 (найм), FR-14, FR-15.
import { income } from '../game/income';
import { hire } from '../game/purchase';
import { newCycle } from '../game/state';
import { cfgV5, game, T0 } from '../test-fixtures';

const ref = (type: 'stream' | 'stage', id: string) => ({ type, id });

describe('діловоди', () => {
  test('діловоди на Рапорти й три ланки коштують 710 (preset-v5)', () => {
    const cfg = cfgV5();
    let s = game(cfg, { signatures: 710 });
    for (const r of [ref('stream', 'raporty'), ref('stage', 'kombat'), ref('stage', 'stroy'), ref('stage', 'fin')]) {
      const res = hire(s, cfg, r);
      if ('error' in res) throw new Error(res.error);
      s = res.state;
    }
    expect(s.signatures).toBe(0);
    expect(income(s, cfg, T0, [], { idle: true }).perMin).toBe(6);
  });

  test('найм списує manager, повторно не можна; isFirstClerk лише першого разу за встановлення', () => {
    const cfg = cfgV5();
    const a = hire(game(cfg, { signatures: 1000 }), cfg, ref('stage', 'stroy'));
    if ('error' in a) throw new Error(a.error);
    expect(a.state.signatures).toBe(800);
    expect(a.events[0]).toMatchObject({ type: 'clerkHire', isFirstClerk: true, clerksCountAfter: 1 });
    expect(hire(a.state, cfg, ref('stage', 'stroy'))).toEqual({ error: 'already' });
    const cycle = { ...newCycle(a.state, cfg), signatures: 1000 };
    expect(cycle.stageClerks).toEqual([false, false, false]);
    const b = hire(cycle, cfg, ref('stage', 'stroy'));
    if ('error' in b) throw new Error(b.error);
    expect(b.events[0]).toMatchObject({ isFirstClerk: false });
  });

  test('без діловода хоча б на одній ланці дохід поза грою 0 (FR-15); замкнений потік не наймає', () => {
    const cfg = cfgV5();
    const s = game(cfg, { streamClerks: [true, false, false, false], stageClerks: [true, true, false] });
    expect(income(s, cfg, T0, [], { idle: true }).perMin).toBe(0);
    expect(income(s, cfg, T0).perMin).toBe(6);
    expect(hire(game(cfg, { signatures: 1e6 }), cfg, ref('stream', 'akty'))).toEqual({ error: 'locked' });
  });
});
