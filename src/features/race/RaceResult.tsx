// race-won / race-lost (005 FR-20, FR-23, FR-25): акт зі штампом, ефект подарунка або запис курйозу, репліка Ліни.
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatMult } from '@/economy/format';
import type { ConveyorStore } from '@/features/conveyor/store';
import { useTumbLine } from '@/features/inspections/useTumbLine';
import { color, radius, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { dur, multText } from './present';
import { Route } from './Route';
import { raceT } from './texts';

function stampDate(ms: number): string {
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function RaceResult({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  const o = s.race.last!;
  const p = s.cfg.params;
  const line = useTumbLine(store, `lina.${o.won ? 'won' : 'lost'}.${o.type}`, `race:${o.id}:end`);
  const leftMs = Math.max(0, o.endMs + o.marginSec * 1000 - s.lastMs);
  return (
    <View style={styles.scrim} testID={o.won ? 'race-won' : 'race-lost'}>
      <View style={styles.wrap} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{o.won ? raceT.wonTitle[o.type] : raceT.lostTitle}</Text>
        {o.won ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.fx}>{raceT.wonFx(o.type, formatMult(o.type === 'generator' ? p.fuelBonus : p.gifts[o.type].mult))}</Text> : null}
        <View style={styles.paper}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{`${raceT.act(o.no)} · ${raceT.docKind}`}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{o.won ? raceT.item[o.type] : `${raceT.lostEntry[o.type]}${raceT.lostEntryTail}`}</Text>
          <Route race={{ steps: o.steps }} stepIdx={o.stepsDone} done={o.won} />
          {o.won ? (
            <>
              <Row k={raceT.took} v={dur(o.tookSec * 1000)} />
              <Row k={raceT.left[o.type]} v={dur(leftMs)} />
              <Row k={raceT.speedups} v={o.speedups ? String(o.speedups) : raceT.none} />
            </>
          ) : (
            <>
              <Row k={raceT.stepsDone} v={raceT.stepsOf(o.stepsDone, o.stepsTotal)} />
              <Row k={raceT.lacked} v={dur(o.marginSec * 1000)} bad />
              <Row k={raceT.penalty} v={raceT.none} />
            </>
          )}
          <View style={styles.foot}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{raceT.chief}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{`${o.won ? raceT.approved : raceT.cancelled} ${stampDate(o.endMs)}`}</Text>
          </View>
        </View>
        {!o.won ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{raceT.lostNote(multText(o.type, p))}</Text> : null}
        {line ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{raceT.lina}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.quote}>{line}</Text>
          </>
        ) : null}
        <Button testID="race-result-ok" label={raceT.toMain} onPress={s.closeRaceResult} />
      </View>
    </View>
  );
}

function Row({ k, v, bad = false }: { k: string; v: string; bad?: boolean }) {
  return (
    <View style={styles.row}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, bad && styles.bad]}>{k}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, bad && styles.bad]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  wrap: { gap: space[8] },
  title: { ...type('h2'), color: color.text },
  fx: { ...type('body'), color: color.accent, fontWeight: typeScale.cta.fontWeight },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[6] },
  meta: { ...type('docMeta'), color: color.ink2 },
  doc: { ...type('docBody'), color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8], borderBottomWidth: 1, borderBottomColor: color.paperLine, paddingVertical: space[2] },
  cell: { ...type('docBody'), color: color.ink, flexShrink: 1 },
  bad: { color: color.alertPaper },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[8], marginTop: space[6] },
  stamp: { ...type('stampS'), color: color.stamp, borderWidth: 2, borderColor: color.stamp, paddingHorizontal: space[6], textTransform: 'uppercase' },
  note: { ...type('bodyS'), color: color.muted },
  muted: { ...type('caption'), color: color.muted },
  quote: { ...type('body'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
});
