// Рядок потоку чи ланки на головному екрані (001 FR-8…FR-11, FR-14). Коуч онбордингу (002 FR-15) підсвічує одну кнопку й блокує решту.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { capAt } from '@/economy/core';
import { formatBig, formatDuration, formatRate } from '@/economy/format';
import { quote } from '@/economy/game/purchase';
import type { BuyMode, EconomyConfig, EconomyState, Effect, UnitDef, UnitRef } from '@/economy/game/types';
import { color, radius, size, space, typeScale } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';

import { t } from './texts';

interface Props {
  def: UnitDef;
  unit: UnitRef;
  level: number;
  hasClerk: boolean;
  isNeck: boolean;
  state: EconomyState;
  cfg: EconomyConfig;
  effects: Effect[];
  mode: BuyMode;
  nowMs: number;
  onBuy: () => void;
  onHire: () => void;
  /** Коуч: ціль у цьому рядку з підказкою, або 'dim' — рядок затемнено й не тапається */
  coach?: { target: 'buy' | 'hire'; text: string } | 'dim';
  /** Найм поки закрито (002, рішення 59) */
  hireLocked?: boolean;
  /** Без діловода після першого найму (002 FR-17) */
  needsClerk?: boolean;
}

export function UnitRow({ def, unit, level, hasClerk, isNeck, state, cfg, effects, mode, nowMs, onBuy, onHire, coach, needsClerk, hireLocked }: Props) {
  const q = quote(state, cfg, unit, mode, nowMs, effects);
  const rate = capAt(def, level, cfg.params) * (state.museum.unit[def.id] ?? 1);
  const opened = level > 0;
  const canHire = state.signatures >= def.manager && !hireLocked;
  const label = opened ? `${t.upgrade} · ${formatBig(q.price, 'price')}` : `${t.open} · ${formatBig(q.price, 'price')}`;
  const dim = coach === 'dim';
  const target = typeof coach === 'object' ? coach : null;
  const coachText = target ? (
    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coach} testID="coach-text" accessibilityLiveRegion="polite">
      {target.text}
    </Text>
  ) : null;
  return (
    <View
      style={[styles.row, isNeck && styles.neck, needsClerk && styles.needsClerk]}
      pointerEvents={dim ? 'none' : 'auto'}
      importantForAccessibility={dim ? 'no-hide-descendants' : 'auto'}
      testID={`unit-${def.id}`}
    >
      <View style={styles.head}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.name}>{def.name}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>
          {opened ? t.level(level, formatRate(rate), hasClerk ? t.clerk : t.manual) : q.locked ? t.locked : t.firstLevel(formatRate(capAt(def, 1, cfg.params)))}
        </Text>
        {opened && q.levels > 1 ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{`${formatRate(q.rateBefore)} → ${formatRate(q.rateAfter)}`}</Text> : null}
        {!q.affordable && !q.locked && q.etaSec != null ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.wait}>{t.wait(formatDuration(q.etaSec))}</Text> : null}
      </View>
      {target?.target === 'buy' ? coachText : null}
      <View style={styles.actions}>
        <Pressable
          testID={`buy-${def.id}`}
          pointerEvents={target && target.target !== 'buy' ? 'none' : 'auto'}
          accessibilityRole="button"
          accessibilityState={{ disabled: !q.affordable }}
          disabled={!q.affordable}
          onPress={onBuy}
          style={[styles.btn, !q.affordable && styles.btnOff, target?.target === 'buy' && styles.lit]}
        >
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.btnText, !q.affordable && styles.btnTextOff]}>{label}</Text>
          {target && target.target !== 'buy' ? <View style={styles.scrim} /> : null}
        </Pressable>
        {opened && !hasClerk ? (
          <Pressable
            testID={`hire-${def.id}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canHire }}
            disabled={!canHire}
            onPress={onHire}
            pointerEvents={target && target.target !== 'hire' ? 'none' : 'auto'}
            style={[styles.btnGhost, !canHire && styles.btnOff, target?.target === 'hire' && styles.lit]}
          >
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.ghostText, !canHire && styles.btnTextOff]}>{`${t.hire} · ${formatBig(def.manager, 'price')}`}</Text>
            {!canHire && !hireLocked ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.wait}>{t.short(formatBig(def.manager - state.signatures, 'price'))}</Text> : null}
            {target && target.target !== 'hire' ? <View style={styles.scrim} /> : null}
          </Pressable>
        ) : null}
      </View>
      {target?.target === 'hire' ? coachText : null}
      {dim ? <View style={styles.scrim} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: color.surface,
    borderRadius: radius[8],
    borderWidth: 1,
    borderColor: color.border,
    padding: space[12],
    gap: space[8],
  },
  neck: { borderColor: color.accent },
  needsClerk: { borderStyle: 'dashed', borderColor: color.borderStrong },
  // коуч (002 FR-15): решту приглушено, ціль обведено акцентом, текст ≤ 2 рядків поруч, не поверх
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, borderRadius: radius[8] },
  lit: { borderWidth: 2, borderColor: color.accent },
  coach: { color: color.accent, fontSize: typeScale.bodyS.fontSize, lineHeight: typeScale.bodyS.lineHeight, fontWeight: typeScale.cta.fontWeight },
  head: { gap: space[2] },
  name: { color: color.text, fontSize: typeScale.h3.fontSize, lineHeight: typeScale.h3.lineHeight, fontWeight: typeScale.h3.fontWeight },
  meta: { color: color.muted, fontSize: typeScale.bodyS.fontSize, lineHeight: typeScale.bodyS.lineHeight },
  wait: { color: color.muted, fontSize: typeScale.caption.fontSize, lineHeight: typeScale.caption.lineHeight },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  btn: { minHeight: size.touchMin, paddingHorizontal: space[12], borderRadius: radius[6], backgroundColor: color.accent, justifyContent: 'center' },
  // неактивно: заглиблена поверхня й приглушений текст, поряд — текст «Не вистачає» (колір не єдиний носій, принцип VI)
  btnOff: { backgroundColor: color.surface2, borderColor: color.border },
  btnText: { color: color.accentInk, fontSize: typeScale.cta.fontSize, fontWeight: typeScale.cta.fontWeight },
  btnTextOff: { color: color.muted },
  btnGhost: { minHeight: size.touchMin, paddingHorizontal: space[12], paddingVertical: space[4], borderRadius: radius[6], borderWidth: 1, borderColor: color.borderStrong, justifyContent: 'center' },
  ghostText: { color: color.text, fontSize: typeScale.body.fontSize },
});
