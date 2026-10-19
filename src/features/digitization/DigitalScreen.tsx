// digital (006 FR-5…FR-12): прогноз балів і множника, журнали, «Обнулиться / Залишиться», лічильник, доріжка рівнів, кнопка.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatBig, formatCountdown, formatMult } from '@/economy/format';
import { itemsFor } from '@/economy/game/state';
import { FINAL_LEVELS, PLAYABLE_LEVELS, finalDue, status } from '@/digitization/digitization';
import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, size, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { byLevel, journalTitle, shownJournals, track } from './present';
import { digitT } from './texts';

export function DigitalScreen({ store, onOpenConfirm }: { store: ConveyorStore; onOpenConfirm: () => void }) {
  const s = useStore(store);
  const [how, setHow] = useState(false);
  const st = status(s.state, s.digit, s.cfg, s.lastMs, s.effects);
  const level = s.state.level;
  const it = itemsFor(s.state, s.cfg);
  const showHow = how || (!s.digit.howSeen && st.kind === 'available');
  const L = s.cfg.params.levels[level - 1];
  const total = L?.exitDigitizations ?? 0;
  const next = s.cfg.params.levels[level];
  const cta = byLevel.cta(level, st.isLast);
  // 011 FR-11: підсумкова рівня - оголошена / чекає потоків / повтор / перехід дозволено
  const fin = s.inspections.active?.kind === 'final' ? s.inspections.active : null;
  const hasFinalHere = FINAL_LEVELS.includes(level);
  const waitFinal = hasFinalHere && !fin && finalDue(s.cfg, s.digit, level);
  return (
    <View style={styles.root} testID="digital">
      <View style={styles.head}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h1} accessibilityRole="header">{digitT.title}</Text>
        <Pressable testID="digit-info" accessibilityRole="button" accessibilityLabel={digitT.how.info} onPress={() => setHow(true)} style={styles.info}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.infoText}>{digitT.how.infoMark}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{byLevel.sub(level)}</Text>
        {showHow ? (
          <View style={styles.card} testID="digit-how">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2}>{digitT.how.title}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{digitT.how.l1}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{digitT.how.l2}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{digitT.how.l3}</Text>
            <Button
              testID="digit-how-ok"
              label={digitT.how.ok}
              onPress={() => {
                setHow(false);
                s.ackDigitHow();
              }}
            />
          </View>
        ) : null}
        {st.kind === 'locked' ? (
          <View style={styles.card} testID="digit-locked">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{digitT.locked(it.streams.length)}</Text>
            {it.streams
              .filter((u) => st.lockedStreams.includes(u.id))
              .map((u) => (
                <Text key={u.id} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{digitT.lockedRow(u.name, formatBig(u.unlock ?? 0, 'price'))}</Text>
              ))}
          </View>
        ) : null}
        {st.kind === 'few' ? (
          <View style={styles.card} testID="digit-few">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{digitT.few(st.lack)}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{digitT.fewTip}</Text>
          </View>
        ) : null}
        {st.kind !== 'locked' ? (
          <View style={styles.card} testID="digit-forecast">
            {st.recommended ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tag} testID="digit-recommended">{digitT.recommended}</Text> : null}
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.big} testID="digit-points">{digitT.points(st.points)}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text} testID="digit-mult">{digitT.mult(formatMult(st.multBefore), formatMult(st.multAfter))}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{`${digitT.lifetime}: ${formatBig(s.state.lifetimeCycle, 'balance')}`}</Text>
          </View>
        ) : null}
        <View style={styles.card} testID="digit-journals">
          {shownJournals(st.journals).length ? (
            <>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2}>{digitT.journals}</Text>
              {shownJournals(st.journals).map((n) => (
                <Text key={n} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{`№ ${n} · ${journalTitle(n)}`}</Text>
              ))}
            </>
          ) : (
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{level >= 2 ? digitT.noJournalsR2 : digitT.noJournals}</Text>
          )}
        </View>
        <View style={styles.card}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2}>{digitT.resets}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{digitT.resetsList}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2}>{digitT.stays}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{digitT.staysList}</Text>
        </View>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text} testID="digit-counter">{level >= 2 ? digitT.counterLvl(st.levelCount, total) : digitT.counterR1(st.levelCount)}</Text>
        {st.isLast && level < 2 ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tag} testID="digit-last">{digitT.last}</Text> : null}
        {hasFinalHere && fin ? (
          <View style={styles.card} testID="digit-final">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{(fin.attempt > 1 ? digitT.finalRetry : digitT.finalOn)(formatCountdown(Math.max(0, (fin.arrMs - s.lastMs) / 1000)))}</Text>
            <Button testID="digit-final-prep" variant="secondary" label={digitT.finalGo} onPress={s.openInspPrep} />
          </View>
        ) : null}
        {waitFinal ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="digit-final-wait">{digitT.finalWait}</Text> : null}
        {st.isLast && next ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tag} testID="digit-exit-ok">{digitT.exitOk(next.name.toLowerCase())}</Text> : null}
        <View style={styles.track} testID="digit-track">
          {track(level).map((x) => (
            <View key={x.key} style={[styles.step, x.state === digitT.trackState.now && styles.stepNow]}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stepName} numberOfLines={1}>{x.name}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stepState} numberOfLines={1}>{x.state}</Text>
            </View>
          ))}
        </View>
        {level >= PLAYABLE_LEVELS && !st.isLast ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="digit-later">{digitT.nextLater}</Text> : null}
      </ScrollView>
      <View style={styles.foot}>
        <Button testID="digit-cta" label={cta} disabled={st.kind !== 'available'} onPress={onOpenConfirm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space[16] },
  h1: { ...type('h2'), color: color.text },
  info: { width: size.touchMin, height: size.touchMin, borderRadius: radius.pill, borderWidth: 1, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  infoText: { ...type('body'), color: color.text },
  body: { paddingHorizontal: space[16], gap: space[8], paddingBottom: space[16] },
  card: { backgroundColor: color.surface, borderRadius: radius[10], padding: space[12], gap: space[6] },
  h2: { ...type('h4'), color: color.text },
  text: { ...type('body'), color: color.text },
  muted: { ...type('bodyS'), color: color.muted },
  big: { ...type('h2'), color: color.accent },
  tag: { ...type('label'), color: color.accent },
  track: { flexDirection: 'row', gap: space[4] },
  step: { flex: 1, minWidth: 0, padding: space[4], borderRadius: radius[4], borderWidth: 1, borderColor: color.border, alignItems: 'center' },
  stepNow: { borderColor: color.accent, borderWidth: 2 },
  stepName: { ...type('caption'), color: color.text, fontWeight: typeScale.cta.fontWeight },
  stepState: { ...type('caption'), color: color.muted },
  foot: { padding: space[16] },
});
