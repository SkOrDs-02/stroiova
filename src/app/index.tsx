import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { color, space, typeScale } from '@/theme';

// Тимчасовий екран каркаса (етап 0). Замінить головний екран зі специфікації 002.
export default function Index() {
  return (
    <View style={styles.root}>
      <Text style={styles.title} accessibilityRole="header">
        Стройова
      </Text>
      <Text style={styles.version}>Каркас {Constants.expoConfig?.version ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[8],
    backgroundColor: color.bg,
  },
  title: {
    color: color.accent,
    fontSize: typeScale.displayXl.fontSize,
    lineHeight: typeScale.displayXl.lineHeight,
    fontWeight: typeScale.displayXl.fontWeight,
    letterSpacing: typeScale.displayXl.letterSpacing,
  },
  version: {
    color: color.muted,
    fontSize: typeScale.caption.fontSize,
    lineHeight: typeScale.caption.lineHeight,
  },
});
