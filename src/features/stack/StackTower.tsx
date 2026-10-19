// Стос до наради біля трибуни (012 FR-13, FR-14): висота в сантиметрах за сесію, лічильник до 999, картинка до 120 см.
// Skia у збірці немає: стос малюється шарами з View, без анімації (Reduce Motion враховано тим самим).
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { display } from '@/stack/stack';
import { color, radius, space } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { stackT } from './texts';

const MAX_H = 56;
const LAYER = 4;

export function StackTower({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  if (s.state.level < 4) return null;
  const { shownCm, counterCm } = display(s.digit.stack, s.cfg);
  const p = s.cfg.params.stack;
  const h = Math.round((shownCm / p.showCm) * MAX_H);
  const layers = Math.max(0, Math.floor(h / LAYER));
  const mark = Math.round((p.reachCm / p.showCm) * MAX_H);
  return (
    <View style={styles.row} testID="stack" accessibilityLabel={stackT.label(counterCm)} accessible>
      <View style={[styles.desk, { height: MAX_H }]}>
        <View style={[styles.ruler, { bottom: mark }]} />
        <View style={styles.pile}>
          {Array.from({ length: layers }, (_, i) => (
            <View key={i} style={[styles.sheet, i % 2 ? styles.sheetB : null]} />
          ))}
        </View>
      </View>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.label} testID="stack-label">{stackT.label(counterCm)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space[8] },
  desk: { width: 56, justifyContent: 'flex-end', borderBottomWidth: 2, borderBottomColor: color.borderStrong },
  ruler: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: color.accent },
  pile: { flexDirection: 'column-reverse', alignItems: 'center' },
  sheet: { width: 40, height: LAYER - 1, marginTop: 1, backgroundColor: color.paper, borderRadius: radius[2] },
  sheetB: { width: 38, backgroundColor: color.paperLine },
  label: { ...type('caption'), color: color.muted },
});
