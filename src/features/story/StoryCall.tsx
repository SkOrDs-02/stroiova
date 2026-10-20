// Дзвінок сюжету (014, носій `call`): одна репліка за іншою, одна кнопка. Показується в безпечний момент, у сесії не більше одного.
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { beatById } from '@/story/content';
import { storyText } from '@/story/text';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { fromName, storyT } from './texts';

export function StoryCall({ store }: { store: ConveyorStore }) {
  const id = useStore(store, (s) => s.storyCall);
  const gender = useStore(store, (s) => s.onboarding.gender);
  const me = useStore(store, (s) => s.onboarding.callsign?.text ?? '');
  const beat = id ? beatById(id) : undefined;
  if (!beat) return null;
  const pl = beat.payload as { from: string; lines: string[] };
  return (
    <View style={styles.scrim} testID="story-call">
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.who} accessibilityRole="header">{storyT.call.title(fromName(pl.from))}</Text>
        {pl.lines.map((l) => (
          <Text key={l} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{storyText(l, gender, me)}</Text>
        ))}
        <Button testID="story-call-ok" label={storyT.call.ok} onPress={() => store.getState().closeStoryCall()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bgDeep, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  who: { ...type('h4'), color: color.accent },
  line: { ...type('bodyL'), color: color.text },
});
