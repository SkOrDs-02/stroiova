// tg-pack (011 FR-19, FR-20): обкладинка «Зведення № N», три картки, вид зведеної відповіді з прогнозом поруч із сумою окремих.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { formatMult } from '@/economy/format';
import type { ConveyorStore } from '@/features/conveyor/store';
import { cutHours, telegramOf } from '@/telegrams/effects';
import { packByNo, packForecast, type SummaryKind } from '@/telegrams/packs';
import type { InboxItem } from '@/telegrams/types';
import { color, radius, size, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { fill, forecastLine, separateLine, short, unitName } from './present';
import { t } from './texts';

interface Props {
  store: ConveyorStore;
  no: number;
  onBack: () => void;
  onOpen: (item: InboxItem) => void;
  /** Зведено: перейти до документа-відповіді */
  onSummed: (no: number) => void;
}

export function PackScreen({ store, no, onBack, onOpen, onSummed }: Props) {
  const insets = useSafeAreaInsets();
  const s = useStore(store);
  const g = packByNo(s.telegrams, no);
  const forecast = g && g.status === 'new' ? packForecast(s.telegrams, s.state, s.cfg, no) : [];
  const [picked, setSel] = useState<SummaryKind | null>(() => forecast.find((f) => f.available)?.kind ?? null);
  if (!g) return null;
  // обраний вид міг стати недоступним (папір змінився): тоді кнопка неактивна, причина видна на картці
  const sel = picked && forecast.find((f) => f.kind === picked)?.available ? picked : null;
  const gender = s.onboarding.gender;
  const summable = g.status === 'new';
  const sum = () => {
    if (!sel) return;
    const r = s.answerPack(no, sel);
    if (!('error' in r)) onSummed(no);
  };
  const cardState = (i: InboxItem) => {
    if (g.summary) return t.pkCardSummary(t.kind[g.summary] ?? g.summary);
    if (i.status === 'new') return t.pkCardNew;
    if (i.status === 'drawer') return t.pkCardDrawer;
    const kind = telegramOf(i)?.choices.find((c) => c.id === i.choiceId)?.kind;
    return t.pkCardDone(kind ? (t.kind[kind] ?? kind) : '');
  };
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[8] }]} testID="tg-pack">
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back} testID="pk-back">
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.backText}>{t.back}</Text>
        </Pressable>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.screen}>{t.pkScreen}</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space[16] }]}>
        <View style={styles.cover}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coverText} testID="pk-cover">{t.pkCover(no, g.answered)}</Text>
        </View>
        {g.items.map((i) => {
          const tel = telegramOf(i);
          return (
            <Pressable key={i.uid} testID={`pk-card-${i.pack!.index}`} accessibilityRole="button" onPress={() => onOpen(i)} style={styles.card}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cardNo}>{t.title(tel?.no ?? '')}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} style={styles.cardTitle}>{tel ? fill(tel.title, i, gender) : i.id}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cardState}>{cardState(i)}</Text>
            </Pressable>
          );
        })}
        {summable ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{t.pkSummaryH}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.hint}>{t.pkSummaryHint}</Text>
            {forecast.map((f) => {
              const on = sel === f.kind;
              const slow = f.slow ? t.slow(short(unitName(s.cfg, 'narada')), formatMult(f.slow.mult), cutHours(f.slow.hours, s.state)) : null;
              return (
                <Pressable
                  key={f.kind}
                  testID={`pk-kind-${f.kind}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on, disabled: !f.available }}
                  disabled={!f.available}
                  onPress={() => setSel(f.kind)}
                  style={[styles.kind, on && styles.kindOn, !f.available && styles.kindOff]}
                >
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.kindTitle, !f.available && styles.offText]}>{t.kind[f.kind] ?? f.kind}</Text>
                  {f.reason === 'kind' ? (
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.why} testID={`pk-why-${f.kind}`}>{t.pkNoKind}</Text>
                  ) : (
                    <>
                      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line} testID={`pk-merged-${f.kind}`}>{`${t.pkMerged}: ${forecastLine(f.paper, f.rep, f.chancePct)}`}</Text>
                      {slow ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{slow}</Text> : null}
                      {f.kind === 'diligent' ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line} testID="pk-buff">{t.pkBuff(formatMult(s.cfg.params.pack.summaryBuff), s.cfg.params.pack.summaryBuffHours)}</Text> : null}
                      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.lineMuted} testID={`pk-sep-${f.kind}`}>{`${t.pkSeparate}: ${separateLine(f.separate)}`}</Text>
                      {f.reason === 'paper' ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.why} testID={`pk-why-${f.kind}`}>{t.noPaper(f.lackPaper ?? 0)}</Text> : null}
                    </>
                  )}
                </Pressable>
              );
            })}
          </>
        ) : g.summary ? null : (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.hint} testID="pk-partial">{t.pkPartial}</Text>
        )}
      </ScrollView>
      {summable ? (
        <View style={[styles.sticky, { paddingBottom: insets.bottom + space[8] }]}>
          <Button testID="pk-summary" label={t.pkSummaryCta} disabled={!sel} onPress={sum} />
        </View>
      ) : g.summary ? (
        <View style={[styles.sticky, { paddingBottom: insets.bottom + space[8] }]}>
          <Button testID="pk-open-result" label={t.pkOpenResult} onPress={() => onSummed(no)} />
        </View>
      ) : null}
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
  cover: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16] },
  coverText: { ...type('h3'), color: color.ink },
  card: { minHeight: size.touchMin, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12], gap: space[2] },
  cardNo: { ...type('label'), color: color.muted },
  cardTitle: { ...type('cta'), color: color.text },
  cardState: { ...type('caption'), color: color.muted },
  h4: { ...type('h4'), color: color.muted, marginTop: space[8] },
  hint: { ...type('caption'), color: color.muted },
  kind: { minHeight: size.touchMin, backgroundColor: color.surface, borderRadius: radius[8], borderWidth: 1, borderColor: color.border, padding: space[12], gap: space[2] },
  kindOn: { borderColor: color.accent, borderWidth: 2 },
  kindOff: { backgroundColor: color.surface2 },
  kindTitle: { ...type('cta'), color: color.text },
  offText: { color: color.muted },
  line: { ...type('bodyS'), color: color.text },
  lineMuted: { ...type('caption'), color: color.muted },
  why: { ...type('caption'), color: color.fail },
  sticky: { paddingHorizontal: space[16], paddingTop: space[8], backgroundColor: color.bg },
});
