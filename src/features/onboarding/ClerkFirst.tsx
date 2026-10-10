// clerk-first (002 FR-17): Оля «Штамп» на «Стройовій частині», «вручну → діловод», «Далі».
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { t } from './texts';

export function ClerkFirst({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.scrim} testID="clerk-first">
      <View style={styles.card} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.name}>{t.c7Name}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.role}>{t.c7Role}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{t.b7Olya}</Text>
        <View style={styles.box}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.boxText}>{t.c7Change}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.boxMuted}>{t.c7Offline}</Text>
        </View>
        <Button testID="clerk-first-next" label={t.c7Next} onPress={onNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  card: { backgroundColor: color.bgDeep, borderRadius: radius[12], padding: space[16], gap: space[8] },
  name: { ...type('h2'), color: color.text },
  role: { ...type('label'), color: color.muted },
  line: { ...type('bodyL'), color: color.text },
  box: { backgroundColor: color.surface, borderRadius: radius[6], padding: space[12], gap: space[4] },
  boxText: { ...type('body'), color: color.text },
  boxMuted: { ...type('bodyS'), color: color.muted },
});
