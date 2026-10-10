// Сховище ключ-значення (009 FR-1). Реалізація MMKV — у mmkv.ts (нативний модуль, імпортує лише застосунок).

export interface KeyValue {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Пам'ятне сховище для тестів і фікстур. */
export function memoryStorage(init: Record<string, string> = {}): KeyValue & { dump(): Record<string, string> } {
  const m = new Map(Object.entries(init));
  return {
    getString: (k) => m.get(k),
    set: (k, v) => { m.set(k, v); },
    remove: (k) => { m.delete(k); },
    dump: () => Object.fromEntries(m),
  };
}
