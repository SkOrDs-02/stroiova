// finale-script (013 FR-18): серверна, бежевий ПК з наліпкою, «ВИМКНУТИ РОЗСИЛКУ? (Y/N)». Y - крок завершено; N - назад на `main`, банер лишається.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ConveyorStore } from '@/features/conveyor/store';
import { beatById } from '@/story/content';
import { color, radius, size, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { finT } from './texts';

export function FinaleShutdown({ store, onClose, onNext }: { store: ConveyorStore; onClose: () => void; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const [off, setOff] = useState(false);
  // рядки скрипта - з тієї ж сцени, що й «знайдено» (014): один скрипт на весь сюжет
  const lines = ((beatById('st_who_writes_11')?.payload as { lines?: string[] } | undefined)?.lines ?? []) as string[];
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="finale-script-yn">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{finT.scriptTitle}</Text>
      <View style={[styles.pc, off && styles.pcOff]}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sticker}>{finT.sticker}</Text>
        <ScrollView style={styles.screen} contentContainerStyle={styles.screenBody}>
          {off ? null : lines.map((l, i) => (
            <Text key={`${i}-${l}`} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.code}>{l}</Text>
          ))}
          {off ? null : <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.code} testID="fy-prompt">{finT.prompt}</Text>}
        </ScrollView>
      </View>
      {off ? (
        <>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note} testID="fy-off">{finT.off}</Text>
          <Button testID="fy-next" label={finT.next} onPress={onNext} />
        </>
      ) : (
        <View style={styles.row}>
          <Button
            testID="fy-y"
            label="Y"
            onPress={() => {
              store.getState().finaleComplete('script');
              setOff(true);
            }}
          />
          <Button
            testID="fy-n"
            label="N"
            variant="secondary"
            onPress={() => {
              store.getState().finaleDecline();
              onClose();
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bgDeep, padding: space[16], gap: space[12], justifyContent: 'center' },
  title: { ...type('h2'), color: color.text },
  pc: { backgroundColor: color.paper, borderRadius: radius[8], padding: space[12], gap: space[8] },
  pcOff: { backgroundColor: color.surface2 },
  sticker: { ...type('docMeta'), color: color.ink, alignSelf: 'flex-start', borderWidth: 1, borderColor: color.ink, paddingHorizontal: space[6] },
  screen: { backgroundColor: color.ink, borderRadius: radius[4], flexGrow: 0, minHeight: size.touchMin },
  screenBody: { padding: space[8], gap: space[2] },
  code: { ...type('docMeta'), color: color.paper },
  note: { ...type('body'), color: color.text },
  row: { flexDirection: 'row', gap: space[12] },
});
