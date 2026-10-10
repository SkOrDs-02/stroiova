import { useState } from 'react';

import { ConveyorScreen } from '@/features/conveyor/ConveyorScreen';
import { createConveyorStore } from '@/features/conveyor/store';

// Вертикальний зріз 001 (етап 1). Головний екран і онбординг — 002.
export default function Index() {
  const [store] = useState(() => createConveyorStore(Date.now()));
  return <ConveyorScreen store={store} />;
}
