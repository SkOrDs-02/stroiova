// about (010 FR-27): «Штатний розпис», «Про відсоток» (рішення 17, 87), посилання в зовнішньому браузері, версія й анонімний ID.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { aboutCfg, versionLine } from './data';
import { Frame, LinkRow } from './Parts';
import { setT } from './texts';

export function AboutScreen({ store, installId, insetTop, onBack, onReports, onLicenses }: { store: ConveyorStore; installId: string; insetTop: number; onBack: () => void; onReports: () => void; onLicenses: () => void }) {
  const links = useStore(store, (s) => s.services.links);
  const [copied, setCopied] = useState(false);
  const ab = setT.ab;
  return (
    <Frame title={ab.title} testID="about" insetTop={insetTop} onBack={onBack}>
      <View style={styles.title}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.game}>{ab.game}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{ab.tagline}</Text>
      </View>

      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header" style={styles.h4}>{ab.staff}</Text>
      <View style={styles.paper}>
        {[
          [ab.dev, ab.devValue],
          [ab.art, aboutCfg.illustrator],
          [ab.cat, ab.catValue],
        ].map(([k, v]) => (
          <View key={k} style={styles.line}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{k}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.v}>{v}</Text>
          </View>
        ))}
      </View>

      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header" style={styles.h4}>{ab.percent}</Text>
      <View style={styles.percent} testID="about-percent">
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{ab.percentBody(aboutCfg.percent, aboutCfg.fund)}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{ab.percentSign}</Text>
      </View>

      <LinkRow id="about-reports" label={ab.reports} onPress={onReports} />
      <LinkRow id="about-privacy" label={ab.privacy} onPress={() => links.open(aboutCfg.privacyUrl)} />
      <LinkRow id="about-licenses" label={ab.licenses} onPress={onLicenses} />
      <LinkRow id="about-contact" label={ab.contact} onPress={() => links.open(`mailto:${aboutCfg.email}`)} />

      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="about-version">{ab.version(versionLine())}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="about-id" selectable>{ab.id(installId)}</Text>
      <Button
        testID="about-copy"
        variant="secondary"
        label={copied ? ab.copied : ab.copy}
        onPress={() => {
          links.copy(installId);
          setCopied(true);
        }}
      />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{ab.idNote}</Text>
    </Frame>
  );
}

const styles = StyleSheet.create({
  title: { gap: space[2] },
  game: { ...type('h1'), color: color.text },
  h4: { ...type('h4'), color: color.muted, marginTop: space[12] },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[12], gap: space[6] },
  line: { flexDirection: 'row', gap: space[8] },
  k: { ...type('caption'), color: color.ink2, width: 100 },
  v: { ...type('body'), color: color.ink, flex: 1 },
  percent: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radius[6], padding: space[12], gap: space[6] },
  body: { ...type('body'), color: color.text },
  muted: { ...type('caption'), color: color.muted },
});
