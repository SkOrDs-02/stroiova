// force-update (009 FR-11; FR-27 — коли з'явиться CDN): телеграма № 1100 і кнопка в стор.
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, size, space, typeScale } from '@/theme';

import { t } from './texts';

// Сторінки гри в сторах з'являться після реєстрації акаунтів і bundle id (ВП етапу 0); до того — пошук стору.
const STORE_URL = Platform.OS === 'ios' ? 'https://apps.apple.com/' : 'https://play.google.com/store';

export function ForceUpdateScreen({ installed, required }: { installed: string; required: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="force-update">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.paper}>
          <Text style={styles.paperH}>{t.updTgH}</Text>
          <Text style={styles.paperBody}>{t.updTgBody(installed)}</Text>
          <Text style={styles.paperH}>{t.updTgTerm}</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">{t.updTitle}</Text>
        <Text style={styles.sub}>{t.updSub}</Text>
        <Text style={styles.sub}>{t.updInstalled(installed)}</Text>
        <Text style={styles.sub}>{t.updRequired(required)}</Text>
      </ScrollView>
      <Pressable testID="force-update-cta" accessibilityRole="button" onPress={() => Linking.openURL(STORE_URL)} style={styles.primary}>
        <Text style={styles.primaryText}>{Platform.OS === 'ios' ? t.updCtaIos : t.updCtaAndroid}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[16] },
  scroll: { gap: space[12], paddingBottom: space[16] },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[8] },
  paperH: { color: color.ink2, fontSize: typeScale.docMeta.fontSize, lineHeight: typeScale.docMeta.lineHeight },
  paperBody: { color: color.ink, fontSize: typeScale.docBody.fontSize, lineHeight: typeScale.docBody.lineHeight },
  title: { color: color.text, fontSize: typeScale.h1.fontSize, lineHeight: typeScale.h1.lineHeight, fontWeight: typeScale.h1.fontWeight },
  sub: { color: color.muted, fontSize: typeScale.body.fontSize, lineHeight: typeScale.body.lineHeight },
  primary: { minHeight: size.ctaHeight, borderRadius: radius[6], backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: color.accentInk, fontSize: typeScale.cta.fontSize, fontWeight: typeScale.cta.fontWeight },
});
