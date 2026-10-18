// Репліка Тумбочкіна з мішка пулу (рішення 41, 45): береться в ефекті, читається зі sessionLines.
import { useEffect } from 'react';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';

export function useTumbLine(store: ConveyorStore, key: string | null, slot: string): string | null {
  const text = useStore(store, (s) => s.sessionLines.byUid[slot] ?? null);
  useEffect(() => {
    if (key) store.getState().tumbLine(key, slot);
  }, [store, key, slot]);
  return key ? text : null;
}
