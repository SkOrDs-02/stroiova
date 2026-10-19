// boss-brief (011 FR-2, FR-3, FR-7): оголошення підсумкової рівня - приїзд через `boss.warnH`, що дасть і що забере, «Готуватися» / «Пізніше».
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatCountdown, formatMult } from '@/economy/format';
import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { finalTitle } from './present';
import { inspT } from './texts';
import { useTumbLine } from './useTumbLine';

export function BossBrief({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  const a = s.inspections.active!;
  const p = s.cfg.params;
  const retry = a.attempt > 1;
  // репліка Тумбочкіна рівня (пул tumb.start.r<N>, мішком)
  const quote = useTumbLine(store, `tumb.start.r${a.level}`, `insp:${a.id}:start`);
  const left = (a.arrMs - s.lastMs) / 1000;
  const b = inspT.boss2;
  return (
    <View style={styles.scrim} testID="boss-brief">
      <View style={styles.card} accessibilityViewIsModal>
        {retry ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tag} testID="boss-retry">{b.retryHead(a.attempt)}</Text> : null}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header" testID="boss-title">{finalTitle(a.level)}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{inspT.bossWho(a.boss)}</Text>
        <View style={styles.timer} accessibilityRole="timer" accessibilityLabel={inspT.untilArrivalLabel(formatCountdown(left))}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timerK}>{inspT.untilArrival}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timerV} testID="boss-timer">{formatCountdown(left)}</Text>
        </View>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rule}>{b.when(formatCountdown(left))}</Text>
        {quote ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.quote}>{quote}</Text> : null}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rule} testID="boss-gives">{b.gives(formatMult(p.inspMult), p.inspHours)}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rule} testID="boss-fail">{b.fail(formatMult(p.inspFailMult), p.inspFailHours)}</Text>
        <Button testID="insp-prepare" label={inspT.prepare} onPress={() => s.ackInspWarning(true)} />
        <Button testID="insp-later" variant="ghost" label={inspT.later} onPress={() => s.ackInspWarning(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  card: { backgroundColor: color.bg, borderRadius: radius[12], borderWidth: 1, borderColor: color.border, padding: space[16], gap: space[8] },
  tag: { ...type('label'), color: color.fail },
  title: { ...type('h2'), color: color.text },
  muted: { ...type('bodyS'), color: color.muted },
  timer: { backgroundColor: color.alertBg, borderColor: color.alertLine, borderWidth: 1, borderRadius: radius[10], padding: space[12], gap: space[2] },
  timerK: { ...type('caption'), color: color.alertText },
  timerV: { ...type('numL'), color: color.onAlert },
  quote: { ...type('body'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
  rule: { ...type('bodyS'), color: color.text },
});
