// Хаптика й звуки першого акта (002 FR-11, FR-12). Reduce Motion вимикає лише тремтіння екрана (AC-7);
// хаптику вимикає перемикач вібрації в налаштуваннях (10). Звуків SFX-01/03/21 ще немає (етап 8): sfx() поки нічого не грає.
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Хаптика тапу не частіше одного разу на 70 мс (FR-11). */
export const TAP_HAPTIC_GAP_MS = 70;
/** «Success» через 300 мс після удару штампа (FR-12). */
export const SUCCESS_DELAY_MS = 300;

const quiet = (p: Promise<void>) => {
  p.catch(() => {}); // web і пристрої без вібромотора
};

let lastTapAt = -Infinity;

// Перемикачі «Вібрація» і «Звук» з налаштувань (010 FR-14): сторі вмикає й вимикає їх одразу
let hapticsOn = true;
let soundOn = true;
export function setHapticsEnabled(on: boolean): void {
  hapticsOn = on;
}
export function setSoundEnabled(on: boolean): void {
  soundOn = on;
}
export const isHapticsEnabled = () => hapticsOn;
export const isSoundEnabled = () => soundOn;

export function tapHaptic(nowMs: number): boolean {
  if (!hapticsOn) return false;
  if (nowMs - lastTapAt < TAP_HAPTIC_GAP_MS) return false;
  lastTapAt = nowMs;
  quiet(Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Keyboard_Tap) : Haptics.selectionAsync());
  return true;
}

export function stampHaptic(): void {
  if (!hapticsOn) return;
  quiet(Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

export function successHaptic(): void {
  if (!hapticsOn) return;
  quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export type SfxId = 'SFX-01' | 'SFX-03' | 'SFX-21';

/** Звук із docs/art-and-sound.md; файли з'являться на етапі 8. */
export function sfx(_id: SfxId): void {
  if (!soundOn) return;
}

export function useReduceMotion(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setOn(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}
