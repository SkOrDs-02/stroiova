// Кнопка з утриманням (006 FR-15, Арт і звук 4.2): 1,2 с; хаптика раз на 250 мс, у кінці Heavy і Success; раніше відпустили — нічого.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { stampHaptic, successHaptic, tapHaptic } from '@/features/onboarding/haptics';
import { color, radius, size, space, typeScale } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';

export const HOLD_MS = 1200;
const HAPTIC_EVERY_MS = 250;
const STEP_MS = 50;

export function HoldButton({ label, onComplete, testID }: { label: string; onComplete: () => void; testID?: string }) {
  const [pct, setPct] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useRef(0);
  const lastHaptic = useRef(0);
  const done = useRef(false);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPct(0);
  };
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const begin = () => {
    if (timer.current || done.current) return;
    start.current = Date.now();
    lastHaptic.current = start.current;
    timer.current = setInterval(() => {
      const now = Date.now();
      const el = now - start.current;
      if (el >= HOLD_MS) {
        done.current = true;
        stop();
        stampHaptic();
        successHaptic();
        onComplete();
        return;
      }
      if (now - lastHaptic.current >= HAPTIC_EVERY_MS) {
        lastHaptic.current = now;
        tapHaptic(now);
      }
      setPct(Math.round((el / HOLD_MS) * 100));
    }, STEP_MS);
  };

  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPressIn={begin} onPressOut={stop} style={styles.btn}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: size.ctaHeight, borderRadius: radius[6], backgroundColor: color.accent, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', paddingHorizontal: space[12] },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: color.paper2 },
  text: { color: color.accentInk, fontSize: typeScale.cta.fontSize, fontWeight: typeScale.cta.fontWeight, textAlign: 'center' },
});
