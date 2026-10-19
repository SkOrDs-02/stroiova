// tg-result зведеної відповіді (011 FR-24): документ «Відповідь пачкою на Зведення № N», три вхідні номери, текст і результат, штамп.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { packDef } from '@/telegrams/content';
import { telegramOf } from '@/telegrams/effects';
import { packByNo, type SummaryKind } from '@/telegrams/packs';
import { repTier } from '@/telegrams/reputation';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { inspWarn, packResultRows } from './present';
import { t } from './texts';

interface Props {
  store: ConveyorStore;
  no: number;
  onClose: () => void;
}

export function PackResult({ store, no, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const s = useStore(store);
  const g = packByNo(s.telegrams, no);
  const def = g ? packDef(g.id) : undefined;
  const first = g?.items[0];
  if (!g || !def || !g.summary || !first?.result) return null;
  const sum = def.summary[g.summary as SummaryKind];
  const tierWord = t.tier[repTier(first.result.repAfter, s.cfg.params)];
  const nos = g.items.map((i) => telegramOf(i)?.no ?? '').join(', ');
  const hit = first.result.inspHit;
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="tg-result-pack">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.paper}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.pkResultMeta(no)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{t.pkResultTitle(no)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta} testID="pk-result-nos">{t.pkResultIn(nos)}</Text>
          {(sum?.reply ?? sum?.note) ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="pk-result-reply">{(sum.reply ?? sum.note)!}</Text> : null}
          {sum?.result ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="pk-result-text">{sum.result}</Text> : null}
          {packResultRows(first, g.summary, s.cfg, tierWord).map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rowK}>{k}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rowV}>{v}</Text>
            </View>
          ))}
          <View style={styles.foot}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.resSigner}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{t.resStamp}</Text>
          </View>
        </View>
        {hit ? (
          <View style={styles.alertBox} testID="tg-result-insp">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.alertText}>{t.inspHit(inspWarn(s.cfg))}</Text>
          </View>
        ) : (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{t.curioNote}</Text>
        )}
      </ScrollView>
      {hit ? (
        <View style={styles.actions}>
          <Button
            testID="tg-result-prepare"
            label={t.inspPrepare}
            onPress={() => {
              s.prepareInspection(first.uid);
              onClose();
            }}
          />
          <Button testID="tg-result-cta" variant="secondary" label={t.inspLater} onPress={onClose} />
        </View>
      ) : (
        <Button testID="tg-result-cta" label={t.resCta} onPress={onClose} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bg, paddingHorizontal: space[16], gap: space[12] },
  scroll: { gap: space[12] },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[4] },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('h3'), color: color.ink },
  body: { ...type('docBody'), color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: color.paperLine },
  rowK: { ...type('docMeta'), color: color.ink2 },
  rowV: { ...type('docMeta'), color: color.ink },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[8] },
  stamp: { ...type('stampM'), color: color.stamp, borderWidth: 2, borderColor: color.stamp, paddingHorizontal: space[6], textTransform: 'uppercase' },
  alertBox: { backgroundColor: color.alertBg, borderColor: color.alertLine, borderWidth: 1, borderRadius: radius[6], padding: space[12] },
  alertText: { ...type('body'), color: color.alertText },
  note: { ...type('caption'), color: color.muted },
  actions: { gap: space[8] },
});
