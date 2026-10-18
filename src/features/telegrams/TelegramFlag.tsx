// tg-flag (003 FR-26): 4 причини (необов'язково), коментар ≤ 280, «Позначено»; на гру не впливає. Відправка — етап 5.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { telegramOf } from '@/telegrams/effects';
import { color, radius, size, space, typeScale } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { t } from './texts';

export const FLAG_COMMENT_MAX = 280;

export function TelegramFlag({ store, uid, onClose }: { store: ConveyorStore; uid: string; onClose: () => void }) {
  const s = useStore(store);
  const item = s.telegrams.inbox.find((x) => x.uid === uid);
  const tel = item && telegramOf(item);
  const [reason, setReason] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  if (!item || !tel) return null;
  return (
    <View style={styles.scrim} testID={sent ? 'tg-flag-thanks' : 'tg-flag'}>
      <View style={styles.sheet} accessibilityViewIsModal>
        {sent ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{t.flagThanks}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sub}>{t.flagThanksSub}</Text>
            <Button testID="tg-flag-back" label={t.flagBack} onPress={onClose} />
          </>
        ) : (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{t.flagTitle}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sub}>{t.flagFor(tel.no ?? '')}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.sub}>{t.flagSub}</Text>
            {t.flagReasons.map((r, i) => (
              <Pressable key={r} testID={`tg-flag-reason-${i}`} accessibilityRole="radio" accessibilityState={{ selected: reason === i }} onPress={() => setReason(reason === i ? null : i)} style={[styles.reason, reason === i && styles.reasonOn]}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.reasonText, reason === i && styles.reasonTextOn]}>{r}</Text>
              </Pressable>
            ))}
            <TextInput
              testID="tg-flag-comment"
              value={comment}
              onChangeText={setComment}
              maxLength={FLAG_COMMENT_MAX}
              multiline
              placeholder={t.flagComment}
              placeholderTextColor={color.muted}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={styles.input}
            />
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{t.flagNote}</Text>
            <Button
              testID="tg-flag-send"
              label={t.flagSend}
              onPress={() => {
                if (sent) return;
                s.flagTelegram(uid, reason, comment.trim().length > 0);
                setSent(true);
              }}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bgDeep, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.text },
  sub: { ...type('bodyS'), color: color.muted },
  reason: { minHeight: size.touchMin, borderRadius: radius[6], borderWidth: 1, borderColor: color.borderStrong, justifyContent: 'center', paddingHorizontal: space[12] },
  reasonOn: { backgroundColor: color.accent, borderColor: color.accent },
  reasonText: { ...type('body'), color: color.text },
  reasonTextOn: { color: color.accentInk, fontWeight: typeScale.cta.fontWeight },
  input: { ...type('body'), color: color.text, minHeight: size.ctaHeight * 2, borderWidth: 1, borderColor: color.borderStrong, borderRadius: radius[6], padding: space[8], textAlignVertical: 'top' },
  note: { ...type('caption'), color: color.muted },
});
