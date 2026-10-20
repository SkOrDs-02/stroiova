// archive-sheets (014 FR-18): 12 слотів («???» і джерело для незнайдених) і аркуш як таблиця Excel: літери стовпців, номери рядків,
// межі, моноширинний шрифт, вкладки внизу. Сітка без горизонтальної прокрутки: стовпці ділять ширину, текст переноситься.
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { SHEETS } from '@/story/archive';
import type { Sheet } from '@/story/types';
import { color, radius, size, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { storyT } from './texts';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function sourceText(sh: Sheet): string {
  const s = sh.source;
  return s.kind === 'gift' ? storyT.arch.gift(s.level, s.nth) : s.kind === 'move' ? storyT.arch.move(s.level) : s.kind === 'boss' ? storyT.arch.boss(s.level) : storyT.arch.conversion(s.k);
}

export function ArchiveSheets({ store, onClose }: { store: ConveyorStore; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const owned = useStore(store, (s) => s.story.sheets);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const sheet = open ? SHEETS.find((x) => x.id === open) : undefined;
  const k = SHEETS.filter((x) => owned[x.id] != null).length;
  if (sheet) {
    const t = sheet.tabs[Math.min(tab, sheet.tabs.length - 1)]!;
    return (
      <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="archive-sheet">
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{`${storyT.arch.sheetNo(sheet.no)} · ${sheet.title}`}</Text>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.grid} testID="archive-grid">
            <View style={styles.gridRow}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, styles.corner]} />
              {t.columns.map((_, i) => (
                <Text key={LETTERS[i]} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, styles.head, styles.flex]}>{LETTERS[i]}</Text>
              ))}
            </View>
            <View style={styles.gridRow}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, styles.corner]}>1</Text>
              {t.columns.map((c) => (
                <Text key={c} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, styles.colName, styles.flex]}>{c}</Text>
              ))}
            </View>
            {t.rows.map((r, ri) => (
              <View key={`${ri}-${r[0]}`} style={styles.gridRow}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, styles.corner]}>{ri + 2}</Text>
                {r.map((c, ci) => (
                  <Text key={`${ci}-${c}`} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.cell, styles.flex]}>{c}</Text>
                ))}
              </View>
            ))}
          </View>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.foot} testID="archive-footnote">{sheet.footnote}</Text>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} testID="archive-tabs">
          {sheet.tabs.map((x, i) => (
            <Pressable key={x.name} testID={`archive-tab-${i}`} accessibilityRole="tab" accessibilityState={{ selected: i === tab }} onPress={() => setTab(i)} style={[styles.tab, i === tab && styles.tabOn]}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tabText}>{x.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Button testID="archive-sheet-back" variant="secondary" label={storyT.arch.back} onPress={() => { setOpen(null); setTab(0); }} />
      </View>
    );
  }
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="archive-sheets">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{storyT.arch.title}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="archive-count">{storyT.arch.count(k)}</Text>
      <ScrollView contentContainerStyle={styles.body}>
        {SHEETS.map((sh) =>
          owned[sh.id] != null ? (
            <Pressable key={sh.id} testID={`archive-slot-${sh.no}`} accessibilityRole="button" onPress={() => setOpen(sh.id)} style={styles.slot}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.slotNo}>{sh.no}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.slotTitle}>{sh.title}</Text>
            </Pressable>
          ) : (
            <View key={sh.id} testID={`archive-slot-${sh.no}`} style={[styles.slot, styles.slotOff]}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.slotNo}>{sh.no}</Text>
              <View style={styles.flex}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.slotTitle}>{storyT.arch.slotUnknown}</Text>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{storyT.arch.unknown(sourceText(sh))}</Text>
              </View>
            </View>
          ),
        )}
      </ScrollView>
      <Button testID="archive-back" variant="secondary" label={storyT.arch.back} onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bg, padding: space[16], gap: space[8] },
  h2: { ...type('h2'), color: color.text },
  muted: { ...type('bodyS'), color: color.muted },
  body: { gap: space[8], paddingBottom: space[16] },
  flex: { flex: 1, minWidth: 0 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: space[12], backgroundColor: color.surface, borderRadius: radius[8], padding: space[12], minHeight: size.touchMin },
  slotOff: { borderWidth: 1, borderColor: color.border, borderStyle: 'dashed' },
  slotNo: { ...type('h4'), color: color.accent, width: space[24] },
  slotTitle: { ...type('body'), color: color.text },
  grid: { borderWidth: 1, borderColor: color.border, backgroundColor: color.paper },
  gridRow: { flexDirection: 'row' },
  cell: { ...type('docMeta'), color: color.ink, borderWidth: StyleSheet.hairlineWidth, borderColor: color.paperLine, paddingHorizontal: space[4], paddingVertical: space[2] },
  corner: { width: space[24], textAlign: 'center', backgroundColor: color.surface, color: color.muted },
  head: { textAlign: 'center', backgroundColor: color.surface, color: color.muted },
  colName: { fontWeight: typeScale.cta.fontWeight },
  foot: { ...type('docMeta'), color: color.muted },
  tabs: { gap: space[4] },
  tab: { minHeight: size.touchMin, justifyContent: 'center', paddingHorizontal: space[12], borderWidth: 1, borderColor: color.border, borderRadius: radius[4] },
  tabOn: { borderColor: color.accent, borderWidth: 2 },
  tabText: { ...type('bodyS'), color: color.text },
});
