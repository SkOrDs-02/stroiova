// gift-arrived (005 FR-5, FR-6): Ліна, предмет, маршрут, служба, прогноз акта, вердикт; таймер ресурсу вже йде.
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { useTumbLine } from '@/features/inspections/useTumbLine';
import { view } from '@/race/race';
import { color, radius, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { bonusText, dur } from './present';
import { Route } from './Route';
import { raceT } from './texts';

export function GiftArrived({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  const r = s.race.active!;
  const v = view(r, s.lastMs);
  const p = s.cfg.params;
  const line = useTumbLine(store, `lina.gift.${r.type}`, `race:${r.id}:gift`);
  return (
    <View style={styles.scrim} testID="gift-arrived">
      <View style={styles.card} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{raceT.giftTitle}</Text>
        {line ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{raceT.lina}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.quote}>{line}</Text>
          </>
        ) : null}
        <View style={styles.doc}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docMeta}>{`${raceT.act(r.no)} · ${raceT.docKind}`}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docTitle}>{raceT.item[r.type]}</Text>
        </View>
        <Route race={r} stepIdx={v.stepIdx} />
        <Row k={raceT.serve[r.type]} v={dur(v.svcLeftMs)} />
        <Row k={raceT.actEta} v={dur(v.actLeftMs)} />
        <Row k={raceT.bonusLabel[r.type]} v={bonusText(r.type, p)} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.verdict, v.late && styles.late]} testID="gift-verdict">
          {v.late ? raceT.lateGift(dur(-v.marginMs)) : raceT.ok(dur(v.marginMs))}
        </Text>
        <Button testID="gift-register" label={raceT.register} onPress={s.ackGift} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{raceT.timerNote}</Text>
      </View>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{k}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.v}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  card: { backgroundColor: color.bg, borderRadius: radius[12], borderWidth: 1, borderColor: color.border, padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.text },
  muted: { ...type('caption'), color: color.muted },
  quote: { ...type('body'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
  doc: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[12], gap: space[2] },
  docMeta: { ...type('docMeta'), color: color.ink2 },
  docTitle: { ...type('docBody'), color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8] },
  k: { ...type('bodyS'), color: color.muted, flexShrink: 1 },
  v: { ...type('num'), color: color.text },
  verdict: { ...type('body'), color: color.accent, fontWeight: typeScale.cta.fontWeight },
  late: { color: color.fail },
});
