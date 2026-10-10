// 009 AC-1, AC-5, FR-1…FR-4.
import { AppState } from 'react-native';

import { createAutosave } from '@/features/boot/autosave';

import { fnv1a } from '../checksum';
import { MIGRATIONS } from '../migrations';
import { installId, KEY_BAK1, KEY_BAK2, KEY_SAVE, loadSave, serialize, snapshot, writeSave } from '../repository';
import { CURRENT_SCHEMA } from '../schema';
import { memoryStorage } from '../storage';
import { draft } from '../test-saves';

const opts = { current: CURRENT_SCHEMA, migrations: MIGRATIONS };

describe('збереження', () => {
  test('fnv1a: відомі значення', () => {
    expect(fnv1a('')).toBe('811c9dc5');
    expect(fnv1a('a')).toBe('e40c292c');
  });

  test('запис → читання дає той самий стан (FR-1, FR-3)', () => {
    const kv = memoryStorage();
    const d = draft({}, { signatures: 1234.5, streamLevels: [7, 1, 0, 0] });
    expect(writeSave(kv, d)).toBe(true);
    const r = loadSave(kv, opts);
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.save.game).toEqual(d.game);
    expect(r.save.savedAt).toBe(d.savedAt);
  });

  test('порожнє сховище — перший запуск', () => {
    expect(loadSave(memoryStorage(), opts)).toEqual({ kind: 'empty' });
  });

  test('AC-1: 12 с на передньому плані + фон → 3 записи, savedAt останнього = мить фону', () => {
    jest.useFakeTimers();
    const kv = memoryStorage();
    const writes: number[] = [];
    let now = 0;
    const set = kv.set;
    kv.set = (k, v) => { if (k === KEY_SAVE) writes.push(JSON.parse(v).savedAt); set(k, v); };
    let listener: ((s: string) => void) | null = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_t, l) => { listener = l as (s: string) => void; return { remove() {} } as never; });
    const auto = createAutosave(kv, () => draft({ savedAt: now }));
    auto.start();
    for (let i = 0; i < 12; i++) { now += 1000; jest.advanceTimersByTime(1000); }
    listener!('background');
    expect(writes).toEqual([5000, 10000, 12000]);
    auto.stop();
    jest.useRealTimers();
  });

  test('AC-5: 3 сесії поспіль → рівно 2 знімки, bak1 — стан на початку 3-ї', () => {
    const kv = memoryStorage();
    for (let s = 1; s <= 3; s++) {
      writeSave(kv, draft({ savedAt: s * 1000 }, { signatures: s * 10 }));
      snapshot(kv);
      writeSave(kv, draft({ savedAt: s * 1000 + 500 }, { signatures: s * 10 + 5 }));
    }
    const keys = Object.keys(kv.dump()).filter((k) => k.startsWith('save.bak'));
    expect(keys.sort()).toEqual([KEY_BAK1, KEY_BAK2]);
    expect(JSON.parse(kv.getString(KEY_BAK1)!).game.economy.signatures).toBe(30);
    expect(JSON.parse(kv.getString(KEY_BAK2)!).game.economy.signatures).toBe(20); // початок 2-ї сесії
  });

  test('пошкоджений save знімком не стає', () => {
    const kv = memoryStorage({ [KEY_SAVE]: serialize(draft()).slice(0, 50) });
    expect(snapshot(kv)).toBe(false);
    expect(kv.getString(KEY_BAK1)).toBeUndefined();
  });

  test('install_id створюється один раз і живе поза save', () => {
    const kv = memoryStorage();
    expect(installId(kv, () => 'u-1')).toEqual({ id: 'u-1', isNew: true });
    kv.remove(KEY_SAVE);
    expect(installId(kv, () => 'u-2')).toEqual({ id: 'u-1', isNew: false });
  });
});
