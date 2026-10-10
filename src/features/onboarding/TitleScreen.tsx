// Крок 1, onb-title (002 FR-2, FR-3): наказ № 1, одна кнопка, без реєстрації й системних вікон.
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { t } from './texts';

export function TitleScreen({ store }: { store: ConveyorStore }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[24], paddingBottom: insets.bottom + space[16] }]} testID="onb-title">
      <View style={styles.doc}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docNo}>{t.o1DocNo}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docTitle}>{t.o1DocTitle}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{t.o1Stamp}</Text>
      </View>
      <View style={styles.center}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.logo} accessibilityRole="header">{t.o1Logo}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tagline}>{t.o1Tagline}</Text>
      </View>
      <View style={styles.bottom}>
        <Button testID="o1-cta" label={t.o1Cta} onPress={() => store.getState().onbComplete(1)} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{t.o1Note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[16], justifyContent: 'space-between' },
  doc: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[4] },
  docNo: { ...type('docMeta'), color: color.ink },
  docTitle: { ...type('docBody'), color: color.ink2 },
  stamp: { ...type('stampM'), color: color.stamp, borderWidth: 2, borderColor: color.stamp, alignSelf: 'flex-end', paddingHorizontal: space[8], transform: [{ rotate: '-6deg' }] },
  center: { alignItems: 'center', gap: space[8] },
  logo: { ...type('displayXl'), color: color.text },
  tagline: { ...type('bodyL'), color: color.muted, textAlign: 'center' },
  bottom: { gap: space[8] },
  note: { ...type('caption'), color: color.muted, textAlign: 'center' },
});
