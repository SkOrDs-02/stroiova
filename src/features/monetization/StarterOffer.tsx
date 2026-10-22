// starter-offer (008 FR-19, FR-20): одноразова накладна «Стартовий набір»; без таймера й слів «лише зараз».
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatBig } from '@/economy/format';
import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { shopT, soT } from './texts';

export function StarterOffer({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  const price = s.services.purchases.prices().starter_pack ?? '';
  const busy = s.busy === 'purchase';
  const pending = s.monetization.pending.includes('starter_pack');
  return (
    <View style={styles.scrim} testID="starter-offer">
      <View style={styles.wrap} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{soT.title}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{soT.note}</Text>
        <View style={styles.paper}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{soT.doc}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{soT.head}</Text>
          <Row k={soT.signatures} v={formatBig(s.cfg.params.starterSignatures, 'counter')} />
          <Row k={soT.tank} v={soT.tankValue} />
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{soT.tankNote}</Text>
          <Row k={soT.total} v={price} />
        </View>
        {busy ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title2}>{shopT.busyTitle}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{Platform.OS === 'android' ? shopT.busyAndroid : shopT.busyIos}</Text>
          </>
        ) : (
          <>
            {pending ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="so-pending">{shopT.pendingLabel}</Text> : null}
            <Button testID="so-buy" label={shopT.buy(price)} disabled={pending} onPress={() => void store.getState().purchase('starter_pack', 'starter_offer')} />
            <Button testID="so-later" variant="ghost" label={soT.later} onPress={s.ackStarterOffer} />
          </>
        )}
      </View>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{k}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  wrap: { gap: space[12] },
  h2: { ...type('h2'), color: color.text },
  title2: { ...type('h4'), color: color.text },
  muted: { ...type('caption'), color: color.muted },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[6] },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('docTitle'), color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8], borderBottomWidth: 1, borderBottomColor: color.paperLine, paddingVertical: space[2] },
  cell: { ...type('docBody'), color: color.ink, flexShrink: 1 },
});
