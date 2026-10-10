// Ігровий цикл зрізу: дохід за монотонним годинником раз на кадр (001 FR-3), офлайн при поверненні з фону (FR-25).
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { createSessionClock } from './clock';
import type { ConveyorStore } from './store';

export function useGameLoop(store: ConveyorStore) {
  useEffect(() => {
    const clock = createSessionClock(() => Date.now(), () => performance.now());
    const now = clock.now;
    let raf = 0;
    const frame = () => {
      store.getState().tick(now());
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    let leftAt: number | null = null;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        // «active» без попереднього фону (напр. після inactive на iOS) не запускає другий ланцюг кадрів
        if (leftAt == null) return;
        store.getState().away(leftAt, Date.now());
        leftAt = null;
        clock.reset();
        raf = requestAnimationFrame(frame);
      } else if (leftAt == null) {
        store.getState().tick(now());
        leftAt = Date.now();
        cancelAnimationFrame(raf);
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      sub.remove();
    };
  }, [store]);
}
