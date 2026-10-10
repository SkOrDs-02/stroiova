// boot (009 FR-28, FR-10): «коротке» — лого; «довге» після 1 с — неписана істина, тап гортає; «міграція».
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, space, typeScale } from '@/theme';

import { t } from './texts';

export const LONG_BOOT_MS = 1000;

export function BootScreen({ migrating }: { migrating: boolean }) {
  const [long, setLong] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setLong(true), LONG_BOOT_MS);
    return () => clearTimeout(id);
  }, []);
  const truth = t.truths[i % t.truths.length]!;
  return (
    <View style={styles.root} testID="boot">
      <Text style={styles.logo} accessibilityRole="header">Стройова</Text>
      {migrating ? (
        <View style={styles.block} testID="boot-migration">
          <Text style={styles.meta}>{t.migrBook}</Text>
          <Text style={styles.title}>{t.migrTitle}</Text>
          <Text style={styles.body}>{t.migrBody}</Text>
        </View>
      ) : long ? (
        <Pressable style={styles.block} onPress={() => setI(i + 1)} accessibilityRole="button" testID="boot-truth">
          <Text style={styles.meta}>{t.truthH(truth.n)}</Text>
          <Text style={styles.body} numberOfLines={2}>{truth.text}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', padding: space[24], gap: space[24] },
  logo: { color: color.accent, fontSize: typeScale.displayXl.fontSize, lineHeight: typeScale.displayXl.lineHeight, fontWeight: typeScale.displayXl.fontWeight },
  block: { gap: space[8], alignItems: 'center' },
  meta: { color: color.muted, fontSize: typeScale.caption.fontSize, lineHeight: typeScale.caption.lineHeight },
  title: { color: color.text, fontSize: typeScale.h3.fontSize, lineHeight: typeScale.h3.lineHeight, fontWeight: typeScale.h3.fontWeight },
  body: { color: color.text, fontSize: typeScale.body.fontSize, lineHeight: typeScale.body.lineHeight, textAlign: 'center' },
});
