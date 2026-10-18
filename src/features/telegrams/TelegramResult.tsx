// tg-result (003 FR-19): документ-відповідь, рядки «Рішення» й ефектів, репутація з рівнем, штамп;
// у № 1 — «Що таке репутація» (002 FR-19); при випадінні перевірки — «Готуватися» / «Пізніше» (перебіг — 04).
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { FIRST_TELEGRAM_ID } from '@/telegrams/content';
import { telegramOf } from '@/telegrams/effects';
import { repTier } from '@/telegrams/reputation';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { fill, inspWarn, resultRows } from './present';
import { t } from './texts';

interface Props {
  store: ConveyorStore;
  uid: string;
  /** Пояснення репутації (002 b8.rep) — лише для № 1 */
  firstText?: string;
  onClose: () => void;
}

export function TelegramResult({ store, uid, firstText, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const s = useStore(store);
  const item = s.telegrams.inbox.find((x) => x.uid === uid);
  const tel = item && telegramOf(item);
  if (!item || !tel || !item.result) return null;
  const choice = tel.choices.find((c) => c.id === item.choiceId);
  const tierWord = t.tier[repTier(item.result.repAfter, s.cfg.params)];
  const first = item.id === FIRST_TELEGRAM_ID && firstText;
  const text = item.result.rollText ?? choice?.result ?? (choice?.kind === 'drawer' ? t.drawerDone : choice?.note) ?? '';
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="tg-result">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.paper}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{t.resMeta(tel.no ?? '')}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{fill(tel.title, item, s.onboarding.gender)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body}>{fill(text, item, s.onboarding.gender)}</Text>
          {resultRows(item, tel, s.cfg, tierWord).map(([k, v]) => (
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
        {item.result.inspHit ? (
          <View style={styles.alertBox} testID="tg-result-insp">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.alertText}>{t.inspHit(inspWarn(s.cfg))}</Text>
          </View>
        ) : null}
        {first ? (
          <View style={styles.first} testID="tg-result-first">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.firstH}>{t.resFirstH}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.firstBody}>{firstText}</Text>
          </View>
        ) : (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{t.curioNote}</Text>
        )}
      </ScrollView>
      {item.result.inspHit ? (
        <View style={styles.actions}>
          <Button
            testID="tg-result-prepare"
            label={t.inspPrepare}
            onPress={() => {
              s.prepareInspection(uid);
              onClose();
            }}
          />
          <Button testID="tg-result-cta" variant="secondary" label={t.inspLater} onPress={onClose} />
        </View>
      ) : (
        <Button testID="tg-result-cta" label={first ? t.resCtaFirst : t.resCta} onPress={onClose} />
      )}
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
  alertBox: { backgroundColor: color.alertBg, borderColor: color.alertLine, borderWidth: 1, borderRadius: radius[6], padding: space[12] },
  alertText: { ...type('body'), color: color.alertText },
  first: { backgroundColor: color.surface, borderRadius: radius[8], padding: space[12], gap: space[4], borderWidth: 1, borderColor: color.accent },
  firstH: { ...type('h4'), color: color.accent },
  firstBody: { ...type('body'), color: color.text },
  note: { ...type('caption'), color: color.muted },
  actions: { gap: space[8] },
});
