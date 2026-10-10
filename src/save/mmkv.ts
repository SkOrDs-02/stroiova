// MMKV-сховище (009 FR-1): нативний Nitro-модуль на пристрої, localStorage на web (вбудована web-реалізація MMKV).
// Окремий файл, щоб логіка збереження й тести не тягнули нативний модуль.
import { createMMKV } from 'react-native-mmkv';

import type { KeyValue } from './storage';

export function createStorage(): KeyValue {
  const mmkv = createMMKV({ id: 'stroiova' });
  return {
    getString: (k) => mmkv.getString(k),
    set: (k, v) => mmkv.set(k, v),
    remove: (k) => {
      mmkv.remove(k);
    },
  };
}
