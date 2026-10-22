// journal-detail (007 FR-17): шторка експоната - знайдений чи ні. «Поділитися» (FR-26) - share-card.
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { bonusText, journal, seriesOf } from '@/museum/journals';
import { color, radius, size, space } from '@/theme';
import { ShareAction } from '@/features/share/ShareCard';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { bonusLevel, COVER_COLOR, ddmmyyyy, flavorOf, hintOf, RARITY_COLOR } from './present';
import { muT } from './texts';

export function JournalDetail({ store, no, onClose }: { store: ConveyorStore; no: number; onClose: () => void }) {
  const s = useStore(store);
  const j = journal(no);
  const owned = s.museum.owned.find((o) => o.no === no) ?? null;
  // 016 FR-19: лічильник «journal_details_read» - шторка знайденого журналу, кожен журнал раз
  const found = owned != null;
  const jid = j?.id;
  useEffect(() => {
    if (found && jid) store.getState().awardsUi('journal-detail', { is_found: true, journal_id: jid });
  }, [found, jid, store]);
  if (!j) return null;
  const se = seriesOf(no);
  const seriesHave = se ? se.journals.filter((n) => s.museum.owned.some((o) => o.no === n)).length : 0;
  const bLevel = bonusLevel(j, s.cfg.params);
  // № 21 діє лише на цифрових ланках: доки жодної немає, бонус «чекає» (016 FR-11); решта - від рівня, де з'являється ціль
  const forDigital = (j.bonus.target as unknown[])[0] === 'digital_stages';
  const later = owned && (forDigital ? s.state.digital.length === 0 : bLevel > s.state.level) ? s.cfg.params.levels[bLevel - 1]?.name : null;
  const sub = owned ? `${muT.category[j.category]}${j.rarity === 'legendary' ? ` · ${muT.detailSeries}` : ''}` : muT.slotNotFound;
  return (
    <View style={styles.scrim} testID="journal-detail">
      <View style={styles.sheet} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{muT.detailTitle(no)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{sub}</Text>
          {se ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="jd-series">{muT.detailSeriesOf(se.title, seriesHave, se.journals.length)}</Text> : null}
          {owned ? (
            <>
              <View style={[styles.cover, { backgroundColor: COVER_COLOR[j.cover] }, j.rarity === 'legendary' && styles.legend]}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coverHead}>{j.head}</Text>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coverName}>{j.name}</Text>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{muT.slotFound}</Text>
              </View>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4} testID="jd-title">{j.title}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.rarity, { color: RARITY_COLOR[j.rarity] }]}>{muT.rarity[j.rarity]}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{muT.bonusLabel}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="jd-bonus">{bonusText(j, s.cfg.params)}</Text>
              {later ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="jd-later">{muT.bonusLater(later)}</Text> : null}
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.quote}>{flavorOf(j, s.onboarding)}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{muT.history}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{j.history}</Text>
              {j.sourceLabel ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{muT.source(j.sourceLabel)}</Text> : null}
              <Row k={muT.whence} v={j.sourceText} />
              <Row k={muT.since} v={ddmmyyyy(owned.atMs)} testID="jd-since" />
            </>
          ) : (
            <>
              <View style={[styles.cover, styles.coverLocked]}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.unknown}>{muT.slotUnknown}</Text>
              </View>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{muT.slotUnknown}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{muT.lockedHint}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{muT.howTo}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="jd-source">{j.sourceText}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="jd-hint">{hintOf(j, s.digit.total)}</Text>
            </>
          )}
        </ScrollView>
        {owned ? <ShareAction store={store} entry={{ kind: 'journal', no }} /> : null}
        <Button testID="journal-detail-ok" label={muT.ok} onPress={onClose} />
      </View>
    </View>
  );
}

function Row({ k, v, testID }: { k: string; v: string; testID?: string }) {
  return (
    <View style={styles.row}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{k}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID={testID}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: color.bg, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[12] },
  scroll: { gap: space[8] },
  h2: { ...type('h2'), color: color.text },
  h4: { ...type('h4'), color: color.text },
  muted: { ...type('caption'), color: color.muted },
  body: { ...type('body'), color: color.text },
  rarity: { ...type('label') },
  quote: { ...type('body'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
  cover: { minHeight: size.coverHeight, borderRadius: radius[6], padding: space[12], justifyContent: 'space-between' },
  coverLocked: { backgroundColor: color.surface2, justifyContent: 'center', alignItems: 'center' },
  legend: { borderWidth: 2, borderColor: color.accent },
  coverHead: { ...type('h2'), color: color.text },
  coverName: { ...type('body'), color: color.text },
  stamp: { ...type('stampM'), color: color.stampOnDark, textTransform: 'uppercase', alignSelf: 'flex-end' },
  unknown: { ...type('displayM'), color: color.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8], borderBottomWidth: 1, borderBottomColor: color.border, paddingVertical: space[4] },
});
