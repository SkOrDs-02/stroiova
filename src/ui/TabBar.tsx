// Нижня навігація (design/system/components/TabBar): 5 вкладок, бейдж нових телеграм, «9+» понад 9.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, size, space } from '@/theme';

import { MAX_FONT_SCALE } from './Button';
import { t } from './texts';
import { type } from './type';

export type TabId = 'stroyova' | 'telegrams' | 'digital' | 'museum' | 'shop';

const TABS: { id: TabId; label: string }[] = (Object.keys(t.tabs) as TabId[]).map((id) => ({ id, label: t.tabs[id] }));

interface Props {
  active: TabId;
  telegramsNew?: number;
  /** Крапка на «Цифрі»: рекомендовано цифровізуватися (06 FR-9) */
  digitalDot?: boolean;
  /** Крапка на «Музеї»: є непереглянутий журнал (07 FR-20) */
  museumDot?: boolean;
  /** Коуч: лише ця вкладка тапається, решта приглушена (002 FR-15) */
  coachTab?: TabId;
  /** Вкладки, яких ще немає в збірці (06–08): не тапаються */
  enabled?: TabId[];
  bottomInset?: number;
  onChange: (tab: TabId) => void;
}

export function TabBar({ active, telegramsNew = 0, digitalDot = false, museumDot = false, coachTab, enabled, bottomInset = 0, onChange }: Props) {
  return (
    <View style={[styles.bar, { paddingBottom: bottomInset }]} accessibilityRole="tablist" testID="tabbar">
      {TABS.map((tab) => {
        const on = active === tab.id;
        const off = (coachTab != null && coachTab !== tab.id) || (enabled != null && !enabled.includes(tab.id));
        const badge = tab.id === 'telegrams' && telegramsNew > 0 ? (telegramsNew > 9 ? '9+' : String(telegramsNew)) : null;
        return (
          <Pressable
            key={tab.id}
            testID={`tab-${tab.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: off }}
            accessibilityLabel={badge ? t.tabNew(tab.label, badge) : tab.label}
            disabled={off}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, coachTab === tab.id && styles.lit]}
          >
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} style={[styles.label, on && styles.labelOn, off && styles.labelOff]}>
              {tab.label}
            </Text>
            {tab.id === 'digital' && digitalDot ? <View style={styles.dot} testID="tab-digital-dot" accessibilityLabel={t.digitalDot} /> : null}
            {tab.id === 'museum' && museumDot ? <View style={styles.dot} testID="tab-museum-dot" accessibilityLabel={t.museumDot} /> : null}
            {badge ? (
              <View style={styles.badge} testID="tab-telegrams-badge">
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: color.bgDeep, borderTopWidth: 1, borderTopColor: color.border },
  tab: { flex: 1, minHeight: size.tabHeight, alignItems: 'center', justifyContent: 'center', borderRadius: radius[6] },
  lit: { borderWidth: 2, borderColor: color.accent },
  label: { ...type('label'), color: color.muted },
  labelOn: { color: color.accent },
  labelOff: { color: color.pencil },
  badge: { position: 'absolute', top: space[6], right: space[8], minWidth: space[18], borderRadius: radius.pill, backgroundColor: color.alert, paddingHorizontal: space[4], alignItems: 'center' },
  dot: { position: 'absolute', top: space[8], right: space[16], width: space[8], height: space[8], borderRadius: radius.pill, backgroundColor: color.accent },
  badgeText: { ...type('label'), color: color.onAlert },
});
