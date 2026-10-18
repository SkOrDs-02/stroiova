// Реклама за винагороду (008): у збірці без нативного SDK ролика немає. AdMob + UMP підключає етап 2 (рішення 80).
import type { AdService } from '@/monetization/types';

export const unavailableAds: AdService = {
  availability: () => 'no_fill',
  show: async () => ({ kind: 'fail', stage: 'not_ready' }),
};
