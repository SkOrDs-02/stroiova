// Стор на заданому кроці онбордингу для тестів 002.
import { bundledConfig } from '@/economy/config';
import { T0 } from '@/economy/test-fixtures';
import { ACT_TAPS, createConveyorStore } from '@/features/conveyor/store';

import type { StepNo } from './steps';

export function storeAt(step: StepNo, gender: 'm' | 'f' = 'f') {
  const store = createConveyorStore(T0, bundledConfig);
  const s = () => store.getState();
  if (step > 1) s().onbComplete(1);
  if (step > 2) s().onbComplete(2);
  if (step > 3) s().onbComplete(3, { callsign: { type: 'excel', text: 'Ексель' }, gender });
  if (step > 4) for (let i = 0; i < ACT_TAPS; i++) s().actSign();
  if (step > 5) {
    s().stamp();
    s().toMain();
  }
  if (step > 6) s().buy({ type: 'stream', id: 'raporty' }, T0); // 16 підписів ≥ ціни першого рівня
  return store;
}
