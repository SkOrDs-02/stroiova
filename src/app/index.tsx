import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

import { ConveyorScreen } from '@/features/conveyor/ConveyorScreen';
import { createConveyorStore } from '@/features/conveyor/store';

// Вертикальний зріз 001 (етап 1). Головний екран і онбординг — 002.
export default function Index() {
  const [store] = useState(() => createConveyorStore(Date.now()));
  const url = Linking.useURL();

  // Лише в розробці: stroiova://?debugAwayMin=10 імітує повернення після відсутності (Maestro, .maestro/offline-return.yaml).
  // Справжній офлайн між запусками потребує збереження (009).
  useEffect(() => {
    if (!__DEV__ || !url) return;
    const min = Number(Linking.parse(url).queryParams?.debugAwayMin);
    if (min > 0) {
      const now = Date.now();
      store.getState().away(now - min * 60_000, now);
    }
  }, [url, store]);

  return <ConveyorScreen store={store} />;
}
