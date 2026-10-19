// licenses (010 FR-29): шрифти OFL 1.1 (копірайт і повний текст), звуки, бібліотеки за production-залежностями збірки.
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { fontRows, libraryRows, oflText } from './data';
import { Frame, Section } from './Parts';
import { setT } from './texts';

export function LicensesScreen({ insetTop, onBack }: { insetTop: number; onBack: () => void }) {
  const li = setT.li;
  return (
    <Frame title={li.title} testID="licenses" insetTop={insetTop} onBack={onBack}>
      <Section title={li.fonts} />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{li.fontsLicense}</Text>
      {fontRows().map((f) => (
        <View key={f.name} style={styles.row} testID={`li-font-${f.name}`}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.name}>{f.name}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{f.copyright}</Text>
        </View>
      ))}
      <View style={styles.license} testID="li-ofl">
        {oflText.map((p, i) => (
          <Text key={i} maxFontSizeMultiplier={MAX_FONT_SCALE} style={i === 0 ? styles.licenseHead : styles.licenseText}>{p}</Text>
        ))}
      </View>

      <Section title={li.sounds} />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="li-sounds">{li.soundsNone}</Text>

      <Section title={li.libs} />
      {libraryRows().map((l) => (
        <View key={l.name} style={styles.lib} testID={`li-lib-${l.name}`}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.name, styles.flex]}>{`${l.name} ${l.version}`}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{l.license}</Text>
        </View>
      ))}
    </Frame>
  );
}

const styles = StyleSheet.create({
  muted: { ...type('caption'), color: color.muted },
  name: { ...type('body'), color: color.text },
  flex: { flex: 1 },
  row: { gap: space[2], paddingVertical: space[6], borderBottomWidth: 1, borderBottomColor: color.border },
  lib: { flexDirection: 'row', gap: space[8], paddingVertical: space[6], borderBottomWidth: 1, borderBottomColor: color.border },
  license: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[12], gap: space[6], marginTop: space[8] },
  licenseHead: { ...type('bodyS'), color: color.ink, fontWeight: '600' },
  licenseText: { ...type('caption'), color: color.ink },
});
