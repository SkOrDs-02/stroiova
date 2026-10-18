// insp-result (004 FR-22): акт № N, рядки пунктів, висновок, підпис; пройшли ×3, позапланова без ×3, провалили.
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { actRows } from './present';
import { inspT } from './texts';
import { useTumbLine } from './useTumbLine';

/** Дата й час акта за годинником пристрою: ДД.ММ.РРРР, ГГ:ХХ */
function stampDate(ms: number): { date: string; time: string } {
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return { date: `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`, time: `${p2(d.getHours())}:${p2(d.getMinutes())}` };
}

export function InspResult({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  const o = s.inspections.last!;
  const res = useTumbLine(store, `tumb.${o.passed ? 'pass' : 'fail'}.r${o.level}`, `insp:${o.id}:result`);
  const { date, time } = stampDate(o.arrMs);
  const verdict = !o.passed ? inspT.failedV : o.remark ? inspT.remarkV : inspT.passed;
  return (
    <View style={styles.scrim} testID="insp-result">
      <View style={styles.wrap} accessibilityViewIsModal>
        <View style={styles.paper}>
          {res ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.res}>{res}</Text> : null}
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{`${inspT.boss[o.boss]} · ${date}, ${time}`}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{inspT.act(o.no)}</Text>
          {actRows(o).map((r, i) => (
            <View key={`${r.k}-${i}`} style={styles.row}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, r.bad && styles.bad]}>{r.k}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, r.bad && styles.bad]}>{r.v}</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, styles.strong, !o.passed && styles.bad]}>{inspT.verdict}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, styles.strong, !o.passed && styles.bad]} testID="insp-verdict">{verdict}</Text>
          </View>
          <View style={styles.foot}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.signer}>{inspT.signer[o.boss]}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{`${inspT.checked} ${date}`}</Text>
          </View>
        </View>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.status} testID="insp-status">
          {o.passed ? <Text style={styles.pass}>{`${inspT.passK} `}</Text> : <Text style={styles.fail}>{`${inspT.failK} `}</Text>}
          {!o.passed ? inspT.fail : o.trigger === 'unscheduled' ? inspT.passUnsched : inspT.passX3}
        </Text>
        <Button testID="insp-result-ok" label={inspT.toMain} onPress={s.closeInspResult} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  wrap: { gap: space[12] },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[6] },
  res: { ...type('resolution'), color: color.pen, alignSelf: 'flex-end', textAlign: 'right' },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('docTitle'), color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8], borderBottomWidth: 1, borderBottomColor: color.paperLine, paddingVertical: space[2] },
  cell: { ...type('docBody'), color: color.ink, flexShrink: 1 },
  strong: { fontWeight: typeScale.cta.fontWeight },
  bad: { color: color.alertPaper },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[8], marginTop: space[6] },
  signer: { ...type('docMeta'), color: color.ink2, flex: 1 },
  stamp: { ...type('stampS'), color: color.stamp, borderWidth: 2, borderColor: color.stamp, paddingHorizontal: space[6], textTransform: 'uppercase' },
  status: { ...type('body'), color: color.text },
  pass: { color: color.accent, fontWeight: typeScale.cta.fontWeight },
  fail: { color: color.fail, fontWeight: typeScale.cta.fontWeight },
});
