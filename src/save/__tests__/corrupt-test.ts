// 009 AC-3, AC-4, AC-6; FR-3, FR-5, FR-6.
import { MIGRATIONS } from '../migrations';
import { KEY_BAK1, KEY_SAVE, loadSave, restoreFromBackup, serialize, snapshot, writeSave } from '../repository';
import { CURRENT_SCHEMA } from '../schema';
import { memoryStorage } from '../storage';
import { draft } from '../test-saves';

const opts = { current: CURRENT_SCHEMA, migrations: MIGRATIONS };

function withBackup() {
  const kv = memoryStorage();
  writeSave(kv, draft({ savedAt: 1000 }, { signatures: 777, prestigePoints: 3 }));
  snapshot(kv);
  return kv;
}

describe('пошкоджене збереження', () => {
  test('AC-3: обрізаний save + валідний знімок → corrupt з копією; save не перезаписано', () => {
    const kv = withBackup();
    const broken = serialize(draft({ savedAt: 2000 })).slice(0, 120);
    kv.set(KEY_SAVE, broken);
    const r = loadSave(kv, opts);
    expect(r).toMatchObject({ kind: 'corrupt', reason: 'parse' });
    if (r.kind !== 'corrupt') return;
    expect(r.backup?.savedAt).toBe(1000);
    expect(r.backup?.game.economy.signatures).toBe(777);
    expect(r.backup?.game.economy.prestigePoints).toBe(3);
    expect(kv.getString(KEY_SAVE)).toBe(broken);
  });

  test('змінене поле без нової суми → checksum; неправильна форма з правильною сумою → schema', () => {
    const kv = memoryStorage();
    const text = serialize(draft({}, { signatures: 10 }));
    kv.set(KEY_SAVE, text.replace('"signatures":10', '"signatures":99999'));
    expect(loadSave(kv, opts)).toMatchObject({ kind: 'corrupt', reason: 'checksum' });
    const bad = draft();
    (bad.game.economy as unknown as Record<string, unknown>).level = 'one';
    kv.set(KEY_SAVE, serialize(bad));
    expect(loadSave(kv, opts)).toMatchObject({ kind: 'corrupt', reason: 'schema' });
  });

  test('AC-4: «Відновити з копії» пише знімок як save; далі читання ok', () => {
    const kv = withBackup();
    kv.set(KEY_SAVE, '{oops');
    const b = restoreFromBackup(kv, opts);
    expect(b?.savedAt).toBe(1000);
    const r = loadSave(kv, opts);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.save.savedAt).toBe(1000);
  });

  test('AC-6: без валідних знімків → backup null', () => {
    const kv = memoryStorage({ [KEY_SAVE]: '{', [KEY_BAK1]: 'also broken' });
    expect(loadSave(kv, opts)).toMatchObject({ kind: 'corrupt', backup: null });
    expect(restoreFromBackup(kv, opts)).toBeNull();
  });
});
