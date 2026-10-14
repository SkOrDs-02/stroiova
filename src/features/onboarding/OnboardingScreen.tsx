// Кроки 1–5 онбордингу (002 FR-1, FR-13): повноекранні, без таббара; екран за поточним кроком.
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';

import { CallsignScreen } from './CallsignScreen';
import { FirstActScreen } from './FirstActScreen';
import { IntroScreen } from './IntroScreen';
import { TitleScreen } from './TitleScreen';

export function OnboardingScreen({ store }: { store: ConveyorStore }) {
  const step = useStore(store, (s) => s.onboarding.step);
  if (step === 1) return <TitleScreen store={store} />;
  if (step === 2) return <IntroScreen store={store} />;
  if (step === 3) return <CallsignScreen store={store} />;
  return <FirstActScreen store={store} />;
}
