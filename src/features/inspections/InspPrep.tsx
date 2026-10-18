// insp-prep (004 FR-11…FR-14): відлік, готовність, чекліст за підписи; позначку не зняти. Реклама й «Забрати все» — 08.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { formatBig, formatCountdown, formatDuration, formatMult } from '@/economy/format';
import { income } from '@/economy/game/income';
import type { ConveyorStore } from '@/features/conveyor/store';
import { readiness, shortfall } from '@/inspections/lifecycle';
import { color, radius, size, space, typeScale } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { AdButton } from '@/features/monetization/AdButton';
import { adT } from '@/features/monetization/texts';
import { inspAdView } from '@/monetization/monetization';
import { type } from '@/ui/type';

import { itemMeta, itemTitle } from './present';
import { inspT } from './texts';
import { useTumbLine } from './useTumbLine';

export function InspPrep({ store }: { store: ConveyorStore }) {
  const insets = useSafeAreaInsets();
  const s = useStore(store);
  const a = s.inspections.active;
  const line = useTumbLine(store, a && a.trigger === 'scheduled' ? `tumb.start.r${a.level}` : a ? 'tumb.start_unsched' : null, `insp:${a?.id}:start`);
  if (!a) return null;
  const perMin = income(s.state, s.cfg, s.lastMs, s.effects).perMin;
  const pct = readiness(a);
  const p = s.cfg.params;
  const left = (a.arrMs - s.lastMs) / 1000;
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[8], paddingBottom: insets.bottom }]} testID="insp-prep">
      <View style={styles.top}>
        <Pressable testID="insp-back" accessibilityRole="button" accessibilityLabel={inspT.backLabel} onPress={s.closeInspPrep} style={styles.back}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.backText}>{`← ${inspT.back}`}</Text>
        </Pressable>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h} accessibilityRole="header">{inspT.prepTitle}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.timer} accessibilityRole="timer" accessibilityLabel={inspT.untilArrivalLabel(formatCountdown(left))}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timerK}>{inspT.untilArrival}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timerV} testID="insp-prep-timer" numberOfLines={1}>{formatCountdown(left)}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.timerK}>
            <Text style={styles.bold}>{`${inspT.bossWho(a.boss)}. `}</Text>
            {inspT.scope[a.boss]}
          </Text>
        </View>
        {line ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.quote}>{line}</Text> : null}
        <View style={styles.row}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{inspT.readiness}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.pct} testID="insp-ready">{inspT.readyPct(pct)}</Text>
        </View>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.row}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{inspT.checklist}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{inspT.have(formatBig(s.state.signatures, 'balance'), inspT.rate(formatBig(perMin)))}</Text>
        </View>
        {a.items.map((it) => {
          const short = shortfall(it, s.state.signatures, perMin);
          const off = !it.done && short != null;
          return (
            <Pressable
              key={it.id}
              testID={`insp-item-${it.id}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: it.done, disabled: it.done || off }}
              disabled={it.done || off}
              onPress={() => s.buyInspItem(it.id)}
              style={[styles.item, it.done && styles.itemDone, off && styles.itemOff]}
            >
              <View style={[styles.box, it.done && styles.boxOn]}>{it.done ? <Text style={styles.tick}>✓</Text> : null}</View>
              <View style={styles.itemText}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.itemTitle}>{itemTitle(it.id)}</Text>
                {itemMeta(it) ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{itemMeta(it)}</Text> : null}
              </View>
              <View style={styles.cost}>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.costText}>{formatBig(it.price, 'price')}</Text>
                {off ? (
                  <>
                    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.lack}>{inspT.lack(formatBig(short.lack, 'price'))}</Text>
                    {Number.isFinite(short.etaSec) ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{inspT.eta(formatDuration(short.etaSec))}</Text> : null}
                  </>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        {pct < 100 ? (
          <AdButton
            store={store}
            placement="inspection_checklist"
            view={inspAdView(s.monetization, a.id, s.state)}
            label={adT.inspAll}
            takeLabel={adT.inspTake}
            note={() => adT.inspNote}
            limitLabel={adT.inspLimit}
            testID="insp-ad"
          />
        ) : null}
        {pct >= 100 ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.ready} testID="insp-ready-line">{inspT.readyLine[a.boss]}</Text> : null}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rule}>
          <Text style={styles.pass}>{`${inspT.passRuleK} `}</Text>
          {a.trigger === 'unscheduled' ? inspT.passUnschedRule : inspT.passRule(formatMult(p.inspMult), p.inspHours)}
        </Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rule}>
          <Text style={styles.fail}>{`${inspT.failRuleK} `}</Text>
          {inspT.failRule(formatMult(p.inspFailMult), p.inspFailHours)}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[12], minHeight: size.touchMin },
  back: { minHeight: size.touchMin, justifyContent: 'center', paddingHorizontal: space[8] },
  backText: { ...type('body'), color: color.text },
  h: { ...type('h4'), color: color.text, flex: 1, textAlign: 'center', marginRight: size.touchMin * 2 },
  body: { padding: space[16], gap: space[12], paddingBottom: space[24] },
  timer: { backgroundColor: color.alertBg, borderColor: color.alertLine, borderWidth: 1, borderRadius: radius[12], padding: space[12], gap: space[4] },
  timerK: { ...type('bodyS'), color: color.alertText },
  timerV: { ...type('displayM'), color: color.onAlert },
  bold: { fontWeight: typeScale.cta.fontWeight },
  quote: { ...type('bodyS'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8], flexWrap: 'wrap' },
  muted: { ...type('caption'), color: color.muted },
  pct: { ...type('num'), color: color.accent },
  track: { height: space[8], borderRadius: radius.pill, backgroundColor: color.surface2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.accent },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: size.touchMin, padding: space[12], borderRadius: radius[10], backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  itemDone: { borderColor: color.accent },
  itemOff: { backgroundColor: color.bgDeep },
  box: { width: space[20], height: space[20], borderRadius: radius[4], borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: color.accent, borderColor: color.accent },
  tick: { ...type('caption'), color: color.accentInk, fontWeight: typeScale.cta.fontWeight },
  itemText: { flex: 1, gap: space[2] },
  itemTitle: { ...type('body'), color: color.text },
  cost: { alignItems: 'flex-end' },
  costText: { ...type('num'), color: color.text },
  lack: { ...type('caption'), color: color.fail },
  ready: { ...type('body'), color: color.accent },
  rule: { ...type('bodyS'), color: color.text },
  pass: { color: color.accent, fontWeight: typeScale.cta.fontWeight },
  fail: { color: color.fail, fontWeight: typeScale.cta.fontWeight },
});
