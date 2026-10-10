// Кнопки дизайн-системи (компонент Button): основна жовта й контурна; ≥ 44 px, масштаб шрифту до ×1,3.
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { color, radius, size, space } from '@/theme';

import { type } from './type';

export const MAX_FONT_SCALE = 1.3;

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', disabled = false, testID, style }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, styles[variant], disabled && styles.off, style]}
    >
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} style={[styles.text, variant === 'primary' ? styles.textPrimary : styles.textOther, disabled && styles.textOff]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: size.ctaHeight, borderRadius: radius[6], alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[16] },
  primary: { backgroundColor: color.accent },
  secondary: { minHeight: size.ctaHeightM, borderWidth: 1, borderColor: color.borderStrong },
  ghost: { minHeight: size.touchMin },
  off: { backgroundColor: color.surface2, borderColor: color.border },
  text: type('cta'),
  textPrimary: { color: color.accentInk },
  textOther: { color: color.text },
  textOff: { color: color.muted },
});
