// Печатка на картці «Стройова частина» (001 FR-16): тап завжди, ліміт 10/с рахує модуль. Штамп — колір stamp (рішення 4).
import { Pressable, StyleSheet, Text } from 'react-native';

import { color, size, typeScale } from '@/theme';

import { t } from './texts';

export function Seal({ onPress }: { onPress: () => void }) {
  return (
    <Pressable testID="seal" accessibilityRole="button" accessibilityLabel={t.sealLabel} onPress={onPress} style={styles.seal}>
      <Text style={styles.text}>{t.sealText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  seal: {
    width: size.sealTap,
    height: size.sealTap,
    borderRadius: size.sealTap / 2,
    borderWidth: 2, // рамка 2 px, як у дизайн-системі (окремого токена товщини немає)
    borderColor: color.stampOnDark,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  text: { color: color.stampOnDark, fontSize: typeScale.stampM.fontSize, fontWeight: typeScale.stampM.fontWeight, letterSpacing: typeScale.stampM.letterSpacing },
});
