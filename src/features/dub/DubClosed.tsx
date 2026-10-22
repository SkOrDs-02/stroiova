// digit-result «Дубль N закрито» (013 FR-26): акт замість фіналу, далі - наказ про Дубль N+1 (`endless-intro`).
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { dupT, span } from './texts';

export function DubClosed({ store, onNext }: { store: ConveyorStore; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const closed = useStore(store, (s) => s.dub.closed);
  if (!closed) return null;
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="dub-closed" accessibilityViewIsModal>
      <View style={styles.paper}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{dupT.closedTitle}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header" testID="dc-title">{dupT.closed(closed.n)}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="dc-cycle">{dupT.closedCycle(span(closed.cycleMs))}</Text>
      </View>
      <Button
        testID="dc-next"
        label={dupT.next}
        onPress={() => {
          store.getState().dubAck();
          onNext();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bgDeep, padding: space[16], gap: space[16], justifyContent: 'center' },
  paper: { backgroundColor: color.paper, borderRadius: radius[8], padding: space[16], gap: space[8] },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('docTitle'), color: color.ink },
  body: { ...type('docBody'), color: color.ink },
});
