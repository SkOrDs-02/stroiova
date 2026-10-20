// finale-script, стан «знайдено» (014 FR-15): серверна під залом доповідей, бежевий ПК з наліпкою, скрипт розсилки на екрані.
// Вимкнення недоступне до фіналу (013): єдина кнопка - «Повернутися».
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { beatById } from '@/story/content';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { storyT } from './texts';

export function FinaleScript({ store }: { store: ConveyorStore }) {
  const id = useStore(store, (s) => s.storyScene);
  const beat = id ? beatById(id) : undefined;
  if (!beat) return null;
  const lines = (beat.payload as { lines: string[] }).lines;
  return (
    <View style={styles.root} testID="finale-script">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{storyT.finale.title}</Text>
      <View style={styles.pc}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sticker} testID="fs-sticker">{storyT.finale.sticker}</Text>
        <ScrollView style={styles.screen} contentContainerStyle={styles.screenBody} testID="fs-screen">
          {lines.map((l, i) => (
            <Text key={`${i}-${l}`} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.code}>{l}</Text>
          ))}
        </ScrollView>
      </View>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note} testID="fs-line">{storyT.finale.foundLine}</Text>
      <Button testID="fs-back" label={storyT.finale.back} onPress={() => store.getState().closeStoryScene()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bgDeep, padding: space[16], gap: space[12], justifyContent: 'center' },
  title: { ...type('h2'), color: color.text },
  pc: { backgroundColor: color.paper, borderRadius: radius[8], padding: space[12], gap: space[8] },
  sticker: { ...type('docMeta'), color: color.ink, alignSelf: 'flex-start', borderWidth: 1, borderColor: color.ink, paddingHorizontal: space[6] },
  screen: { backgroundColor: color.ink, borderRadius: radius[4], maxHeight: 280 },
  screenBody: { padding: space[8], gap: space[2] },
  code: { ...type('docMeta'), color: color.paper },
  note: { ...type('body'), color: color.text },
});
