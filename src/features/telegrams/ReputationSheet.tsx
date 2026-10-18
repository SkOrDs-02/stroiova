// reputation-sheet (003 FR-22, AC-16; рішення 61): три рівні, поточний «зараз», 3 останні зміни, «До телеграм».
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { telegram } from '@/telegrams/content';
import { repTier } from '@/telegrams/reputation';
import { color, radius, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { t } from './texts';

export function ReputationSheet({ store, onClose }: { store: ConveyorStore; onClose: () => void }) {
  const s = useStore(store);
  const r = s.telegrams.reputation;
  const tier = repTier(r.value, s.cfg.params);
  return (
    <View style={styles.scrim} testID="reputation-sheet">
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{t.repTile(t.tier[tier])}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sub}>{t.repTitle}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${r.value}%` }]} />
        </View>
        <View style={styles.headRow}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, styles.cellName]} />
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cellH}>{t.repReply}</Text>
        </View>
        {t.repLevels.map((lv) => {
          const now = lv.key === tier;
          return (
            <View key={lv.key} style={[styles.lvRow, now && styles.lvNow]} testID={`rep-level-${lv.key}`}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, styles.cellName, now && styles.bold]}>{now ? `${lv.name} · ${t.repNow}` : lv.name}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{lv.otp}</Text>
            </View>
          );
        })}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{t.repSub}</Text>
        {r.history.length ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{t.repLog}</Text> : null}
        {r.history.map((h) => {
          const item = s.telegrams.inbox.find((x) => x.uid === h.uid);
          const tel = item && telegram(item.id);
          const choice = tel?.choices.find((c) => c.id === item?.choiceId);
          return (
            <View key={`${h.uid}-${h.atMs}`} style={styles.logRow} testID="rep-log">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.logText} numberOfLines={1}>{t.repLogItem(tel?.title ?? '', t.logKind[choice?.kind ?? ''] ?? choice?.title ?? '')}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.logD, h.delta > 0 && styles.logPlus]}>{h.delta > 0 ? `+${h.delta}` : `−${Math.abs(h.delta)}`}</Text>
            </View>
          );
        })}
        <Button testID="rep-close" label={t.repCta} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bgDeep, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.text },
  sub: { ...type('bodyS'), color: color.muted },
  track: { height: space[8], borderRadius: radius.pill, backgroundColor: color.surface2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.accent },
  headRow: { flexDirection: 'row', gap: space[8] },
  cellH: { ...type('label'), color: color.muted, flex: 2 },
  lvRow: { flexDirection: 'row', gap: space[8], paddingVertical: space[6], borderRadius: radius[6] },
  lvNow: { backgroundColor: color.surface },
  cell: { ...type('caption'), color: color.text, flex: 2 },
  cellName: { flex: 2 },
  bold: { fontWeight: typeScale.cta.fontWeight, color: color.accent },
  note: { ...type('caption'), color: color.muted },
  h4: { ...type('h4'), color: color.muted, marginTop: space[4] },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8] },
  logText: { ...type('bodyS'), color: color.text, flex: 1 },
  logD: { ...type('num'), color: color.text },
  logPlus: { color: color.accent },
});
