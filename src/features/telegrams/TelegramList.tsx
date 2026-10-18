// tg-list (003 FR-8, FR-9): «Вхідні» (Нові, На виконанні, Записки), «Шухляда · N», «Архів · N»; плитка репутації.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { formatDuration } from '@/economy/format';
import type { ConveyorStore } from '@/features/conveyor/store';
import { telegramOf } from '@/telegrams/effects';
import { repTier } from '@/telegrams/reputation';
import type { InboxItem } from '@/telegrams/types';
import { color, radius, size, space, typeScale } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { emptyLine } from './lines';
import { noteView } from './NoteDetail';
import { fill } from './present';
import { t } from './texts';

type Seg = 'in' | 'drawer' | 'archive';

interface Props {
  store: ConveyorStore;
  onOpen: (item: InboxItem) => void;
  onReputation: () => void;
}

export function TelegramList({ store, onOpen, onReputation }: Props) {
  const insets = useSafeAreaInsets();
  const s = useStore(store);
  const [seg, setSeg] = useState<Seg>('in');
  const inbox = s.telegrams.inbox;
  const fresh = inbox.filter((x) => x.status === 'new' && x.kind !== 'note').sort((a, b) => b.receivedAt - a.receivedAt);
  const work = inbox.filter((x) => x.status === 'work');
  const notes = inbox.filter((x) => x.kind === 'note');
  const drawer = inbox.filter((x) => x.status === 'drawer');
  const archive = inbox.filter((x) => x.status === 'archive' && x.kind !== 'note').sort((a, b) => (b.answeredAt ?? 0) - (a.answeredAt ?? 0));
  const tier = t.tier[repTier(s.telegrams.reputation.value, s.cfg.params)];
  const g = s.onboarding.gender;
  const now = s.lastMs;

  const row = (x: InboxItem, sub: string, badge?: string) => {
    const tel = telegramOf(x);
    const title = x.kind === 'note' ? noteView(x.id).title : tel ? fill(tel.title, x, g) : x.id;
    return (
      <Pressable key={x.uid} testID={`tg-row-${x.uid}`} accessibilityRole="button" onPress={() => onOpen(x)} style={styles.row}>
        <View style={styles.rowMain}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} style={styles.rowTitle}>{title}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} style={styles.rowSub}>{sub}</Text>
        </View>
        {badge ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.badge}>{badge}</Text> : null}
      </Pressable>
    );
  };
  const fromLine = (x: InboxItem) => {
    const tel = telegramOf(x);
    return tel?.from ? t.from(t.who[tel.from] ?? tel.from) : '';
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space[8] }]} testID="tg-list">
      <View style={styles.head}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h1} accessibilityRole="header">{t.inbox}</Text>
        <Pressable accessibilityRole="button" onPress={onReputation} style={styles.repTile} testID="rep-tile">
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.repText}>{t.repTile(tier)}</Text>
        </Pressable>
      </View>
      <View style={styles.segs} accessibilityRole="tablist">
        {(
          [
            ['in', t.segIn(fresh.length)],
            ['drawer', t.segDrawer(drawer.length)],
            ['archive', t.segArchive(archive.length)],
          ] as [Seg, string][]
        ).map(([k, label]) => (
          <Pressable key={k} testID={`tg-seg-${k}`} accessibilityRole="tab" accessibilityState={{ selected: seg === k }} onPress={() => setSeg(k)} style={[styles.seg, seg === k && styles.segOn]}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} style={[styles.segText, seg === k && styles.segTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space[24] }]}>
        {seg === 'in' ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{t.secNew}</Text>
            {fresh.length ? fresh.map((x) => row(x, fromLine(x), t.badgeNew)) : <Text style={styles.empty} testID="tg-empty-new">{emptyLine(s.telegrams, 'tg.empty_new')}</Text>}
            {work.length ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{t.secWork(work.length)}</Text> : null}
            {work.map((x) => row(x, fromLine(x), t.left(formatDuration(Math.max(0, ((x.workUntil ?? now) - now) / 1000)))))}
            {notes.length ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{t.secNotes(notes.length)}</Text> : null}
            {notes.map((x) => row(x, '', x.read ? undefined : t.badgeNew))}
          </>
        ) : seg === 'drawer' ? (
          drawer.length ? drawer.map((x) => row(x, fromLine(x), t.inDrawer)) : <Text style={styles.empty}>{emptyLine(s.telegrams, 'tg.empty_drawer')}</Text>
        ) : (
          <>
            {archive.map((x) => row(x, x.kind === 'notice' ? t.info : fromLine(x), t.done))}
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{t.curioNote}</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[16] },
  h1: { ...type('h1'), color: color.text },
  repTile: { minHeight: size.touchMin, justifyContent: 'center', paddingHorizontal: space[10], borderRadius: radius[6], backgroundColor: color.surface },
  repText: { ...type('caption'), color: color.text },
  segs: { flexDirection: 'row', gap: space[8], padding: space[16] },
  seg: { flex: 1, minHeight: size.touchMin, borderRadius: radius[6], borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[4] },
  segOn: { backgroundColor: color.accent, borderColor: color.accent },
  segText: { ...type('bodyS'), color: color.text },
  segTextOn: { color: color.accentInk, fontWeight: typeScale.cta.fontWeight },
  list: { paddingHorizontal: space[16], gap: space[8] },
  h4: { ...type('h4'), color: color.muted, marginTop: space[8] },
  row: { minHeight: size.touchMin, flexDirection: 'row', alignItems: 'center', gap: space[8], backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
  rowMain: { flex: 1, gap: space[2] },
  rowTitle: { ...type('cta'), color: color.text },
  rowSub: { ...type('caption'), color: color.muted },
  badge: { ...type('label'), color: color.accent },
  empty: { ...type('body'), color: color.muted },
  note: { ...type('caption'), color: color.muted, marginTop: space[8] },
});
