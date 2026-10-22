// endless-intro (013 FR-23): наказ «Дублювати на папері» з модифікатором Дубля; «Прийняти до виконання» утримується 1,2 с, «Пізніше» лишає на Р5.
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { HoldButton } from '@/features/digitization/HoldButton';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { dupT, modifierText } from './texts';

export function EndlessIntro({ store, onClose }: { store: ConveyorStore; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const offer = useStore(store, (s) => s.dub.offer);
  const fuelMult = useStore(store, (s) => s.cfg.params.dup.noDid.fuelMult);
  if (!offer) return null;
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="endless-intro" accessibilityViewIsModal>
      <View style={styles.paper}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{dupT.docTitle}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header" testID="ei-title">{dupT.title(offer.n)}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="ei-lead">{dupT.docLead}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.label}>{dupT.modifierLabel}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.mod} testID={`ei-mod-${offer.modifier}`}>{modifierText(offer.modifier, String(fuelMult).replace('.', ','))}</Text>
      </View>
      <View style={styles.actions}>
        <HoldButton
          testID="ei-accept"
          label={dupT.accept}
          onComplete={() => {
            if (store.getState().dubAccept()) onClose();
          }}
        />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.hint} testID="ei-hold">{dupT.hold}</Text>
        <Button testID="ei-later" variant="secondary" label={dupT.later} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bgDeep, padding: space[16], gap: space[16], justifyContent: 'center' },
  paper: { backgroundColor: color.paper, borderRadius: radius[8], padding: space[16], gap: space[8] },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('docTitle'), color: color.ink },
  body: { ...type('docBody'), color: color.ink },
  label: { ...type('label'), color: color.ink2 },
  mod: { ...type('docBody'), color: color.ink },
  actions: { gap: space[8] },
  hint: { ...type('caption'), color: color.muted, textAlign: 'center' },
});
