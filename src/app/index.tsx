import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

import { BootScreen } from '@/features/boot/BootScreen';
import { ForceUpdateScreen } from '@/features/boot/ForceUpdateScreen';
import { SaveErrorScreen } from '@/features/boot/SaveErrorScreen';
import { useBoot } from '@/features/boot/useBoot';
import { ConveyorScreen } from '@/features/conveyor/ConveyorScreen';
import { createStorage } from '@/save/mmkv';

// Запуск 009: boot → force-update / save-error / гра (онбординг — 002). Головний екран — 002.
export default function Index() {
  const [kv] = useState(createStorage);
  const boot = useBoot(kv);
  const url = Linking.useURL();
  const store = boot.route.kind === 'game' ? boot.route.store : null;

  // Лише в розробці: stroiova://?debugAwayMin=10 імітує повернення після відсутності (Maestro, .maestro/offline-return.yaml).
  useEffect(() => {
    if (!__DEV__ || !url || !store) return;
    const min = Number(Linking.parse(url).queryParams?.debugAwayMin);
    if (min > 0) {
      const now = Date.now();
      store.getState().away(now - min * 60_000, now);
    }
  }, [url, store]);

  const r = boot.route;
  if (r.kind === 'boot') return <BootScreen migrating={r.migrating} />;
  if (r.kind === 'newer') return <ForceUpdateScreen installed={r.installed} required={r.required} nowMs={r.atMs} />;
  if (r.kind === 'error') {
    return <SaveErrorScreen backup={r.corrupt.backup} nowMs={r.atMs} onRestore={boot.restore} onNew={boot.startNew} onReport={boot.report} />;
  }
  return <ConveyorScreen store={r.store} />;
}
