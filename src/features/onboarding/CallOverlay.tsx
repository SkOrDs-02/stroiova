// call (002 FR-20): «виклик» → «репліки» → «бонус отримано»; бонус архіву зараховує стор один раз, екрана архіву немає.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatBig } from '@/economy/format';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { t } from './texts';

type Phase = 'ring' | 'talk' | 'bonus';

export function CallOverlay({ onClaim, onClose }: { onClaim: () => number; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('ring');
  const [amount, setAmount] = useState(0);
  const status = phase === 'ring' ? t.b9Status[0] : phase === 'talk' ? t.b9Status[1] : t.b9Status[2];
  return (
    <View style={styles.scrim} testID={`call-${phase}`}>
      <View style={styles.card} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.who}>{t.b9Arch}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.status}>{status}</Text>
        {phase === 'ring' ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.name}>{t.b9Kava2}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{t.b9Kava}</Text>
            <Button testID="call-cta" label={t.b9Cta} onPress={() => setPhase('talk')} />
          </>
        ) : phase === 'talk' ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{t.b9A1}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{t.b9A2}</Text>
            <Button
              testID="call-end"
              label={t.b9End}
              onPress={() => {
                if (phase !== 'talk') return; // подвійний тап в одному кадрі не перезаписує суму
                setAmount(onClaim());
                setPhase('bonus');
              }}
            />
          </>
        ) : (
          <>
            <View style={styles.doc}>
              {t.b9Doc.map((l) => (
                <Text key={l} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docLine}>{l}</Text>
              ))}
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sum} testID="call-sum">{`+${formatBig(amount, 'balance')}`}</Text>
            </View>
            <Button testID="call-close" label={t.b9Cta2} onPress={onClose} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  card: { backgroundColor: color.bgDeep, borderRadius: radius[12], padding: space[16], gap: space[8] },
  who: { ...type('h2'), color: color.text, textAlign: 'center' },
  status: { ...type('label'), color: color.muted, textAlign: 'center' },
  name: { ...type('h4'), color: color.accent },
  line: { ...type('bodyL'), color: color.text },
  doc: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[12], gap: space[2] },
  docLine: { ...type('docMeta'), color: color.ink2 },
  sum: { ...type('numL'), color: color.ink },
});
