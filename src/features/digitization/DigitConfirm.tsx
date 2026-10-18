// digit-confirm (006 FR-14, FR-15): бали, множник, що обнулиться й що лишиться, журнали; утримання кнопки 1,2 с.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatMult } from '@/economy/format';
import { status } from '@/digitization/digitization';
import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { HoldButton } from './HoldButton';
import { journalTitle, shownJournals } from './present';
import { digitT } from './texts';

export function DigitConfirm({ store, onClose, onDone }: { store: ConveyorStore; onClose: () => void; onDone: () => void }) {
  const s = useStore(store);
  const st = status(s.state, s.digit, s.cfg, s.lastMs, s.effects);
  const level = s.state.level;
  const toL2 = st.isLast && level < 2;
  return (
    <View style={styles.scrim} testID="digit-confirm">
      <View style={styles.sheet} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.body}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{level >= 2 ? digitT.confirmTitleR2 : digitT.confirmTitleR1}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{shownJournals(st.journals).length ? digitT.confirmSub : digitT.confirmSubNone}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.big} testID="confirm-points">{digitT.points(st.points)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text} testID="confirm-mult">{digitT.mult(formatMult(st.multBefore), formatMult(st.multAfter))}</Text>
          {toL2 ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note} testID="confirm-lvl">{digitT.confirmLvl}</Text> : null}
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h}>{digitT.resets}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{digitT.resetsList}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h}>{digitT.stays}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.text}>{digitT.staysList}</Text>
          {shownJournals(st.journals).map((n) => (
            <Text key={n} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{`№ ${n} · ${journalTitle(n)}`}</Text>
          ))}
        </ScrollView>
        <View style={styles.foot}>
          <HoldButton
            testID="digit-hold"
            label={toL2 ? digitT.confirmCtaLvl : digitT.confirmCta}
            onComplete={() => {
              if (s.digitize(st.recommended)) onDone();
            }}
          />
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{digitT.hold}</Text>
          <Button testID="digit-no" variant="ghost" label={digitT.no} onPress={onClose} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', backgroundColor: color.bgDeep, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12] },
  body: { padding: space[16], gap: space[6] },
  foot: { padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.text },
  h: { ...type('h4'), color: color.muted, marginTop: space[6] },
  big: { ...type('h2'), color: color.accent },
  text: { ...type('body'), color: color.text },
  note: { ...type('bodyS'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[8] },
  muted: { ...type('bodyS'), color: color.muted },
});
