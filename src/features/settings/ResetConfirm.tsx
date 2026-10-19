// reset-confirm (010 FR-19, FR-20): два кроки. Крок 2 - «Акт № 0 про списання особової справи»; «Не скидати» повертає в налаштування без змін.
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { setT } from './texts';

export function ResetConfirm({ store, onCancel, onDone }: { store: ConveyorStore; onCancel: () => void; onDone: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const callsign = useStore(store, (s) => s.onboarding.callsign?.text ?? '');
  const hasStarter = useStore(store, (s) => s.monetization.rights.starter_pack);
  const rc = setT.rc;
  return (
    <View style={styles.scrim} testID="reset-confirm">
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.step} testID="rc-step">{step === 1 ? rc.step1 : rc.step2}</Text>
        {step === 1 ? (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header" style={styles.h2}>{rc.title}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{rc.sub}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{rc.gone}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{rc.goneList}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{rc.stays}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{rc.staysList}</Text>
            {hasStarter ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="rc-starter">{rc.staysStarter}</Text> : null}
          </ScrollView>
        ) : (
          <View style={styles.paper} testID="rc-act">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.actNo}>{rc.act}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.actTitle}>{rc.actTitle}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.actBody} testID="rc-act-body">{rc.actBody(callsign)}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.actBody}>{`${rc.purchases}: ${rc.purchasesStay}`}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.actSigner}>{rc.signer}</Text>
          </View>
        )}
        {step === 1 ? (
          <Button testID="rc-next" variant="secondary" label={rc.next} onPress={() => setStep(2)} />
        ) : (
          <Button
            testID="rc-sign"
            label={rc.sign}
            onPress={() => {
              store.getState().resetProgress();
              onDone();
            }}
          />
        )}
        <Button testID="rc-cancel" variant="ghost" label={rc.cancel} onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: color.bg, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  scroll: { gap: space[8] },
  step: { ...type('caption'), color: color.muted },
  h2: { ...type('h2'), color: color.text },
  k: { ...type('h4'), color: color.muted, marginTop: space[8] },
  body: { ...type('body'), color: color.text },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[8] },
  actNo: { ...type('h4'), color: color.ink2 },
  actTitle: { ...type('h3'), color: color.ink },
  actBody: { ...type('body'), color: color.ink },
  actSigner: { ...type('caption'), color: color.ink2, marginTop: space[8] },
});
