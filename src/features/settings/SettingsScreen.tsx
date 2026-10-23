// settings (010 FR-12…FR-18): звук і вібрація, категорії сповіщень (або стан «заборонено»), статистика, покупки й прогрес.
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import type { PushCategory } from '@/notifications/types';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { Frame, LinkRow, Section, ToggleRow } from './Parts';
import { setT } from './texts';

const CATS: PushCategory[] = ['storage', 'telegrams', 'inspections', 'gifts', 'boosts'];

export function SettingsScreen({ store, insetTop, onBack, onReset, onAskPush }: { store: ConveyorStore; insetTop: number; onBack: () => void; onReset: () => void; onAskPush: () => void }) {
  const s = useStore(store);
  const st = s.settings;
  useEffect(() => {
    void store.getState().refreshPermission();
  }, [store]);
  const denied = st.pushPermission === 'denied';
  return (
    <Frame title={setT.title} testID="settings" insetTop={insetTop} onBack={onBack}>
      <Section title={setT.sectionSound} />
      <ToggleRow id="set-sound" label={setT.sound} value={st.sound} onChange={(v) => s.setSetting('sound', v)} />
      <ToggleRow id="set-haptics" label={setT.haptics} value={st.haptics} onChange={(v) => s.setSetting('haptics', v)} />

      <Section title={setT.sectionNotif} />
      {denied ? (
        <View style={styles.denied} testID="set-denied">
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.deniedTitle}>{setT.deniedTitle}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.deniedBody}>{setT.deniedBody}</Text>
          <Button testID="set-open-os" variant="secondary" label={setT.openPhoneSettings} onPress={() => s.services.notifications.openSystemSettings()} />
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{setT.deniedHint}</Text>
        </View>
      ) : (
        <>
          {CATS.map((c) => (
            <ToggleRow
              key={c}
              id={`set-notif-${c}`}
              label={setT.cat[c]}
              value={st.notif[c]}
              onChange={(v) => {
                // FR-10, рішення 92: перший тап по будь-якій категорії, поки відповіді ОС ще немає
                if (st.pushPermission === 'not_asked') onAskPush();
                s.setNotifCategory(c, v);
              }}
            />
          ))}
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{setT.notifNote}</Text>
        </>
      )}

      <Section title={setT.sectionPrivacy} />
      <ToggleRow id="set-analytics" label={setT.analytics} note={setT.analyticsNote} value={st.analytics} onChange={(v) => s.setSetting('analytics', v)} />
      {/* FR-17: лише коли UMP вимагає точку входу до налаштувань приватності (ЄЕЗ, Британія, Швейцарія) */}
      {!s.state.hasNoAds && s.services.ads.privacyOptionsRequired?.() ? <LinkRow id="set-ad-privacy" label={setT.adPrivacy} note={setT.adPrivacyNote} disabled={s.busy != null} onPress={() => void s.services.ads.showPrivacyOptions?.()} /> : null}

      <Section title={setT.sectionPurchases} />
      <LinkRow id="set-restore" label={setT.restore} note={setT.restoreNote} disabled={s.busy != null} onPress={() => void s.restore('settings_button')} />
      <LinkRow id="set-reset" label={setT.reset} note={setT.resetNote} danger onPress={onReset} />
      {st.testUser ? <ToggleRow id="set-test" label={setT.testUser} value onChange={(v) => s.setSetting('testUser', v)} /> : null}
    </Frame>
  );
}

const styles = StyleSheet.create({
  denied: { backgroundColor: color.alertBg, borderWidth: 1, borderColor: color.alertLine, borderRadius: radius[6], padding: space[12], gap: space[8] },
  deniedTitle: { ...type('h4'), color: color.alertText },
  deniedBody: { ...type('body'), color: color.alertText },
  note: { ...type('caption'), color: color.muted },
});
