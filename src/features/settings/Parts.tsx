// Спільні частини екранів 010: рамка з кнопкою «Назад», розділ, рядок-перемикач, рядок-посилання.
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { color, radius, size, space } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { setT } from './texts';

export function Frame({ title, testID, insetTop, onBack, children }: { title: string; testID: string; insetTop: number; onBack: () => void; children: ReactNode }) {
  return (
    <View style={styles.frame} testID={testID}>
      <View style={[styles.head, { paddingTop: insetTop }]}>
        <Pressable testID={`${testID}-back`} accessibilityRole="button" accessibilityLabel={setT.back} onPress={onBack} style={styles.back}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.backArrow}>{'‹'}</Text>
        </Pressable>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header" style={styles.title}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
    </View>
  );
}

export function Section({ title }: { title: string }) {
  return (
    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header" style={styles.section}>
      {title}
    </Text>
  );
}

export function ToggleRow({ id, label, note, value, onChange }: { id: string; label: string; note?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable testID={id} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} onPress={() => onChange(!value)} style={styles.row}>
      <View style={styles.rowText}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.label}>{label}</Text>
        {note ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{note}</Text> : null}
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

export function LinkRow({ id, label, note, onPress, disabled = false, danger = false, badge }: { id: string; label: string; note?: string; onPress: () => void; disabled?: boolean; danger?: boolean; badge?: string }) {
  return (
    <Pressable testID={id} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.row, disabled && styles.off]}>
      <View style={styles.rowText}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.label, danger && styles.danger]}>{label}</Text>
        {note ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{note}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge} testID={`${id}-badge`}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.chev}>{'›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { ...StyleSheet.absoluteFill, backgroundColor: color.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[8], paddingBottom: space[8], backgroundColor: color.bgDeep },
  back: { width: size.touchMin, height: size.touchMin, alignItems: 'center', justifyContent: 'center' },
  backArrow: { ...type('h1'), color: color.text },
  title: { ...type('h2'), color: color.text, flex: 1 },
  body: { padding: space[16], gap: space[8] },
  section: { ...type('h4'), color: color.muted, marginTop: space[12] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: size.touchMin, paddingVertical: space[8], borderBottomWidth: 1, borderBottomColor: color.border },
  rowText: { flex: 1, gap: space[2] },
  label: { ...type('body'), color: color.text },
  note: { ...type('caption'), color: color.muted },
  danger: { color: color.fail },
  off: { opacity: 0.5 },
  chev: { ...type('h2'), color: color.muted },
  badge: { backgroundColor: color.accent, borderRadius: radius[6], paddingHorizontal: space[8], paddingVertical: space[2] },
  badgeText: { ...type('caption'), color: color.accentInk },
  track: { width: size.touchMin, height: 26, borderRadius: 13, backgroundColor: color.surface2, borderWidth: 1, borderColor: color.borderStrong, justifyContent: 'center', paddingHorizontal: 2 },
  trackOn: { backgroundColor: color.accent, borderColor: color.accent },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: color.muted },
  knobOn: { backgroundColor: color.accentInk, alignSelf: 'flex-end' },
});
