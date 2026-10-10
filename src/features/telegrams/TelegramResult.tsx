// tg-result (002 FR-19): відповідь, наслідки; стан «перший раз: що таке репутація» з b8.rep (артборд TgResult).
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EconomyConfig } from '@/economy/game/types';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { resultRows, type Telegram, type TgChoice } from './first';
import { t } from './texts';

interface Props {
  tg: Telegram;
  choice: TgChoice;
  cfg: EconomyConfig;
  /** Пояснення репутації (перший раз) */
  firstText?: string;
  onClose: () => void;
}

export function TelegramResult({ tg, choice, cfg, firstText, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="tg-result">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.paper}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.resMeta(tg.no)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{tg.title}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{choice.result ?? choice.note ?? ''}</Text>
          {resultRows(choice, cfg).map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rowK}>{k}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rowV}>{v}</Text>
            </View>
          ))}
          <View style={styles.foot}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.resSigner}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{t.resStamp}</Text>
          </View>
        </View>
        {firstText ? (
          <View style={styles.first} testID="tg-result-first">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.firstH}>{t.resFirstH}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.firstBody}>{firstText}</Text>
          </View>
        ) : null}
      </ScrollView>
      <Button testID="tg-result-cta" label={t.resCtaFirst} onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bg, paddingHorizontal: space[16], gap: space[12] },
  scroll: { gap: space[12] },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[4] },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('h3'), color: color.ink },
  body: { ...type('docBody'), color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: color.paperLine },
  rowK: { ...type('docMeta'), color: color.ink2 },
  rowV: { ...type('docMeta'), color: color.ink },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[8] },
  stamp: { ...type('stampM'), color: color.stamp, borderWidth: 2, borderColor: color.stamp, paddingHorizontal: space[6], textTransform: 'uppercase' },
  first: { backgroundColor: color.surface, borderRadius: radius[8], padding: space[12], gap: space[4], borderWidth: 1, borderColor: color.accent },
  firstH: { ...type('h4'), color: color.accent },
  firstBody: { ...type('body'), color: color.text },
});
