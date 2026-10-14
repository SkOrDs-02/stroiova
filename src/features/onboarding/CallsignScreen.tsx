// Крок 3, onb-callsign (002 FR-5, FR-8, FR-9): три готові позивні, свій у шторці, форма «він / вона».
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, size, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { CallsignSheet } from './CallsignSheet';
import type { CallsignType, Gender } from './steps';
import { t } from './texts';

export function CallsignScreen({ store }: { store: ConveyorStore }) {
  const insets = useSafeAreaInsets();
  const [pick, setPick] = useState<CallsignType>('excel');
  const [own, setOwn] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [tried, setTried] = useState(false);
  const [sheet, setSheet] = useState(false);
  const opt = t.o3Opts.find((o) => o.type === pick);
  const name = pick === 'custom' ? own : opt!.name;

  const submit = () => {
    setTried(true);
    if (!gender) return; // FR-8: без вибору — o3.err3, нічого не записуємо
    store.getState().onbComplete(3, { callsign: { type: pick, text: name }, gender });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space[8], paddingBottom: insets.bottom + space[16] }]} testID="onb-callsign">
      <View style={styles.head}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.place}>{t.o3Place}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.place}>{t.o3Step}</Text>
      </View>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.q} accessibilityRole="header">{t.o3Q}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sub}>{t.o3Sub}</Text>
      <View style={styles.book}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.bookH}>{t.o3Book}</Text>
        <Row k={t.o3ColCallsign} v={name} testID="book-callsign" />
        <Row k={t.o3ColPos} v={t.o3Pos} />
        <Row k={t.o3ColArr} v={t.o3Arr} />
        <Row k={t.o3ColSkill} v={t.o3Skill} />
      </View>
      <View style={styles.opts} accessibilityRole="radiogroup">
        {t.o3Opts.map((o) => (
          <Chip key={o.type} label={o.name} on={pick === o.type} onPress={() => setPick(o.type)} testID={`o3-opt-${o.type}`} />
        ))}
      </View>
      {pick !== 'custom' ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.hint} testID="o3-hint">{opt!.hint}</Text> : null}
      <Pressable testID="o3-custom" accessibilityRole="button" onPress={() => setSheet(true)} style={[styles.custom, pick === 'custom' && styles.customOn]}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.customText, pick === 'custom' && styles.customTextOn]}>
          {pick === 'custom' ? t.o3Own(own) : t.o3Custom}
        </Text>
      </Pressable>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.gq}>{t.o3GQ}</Text>
      <View style={styles.opts} accessibilityRole="radiogroup">
        <Chip label={t.o3GM} on={gender === 'm'} onPress={() => setGender('m')} testID="o3-g-m" />
        <Chip label={t.o3GF} on={gender === 'f'} onPress={() => setGender('f')} testID="o3-g-f" />
      </View>
      <View style={styles.bottom}>
        {tried && !gender ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.err} testID="o3-err" accessibilityLiveRegion="polite">{t.o3Err3}</Text>
        ) : null}
        <Button testID="o3-cta" label={t.o3Cta} onPress={submit} />
      </View>
      {sheet ? (
        <CallsignSheet
          initial={own}
          onClose={() => setSheet(false)}
          onDone={(v) => {
            setOwn(v);
            setPick('custom');
            setSheet(false);
          }}
        />
      ) : null}
    </View>
  );
}

function Row({ k, v, testID }: { k: string; v: string; testID?: string }) {
  return (
    <View style={styles.row}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rowK}>{k}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rowV} testID={testID} numberOfLines={1}>{v}</Text>
    </View>
  );
}

function Chip({ label, on, onPress, testID }: { label: string; on: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[16], gap: space[8] },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  place: { ...type('docMeta'), color: color.muted },
  q: { ...type('h1'), color: color.text },
  sub: { ...type('bodyS'), color: color.muted },
  book: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[12], gap: space[4] },
  bookH: { ...type('docMeta'), color: color.ink2 },
  row: { flexDirection: 'row', gap: space[8], borderBottomWidth: 1, borderBottomColor: color.paperLine, paddingVertical: space[2] },
  rowK: { ...type('docMeta'), color: color.ink2, flex: 2 },
  rowV: { ...type('docBody'), color: color.pen, flex: 3 },
  opts: { flexDirection: 'row', gap: space[8] },
  chip: { flex: 1, minHeight: size.touchMin, borderRadius: radius[6], borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[6] },
  chipOn: { borderColor: color.accent, backgroundColor: color.accent },
  chipText: { ...type('body'), color: color.text },
  chipTextOn: { color: color.accentInk, fontWeight: typeScale.cta.fontWeight },
  hint: { ...type('caption'), color: color.muted },
  custom: { minHeight: size.touchMin, borderRadius: radius[6], borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, justifyContent: 'center', paddingHorizontal: space[12] },
  customOn: { borderColor: color.accent, borderStyle: 'solid' },
  customText: { ...type('body'), color: color.muted },
  customTextOn: { color: color.accent, fontWeight: typeScale.cta.fontWeight },
  gq: { ...type('label'), color: color.muted, marginTop: space[4] },
  bottom: { marginTop: 'auto', gap: space[8] },
  err: { ...type('bodyS'), color: color.fail },
});
