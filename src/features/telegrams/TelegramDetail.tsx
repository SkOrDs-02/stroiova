// tg-detail (003 FR-12; 002 FR-19): шапка, текст, строки, плитки репутації й паперу, «Як реагуємо?», варіанти з ціною.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { telegramOf } from '@/telegrams/effects';
import { repTier } from '@/telegrams/reputation';
import { color, radius, size, space, typeScale } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { choiceView, fill } from './present';
import { t } from './texts';

interface Props {
  store: ConveyorStore;
  uid: string;
  /** Підказка коуча над варіантами (002 крок 8) */
  coachText?: string;
  onAnswered: (uid: string) => void;
  onFlag: (uid: string) => void;
  /** Без «Назад», поки коуч кроку 8 веде до вибору */
  onBack?: () => void;
}

export function TelegramDetail({ store, uid, coachText, onAnswered, onFlag, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const s = useStore(store);
  const item = s.telegrams.inbox.find((x) => x.uid === uid);
  const tel = item && telegramOf(item);
  if (!item || !tel) return null;
  const isMsg = tel.docType === 'message';
  const answerable = item.status === 'new' || item.status === 'drawer';
  const fromDrawer = item.status === 'drawer';
  const views = tel.choices.map((c) => choiceView(c, s.telegrams, s.state, s.cfg, fromDrawer)).filter((v) => !(fromDrawer && v.choice.kind === 'drawer'));
  const tier = t.tier[repTier(s.telegrams.reputation.value, s.cfg.params)];
  const g = s.onboarding.gender;
  const choose = (choiceId: string) => {
    const r = s.answerTelegram(uid, choiceId);
    if (!('error' in r)) onAnswered(uid);
  };
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[8] }]} testID="tg-detail">
      <View style={styles.bar}>
        {onBack ? (
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.back} testID="tg-back">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.backText}>{t.back}</Text>
          </Pressable>
        ) : null}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.screen}>{isMsg ? t.screenMsg : t.screen}</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space[16] }]}>
        <View style={styles.tiles}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tile}>{t.repTile(tier)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tile}>{`${t.resPaper}: ${Math.floor(s.state.paper)}`}</Text>
        </View>
        <View style={styles.paper}>
          <View style={styles.head}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.no}>{isMsg ? t.titleMsg(tel.no ?? '') : t.title(tel.no ?? '')}</Text>
            {tel.stamp ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{tel.stamp}</Text> : null}
          </View>
          {tel.from ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.from(t.who[tel.from] ?? tel.from)}</Text> : null}
          {tel.to ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.to(t.who[tel.to] ?? tel.to)}</Text> : null}
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{fill(tel.title, item, g)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{fill(tel.body, item, g)}</Text>
          {Array.isArray(tel.deadline) ? (
            <>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.rowsLabel}</Text>
              {tel.deadline.map(([who, val, kind]) => (
                <View key={who} style={styles.row}>
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rowK}>{who}</Text>
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.rowV, kind === 'old' && styles.old, kind === 'alert' && styles.alert]}>{val}</Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
        {answerable ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{t.howReact}</Text>
            {coachText ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coach} testID="coach-text" accessibilityLiveRegion="polite">{coachText}</Text> : null}
            {views.map((v) => (
              <Pressable
                key={v.choice.id}
                testID={`tg-choice-${v.choice.id}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: v.disabled != null }}
                disabled={v.disabled != null}
                onPress={() => choose(v.choice.id)}
                style={[styles.choice, v.disabled != null && styles.choiceOff]}
              >
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.choiceTitle, v.disabled != null && styles.offText]}>
                  {fill(v.choice.title, item, g)}
                  {v.choice.isNew ? <Text style={styles.isNew}>{`  ${t.isNew}`}</Text> : null}
                </Text>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.choiceSub}>{v.summary}</Text>
                {v.disabled ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.why} testID={`tg-why-${v.choice.id}`}>{v.disabled}</Text> : null}
              </Pressable>
            ))}
          </>
        ) : null}
        <Pressable accessibilityRole="button" onPress={() => onFlag(uid)} disabled={!!item.flagged} style={styles.flag} testID="tg-flag-open">
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.flagText}>{item.flagged ? t.flagged : t.notFunny}</Text>
        </Pressable>
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
  tiles: { flexDirection: 'row', gap: space[8] },
  tile: { ...type('caption'), color: color.text, backgroundColor: color.surface, borderRadius: radius[6], paddingHorizontal: space[8], paddingVertical: space[6], overflow: 'hidden' },
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
  alert: { color: color.alertPaper, fontWeight: typeScale.cta.fontWeight },
  h4: { ...type('h4'), color: color.muted, marginTop: space[8] },
  coach: { ...type('bodyS'), color: color.accent, fontWeight: typeScale.cta.fontWeight },
  choice: { minHeight: size.touchMin, backgroundColor: color.surface, borderRadius: radius[8], borderWidth: 1, borderColor: color.border, padding: space[12], gap: space[2] },
  choiceOff: { backgroundColor: color.surface2 },
  choiceTitle: { ...type('cta'), color: color.text },
  offText: { color: color.muted },
  isNew: { ...type('label'), color: color.accent },
  choiceSub: { ...type('caption'), color: color.muted },
  why: { ...type('caption'), color: color.fail },
  flag: { minHeight: size.touchMin, justifyContent: 'center', alignSelf: 'flex-start' },
  flagText: { ...type('bodyS'), color: color.muted, textDecorationLine: 'underline' },
});
