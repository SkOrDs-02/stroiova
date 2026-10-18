// Картка акта на main (005 FR-11, FR-12): номер, предмет, маршрут, обидва таймери, запас чи нестача, «Прискорити».
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { EconomyParams } from '@/economy/core/types';
import { view } from '@/race/race';
import type { Race } from '@/race/types';
import { color, radius, size, space, typeScale } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { dur, multText } from './present';
import { Route } from './Route';
import { raceT } from './texts';

export function RaceCard({ race, nowMs, p, onOpen }: { race: Race; nowMs: number; p: EconomyParams; onOpen: () => void }) {
  const v = view(race, nowMs);
  return (
    <View style={[styles.card, v.late && styles.cardLate]} testID="race-card">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.head}>{`${raceT.act(race.no)} · ${raceT.short[race.type]}`}</Text>
      <Route race={race} stepIdx={v.stepIdx} />
      <View style={styles.row}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{raceT.docEta}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.v}>{dur(v.actLeftMs)}</Text>
      </View>
      <View style={styles.row}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{raceT.life[race.type]}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.v}>{dur(v.svcLeftMs)}</Text>
      </View>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.verdict, v.late && styles.late]} testID="race-verdict">
        {v.late ? `${raceT.sheetLateK} ${raceT.sheetLate[race.type]}${raceT.sheetLateTail(dur(-v.marginMs))}` : `${raceT.sheetOkK} ${raceT.sheetOk(multText(race.type, p), dur(v.marginMs))}`}
      </Text>
      <Pressable testID="race-speed" accessibilityRole="button" onPress={onOpen} style={[styles.btn, v.late && styles.btnMain]}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.btnText, v.late && styles.btnTextMain]}>{raceT.speed}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[6], padding: space[12], borderRadius: radius[10], backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, marginTop: space[8] },
  cardLate: { borderColor: color.alertLine },
  head: { ...type('bodyS'), color: color.text, fontWeight: typeScale.cta.fontWeight },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8] },
  k: { ...type('caption'), color: color.muted, flexShrink: 1 },
  v: { ...type('num'), color: color.text },
  verdict: { ...type('caption'), color: color.accent },
  late: { color: color.fail },
  btn: { minHeight: size.touchMin, borderRadius: radius[6], borderWidth: 1, borderColor: color.borderStrong, justifyContent: 'center', alignItems: 'center' },
  btnMain: { backgroundColor: color.accent, borderColor: color.accent },
  btnText: { ...type('body'), color: color.text },
  btnTextMain: { color: color.accentInk, fontWeight: typeScale.cta.fontWeight },
});
