// 012 AC-19: збереження Р4 (7 потоків, ЗпЗ, 6 ланок, крок маршруту «Доповідь») проходить схему без втрат.
import { bundledConfig } from '@/economy/config';
import { newGame } from '@/economy/game/state';
import { MIGRATIONS } from '../migrations';
import { KEY_SAVE, loadSave, serialize } from '../repository';
import { CURRENT_SCHEMA } from '../schema';
import { memoryStorage } from '../storage';
import { draft } from '../test-saves';

test('Р4: запис економіки з 7 потоками й 6 ланками, прив\'язаний конфіг із потоком-часткою, гонка з кроком «Доповідь»', () => {
  const d = draft({ schemaVersion: CURRENT_SCHEMA, savedAt: 5000 });
  const eco = { ...newGame(bundledConfig, 0), level: 4, streamLevels: [30, 20, 10, 5, 3, 2, 8], stageLevels: Array(6).fill(10), streamClerks: Array(7).fill(true), stageClerks: Array(6).fill(true) };
  const steps = [{ unit: 'akty', sec: 1 }, { unit: 'narada', sec: 2 }, { unit: 'dopovid', sec: 3 }];
  const race = { ...d.game.race, active: { id: 'race_1', no: 1, type: 'drone', level: 4, startMs: 0, svcEndMs: 9, steps, actTotalSec: 6, actEndMs: 8, pausedAtMs: null, digUsed: false, sped: [], seen: true } };
  const kv = memoryStorage({ [KEY_SAVE]: serialize({ ...d, game: { ...d.game, economy: eco, race } as never }) });
  const r = loadSave(kv, { current: CURRENT_SCHEMA, migrations: MIGRATIONS });
  expect(r.kind).toBe('ok');
  if (r.kind !== 'ok') return;
  expect(r.save.game.economy.level).toBe(4);
  expect(r.save.game.economy.streamLevels).toHaveLength(7);
  expect(r.save.game.race.active?.steps.at(-1)).toEqual({ unit: 'dopovid', sec: 3 });
});
