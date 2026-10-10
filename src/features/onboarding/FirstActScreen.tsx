// Кроки 4–5, onb-first-act (002 FR-11, FR-12): 8 тапів «Підписати», ПОГОДЖЕНО з тремтінням, дрон, «Пташка» ×2.
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { ACT_TAPS, type ConveyorStore } from '@/features/conveyor/store';
import { color, duration, radius, size, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { gendered } from './callsign';
import { sfx, stampHaptic, SUCCESS_DELAY_MS, successHaptic, tapHaptic, useReduceMotion } from './haptics';
import { t } from './texts';

export function FirstActScreen({ store }: { store: ConveyorStore }) {
  const insets = useSafeAreaInsets();
  const n = useStore(store, (s) => s.actTaps);
  const step = useStore(store, (s) => s.onboarding.step);
  const gender = useStore(store, (s) => s.onboarding.gender);
  const reduceMotion = useReduceMotion();
  const [shake] = useState(() => new Animated.Value(0));
  const [stampIn] = useState(() => new Animated.Value(0));
  const [stamped, setStamped] = useState(step !== 4 && step !== 5);

  // 8-й тап: удар штампа, тремтіння (без Reduce Motion), хаптика; кінець анімації закриває крок 5
  useEffect(() => {
    if (n < ACT_TAPS || stamped) return;
    sfx('SFX-03');
    if (!reduceMotion) stampHaptic();
    const anims = [Animated.timing(stampIn, { toValue: 1, duration: duration.stampBig, useNativeDriver: true })];
    if (!reduceMotion) {
      const d = duration.shake / 4;
      anims.push(
        Animated.sequence([
          Animated.timing(shake, { toValue: 1, duration: d, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -1, duration: d, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 1, duration: d, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: d, useNativeDriver: true }),
        ]),
      );
    }
    Animated.parallel(anims).start(() => {
      store.getState().stamp();
      setStamped(true);
    });
  }, [n, stamped, reduceMotion, shake, stampIn, store]);

  // дрон злітає: «Success» через 300 мс після удару (FR-12); таймер не скидається, коли анімація закінчилась раніше
  const hit = n >= ACT_TAPS;
  useEffect(() => {
    if (!hit) return;
    const id = setTimeout(() => {
      sfx('SFX-21');
      if (!reduceMotion) successHaptic();
    }, SUCCESS_DELAY_MS);
    return () => clearTimeout(id);
  }, [hit, reduceMotion]);

  const onSign = () => {
    const before = store.getState().actTaps;
    const after = store.getState().actSign();
    if (after === before) return; // тапи після 8-го ігноруємо (FR-11)
    sfx('SFX-01');
    if (!reduceMotion) tapHaptic(Date.now());
  };

  const done = n >= ACT_TAPS || stamped;
  const tx = shake.interpolate({ inputRange: [-1, 1], outputRange: [-space[6], space[6]] });
  return (
    <Animated.View style={[styles.root, { paddingTop: insets.top + space[8], paddingBottom: insets.bottom + space[16], transform: [{ translateX: tx }] }]} testID="onb-first-act">
      <View style={styles.head}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.place}>{t.o4Place}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.place}>{t.o4Step}</Text>
      </View>
      <View style={styles.bubble}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.name}>{t.o4Name}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{t.o4L1}</Text>
      </View>
      <View style={styles.doc}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docNo}>{t.o4DocNo}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docTitle}>{t.o4DocTitle}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docItem}>{t.o4DocItem}</Text>
        {done ? (
          <Animated.Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            testID="o4-stamp"
            style={[styles.stamp, { opacity: stamped ? 1 : stampIn, transform: [{ rotate: '-8deg' }, { scale: stamped ? 1 : stampIn.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1] }) }] }]}
          >
            {t.o4Stamp}
          </Animated.Text>
        ) : null}
      </View>
      {!stamped ? (
        <View style={styles.bottom}>
          <View style={styles.progHead}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.progLabel}>{t.o4ProgLabel}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.progText} testID="o4-prog">{t.o4Prog(Math.min(n, ACT_TAPS))}</Text>
          </View>
          <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: ACT_TAPS, now: n }}>
            <View style={[styles.fill, { width: `${(Math.min(n, ACT_TAPS) / ACT_TAPS) * 100}%` }]} />
          </View>
          <Pressable testID="o4-cta" accessibilityRole="button" onPress={onSign} style={styles.sign} disabled={done}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.signText}>{t.o4Cta}</Text>
          </Pressable>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.hint}>{t.o4Hint}</Text>
        </View>
      ) : (
        <View style={styles.bottom} testID="o4-result">
          <View style={styles.result}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.resTitle}>{`${t.o4ResTitle} ×2`}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.resSub}>{t.o4ResSub}</Text>
          </View>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.comment} testID="o4-comment">{gendered(t.o4Comment, gender)}</Text>
          <Button testID="o4-cta2" label={t.o4Cta2} onPress={() => store.getState().toMain()} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[16], gap: space[12] },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  place: { ...type('docMeta'), color: color.muted },
  bubble: { backgroundColor: color.surface, borderRadius: radius[8], padding: space[12], gap: space[4] },
  name: { ...type('h4'), color: color.accent },
  line: { ...type('body'), color: color.text },
  doc: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[4] },
  docNo: { ...type('docMeta'), color: color.ink },
  docTitle: { ...type('docBody'), color: color.ink },
  docItem: { ...type('docBody'), color: color.ink2 },
  stamp: { ...type('stampL'), color: color.stamp, borderWidth: 3, borderColor: color.stamp, alignSelf: 'center', paddingHorizontal: space[12], marginTop: space[8] },
  bottom: { marginTop: 'auto', gap: space[8] },
  progHead: { flexDirection: 'row', justifyContent: 'space-between' },
  progLabel: { ...type('label'), color: color.muted },
  progText: { ...type('num'), color: color.text },
  track: { height: size.trackL, borderRadius: radius.pill, backgroundColor: color.surface2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.accent },
  sign: { minHeight: size.ctaHeight, borderRadius: radius[6], backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  signText: { ...type('cta'), color: color.accentInk },
  hint: { ...type('caption'), color: color.muted, textAlign: 'center' },
  result: { backgroundColor: color.surface, borderRadius: radius[8], padding: space[12], gap: space[4], borderWidth: 1, borderColor: color.accent },
  resTitle: { ...type('h3'), color: color.accent },
  resSub: { ...type('body'), color: color.text },
  comment: { ...type('bodyL'), color: color.text, fontStyle: 'italic' },
});
