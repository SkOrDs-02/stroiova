// fund-reports (010 FR-28, FR-25): підсумок і список звітів; квитанції - у зовнішньому браузері. Без звітів - порожній стан.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, size, space } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { aboutCfg } from './data';
import { Frame } from './Parts';
import { setT } from './texts';

const uah = (n: number) => `${Math.round(n).toLocaleString('uk-UA')} ₴`;

export function FundReportsScreen({ store, insetTop, onBack }: { store: ConveyorStore; insetTop: number; onBack: () => void }) {
  const links = useStore(store, (s) => s.services.links);
  const fr = setT.fr;
  const reports = [...aboutCfg.reports].sort((a, b) => b.no - a.no);
  const total = reports.reduce((n, r) => n + r.sumUah, 0);
  return (
    <Frame title={fr.title} testID="fund-reports" insetTop={insetTop} onBack={onBack}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{fr.intro(aboutCfg.percent, aboutCfg.fund)}</Text>
      {reports.length === 0 ? (
        <View style={styles.empty} testID="fr-empty">
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.emptyTitle}>{fr.emptyTitle}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{fr.emptyBody}</Text>
        </View>
      ) : (
        <>
          <View style={styles.sum}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.num} testID="fr-total">{uah(total)}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{`${fr.total} · ${fr.count}: ${reports.length}`}</Text>
          </View>
          {reports.map((r) => (
            <View key={r.no} style={styles.report} testID={`fr-report-${r.no}`}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{`№ ${r.no} · ${r.month}`}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{`${fr.done} · ${fr.sum}: ${uah(r.sumUah)} · ${fr.date}: ${r.transferDate}`}</Text>
              <Pressable testID={`fr-receipt-${r.no}`} accessibilityRole="link" onPress={() => links.open(r.receiptUrl)} style={styles.link}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.linkText}>{fr.receipt}</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
    </Frame>
  );
}

const styles = StyleSheet.create({
  muted: { ...type('caption'), color: color.muted },
  empty: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radius[6], padding: space[16], gap: space[6] },
  emptyTitle: { ...type('body'), color: color.text },
  sum: { gap: space[2] },
  num: { ...type('displayM'), color: color.accent },
  report: { backgroundColor: color.surface, borderRadius: radius[6], padding: space[12], gap: space[4] },
  title: { ...type('body'), color: color.text, fontWeight: '600' },
  link: { minHeight: size.touchMin, justifyContent: 'center' },
  linkText: { ...type('body'), color: color.accent, textDecorationLine: 'underline' },
});
