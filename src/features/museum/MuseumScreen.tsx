// museum (007 FR-2, FR-13…FR-17): вкладка «Музей» із сегментами «Журнали» і «Курйози», сітка 8 слотів, фільтри, шторки.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { count, seriesDone } from '@/museum/museum';
import { MUSEUM_SIZE } from '@/museum/journals';
import { color, radius, size, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { ArchiveSheets } from '@/features/story/ArchiveSheets';

import { CuriosList } from './CuriosScreen';
import { CurioDetail } from './CurioDetail';
import { JournalDetail } from './JournalDetail';
import { COVER_COLOR, RARITY_COLOR, slots, type Filter, type Slot } from './present';
import { muT } from './texts';

type Seg = 'journals' | 'curios';
type Sheet = { kind: 'journal'; no: number } | { kind: 'curio'; seq: number } | { kind: 'archive' } | null;

const FILTERS: Filter[] = ['all', 'property', 'personnel'];

export function MuseumScreen({ store, onToDigital, insetTop, initialSeg = 'journals' }: { store: ConveyorStore; onToDigital: () => void; insetTop: number; initialSeg?: Seg }) {
  const s = useStore(store);
  const [seg, setSeg] = useState<Seg>(initialSeg);
  // 010 FR-30: бейдж «нове» в меню гасне, коли гравець побачив список записів
  useEffect(() => {
    if (seg === 'curios') store.getState().markCuriosSeen();
  }, [seg, store, s.museum.curioSeq]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sheet, setSheet] = useState<Sheet>(null);
  const n = count(s.museum);
  const done = seriesDone(s.museum);
  const list = slots(s.museum, filter);
  return (
    <View style={styles.root} testID="museum">
      <View style={[styles.head, { paddingTop: insetTop }]}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{muT.screen}</Text>
        <View style={styles.segs} accessibilityRole="tablist">
          {(['journals', 'curios'] as Seg[]).map((k) => (
            <Pressable key={k} testID={`mu-seg-${k}`} accessibilityRole="tab" accessibilityState={{ selected: seg === k }} onPress={() => setSeg(k)} style={[styles.seg, seg === k && styles.segOn]}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.segText, seg === k && styles.segTextOn]}>{k === 'journals' ? muT.segJournals : muT.segCurios}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {seg === 'curios' ? (
        <CuriosList store={store} onOpen={(seq) => setSheet({ kind: 'curio', seq })} onArchive={() => setSheet({ kind: 'archive' })} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{muT.count}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.countText} testID="mu-count">{muT.countText(n)}</Text>
          <View style={styles.pips} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: MUSEUM_SIZE }, (_, i) => (
              <View key={i} testID={i < n ? 'mu-pip-on' : 'mu-pip-off'} style={[styles.pip, i < n && styles.pipOn]} />
            ))}
          </View>
          {done ? (
            <View style={styles.banner} testID="mu-done">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.bannerTitle}>{muT.doneTitle}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{`${muT.doneBody} ${muT.doneMult}`}</Text>
            </View>
          ) : null}
          {n === 0 ? (
            <View style={styles.empty} testID="mu-empty">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.bannerTitle}>{muT.emptyTitle}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{muT.emptyBody}</Text>
              <Button testID="mu-empty-cta" label={muT.emptyCta} onPress={onToDigital} />
            </View>
          ) : (
            <View style={styles.filters} accessibilityRole="tablist">
              {FILTERS.map((f) => (
                <Pressable key={f} testID={`mu-filter-${f}`} accessibilityRole="tab" accessibilityState={{ selected: filter === f }} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipOn]}>
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.chipText, filter === f && styles.segTextOn]}>{muT.filter[f]}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {list.length === 0 && filter !== 'all' ? (
            <View style={styles.empty} testID="mu-none">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.bannerTitle}>{muT.noneTitle[filter as 'property' | 'personnel']}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{muT.noneBody}</Text>
              <Button testID="mu-none-cta" label={muT.noneCta} variant="secondary" onPress={() => setFilter('all')} />
            </View>
          ) : (
            <View style={styles.grid}>
              {list.map((sl) => (
                <SlotCard key={sl.no} slot={sl} onPress={() => setSheet({ kind: 'journal', no: sl.no })} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
      {sheet?.kind === 'journal' ? <JournalDetail store={store} no={sheet.no} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === 'archive' ? <ArchiveSheets store={store} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === 'curio' ? <CurioDetail store={store} seq={sheet.seq} onClose={() => setSheet(null)} /> : null}
    </View>
  );
}

function SlotCard({ slot, onPress }: { slot: Slot; onPress: () => void }) {
  const j = slot.journal;
  const found = slot.owned != null;
  const label = found ? `${j.title}. ${muT.rarity[j.rarity]}. ${j.bonus.text}` : `${muT.slotUnknown}. ${muT.slotNotFound}. ${j.sourceText}`;
  return (
    <Pressable testID={`slot-${slot.no}`} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.slot}>
      <View style={[styles.cover, { backgroundColor: found ? COVER_COLOR[j.cover] : color.surface2 }, found && j.rarity === 'legendary' && styles.legend]}>
        {found ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coverHead}>{j.head}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={3} style={styles.coverName}>{j.name}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{muT.slotFound}</Text>
          </>
        ) : (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.unknown}>{muT.slotUnknown}</Text>
        )}
      </View>
      {found ? (
        <>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.rarity, { color: RARITY_COLOR[j.rarity] }]}>{muT.rarity[j.rarity]}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.bonus}>{j.bonus.text}</Text>
        </>
      ) : (
        <>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rarity}>{muT.slotNotFound}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.bonus}>{j.sourceText}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  head: { paddingHorizontal: space[16], paddingBottom: space[8], gap: space[8], backgroundColor: color.bgDeep },
  title: { ...type('h2'), color: color.text },
  segs: { flexDirection: 'row', gap: space[8] },
  seg: { flex: 1, minHeight: size.touchMin, borderRadius: radius[6], borderWidth: 1, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: color.surface, borderColor: color.accent },
  segText: { ...type('body'), color: color.muted },
  segTextOn: { color: color.accent },
  scroll: { padding: space[16], gap: space[8], paddingBottom: space[24] },
  muted: { ...type('caption'), color: color.muted },
  countText: { ...type('displayM'), color: color.text },
  pips: { flexDirection: 'row', gap: space[4] },
  pip: { flex: 1, height: space[8], borderRadius: radius[4], backgroundColor: color.border },
  pipOn: { backgroundColor: color.accent },
  banner: { backgroundColor: color.surface, borderRadius: radius[6], borderWidth: 1, borderColor: color.accent, padding: space[12], gap: space[4] },
  bannerTitle: { ...type('h4'), color: color.text },
  body: { ...type('body'), color: color.text },
  empty: { backgroundColor: color.surface, borderRadius: radius[6], padding: space[16], gap: space[8] },
  filters: { flexDirection: 'row', gap: space[8], flexWrap: 'wrap' },
  chip: { minHeight: size.touchMin, paddingHorizontal: space[12], borderRadius: radius.pill, borderWidth: 1, borderColor: color.borderStrong, justifyContent: 'center' },
  chipOn: { backgroundColor: color.surface, borderColor: color.accent },
  chipText: { ...type('bodyS'), color: color.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[12] },
  slot: { width: '47%', gap: space[4] },
  cover: { minHeight: size.coverHeight, borderRadius: radius[6], padding: space[8], justifyContent: 'space-between' },
  legend: { borderWidth: 2, borderColor: color.accent },
  coverHead: { ...type('h4'), color: color.text },
  coverName: { ...type('bodyS'), color: color.text },
  stamp: { ...type('stampS'), color: color.stampOnDark, textTransform: 'uppercase', alignSelf: 'flex-end' },
  unknown: { ...type('displayM'), color: color.muted, alignSelf: 'center' },
  rarity: { ...type('label'), color: color.muted },
  bonus: { ...type('bodyS'), color: color.text },
});
