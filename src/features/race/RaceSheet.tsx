// race-sheet (005 FR-11, FR-16, FR-19): маршрут, таймери, запас чи нестача, «Послатися на цифру». Реклама −50% — 08.
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { view } from '@/race/race';
import { telegram } from '@/telegrams/content';
import { color, radius, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { dur, multText } from './present';
import { Route } from './Route';
import { raceT } from './texts';

export function RaceSheet({ store, onClose }: { store: ConveyorStore; onClose: () => void }) {
  const s = useStore(store);
  const r = s.race.active;
  if (!r) return null;
  const v = view(r, s.lastMs);
  const p = s.cfg.params;
  const sped = r.sped.filter((x) => x.sec < 0);
  const savedSec = -sped.reduce((a, x) => a + x.sec, 0);
  const canDigital = !r.digUsed && s.state.prestigePoints >= 1 && v.actLeftMs > 0;
  return (
    <View style={styles.scrim} testID="race-sheet">
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{raceT.sheetTitle}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{raceT.sheetSub}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{`${raceT.actOnWay(r.no)} · ${raceT.item[r.type]}`}</Text>
        <Route race={r} stepIdx={v.stepIdx} />
        <View style={styles.row}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{raceT.docEta}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.v} testID="race-act-left">{dur(v.actLeftMs)}</Text>
        </View>
        <View style={styles.row}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{raceT.life[r.type]}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.v}>{dur(v.svcLeftMs)}</Text>
        </View>
        {v.paused ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{raceT.paused(telegram('tg_0020_gift_price')?.no ?? null)}</Text> : null}
        {savedSec > 0 ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sped} testID="race-sped">{raceT.sped(dur(savedSec * 1000), sped.map((x) => raceT.how[x.method] ?? '').join(', '))}</Text> : null}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.verdict, v.late && styles.late]}>
          <Text style={styles.bold}>{`${v.late ? raceT.sheetLateK : raceT.sheetOkK} `}</Text>
          {v.late ? `${raceT.sheetLate[r.type]}${raceT.sheetLateTail(dur(-v.marginMs))}` : raceT.sheetOk(multText(r.type, p), dur(v.marginMs))}
        </Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h}>{raceT.speed}</Text>
        <Button testID="race-digital" label={raceT.digital} disabled={!canDigital} onPress={() => s.raceDigital()} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{raceT.digitalCut(p.raceDigitalCutH)}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{raceT.digitalNote}</Text>
        <Button testID="race-close" variant="ghost" label={raceT.close} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bgDeep, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.text },
  h: { ...type('h4'), color: color.text, marginTop: space[4] },
  muted: { ...type('caption'), color: color.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8] },
  k: { ...type('bodyS'), color: color.muted, flexShrink: 1 },
  v: { ...type('num'), color: color.text },
  sped: { ...type('bodyS'), color: color.accent },
  verdict: { ...type('bodyS'), color: color.accent },
  late: { color: color.fail },
  bold: { fontWeight: typeScale.cta.fontWeight },
});
