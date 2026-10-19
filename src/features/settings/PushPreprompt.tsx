// push-preprompt (010 FR-9, FR-10): шторка перед системним запитом; запит ОС лише після «Так, сповіщати».
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { setT } from './texts';

export type PushTrigger = 'onboarding_session_end' | 'settings';

export function PushPreprompt({ store, trigger, onClose }: { store: ConveyorStore; trigger: PushTrigger; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const pp = setT.pp;
  return (
    <View style={styles.scrim} testID="push-preprompt">
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header" style={styles.h2}>{pp.title}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{pp.body}</Text>
        {[
          [pp.ex1Title, pp.ex1Body],
          [pp.ex2Title, pp.ex2Body],
        ].map(([title, body]) => (
          <View key={title} style={styles.example}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.exTitle}>{title}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.exBody}>{body}</Text>
          </View>
        ))}
        <Button
          testID="pp-yes"
          label={pp.yes}
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void store.getState().requestPush(trigger).finally(onClose);
          }}
        />
        <Button
          testID="pp-later"
          variant="ghost"
          label={pp.later}
          onPress={() => {
            store.getState().declinePush(trigger);
            onClose();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bg, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  h2: { ...type('h2'), color: color.text },
  body: { ...type('body'), color: color.text },
  example: { backgroundColor: color.surface, borderRadius: radius[6], padding: space[12], gap: space[2] },
  exTitle: { ...type('bodyS'), color: color.text, fontWeight: '600' },
  exBody: { ...type('caption'), color: color.muted },
});
