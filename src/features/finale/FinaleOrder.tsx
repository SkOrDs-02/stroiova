// finale-order (013 FR-17): наказ «Про вимкнення розсилки», 8 тапів підпису, штамп «ПОГОДЖЕНО», Дід друкує останній аркуш. Крок не пропускається.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACT_TAPS, type ConveyorStore } from '@/features/conveyor/store';
import { telegram } from '@/telegrams/content';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { finT } from './texts';

export function FinaleOrder({ store, onClose }: { store: ConveyorStore; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  // убито посеред тапів - з нуля (крайовий випадок): лічильник лише в пам'яті
  const [n, setN] = useState(0);
  const done = n >= ACT_TAPS;
  const body = telegram('tg_0108_shutdown_order')?.body ?? '';
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="finale-order">
      <View style={styles.paper}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{finT.orderTitle}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{body}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.hint} testID="fo-hint">{finT.orderHint}</Text>
        {done ? (
          <View style={styles.stamp} testID="fo-stamp">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stampText}>{finT.stamp}</Text>
          </View>
        ) : null}
      </View>
      {done ? (
        <>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.print} testID="fo-print">{finT.printing}</Text>
          <Button
            testID="fo-next"
            label={finT.next}
            onPress={() => {
              store.getState().finaleComplete('order');
              onClose();
            }}
          />
        </>
      ) : (
        <>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.prog} testID="fo-prog">{finT.taps(n, ACT_TAPS)}</Text>
          <Button testID="fo-sign" label={finT.sign} onPress={() => setN((v) => Math.min(ACT_TAPS, v + 1))} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bgDeep, padding: space[16], gap: space[12], justifyContent: 'center' },
  paper: { backgroundColor: color.paper, borderRadius: radius[8], padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.ink },
  body: { ...type('body'), color: color.ink },
  hint: { ...type('bodyS'), color: color.ink },
  stamp: { alignSelf: 'flex-end', borderWidth: 2, borderColor: color.stamp, borderRadius: radius[4], paddingHorizontal: space[8], transform: [{ rotate: '-8deg' }] },
  stampText: { ...type('stampM'), color: color.stamp },
  prog: { ...type('label'), color: color.text, textAlign: 'center' },
  print: { ...type('body'), color: color.text, textAlign: 'center' },
});
