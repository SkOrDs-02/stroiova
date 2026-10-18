// digit-result (006 FR-20): акт «про переведення обліку в електронну форму», штамп «Оцифровано», бали, множник, репліка.
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatBig, formatMult } from '@/economy/format';
import type { ConveyorStore } from '@/features/conveyor/store';
import { useTumbLine } from '@/features/inspections/useTumbLine';
import { speakerOf } from '@/features/telegrams/lines';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { count } from '@/museum/museum';
import { muT } from '@/features/museum/texts';

import { journalTitle, shownJournals } from './present';
import { digitT } from './texts';

export function DigitResult({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  const c = s.digit.ceremony!;
  const journals = shownJournals(c.journals);
  const line = useTumbLine(store, 'digit.line', `digit:${c.no}`);
  const note = c.levelUp ? digitT.noteL2 : c.level >= 2 ? digitT.noteR2 : digitT.noteR1;
  return (
    <View style={styles.scrim} testID="digit-result">
      <View style={styles.wrap} accessibilityViewIsModal>
        <View style={styles.paper}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{digitT.docNo(c.no)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{digitT.docTitle}</Text>
          <Row k={digitT.rowLifetime} v={formatBig(c.lifetime, 'balance')} />
          <Row k={digitT.rowJournals} v={String(journals.length)} />
          <Row k={digitT.rowPoints} v={`+${c.points}`} testID="result-points" />
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.total} testID="result-total">{digitT.total(c.pointsTotal, formatMult(c.multAfter))}</Text>
          {journals.length ? (
            <>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{digitT.fly}</Text>
              {journals.map((n) => (
                <Text key={n} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{`№ ${n} · ${journalTitle(n)}`}</Text>
              ))}
            </>
          ) : (
            <>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.none}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc} testID="result-museum">{muT.counter(count(s.museum))}</Text>
            </>
          )}
          <View style={styles.foot}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta} numberOfLines={2}>{note}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{digitT.stamp}</Text>
          </View>
        </View>
        {line ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="result-speaker">{speakerOf('digit.line', line) ?? ''}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.quote}>{line}</Text>
          </>
        ) : null}
        <Button testID="digit-result-ok" label={c.levelUp || journals.length ? digitT.next : digitT.toMain} onPress={s.closeDigitStep} />
      </View>
    </View>
  );
}

function Row({ k, v, testID }: { k: string; v: string; testID?: string }) {
  return (
    <View style={styles.row}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{k}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell} testID={testID}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  wrap: { gap: space[12] },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[6] },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('docTitle'), color: color.ink },
  doc: { ...type('docBody'), color: color.ink },
  total: { ...type('docBody'), color: color.ink, marginTop: space[6] },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8], borderBottomWidth: 1, borderBottomColor: color.paperLine, paddingVertical: space[2] },
  cell: { ...type('docBody'), color: color.ink, flexShrink: 1 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[8], marginTop: space[6] },
  stamp: { ...type('stampS'), color: color.stamp, borderWidth: 2, borderColor: color.stamp, paddingHorizontal: space[6], textTransform: 'uppercase' },
  muted: { ...type('caption'), color: color.muted },
  quote: { ...type('body'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
});
