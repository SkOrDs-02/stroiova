// Крок 2, onb-intro (002 FR-4): 4 репліки по тапу «Далі», «Пропустити» на кожній.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { t } from './texts';

export function IntroScreen({ store }: { store: ConveyorStore }) {
  const insets = useSafeAreaInsets();
  // номер репліки не зберігається: після вбивства вступ з репліки 1 (крайовий випадок)
  const [i, setI] = useState(0);
  const lines = t.o2Lines;
  const line = lines[i]!;
  const next = () => (i < lines.length - 1 ? setI(i + 1) : store.getState().onbComplete(2));
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[8], paddingBottom: insets.bottom + space[16] }]} testID="onb-intro">
      <View style={styles.top}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.place}>{t.o2Place}</Text>
        <Button testID="o2-skip" variant="ghost" label={t.o2Skip} onPress={() => store.getState().onbComplete(2, { skipped: true })} />
      </View>
      <View style={[styles.bubble, line.who === 'player' && styles.bubblePlayer]} testID={`o2-line-${i + 1}`}>
        {line.who === 'kava' ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.name}>{t.o2Name}</Text> : null}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{line.text}</Text>
      </View>
      <Button testID="o2-next" label={t.o2Next} onPress={next} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[16], justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  place: { ...type('docMeta'), color: color.muted },
  bubble: { backgroundColor: color.surface, borderRadius: radius[8], padding: space[16], gap: space[6] },
  bubblePlayer: { backgroundColor: color.surface2, alignSelf: 'flex-end' },
  name: { ...type('h4'), color: color.accent },
  line: { ...type('bodyL'), color: color.text },
});
