// ad-offer-first (002 FR-21…FR-25): перша пропозиція буста за рекламу; показ закриває крок 10, «Не зараз» є в кожному стані.
// Стани: ролик готовий; ролик недоступний (причина словами, крок однаково закрито); куплено «Без реклами» («Забрати» без ролика).
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { localDate, type ConveyorStore } from '@/features/conveyor/store';
import { AdButton } from '@/features/monetization/AdButton';
import { adT } from '@/features/monetization/texts';
import { boostView } from '@/monetization/monetization';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { t } from './texts';

export function AdOfferFirst({ store, onClose }: { store: ConveyorStore; onClose: () => void }) {
  const s = useStore(store);
  // FR-21: показ модалки закриває крок 10 (first_ad_offer)
  useEffect(() => {
    store.getState().onbComplete(10);
  }, [store]);
  const now = s.lastMs;
  const view = boostView(s.monetization, s.effects, now, localDate(now), s.cfg, s.state.hasNoAds);
  const noAds = s.state.hasNoAds;
  const ready = noAds || s.services.ads.availability() === 'ready';
  const h = s.cfg.params.adHours;
  return (
    <View style={styles.scrim} testID="ad-offer-first">
      <View style={styles.wrap} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header" testID="aof-title">
          {ready ? t.b10Title(h) : t.b10NaTitle}
        </Text>
        {ready ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="aof-sub">{noAds ? t.b10SubNa : t.b10Sub}</Text> : null}
        <AdButton store={store} placement="income_boost" entryPoint="ad_offer_first" view={view} label={t.b10Cta} takeLabel={t.b10CtaNa} note={adT.note} takeNote={adT.takeNote} onGranted={onClose} testID="aof-watch" />
        <Button testID="aof-no" variant="ghost" label={t.b10No} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  wrap: { backgroundColor: color.bg, borderRadius: radius[12], padding: space[16], gap: space[12] },
  h2: { ...type('h2'), color: color.text },
  body: { ...type('body'), color: color.text },
});
