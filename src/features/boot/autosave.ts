// Автозапис (009 FR-2): кожні 5 с на передньому плані й при переході у фон.
// У фоні інтервал зупиняється: стан заморожений на моменті виходу, і пізніший savedAt з'їв би офлайн.
import { AppState } from 'react-native';

import { writeSave, type SaveDraft } from '@/save/repository';
import type { KeyValue } from '@/save/storage';

export const AUTOSAVE_MS = 5000;

/** draft() повертає null, коли писати не можна (напр., довідка повернення ще не забрана). */
export function createAutosave(kv: KeyValue, draft: () => SaveDraft | null, intervalMs = AUTOSAVE_MS) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let sub: { remove(): void } | null = null;
  // запис, що не вдався (місце скінчилося), повторюється на наступному тіку
  const saveNow = () => {
    const d = draft();
    return d ? writeSave(kv, d) : false;
  };
  const startTimer = () => {
    if (!timer) timer = setInterval(saveNow, intervalMs);
  };
  const stopTimer = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  return {
    saveNow,
    start() {
      startTimer();
      sub ??= AppState.addEventListener('change', (s) => {
        if (s === 'active') startTimer();
        else {
          saveNow();
          stopTimer();
        }
      });
    },
    stop() {
      stopTimer();
      sub?.remove();
      sub = null;
    },
  };
}
