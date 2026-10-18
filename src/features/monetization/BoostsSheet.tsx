// boosts-sheet (008, рішення 82): шторка множників - розбивка M по складниках, музей, кнопка буста, посилання в магазин.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatCountdown, formatMult } from '@/economy/format';
import { multStack } from '@/economy/game/income';
import { birdEffect, localDate, type ConveyorStore } from '@/features/conveyor/store';
import { multRow } from '@/features/museum/present';
import { boostView } from '@/monetization/monetization';
import { color, radius, size, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { AdButton } from './AdButton';
import { adT, boostsT } from './texts';

export function BoostsSheet({ store, onClose, onShop }: { store: ConveyorStore; onClose: () => void; onShop: () => void }) {
  const s = useStore(store);
  const now = s.lastMs;
  const eff = [...s.effects, ...birdEffect(s.cfg, s.onboarding, now)];
  const stack = multStack(s.state, s.cfg, now, eff);
  const mus = multRow(s.museum);
  const view = boostView(s.monetization, s.effects, now, localDate(now), s.cfg, s.state.hasNoAds);
  const sources = stack.rows.length;
  return (
    <View style={styles.scrim} testID="boosts-sheet">
      <View style={styles.sheet} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{boostsT.title}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{boostsT.sub}</Text>
          <View style={styles.total}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{boostsT.total}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.num} testID="boosts-total">{formatMult(stack.total)}</Text>
          </View>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{sources > 0 ? boostsT.sources(sources) : ''}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{boostsT.active}</Text>
          {stack.rows.map((r, i) => (
            <View key={`${r.source}-${i}`} style={styles.row} testID={`boost-row-${r.source}`}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.k, styles.flex]}>{boostsT.rows[r.source] ?? r.source}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.v}>{r.endsAtMs != null ? `${formatMult(r.value)} · ${formatCountdown((r.endsAtMs - now) / 1000)}` : formatMult(r.value)}</Text>
            </View>
          ))}
          <View style={styles.row} testID="boost-row-museum">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.k, styles.flex]}>{boostsT.museum}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.v}>{`${mus.count} · ${mus.note}`}</Text>
          </View>
          <AdButton
            store={store}
            placement="income_boost"
            view={view}
            label={view.left === s.cfg.params.adsPerDay ? adT.boostFirst : adT.boostAdd}
            takeLabel={adT.takeBoost}
            note={adT.note}
            takeNote={adT.takeNote}
            testID="boost-ad"
          />
          {!s.state.hasNoAds ? (
            <Pressable testID="boosts-shop" accessibilityRole="link" onPress={onShop} style={styles.link}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.linkText}>{boostsT.shopLink}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
        <Button testID="boosts-close" variant="ghost" label={boostsT.close} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: color.bg, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  scroll: { gap: space[8] },
  h2: { ...type('h2'), color: color.text },
  h4: { ...type('h4'), color: color.muted, marginTop: space[8] },
  muted: { ...type('caption'), color: color.muted },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  num: { ...type('displayM'), color: color.accent },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8], borderBottomWidth: 1, borderBottomColor: color.border, paddingVertical: space[6] },
  flex: { flex: 1 },
  k: { ...type('body'), color: color.text },
  v: { ...type('body'), color: color.accent },
  link: { minHeight: size.touchMin, justifyContent: 'center' },
  linkText: { ...type('body'), color: color.accent, textDecorationLine: 'underline' },
});
