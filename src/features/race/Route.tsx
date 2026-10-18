// Маршрут акта (FR-7, FR-12): кроки з поточним; пройдені — акцентом.
import { StyleSheet, Text, View } from 'react-native';

import type { Race } from '@/race/types';
import { color, radius, space, typeScale } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { raceT } from './texts';

export function Route({ race, stepIdx, done = false }: { race: Race | { steps: Race['steps'] }; stepIdx: number; done?: boolean }) {
  return (
    <View style={styles.row} testID="race-route">
      {race.steps.map((s, i) => {
        const passed = done || i < stepIdx;
        const now = !done && i === stepIdx;
        return (
          <View key={s.unit} style={[styles.step, passed && styles.passed, now && styles.now]}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.text, (passed || now) && styles.textOn]} numberOfLines={1}>
              {raceT.route[s.unit]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[4] },
  step: { flex: 1, minWidth: 0, paddingVertical: space[4], borderRadius: radius[4], borderWidth: 1, borderColor: color.border, alignItems: 'center' },
  passed: { backgroundColor: color.surface2, borderColor: color.accent },
  now: { borderColor: color.accent, borderWidth: 2 },
  text: { ...type('caption'), color: color.muted },
  textOn: { color: color.text, fontWeight: typeScale.cta.fontWeight },
});
