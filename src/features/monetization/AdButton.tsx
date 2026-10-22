// Кнопка нагороди за рекламу (008 FR-8, FR-9): готова / вантажиться / недоступна / ліміт / межа 12 год / «Забрати».
import { StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useStore } from 'zustand';

import { formatDuration } from '@/economy/format';
import { analyticsOf, type ConveyorStore } from '@/features/conveyor/store';
import type { AdView } from '@/monetization/monetization';
import type { AdAvailability, Placement } from '@/monetization/types';
import { color, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { adT } from './texts';

/** Текст причини, чому ролика немає (немає ролика, мережі, згоди); null - можна показувати */
export function unavailableText(av: AdAvailability): string | null {
  if (av === 'no_net') return adT.naNet;
  if (av === 'no_consent') return adT.naConsent;
  if (av === 'no_fill') return adT.na;
  return null;
}

interface Props {
  store: ConveyorStore;
  placement: Placement;
  view: AdView;
  /** Підпис готової кнопки і кнопки «Забрати» */
  label: string;
  takeLabel: string;
  /** Рядок під кнопкою у станах «готова» і «Забрати» */
  note: (left: number, limit: number) => string;
  takeNote?: (left: number, limit: number) => string;
  limitLabel?: string;
  /** Звідки показано пропозицію (лише `income_boost`, аналітика) */
  entryPoint?: 'boosts_sheet' | 'shop' | 'ad_offer_first';
  /** Після нагороди (закрити шторку тощо) */
  onGranted?: () => void;
  testID: string;
}

export function AdButton({ store, placement, view, label, takeLabel, note, takeNote, limitLabel = adT.limit, entryPoint, onGranted, testID }: Props) {
  const s = useStore(store);
  const loading = s.busy === 'ad';
  const av = s.state.hasNoAds ? 'ready' : s.services.ads.availability();
  const off = view.button === 'ready' ? unavailableText(av) : null;
  // ad_offer_show: кнопка з'явилась, ліміт не вичерпано
  const offerable = view.button === 'ready' || view.button === 'claim';
  useEffect(() => {
    if (!offerable) return;
    analyticsOf(store).adOffer(placement, { isNoAdsClaim: view.button === 'claim', isReady: view.button === 'claim' || av === 'ready', usesToday: view.limit - view.left, dailyLimit: view.limit, ...(entryPoint ? { entryPoint } : {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerable, placement]);
  const onPress = async () => {
    const r = await store.getState().watchAd(placement);
    if (r === 'granted') onGranted?.();
  };
  if (view.button === 'limit')
    return (
      <View style={styles.wrap}>
        <Button testID={testID} label={limitLabel} disabled onPress={() => {}} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{adT.limitNote(view.limit)}</Text>
      </View>
    );
  if (view.button === 'cap')
    return (
      <View style={styles.wrap}>
        <Button testID={testID} label={adT.cap(s.cfg.params.adCapHours)} disabled onPress={() => {}} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{adT.capNote(formatDuration((view.boostLeftMs ?? 0) / 1000), s.cfg.params.adHours, s.cfg.params.adCapHours - s.cfg.params.adHours)}</Text>
      </View>
    );
  if (loading)
    return (
      <View style={styles.wrap}>
        <Button testID={testID} label={adT.loading} disabled onPress={() => {}} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{adT.loadingNote}</Text>
      </View>
    );
  if (off)
    return (
      <View style={styles.wrap}>
        <Button testID={testID} label={adT.na} disabled onPress={() => {}} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{off === adT.na ? adT.nofill : off}</Text>
      </View>
    );
  const take = view.button === 'claim';
  return (
    <View style={styles.wrap}>
      <Button testID={testID} label={take ? takeLabel : label} onPress={onPress} />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{take ? (takeNote ?? note)(view.left, view.limit) : note(view.left, view.limit)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  note: { ...type('caption'), color: color.muted },
});
