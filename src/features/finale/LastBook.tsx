// last-book (013 FR-20): журнал № 24 (церемонія journal-new у стані «легендарний» показує MainScreen), потім запис про кота (014).
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { nextReveal } from '@/museum/museum';
import { beatById } from '@/story/content';
import { storyText } from '@/story/text';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { finT } from './texts';

export function LastBook({ store, onNext }: { store: ConveyorStore; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const revealing = useStore(store, (s) => nextReveal(s.museum) != null);
  const o = useStore(store, (s) => s.onboarding);
  useEffect(() => {
    store.getState().finaleOpenLastBook();
  }, [store]);
  // поки розкривається журнал, під ним нічого не показуємо: він «усередині» last-book
  if (revealing) return <View style={styles.root} testID="last-book-wait" />;
  const pl = beatById('st_cat_03')?.payload as { title: string; body: string } | undefined;
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="last-book">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{finT.lastBookTitle}</Text>
      {pl ? (
        <View style={styles.paper}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h}>{pl.title}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="lb-cat">{storyText(pl.body, o.gender, o.callsign?.text ?? '')}</Text>
        </View>
      ) : null}
      <Button
        testID="lb-next"
        label={finT.next}
        onPress={() => {
          store.getState().finaleComplete('last_book');
          onNext();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bgDeep, padding: space[16], gap: space[12], justifyContent: 'center' },
  title: { ...type('h2'), color: color.text },
  paper: { backgroundColor: color.paper, borderRadius: radius[8], padding: space[16], gap: space[8] },
  h: { ...type('h4'), color: color.ink },
  body: { ...type('body'), color: color.ink },
});
