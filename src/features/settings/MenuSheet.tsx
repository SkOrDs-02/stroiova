// menu (010 FR-30): шторка з позивним, чотирма пунктами й підвалом. Бейдж «нове» біля Журналу курйозів, поки є непереглянутий запис.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { hasNewCurio } from '@/museum/museum';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { APP_VERSION } from './data';
import { LinkRow } from './Parts';
import { setT } from './texts';

export function MenuSheet({ store, onClose, onProfile, onCurios, onSettings, onAbout }: { store: ConveyorStore; onClose: () => void; onProfile: () => void; onCurios: () => void; onSettings: () => void; onAbout: () => void }) {
  const callsign = useStore(store, (s) => s.onboarding.callsign?.text ?? '');
  const isNew = useStore(store, (s) => hasNewCurio(s.museum));
  const curios = useStore(store, (s) => s.museum.curios.length);
  return (
    <View style={styles.scrim} testID="menu">
      <Pressable style={styles.fill} accessibilityLabel={setT.close} onPress={onClose} />
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header" style={styles.h2}>{setT.menu}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.who} testID="menu-who">{`${callsign} · ${setT.pf.postValue}`}</Text>
        <LinkRow id="menu-profile" label={setT.items.profile} note={setT.menuSub.profile} onPress={onProfile} />
        <LinkRow id="menu-curios" label={setT.items.curios} note={isNew ? setT.curiosSubNew : setT.curiosSub(curios)} badge={isNew ? setT.newBadge : undefined} onPress={onCurios} />
        <LinkRow id="menu-settings" label={setT.items.settings} note={setT.menuSub.settings} onPress={onSettings} />
        <LinkRow id="menu-about" label={setT.items.about} note={setT.menuSub.about} onPress={onAbout} />
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.foot} testID="menu-foot">{setT.menuFoot(APP_VERSION)}</Text>
        <Button testID="menu-close" variant="ghost" label={setT.close} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  fill: { flex: 1 },
  sheet: { backgroundColor: color.bg, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[4] },
  h2: { ...type('h2'), color: color.text },
  who: { ...type('bodyS'), color: color.muted, marginBottom: space[8] },
  foot: { ...type('caption'), color: color.muted, marginTop: space[8] },
});
