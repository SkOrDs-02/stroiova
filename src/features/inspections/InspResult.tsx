// insp-result (004 FR-22): акт № N, рядки пунктів, висновок, підпис; пройшли ×3, позапланова без ×3, провалили.
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatDuration, formatMult } from '@/economy/format';
import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { muT } from '@/features/museum/texts';
import { titleOf } from '@/features/museum/present';
import { journal, seriesBonusText } from '@/museum/journals';
import { completesSeries } from '@/museum/museum';
import { BEATS } from '@/story/content';

import { PLAYABLE_LEVELS } from '@/digitization/digitization';

import { actRows, verdictText } from './present';
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
  // провал підсумкової: повтор уже оголошено (011 FR-7)
  const retry = s.inspections.active?.kind === 'final' ? s.inspections.active : null;
  // із зауваженням — рядок з артборда: пул «пройшли» каже «зауважень немає»
  const poolRes = useTumbLine(store, o.remark ? null : `tumb.${o.passed ? 'pass' : 'fail'}.r${o.level}`, `insp:${o.id}:result`);
  const res = o.remark ? inspT.remarkRes : poolRes;
  const { date, time } = stampDate(o.arrMs);
  const verdict = verdictText(o);
  const p = s.cfg.params;
  // 007 FR-19: журнал за цю перевірку розкривається блоком в акті
  const exhibits = s.museum.reveal.filter((r) => r.via === 'insp');
  // insp-result міг чекати в черзі: залишок ×3 — від приїзду (крайовий випадок spec)
  // 014 FR-22: сюжетний рядок в акті «Аудиту усього» (носій `insp_act_line`); крок спрацьовує на проходженні й доставляється вже після акта
  const actLine = o.kind === 'final' && o.passed ? BEATS.filter((x) => x.carrier === 'insp_act_line').find((b) => b.level === o.level && (s.story.fired[b.id] != null || s.story.delivered[b.id] != null)) : undefined;
  const x3Left = Math.max(0, o.arrMs + p.inspHours * 3_600_000 - s.lastMs);
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
          {actLine ? (
            <View style={styles.row} testID="insp-act-line">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{(actLine.payload as { line: string }).line}</Text>
            </View>
          ) : null}
          {exhibits.map((r) => (
            <View key={r.no} style={styles.exhibit} testID="insp-exhibit">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{muT.inspBlock(r.nAfter)}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{muT.inspLine(r.no, titleOf(r.no))}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta} testID="insp-exhibit-note">{r.no === 8 ? `${muT.rarity.legendary}. ${muT.noteSeries}` : muT.rarity[journal(r.no)?.rarity ?? 'common']}</Text>
              {completesSeries(s.museum, r.no) && r.no !== 8 ? (
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta} testID="insp-exhibit-series">{muT.newSeriesDone(completesSeries(s.museum, r.no)!.title, seriesBonusText(completesSeries(s.museum, r.no)!, p))}</Text>
              ) : null}
            </View>
          ))}
          <View style={styles.foot}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.signer}>{inspT.signer[o.boss]}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{`${inspT.checked} ${date}`}</Text>
          </View>
        </View>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.status} testID="insp-status">
          {o.passed ? <Text style={styles.pass}>{`${inspT.passK} `}</Text> : <Text style={styles.fail}>{`${inspT.failK} `}</Text>}
          {!o.passed
            ? inspT.fail(formatMult(p.inspFailMult), p.inspFailHours)
            : o.trigger === 'unscheduled'
              ? inspT.passUnsched
              : inspT.passX3(formatMult(p.inspMult), formatDuration(x3Left / 1000))}
        </Text>
        {o.kind === 'final' && o.passed ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.status} testID="insp-order">{o.level + 1 > PLAYABLE_LEVELS ? inspT.boss2.passOrderHeld : inspT.boss2.passOrder}</Text> : null}
        {o.kind === 'final' && !o.passed && retry ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.status} testID="insp-retry">{inspT.boss2.retry(formatDuration(Math.max(0, retry.arrMs - s.lastMs) / 1000))}</Text> : null}
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
  exhibit: { borderWidth: 1, borderColor: color.paperRule, padding: space[8], gap: space[2], marginTop: space[4] },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[8], marginTop: space[6] },
  signer: { ...type('docMeta'), color: color.ink2, flex: 1 },
  stamp: { ...type('stampS'), color: color.stamp, borderWidth: 2, borderColor: color.stamp, paddingHorizontal: space[6], textTransform: 'uppercase' },
  status: { ...type('body'), color: color.text },
  pass: { color: color.accent, fontWeight: typeScale.cta.fontWeight },
  fail: { color: color.fail, fontWeight: typeScale.cta.fontWeight },
});
