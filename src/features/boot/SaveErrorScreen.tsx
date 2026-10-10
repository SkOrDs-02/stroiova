// save-error (009 FR-5…FR-8): акт про пошкодження на папері, копія чи її відсутність, три дії.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatBig } from '@/economy/format';
import type { SaveFile } from '@/save/schema';
import { color, radius, size, space, typeScale } from '@/theme';

import { t } from './texts';

const fmtWhen = (ms: number) => {
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}, ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
const fmtTime = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

interface Props {
  backup: SaveFile | null;
  nowMs: number;
  onRestore: () => void;
  onNew: () => void;
  onReport: () => void;
}

export function SaveErrorScreen({ backup, nowMs, onRestore, onNew, onReport }: Props) {
  const insets = useSafeAreaInsets();
  const [reported, setReported] = useState(false);
  const e = backup?.game.economy;
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="save-error">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} accessibilityRole="header">{t.saveTitle}</Text>
        <Text style={styles.sub}>{t.saveSub}</Text>
        <View style={styles.paper}>
          <Text style={styles.paperH}>{t.saveActH(fmtWhen(nowMs))}</Text>
          <Text style={styles.paperBody}>{backup ? t.saveActBackup : t.saveActNone}</Text>
        </View>
        {backup && e ? (
          <View style={styles.card} testID="save-backup">
            <Text style={styles.cardH}>{t.saveBackupH(fmtWhen(backup.savedAt))}</Text>
            <View style={styles.row}>
              <Text style={styles.cardBody}>{t.bkSigs}</Text>
              <Text style={styles.cardValue}>{formatBig(e.signatures, 'balance')}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cardBody}>{t.bkPoints}</Text>
              <Text style={styles.cardValue}>{e.prestigePoints}</Text>
            </View>
            <Text style={styles.cardBody}>{t.saveLoss(fmtTime(backup.savedAt))}</Text>
          </View>
        ) : (
          <Text style={styles.sub}>{t.saveNone}</Text>
        )}
        <Text style={styles.note}>{reported ? t.saveReported : t.saveReportNote}</Text>
      </ScrollView>
      <View style={styles.actions}>
        {backup ? (
          <Pressable testID="save-restore" accessibilityRole="button" onPress={onRestore} style={styles.primary}>
            <Text style={styles.primaryText}>{t.saveRestore}</Text>
          </Pressable>
        ) : null}
        <Pressable testID="save-new" accessibilityRole="button" onPress={onNew} style={backup ? styles.secondary : styles.primary}>
          <Text style={backup ? styles.secondaryText : styles.primaryText}>{t.saveNew}</Text>
        </Pressable>
        <Pressable
          testID="save-report"
          accessibilityRole="button"
          accessibilityState={{ disabled: reported }}
          disabled={reported}
          onPress={() => { onReport(); setReported(true); }}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>{t.saveReport}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[16] },
  scroll: { gap: space[12], paddingBottom: space[16] },
  title: { color: color.text, fontSize: typeScale.h1.fontSize, lineHeight: typeScale.h1.lineHeight, fontWeight: typeScale.h1.fontWeight },
  sub: { color: color.muted, fontSize: typeScale.body.fontSize, lineHeight: typeScale.body.lineHeight },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[8] },
  paperH: { color: color.ink2, fontSize: typeScale.docMeta.fontSize, lineHeight: typeScale.docMeta.lineHeight },
  paperBody: { color: color.ink, fontSize: typeScale.docBody.fontSize, lineHeight: typeScale.docBody.lineHeight },
  card: { backgroundColor: color.surface, borderRadius: radius[8], padding: space[12], gap: space[4] },
  cardH: { color: color.text, fontSize: typeScale.h4.fontSize, fontWeight: typeScale.h4.fontWeight },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cardValue: { color: color.text, fontSize: typeScale.num.fontSize, fontWeight: typeScale.num.fontWeight },
  cardBody: { color: color.muted, fontSize: typeScale.bodyS.fontSize, lineHeight: typeScale.bodyS.lineHeight },
  note: { color: color.muted, fontSize: typeScale.caption.fontSize },
  actions: { gap: space[8] },
  primary: { minHeight: size.ctaHeight, borderRadius: radius[6], backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: color.accentInk, fontSize: typeScale.cta.fontSize, fontWeight: typeScale.cta.fontWeight },
  secondary: { minHeight: size.ctaHeightM, borderRadius: radius[6], borderWidth: 1, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: color.text, fontSize: typeScale.cta.fontSize },
});
