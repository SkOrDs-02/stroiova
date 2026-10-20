// profile (010 FR-26): особова справа - позивний, форма в наказах, рівень, лічильники, щоденник. «Рапорт на зміну позивного» - callsign-input.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { count } from '@/awards/awards';
import { AWARDS_TOTAL } from '@/awards/content';
import { awT } from '@/features/awards/texts';
import type { ConveyorStore } from '@/features/conveyor/store';
import { CallsignSheet } from '@/features/onboarding/CallsignSheet';
import type { Gender } from '@/features/onboarding/steps';
import { color, radius, size, space } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { Frame } from './Parts';
import { profileRows } from './present';
import { setT } from './texts';

export function ProfileScreen({ store, insetTop, onBack, onAwards }: { store: ConveyorStore; insetTop: number; onBack: () => void; onAwards: () => void }) {
  const s = useStore(store);
  const [edit, setEdit] = useState(false);
  const [pick, setPick] = useState<{ text: string; gender: Gender } | null>(null);
  const o = s.onboarding;
  const gender: Gender = o.gender ?? 'm';
  const r = profileRows({ level: s.state.level, digit: s.digit, installMs: s.inspections.installMs, points: s.state.prestigePoints, params: s.cfg.params, exit: s.cfg.params.levels[s.state.level - 1]?.exitDigitizations ?? null, inbox: s.telegrams.inbox, stats: s.stats, gender });
  const pf = setT.pf;
  const rows: [string, string, string][] = [
    ['pf-form', pf.form, r.form],
    ['pf-post', pf.post, pf.postValue],
    ['pf-level', pf.level, r.level],
    ['pf-digit', pf.digit, r.digitizations],
    ['pf-arrival', pf.arrival, r.arrival],
    ['pf-skills', pf.skills, pf.skillsValue],
  ];
  return (
    <Frame title={pf.title} testID="profile" insetTop={insetTop} onBack={onBack}>
      <View style={styles.paper}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docTitle}>{pf.title}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{pf.book}</Text>
        <View style={styles.line}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{pf.callsign}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.callsign} testID="pf-callsign">{o.callsign?.text ?? ''}</Text>
        </View>
        {rows.map(([id, k, v]) => (
          <View key={id} style={styles.line}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{k}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.v} testID={id}>{v}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {[
          ['pf-points', r.points, pf.points, r.pointsNote],
          ['pf-tg', r.telegrams, pf.telegrams, r.telegramsNote],
          ['pf-insp', r.inspections, r.inspectionsLabel, ''],
          ['pf-drones', r.drones, r.dronesLabel, ''],
        ].map(([id, num, label, note]) => (
          <View key={id} style={styles.tile}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.num} testID={id}>{num}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tileText}>{label}</Text>
            {note ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tileNote}>{note}</Text> : null}
          </View>
        ))}
      </View>

      <Pressable
        testID="pf-awards"
        accessibilityRole="button"
        onPress={() => {
          store.getState().openAwards('profile');
          onAwards();
        }}
        style={styles.report}
      >
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.reportTitle}>{awT.profile(count(s.awards), AWARDS_TOTAL)}</Text>
      </Pressable>

      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header" style={styles.h3}>{pf.diary}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note} testID="pf-diary-empty">{pf.diaryEmpty}</Text>

      <Pressable testID="pf-report" accessibilityRole="button" onPress={() => setEdit(true)} style={styles.report}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.reportTitle}>{pf.report}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{pf.reportNote}</Text>
      </Pressable>

      {edit ? (
        <CallsignSheet
          initial={o.callsign?.text ?? ''}
          onClose={() => setEdit(false)}
          onDone={(text) => {
            setEdit(false);
            setPick({ text, gender });
          }}
        />
      ) : null}
      {pick ? (
        <View style={styles.scrim} testID="pf-gender">
          <View style={styles.sheet} accessibilityViewIsModal>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header" style={styles.h3}>{pf.form}</Text>
            {(['m', 'f'] as Gender[]).map((g) => (
              <Pressable key={g} testID={`pf-gender-${g}`} accessibilityRole="radio" accessibilityState={{ checked: pick.gender === g }} onPress={() => setPick({ ...pick, gender: g })} style={[styles.choice, pick.gender === g && styles.choiceOn]}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.v}>{g === 'm' ? pf.genderM : pf.genderF}</Text>
              </Pressable>
            ))}
            <Pressable
              testID="pf-gender-ok"
              accessibilityRole="button"
              onPress={() => {
                s.changeCallsign(pick.text, pick.gender);
                setPick(null);
              }}
              style={styles.ok}
            >
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.okText}>{pf.reportDone}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Frame>
  );
}

const styles = StyleSheet.create({
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[6] },
  docTitle: { ...type('h3'), color: color.ink },
  meta: { ...type('caption'), color: color.ink2, marginBottom: space[4] },
  line: { flexDirection: 'row', gap: space[8], alignItems: 'baseline' },
  k: { ...type('caption'), color: color.ink2, width: 100 },
  v: { ...type('body'), color: color.ink, flex: 1 },
  callsign: { ...type('h2'), fontStyle: 'italic', color: color.pen, flex: 1, flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  tile: { width: '48%', flexGrow: 1, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radius[6], padding: space[12], gap: space[2] },
  num: { ...type('numL'), color: color.accent },
  tileText: { ...type('caption'), color: color.text },
  tileNote: { ...type('caption'), color: color.muted },
  h3: { ...type('h3'), color: color.text, marginTop: space[8] },
  note: { ...type('caption'), color: color.muted },
  report: { borderWidth: 1.5, borderColor: color.accent, borderRadius: radius[6], padding: space[12], gap: space[2], minHeight: size.ctaHeight, justifyContent: 'center' },
  reportTitle: { ...type('body'), color: color.accent, fontWeight: '600' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bgDeep, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  choice: { minHeight: size.touchMin, borderWidth: 1, borderColor: color.borderStrong, borderRadius: radius[6], justifyContent: 'center', paddingHorizontal: space[12] },
  choiceOn: { borderColor: color.accent, borderWidth: 2 },
  ok: { minHeight: size.ctaHeightM, backgroundColor: color.accent, borderRadius: radius[6], alignItems: 'center', justifyContent: 'center' },
  okText: { ...type('cta'), color: color.accentInk },
});
