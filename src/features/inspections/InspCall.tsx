// call перед першою перевіркою (004 FR-2): «Археолог» попереджає про Тумбочкіна, далі insp-warning.
import { StyleSheet, Text, View } from 'react-native';

import { t as onb } from '@/features/onboarding/texts';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { inspT } from './texts';

export function InspCall({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.scrim} testID="insp-call">
      <View style={styles.card} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.who}>{onb.b9Arch}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.status}>{onb.b9Status[1]}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{inspT.call1}</Text>
        <Button testID="insp-call-ok" label={inspT.callOk} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  card: { backgroundColor: color.bgDeep, borderRadius: radius[12], padding: space[16], gap: space[8] },
  who: { ...type('h2'), color: color.text, textAlign: 'center' },
  status: { ...type('label'), color: color.muted, textAlign: 'center' },
  line: { ...type('bodyL'), color: color.text },
});
