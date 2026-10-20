// awards (016 FR-25…FR-29): сегмент «Грамоти» в музеї - шапка, фільтри, секції категорій, плитки-документи; шторка award-detail (FR-28).
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { count, progressOf } from '@/awards/awards';
import { AWARDS, AWARDS_TOTAL, CATEGORIES, CATEGORY_ORDER, TYPES, award } from '@/awards/content';
import type { AwardCategory, AwardDef, AwardsState } from '@/awards/types';
import type { ConveyorStore } from '@/features/conveyor/store';
import { ddmmyyyy } from '@/features/museum/present';
import { color, radius, size, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { awT } from './texts';

export type AwardFilter = 'all' | 'owned' | 'ahead';
const FILTERS: AwardFilter[] = ['all', 'owned', 'ahead'];

export interface Section {
  category: AwardCategory;
  title: string;
  owned: number;
  total: number;
  items: AwardDef[];
}

/** Секції стіни: отримані за датою (нові зверху), далі неотримані за `estDayAds`, приховані в кінці (FR-27) */
export function sections(aw: AwardsState, filter: AwardFilter): Section[] {
  return CATEGORY_ORDER.map((category) => {
    const all = AWARDS.filter((a) => a.category === category);
    const got = all.filter((a) => aw.got[a.id]).sort((a, b) => (aw.got[b.id]!.seq ?? 0) - (aw.got[a.id]!.seq ?? 0) || aw.got[b.id]!.atMs - aw.got[a.id]!.atMs || a.no - b.no);
    const open = all.filter((a) => !aw.got[a.id] && !a.hidden).sort((a, b) => a.estDayAds - b.estDayAds || a.no - b.no);
    const hidden = all.filter((a) => !aw.got[a.id] && a.hidden).sort((a, b) => a.no - b.no);
    const items = filter === 'owned' ? got : filter === 'ahead' ? [...open, ...hidden] : [...got, ...open, ...hidden];
    return { category, title: CATEGORIES[category], owned: got.length, total: all.length, items };
  }).filter((s) => s.items.length > 0);
}

export function AwardsScreen({ store, initialAward = null }: { store: ConveyorStore; initialAward?: string | null }) {
  const aw = useStore(store, (s) => s.awards);
  const [filter, setFilter] = useState<AwardFilter>('all');
  const [sheet, setSheet] = useState<string | null>(initialAward);
  const n = count(aw);
  const secs = sections(aw, filter);
  return (
    <View style={styles.root} testID="awards">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.head} testID="aw-head" accessibilityRole="header">{awT.head(n, AWARDS_TOTAL)}</Text>
        <ProgressBar value={n} max={AWARDS_TOTAL} testID="aw-bar" />
        <View style={styles.filters} accessibilityRole="tablist">
          {FILTERS.map((f) => (
            <Pressable key={f} testID={`aw-filter-${f}`} accessibilityRole="tab" accessibilityState={{ selected: filter === f }} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipOn]}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.chipText, filter === f && styles.chipTextOn]}>{awT.filter[f]}</Text>
            </Pressable>
          ))}
        </View>
        {secs.length === 0 ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="aw-none">{filter === 'ahead' ? awT.allDone : awT.empty}</Text>
        ) : (
          secs.map((sec) => (
            <View key={sec.category} style={styles.section} testID={`aw-sec-${sec.category}`}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.secTitle} accessibilityRole="header">{awT.sectionTitle(sec.title, sec.owned, sec.total)}</Text>
              <View style={styles.grid}>
                {sec.items.map((a) => (
                  <Tile key={a.id} a={a} aw={aw} onPress={() => setSheet(a.id)} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
      {sheet ? <AwardDetail store={store} id={sheet} onClose={() => setSheet(null)} /> : null}
    </View>
  );
}

function Tile({ a, aw, onPress }: { a: AwardDef; aw: AwardsState; onPress: () => void }) {
  const got = aw.got[a.id];
  const hiddenLock = !got && a.hidden;
  const pr = !got && !hiddenLock ? progressOf(aw, a) : null;
  return (
    <Pressable testID={`aw-tile-${a.id}`} accessibilityRole="button" onPress={onPress} style={[styles.tile, got && styles.tileOwned]}>
      {got ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.kind}>{TYPES[a.type].label}</Text> : null}
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{hiddenLock ? awT.hiddenTitle : a.title}</Text>
      {got ? (
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{awT.ownedOn(ddmmyyyy(got.atMs))}</Text>
      ) : (
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{hiddenLock ? awT.hiddenHint : a.hint}</Text>
      )}
      {pr ? (
        <View style={styles.prog}>
          <ProgressBar value={pr.k} max={pr.n} testID={`aw-bar-${a.id}`} />
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID={`aw-prog-${a.id}`}>{awT.progress(pr.k, pr.n)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ProgressBar({ value, max, testID }: { value: number; max: number; testID?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View style={styles.bar} testID={testID} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }}>
      <View style={[styles.barFill, { width: `${pct}%` }]} />
    </View>
  );
}

/** award-detail (FR-28): отримана - документ; неотримана відкрита - підказка й прогрес; прихована - заглушка без умови */
export function AwardDetail({ store, id, onClose }: { store: ConveyorStore; id: string; onClose: () => void }) {
  const aw = useStore(store, (s) => s.awards);
  const o = useStore(store, (s) => s.onboarding);
  const a = award(id);
  if (!a) return null;
  const got = aw.got[id];
  const hiddenLock = !got && a.hidden;
  const pr = !got && !hiddenLock ? progressOf(aw, a) : null;
  const t = TYPES[a.type];
  return (
    <View style={styles.scrim} testID="award-detail">
      <View style={styles.sheet} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.sheetScroll}>
          {got ? (
            <View style={styles.doc} testID="aw-doc">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docTitle} testID="aw-doc-title">{t.docTitle.replace('{orderNo}', String(got.orderNo ?? ''))}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{a.title}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="aw-doc-text">{a.text}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="aw-doc-awardee">{awT.awardee(o.gender, o.callsign?.text ?? '')}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="aw-doc-date">{awT.ownedOn(ddmmyyyy(got.atMs))}</Text>
            </View>
          ) : (
            <View style={styles.doc} testID="aw-locked">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{hiddenLock ? awT.hiddenTitle : a.title}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{hiddenLock ? awT.hiddenHint : a.hint}</Text>
              {pr ? (
                <>
                  <ProgressBar value={pr.k} max={pr.n} />
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="aw-detail-prog">{awT.progress(pr.k, pr.n)}</Text>
                </>
              ) : null}
            </View>
          )}
        </ScrollView>
        <Button testID="award-detail-ok" label={awT.ok} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: space[16], gap: space[12] },
  head: { ...type('h2'), color: color.text },
  filters: { flexDirection: 'row', gap: space[8], flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: color.border, borderRadius: radius.pill, paddingVertical: space[6], paddingHorizontal: space[12], minHeight: size.touchMin, justifyContent: 'center' },
  chipOn: { backgroundColor: color.surface, borderColor: color.accent },
  chipText: { ...type('label'), color: color.text },
  chipTextOn: { color: color.accent },
  section: { gap: space[8] },
  secTitle: { ...type('h4'), color: color.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  tile: { width: '48%', flexGrow: 1, minHeight: 96, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radius[8], padding: space[12], gap: space[4] },
  tileOwned: { backgroundColor: color.surface2 },
  kind: { ...type('caption'), color: color.muted, textTransform: 'uppercase' },
  title: { ...type('label'), color: color.text },
  muted: { ...type('caption'), color: color.muted },
  prog: { gap: space[4] },
  bar: { height: space[8], borderRadius: radius.pill, backgroundColor: color.surface2, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: color.accent },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: color.bg, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[12] },
  sheetScroll: { gap: space[8] },
  doc: { gap: space[8], borderWidth: 1, borderColor: color.border, borderRadius: radius[6], padding: space[16], backgroundColor: color.surface },
  docTitle: { ...type('label'), color: color.muted, textTransform: 'uppercase' },
  h2: { ...type('h2'), color: color.text },
  body: { ...type('body'), color: color.text },
});
