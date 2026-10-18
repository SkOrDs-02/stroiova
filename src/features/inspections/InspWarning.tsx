// insp-warning (004 FR-8): перший раз, позапланова, Р2 «Комісія командування»; «Готуватися» / «Пізніше».
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatCountdown } from '@/economy/format';
import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { reasonText } from './present';
import { inspT } from './texts';
import { useTumbLine } from './useTumbLine';

export function InspWarning({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  const a = s.inspections.active!;
  const unsched = a.trigger === 'unscheduled';
  const first = a.no === 1;
  const r2First = !first && !unsched && a.boss === 'command_commission';
  // «Перша поява» й перехід у бригаду — одноразові рядки texts.md §4; решта — пули tumb.*
  const pool = first || r2First ? null : unsched ? 'tumb.start_unsched' : `tumb.start.r${a.level}`;
  const poolLine = useTumbLine(store, pool, `insp:${a.id}:start`);
  const quote = first ? inspT.firstQuote : r2First ? inspT.r2Quote : poolLine;
  const left = (a.arrMs - s.lastMs) / 1000;
  return (
    <View style={styles.scrim} testID="insp-warning">
      <View style={styles.card} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{unsched ? inspT.titleUnsched : inspT.title}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{inspT.bossWho(a.boss)}</Text>
        {unsched && a.reason ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.reason} testID="insp-reason">{reasonText(a.reason.telegramId)}</Text> : null}
        <View style={styles.timer} accessibilityRole="timer" accessibilityLabel={inspT.untilArrivalLabel(formatCountdown(left))}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timerK}>{inspT.untilArrival}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timerV} testID="insp-timer">{formatCountdown(left)}</Text>
        </View>
        {quote ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{inspT.tumb}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.quote}>{quote}</Text>
          </>
        ) : null}
        {first ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rule}>{inspT.firstRule}</Text> : null}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rule}>
          <Text style={styles.pass}>{`${inspT.passRuleK} `}</Text>
          {unsched ? inspT.passUnschedRule : inspT.passRule}
        </Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rule}>
          <Text style={styles.fail}>{`${inspT.failRuleK} `}</Text>
          {inspT.failRule}
        </Text>
        {first ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{inspT.repRule}</Text> : null}
        <Button testID="insp-prepare" label={inspT.prepare} onPress={() => s.ackInspWarning(true)} />
        <Button testID="insp-later" variant="ghost" label={inspT.later} onPress={() => s.ackInspWarning(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  card: { backgroundColor: color.bg, borderRadius: radius[12], borderWidth: 1, borderColor: color.border, padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.text },
  muted: { ...type('bodyS'), color: color.muted },
  reason: { ...type('bodyS'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[8] },
  timer: { backgroundColor: color.alertBg, borderColor: color.alertLine, borderWidth: 1, borderRadius: radius[10], padding: space[12], gap: space[2] },
  timerK: { ...type('caption'), color: color.alertText },
  timerV: { ...type('numL'), color: color.onAlert },
  quote: { ...type('body'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
  rule: { ...type('bodyS'), color: color.text },
  pass: { color: color.accent, fontWeight: typeScale.cta.fontWeight },
  fail: { color: color.fail, fontWeight: typeScale.cta.fontWeight },
});
