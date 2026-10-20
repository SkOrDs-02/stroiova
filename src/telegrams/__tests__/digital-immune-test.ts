// 013 FR-9, FR-10, AC-5, AC-6: цифрова ланка не сповільнюється відповіддю на телеграму; «Комбата шукають» з телеграми після конвертації № 1 не стартує.
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import { createConveyorStore } from '@/features/conveyor/store';
import { choiceView } from '@/features/telegrams/present';
import { T0 } from '@/economy/test-fixtures';

import { telegram } from '../content';
import { answer } from '../effects';
import { ctx, eco, tgWith } from '../test-utils';

const cfg = bundledConfig;

describe('цифрова Стройова (AC-5)', () => {
  test('«сумлінно» на № 1: сповільнення немає, ефекту немає, у результаті «Цифрова ланка: без сповільнення»', () => {
    const tg = tgWith(['tg_0001_sergeants']);
    const r = answer(tg, eco({ level: 5, digital: ['stroy'] }), 'tg_0001_sergeants#1', 'diligent', ctx());
    if ('error' in r) throw new Error(r.error);
    expect(r.effects).toEqual([]);
    expect(r.item.result?.slow).toEqual([]);
    expect(r.item.result?.immune).toEqual(['stroy']);
  });

  test('паперова Стройова сповільнюється, як і було', () => {
    const r = answer(tgWith(['tg_0001_sergeants']), eco(), 'tg_0001_sergeants#1', 'diligent', ctx());
    if ('error' in r) throw new Error(r.error);
    expect(r.effects).toHaveLength(1);
    expect(r.item.result?.immune).toBeUndefined();
  });

  test('рядок ефекту варіанта на цифровій ланці', () => {
    const tg = tgWith(['tg_0001_sergeants']);
    const e = eco({ level: 5, digital: ['stroy'] });
    const tel = tg.inbox[0]!;
    const c = telegram(tel.id)!.choices.find((x) => x.id === 'diligent')!;
    expect(choiceView(c, tg, e, cfg, false).summary).toContain('Цифрова ланка: без сповільнення');
  });
});

describe('«Комбата шукають» з телеграми (AC-6)', () => {
  function played(digital: string[], seed: number) {
    const store = createConveyorStore(T0, cfg);
    const g = { ...newGame(cfg, T0), level: 5, digital, paper: 30 };
    const tg = tgWith(['tg_0018_kombat_leave'], { rng: seed });
    store.setState({ lastMs: T0, state: g, telegrams: { ...store.getState().telegrams, ...tg } });
    store.getState().answerTelegram('tg_0018_kombat_leave#1', 'kombat_desk');
    return store.getState().telegrams.kombat.active;
  }

  test('без цифрових ланок подія стартує, з першою конвертацією - ні (той самий кидок)', () => {
    let seed = 0;
    while (seed < 200 && !played([], seed)) seed++;
    expect(seed).toBeLessThan(200);
    expect(played(['kombat'], seed)).toBeNull();
  });
});
