// tg-detail для телеграми № 1 (002 FR-19): шапка, текст, строки по рівнях, 3 варіанти; коуч b8.tip над варіантами.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EconomyConfig } from '@/economy/game/types';
import { color, radius, size, space } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { choiceSummary, type Telegram, type TgChoice } from './first';
import { t } from './texts';

interface Props {
  tg: Telegram;
  cfg: EconomyConfig;
  coachText?: string;
  onChoose: (c: TgChoice) => void;
  /** Без кнопки «Назад», поки коуч кроку 8 веде до вибору */
  onBack?: () => void;
}

export function TelegramDetail({ tg, cfg, coachText, onChoose, onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[8] }]} testID="tg-detail">
      <View style={styles.bar}>
        {onBack ? (
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.backText}>{t.back}</Text>
          </Pressable>
        ) : null}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.screen}>{t.screen}</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space[16] }]}>
        <View style={styles.paper}>
          <View style={styles.head}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.no}>{t.title(tg.no)}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{tg.stamp}</Text>
          </View>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.from(t.who[tg.from] ?? tg.from)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.to(t.who[tg.to] ?? tg.to)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{tg.title}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{tg.body}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.rowsLabel}</Text>
          {tg.deadline.map(([who, val, kind]) => (
            <View key={who} style={styles.row}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rowK}>{who}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.rowV, kind === 'old' && styles.old, kind === 'alert' && styles.alert]}>{val}</Text>
            </View>
          ))}
        </View>
        {coachText ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coach} testID="coach-text" accessibilityLiveRegion="polite">{coachText}</Text>
        ) : null}
        {tg.choices.map((c) => (
          <Pressable key={c.id} testID={`tg-choice-${c.id}`} accessibilityRole="button" onPress={() => onChoose(c)} style={styles.choice}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.choiceTitle}>{c.title}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.choiceSub}>{choiceSummary(c, cfg)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bg },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[16], minHeight: size.touchMin },
  back: { minHeight: size.touchMin, justifyContent: 'center' },
  backText: { ...type('body'), color: color.accent },
  screen: { ...type('h4'), color: color.muted },
  scroll: { padding: space[16], gap: space[8] },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[4] },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  no: { ...type('docMeta'), color: color.ink },
  stamp: { ...type('stampM'), color: color.stamp, borderWidth: 2, borderColor: color.stamp, paddingHorizontal: space[6], textTransform: 'uppercase' },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('h3'), color: color.ink, marginTop: space[4] },
  body: { ...type('docBody'), color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: color.paperLine },
  rowK: { ...type('docMeta'), color: color.ink2 },
  rowV: { ...type('docMeta'), color: color.ink },
  old: { textDecorationLine: 'line-through', color: color.ink2 },
  alert: { color: color.alertPaper, fontWeight: '600' },
  coach: { ...type('bodyS'), color: color.accent, fontWeight: '600' },
  choice: { minHeight: size.touchMin, backgroundColor: color.surface, borderRadius: radius[8], borderWidth: 1, borderColor: color.border, padding: space[12], gap: space[2] },
  choiceTitle: { ...type('cta'), color: color.text },
  choiceSub: { ...type('caption'), color: color.muted },
});
