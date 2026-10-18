// journal-new (007 FR-18, FR-19): розкриття нового експоната по одному; закриття позначає журнал переглянутим.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { journal } from '@/museum/journals';
import { nextReveal } from '@/museum/museum';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { JournalDetail } from './JournalDetail';
import { COVER_COLOR, flavorOf, RARITY_COLOR } from './present';
import { muT } from './texts';

export function JournalNew({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  const [detail, setDetail] = useState<number | null>(null);
  const r = nextReveal(s.museum);
  const j = r ? journal(r.no) : undefined;
  if (!r || !j) return null;
  const last = !s.museum.reveal.some((x) => x !== r && x.via === 'other');
  return (
    <>
    <View style={styles.scrim} testID="journal-new">
      <View style={styles.wrap} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{muT.newTitle}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="jn-counter">{r.m > 1 ? muT.counterMulti(r.k, r.m, r.nAfter) : muT.counter(r.nAfter)}</Text>
        <View style={[styles.cover, { backgroundColor: COVER_COLOR[j.cover] }, j.rarity === 'legendary' && styles.legend]}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coverHead}>{j.head}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coverName}>{j.name}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{muT.stamp}</Text>
        </View>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4} testID="jn-title">{j.title}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.rarity, { color: RARITY_COLOR[j.rarity] }]} testID="jn-rarity">{muT.rarity[j.rarity]}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.quote}>{flavorOf(j, s.onboarding)}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{j.bonus.text}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="jn-note">{j.no === 8 ? muT.noteSeries : muT.note}</Text>
        {j.fromText ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{j.fromText}</Text> : null}
        <Button testID="jn-next" label={last ? muT.done : muT.next} onPress={s.closeReveal} />
        <Button testID="jn-detail" label={muT.detail} variant="ghost" onPress={() => setDetail(j.no)} />
      </View>
    </View>
    {/* шторка поряд зі scrim, а не всередині: модальне вікно приховує від доступності все, що поряд з ним */}
    {detail != null ? <JournalDetail store={store} no={detail} onClose={() => setDetail(null)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  wrap: { backgroundColor: color.bg, borderRadius: radius[12], padding: space[16], gap: space[8] },
  h2: { ...type('h2'), color: color.text },
  h4: { ...type('h4'), color: color.text },
  muted: { ...type('caption'), color: color.muted },
  body: { ...type('body'), color: color.text },
  rarity: { ...type('label') },
  quote: { ...type('body'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
  cover: { minHeight: 150, borderRadius: radius[6], padding: space[12], justifyContent: 'space-between' },
  legend: { borderWidth: 2, borderColor: color.accent },
  coverHead: { ...type('h2'), color: color.text },
  coverName: { ...type('body'), color: color.text },
  stamp: { ...type('stampM'), color: color.stampOnDark, textTransform: 'uppercase', alignSelf: 'flex-end' },
});
