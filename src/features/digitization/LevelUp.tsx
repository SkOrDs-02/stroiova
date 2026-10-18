// level-up (006 FR-25): «Наказ № 2 про переведення до штабу бригади»; бали переходять; «Прибути до бригади».
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { digitT } from './texts';

export function LevelUp({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  return (
    <View style={styles.scrim} testID="level-up">
      <View style={styles.wrap} accessibilityViewIsModal>
        <View style={styles.paper}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{digitT.l2DocNo}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{digitT.l2DocTitle}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l2l1}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l2l2}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l2l3}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l2Commission}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc} testID="level-points">{digitT.l2Points(s.state.prestigePoints)}</Text>
        </View>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{digitT.l2Kava2}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.quote}>{digitT.l2Kava}</Text>
        <Button testID="level-up-ok" label={digitT.l2Cta} onPress={s.closeDigitStep} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  wrap: { gap: space[8] },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[6] },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('docTitle'), color: color.ink },
  doc: { ...type('docBody'), color: color.ink },
  muted: { ...type('caption'), color: color.muted },
  quote: { ...type('body'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
});
