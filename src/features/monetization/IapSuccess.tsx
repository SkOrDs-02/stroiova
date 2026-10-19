// iap-success (008 FR-23, FR-24): штамп «Зараховано» і що змінилося; з черги, зокрема після запуску.
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { iapT, shopT } from './texts';

function stampDate(ms: number): string {
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function IapSuccess({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  const id = s.monetization.success[0];
  if (!id) return null;
  const price = s.services.purchases.prices()[id] ?? '';
  const date = stampDate(s.lastMs);
  return (
    <View style={styles.scrim} testID="iap-success">
      <View style={styles.wrap} accessibilityViewIsModal>
        <View style={styles.paper}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{`${iapT.kicker} · ${date}`}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{shopT.products[id].name}</Text>
          {price ? (
            <View style={styles.row}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{iapT.price}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{price}</Text>
            </View>
          ) : null}
          {iapT.rows[id].map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{k}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{v}</Text>
            </View>
          ))}
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc} testID="iap-body">{iapT.body[id]}</Text>
          <View style={styles.foot}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{`${iapT.stamp} ${date}`}</Text>
          </View>
        </View>
        <Button testID="iap-ok" label={iapT.ok} onPress={s.closeIapSuccess} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  wrap: { gap: space[12] },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[6] },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('docTitle'), color: color.ink },
  doc: { ...type('docBody'), color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8], borderBottomWidth: 1, borderBottomColor: color.paperLine, paddingVertical: space[2] },
  cell: { ...type('docBody'), color: color.ink, flexShrink: 1 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: space[6] },
  stamp: { ...type('stampS'), color: color.stamp, borderWidth: 2, borderColor: color.stamp, paddingHorizontal: space[6], textTransform: 'uppercase' },
});
