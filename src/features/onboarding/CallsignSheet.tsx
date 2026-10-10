// Шторка callsign-input (002 FR-6, FR-7): лічильник «n/16», «Вписати в графу» неактивна до 2 знаків, стоп-слова на тап.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { CALLSIGN_MAX, CALLSIGN_MIN, validateCallsign, type CallsignError } from './callsign';
import { t } from './texts';

const ERR: Record<CallsignError, string> = { empty: t.o3Err2, tooShort: t.o3Err5, tooLong: t.o3Err1, chars: t.o3Err4, stopword: t.o3Err4 };

export function CallsignSheet({ initial, onDone, onClose }: { initial: string; onDone: (text: string) => void; onClose: () => void }) {
  const [value, setValue] = useState(initial);
  const [tapErr, setTapErr] = useState<CallsignError | null>(null);
  const n = [...value.trim()].length;
  // довжину видно одразу; знаки й стоп-слова — на тап «Вписати в графу» (FR-7)
  const liveErr: CallsignError | null = n === 0 ? 'empty' : n < CALLSIGN_MIN ? 'tooShort' : n > CALLSIGN_MAX ? 'tooLong' : null;
  const err = liveErr ?? tapErr;
  const submit = () => {
    const r = validateCallsign(value);
    if (r.ok) onDone(value.trim());
    else setTapErr(r.error);
  };
  return (
    <View style={styles.scrim} testID="callsign-input">
      <Pressable style={styles.fill} accessibilityLabel={t.o3SheetTitle} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{t.o3SheetTitle}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sub}>{t.o3SheetSub}</Text>
          <View style={[styles.field, err && n > 0 ? styles.fieldBad : null]}>
            <TextInput
              testID="callsign-field"
              value={value}
              onChangeText={(v) => {
                setValue(v);
                setTapErr(null);
              }}
              autoFocus
              autoCorrect={false}
              maxLength={32}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={styles.input}
              accessibilityLabel={t.o3SheetTitle}
            />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.count, n > CALLSIGN_MAX && styles.countOver]} testID="callsign-count">
              {t.o3Counter(n)}
            </Text>
          </View>
          {err ? (
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.err} testID="callsign-err" accessibilityLiveRegion="polite">
              {ERR[err]}
            </Text>
          ) : null}
          <Button testID="o3-sheet-cta" label={t.o3SheetCta} disabled={liveErr != null} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  fill: { flex: 1 },
  sheet: { backgroundColor: color.bgDeep, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.text },
  sub: { ...type('bodyS'), color: color.muted },
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: color.borderStrong, borderRadius: radius[6], paddingHorizontal: space[12] },
  fieldBad: { borderColor: color.fail, borderWidth: 2 },
  input: { flex: 1, minHeight: 48, color: color.text, ...type('bodyL') },
  count: { ...type('numS'), color: color.muted },
  countOver: { color: color.fail },
  err: { ...type('bodyS'), color: color.fail },
});
