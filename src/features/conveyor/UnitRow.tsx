// Рядок потоку чи ланки на тимчасовому екрані «Конвеєр» (001 FR-8…FR-11, FR-14). Повний unit-sheet — 002.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { capAt } from '@/economy/core';
import { formatBig, formatDuration, formatRate } from '@/economy/format';
import { quote } from '@/economy/game/purchase';
import type { BuyMode, EconomyConfig, EconomyState, Effect, UnitDef, UnitRef } from '@/economy/game/types';
import { color, radius, size, space, typeScale } from '@/theme';

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
}

export function UnitRow({ def, unit, level, hasClerk, isNeck, state, cfg, effects, mode, nowMs, onBuy, onHire }: Props) {
  const q = quote(state, cfg, unit, mode, nowMs, effects);
  const rate = capAt(def, level, cfg.params) * (state.museum.unit[def.id] ?? 1);
  const opened = level > 0;
  const label = opened ? `${t.upgrade} · ${formatBig(q.price, 'price')}` : `${t.open} · ${formatBig(q.price, 'price')}`;
  return (
    <View style={[styles.row, isNeck && styles.neck]} testID={`unit-${def.id}`}>
      <View style={styles.head}>
        <Text style={styles.name}>{def.name}</Text>
        <Text style={styles.meta}>
          {opened ? `Рів. ${level} · ${formatRate(rate)}` : q.locked ? t.locked : `1-й рівень: ${formatRate(capAt(def, 1, cfg.params))}`}
          {opened ? ` · ${hasClerk ? t.clerk : t.manual}` : ''}
        </Text>
        {opened && q.levels > 1 ? <Text style={styles.meta}>{`${formatRate(q.rateBefore)} → ${formatRate(q.rateAfter)}`}</Text> : null}
        {!q.affordable && !q.locked && q.etaSec != null ? <Text style={styles.wait}>{t.wait(formatDuration(q.etaSec))}</Text> : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          testID={`buy-${def.id}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: !q.affordable }}
          disabled={!q.affordable}
          onPress={onBuy}
          style={[styles.btn, !q.affordable && styles.btnOff]}
        >
          <Text style={[styles.btnText, !q.affordable && styles.btnTextOff]}>{label}</Text>
        </Pressable>
        {opened && !hasClerk ? (
          <Pressable
            testID={`hire-${def.id}`}
            accessibilityRole="button"
            disabled={state.signatures < def.manager}
            onPress={onHire}
            style={[styles.btnGhost, state.signatures < def.manager && styles.btnOff]}
          >
            <Text style={styles.ghostText}>{`${t.hire} · ${formatBig(def.manager, 'price')}`}</Text>
          </Pressable>
        ) : null}
      </View>
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
  head: { gap: space[2] },
  name: { color: color.text, fontSize: typeScale.h3.fontSize, lineHeight: typeScale.h3.lineHeight, fontWeight: typeScale.h3.fontWeight },
  meta: { color: color.muted, fontSize: typeScale.bodyS.fontSize, lineHeight: typeScale.bodyS.lineHeight },
  wait: { color: color.muted, fontSize: typeScale.caption.fontSize, lineHeight: typeScale.caption.lineHeight },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  btn: { minHeight: size.touchMin, paddingHorizontal: space[12], borderRadius: radius[6], backgroundColor: color.accent, justifyContent: 'center' },
  btnOff: { opacity: 0.45 },
  btnText: { color: color.accentInk, fontSize: typeScale.cta.fontSize, fontWeight: typeScale.cta.fontWeight },
  btnTextOff: {},
  btnGhost: { minHeight: size.touchMin, paddingHorizontal: space[12], borderRadius: radius[6], borderWidth: 1, borderColor: color.borderStrong, justifyContent: 'center' },
  ghostText: { color: color.text, fontSize: typeScale.body.fontSize },
});
