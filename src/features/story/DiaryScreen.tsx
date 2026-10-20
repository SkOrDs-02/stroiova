// diary (014 FR-25): отримані рядки щоденника за днями, лічильник; щоденник переживає цифровізації, стирає його лише «Скинути прогрес».
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { ddmmyyyy } from '@/features/museum/present';
import { Frame } from '@/features/settings/Parts';
import { DIARY } from '@/story/content';
import { storyText } from '@/story/text';
import { color, radius, space } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { storyT } from './texts';

export function DiaryScreen({ store, insetTop, onBack }: { store: ConveyorStore; insetTop: number; onBack: () => void }) {
  const got = useStore(store, (s) => s.story.diary.got);
  const gender = useStore(store, (s) => s.onboarding.gender);
  const me = useStore(store, (s) => s.onboarding.callsign?.text ?? '');
  // нові зверху; рядок, вилучений оновленням контенту, у списку не показуємо
  const rows = got
    .slice()
    .reverse()
    .map((g) => ({ g, line: DIARY.find((l) => l.id === g.id) }))
    .filter((r) => r.line != null);
  return (
    <Frame title={storyT.diary.title} testID="diary" insetTop={insetTop} onBack={onBack}>
      {rows.length === 0 ? (
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="diary-empty">{storyT.diary.empty}</Text>
      ) : (
        <>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="diary-count">{storyT.diary.count(rows.length)}</Text>
          {rows.map(({ g, line }) => (
            <View key={g.id} style={styles.card} testID="diary-row">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.day}>{storyT.diary.day(g.day, ddmmyyyy(g.atMs))}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{storyText(line!.text, gender, me)}</Text>
            </View>
          ))}
        </>
      )}
    </Frame>
  );
}

const styles = StyleSheet.create({
  muted: { ...type('bodyS'), color: color.muted },
  card: { backgroundColor: color.surface, borderRadius: radius[8], padding: space[12], gap: space[4] },
  day: { ...type('label'), color: color.accent },
  text: { ...type('body'), color: color.text },
});
