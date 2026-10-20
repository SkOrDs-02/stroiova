// curios (007 FR-22, FR-23): хронологія записів журналу курйозів, групи за днями.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { storyT } from '@/features/story/texts';
import { curioSummary } from '@/museum/museum';
import { color, radius, size, space } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { curioGroups } from './present';
import { muT } from './texts';

export function CuriosList({ store, onOpen, onArchive }: { store: ConveyorStore; onOpen: (seq: number) => void; onArchive?: () => void }) {
  const s = useStore(store);
  const sum = curioSummary(s.museum);
  const sheets = Object.keys(s.story.sheets).length;
  const groups = curioGroups(s.museum, s.telegrams, s.onboarding.gender, s.lastMs);
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="curios">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{muT.curiosTitle}</Text>
      {sheets > 0 && onArchive ? (
        <Pressable testID="archive-open" accessibilityRole="button" onPress={onArchive} style={styles.row}>
          <View style={styles.main}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{storyT.arch.title}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{storyT.arch.count(sheets)}</Text>
          </View>
        </Pressable>
      ) : null}
      {sum.total === 0 ? (
        <View style={styles.empty} testID="curios-empty">
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{muT.curiosEmptyTitle}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{muT.curiosEmptyBody}</Text>
        </View>
      ) : (
        <>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="curios-summary">{muT.summary(sum.total, sum.telegrams, sum.gifts, sum.packs, sum.stacks)}</Text>
          {groups.map((g) => (
            <View key={g.day} style={styles.group}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.day}>{g.day}</Text>
              {g.items.map((r) => (
                <Pressable
                  key={r.entry.seq}
                  testID={`curio-${r.entry.seq}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${muT.curioNo(r.entry.seq)}. ${r.num}. ${r.title}. ${r.status}. ${r.meta}`}
                  onPress={() => onOpen(r.entry.seq)}
                  style={styles.row}
                >
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.no}>{`${r.entry.seq}`}</Text>
                  <View style={styles.main}>
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{`${r.num} · ${r.status}`}</Text>
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{r.title}</Text>
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta} numberOfLines={1}>{r.meta}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space[16], gap: space[8], paddingBottom: space[24] },
  h2: { ...type('h2'), color: color.text },
  h4: { ...type('h4'), color: color.text },
  body: { ...type('body'), color: color.text },
  muted: { ...type('caption'), color: color.muted },
  empty: { backgroundColor: color.surface, borderRadius: radius[6], padding: space[16], gap: space[8] },
  group: { gap: space[6] },
  day: { ...type('label'), color: color.muted, marginTop: space[8] },
  row: { minHeight: size.touchMin, flexDirection: 'row', gap: space[12], backgroundColor: color.surface, borderRadius: radius[6], padding: space[12] },
  no: { ...type('numL'), color: color.accent, minWidth: space[24] },
  main: { flex: 1, gap: space[2] },
  title: { ...type('body'), color: color.text },
  meta: { ...type('bodyS'), color: color.muted },
});
