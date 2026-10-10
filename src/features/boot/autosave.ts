// Автозапис (009 FR-2): кожні 5 с на передньому плані, при переході у фон і за saveNow().
import { AppState } from 'react-native';

import { writeSave, type SaveDraft } from '@/save/repository';
import type { KeyValue } from '@/save/storage';

export const AUTOSAVE_MS = 5000;

export function createAutosave(kv: KeyValue, draft: () => SaveDraft, intervalMs = AUTOSAVE_MS) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let sub: { remove(): void } | null = null;
  // запис, що не вдався (місце скінчилося), повторюється на наступному тіку
  const saveNow = () => writeSave(kv, draft());
  return {
    saveNow,
    start() {
      if (timer) return;
      timer = setInterval(saveNow, intervalMs);
      sub = AppState.addEventListener('change', (s) => {
        if (s === 'background') saveNow();
      });
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      sub?.remove();
      sub = null;
    },
  };
}
