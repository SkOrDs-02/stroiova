// Тимчасовий екран «Конвеєр» — вертикальний зріз 001: тап → покупка → діловод → офлайн. Повний main — 002.
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { formatBig, formatMult, formatRate } from '@/economy/format';
import { fuelMult, income, multStack, tankPct } from '@/economy/game/income';
import { itemsFor } from '@/economy/game/state';
import type { BuyMode } from '@/economy/game/types';
import { color, duration, radius, size, space, typeScale } from '@/theme';

import { OfflineReturn } from './OfflineReturn';
import { Seal } from './Seal';
import type { ConveyorStore } from './store';
import { t } from './texts';
import { UnitRow } from './UnitRow';
import { useGameLoop } from './useGameLoop';

const MODES: BuyMode[] = ['x1', 'x10', 'toMilestone'];

export function ConveyorScreen({ store }: { store: ConveyorStore }) {
  useGameLoop(store);
  const insets = useSafeAreaInsets();
  const s = useStore(store);
  const now = s.lastMs;
  const inc = income(s.state, s.cfg, now, s.effects);
  const M = multStack(s.state, s.cfg, now, s.effects).total;
  const it = itemsFor(s.state, s.cfg);
  const neck = inc.bottleneck;
  const neckName = neck === 'streams' ? null : it.stages.find((u) => u.id === neck.id)?.name ?? '';
  const tank = tankPct(s.state, now);
  const fuelM = fuelMult(s.state, s.cfg, now, s.effects);

  const toast = s.toast;
  useEffect(() => {
    if (toast == null) return;
    const id = setTimeout(() => store.getState().clearToast(), duration.toast);
    return () => clearTimeout(id);
  }, [toast, store]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.balance} testID="balance">{formatBig(s.state.signatures, 'counter')}</Text>
        <Text style={styles.income}>{`${formatRate(inc.perMin)} · ${formatMult(M)}`}</Text>
        <Text style={styles.flow} testID="flow-line">
          {neck === 'streams' ? t.flowStreams : t.flow(formatBig(inc.flow.sum), formatBig(inc.flow.pipe), neckName ?? '')}
        </Text>
        <View style={styles.tiles}>
          <Pressable testID="refuel" accessibilityRole="button" onPress={() => s.refuel(Date.now())} style={styles.tile}>
            <Text style={styles.tileText}>{`${t.fuel(tank, fuelM > 1 ? formatMult(fuelM) : null)} · ${t.refuel}`}</Text>
          </Pressable>
          <View style={styles.tile}>
            <Text style={styles.tileText}>{t.paper(Math.floor(s.state.paper))}</Text>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space[24] }]}>
        <View style={styles.modes} accessibilityRole="tablist">
          {MODES.map((m) => (
            <Pressable
              key={m}
              testID={`mode-${m}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: s.mode === m }}
              onPress={() => s.setMode(m)}
              style={[styles.mode, s.mode === m && styles.modeOn]}
            >
              <Text style={[styles.modeText, s.mode === m && styles.modeTextOn]}>{t.modes[m]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.h4}>{t.streams}</Text>
        {it.streams.map((def, i) => (
          <UnitRow
            key={def.id}
            def={def}
            unit={{ type: 'stream', id: def.id }}
            level={s.state.streamLevels[i] ?? 0}
            hasClerk={!!s.state.streamClerks[i]}
            isNeck={neck === 'streams' && (s.state.streamLevels[i] ?? 0) > 0}
            state={s.state}
            cfg={s.cfg}
            effects={s.effects}
            mode={s.mode}
            nowMs={now}
            onBuy={() => s.buy({ type: 'stream', id: def.id }, Date.now())}
            onHire={() => s.hire({ type: 'stream', id: def.id })}
          />
        ))}
        <Text style={styles.h4}>{t.stages}</Text>
        {it.stages.map((def, j) => (
          <View key={def.id} style={styles.stageWrap}>
            <UnitRow
              def={def}
              unit={{ type: 'stage', id: def.id }}
              level={s.state.stageLevels[j] ?? 0}
              hasClerk={!!s.state.stageClerks[j]}
              isNeck={neck !== 'streams' && neck.id === def.id}
              state={s.state}
              cfg={s.cfg}
              effects={s.effects}
              mode={s.mode}
              nowMs={now}
              onBuy={() => s.buy({ type: 'stage', id: def.id }, Date.now())}
              onHire={() => s.hire({ type: 'stage', id: def.id })}
            />
            {def.id === 'stroy' ? <Seal onPress={() => s.tapSeal(Date.now())} /> : null}
          </View>
        ))}
        <Text style={styles.note}>{t.formula}</Text>
      </ScrollView>
      {toast != null ? (
        <View style={[styles.toast, { bottom: insets.bottom + space[16] }]} testID="toast">
          <Text style={styles.toastText}>{toast.kind === 'clockBack' ? t.clockBack : t.offToast(formatBig(toast.amount, 'balance'))}</Text>
        </View>
      ) : null}
      {s.offline ? <OfflineReturn res={s.offline} onClaim={s.claim} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { padding: space[16], gap: space[4], backgroundColor: color.bgDeep },
  balance: { color: color.text, fontSize: typeScale.displayM.fontSize, lineHeight: typeScale.displayM.lineHeight, fontWeight: typeScale.displayM.fontWeight },
  income: { color: color.accent, fontSize: typeScale.numL.fontSize, fontWeight: typeScale.numL.fontWeight },
  flow: { color: color.muted, fontSize: typeScale.caption.fontSize, lineHeight: typeScale.caption.lineHeight },
  tiles: { flexDirection: 'row', gap: space[8], marginTop: space[8] },
  tile: { minHeight: size.touchMin, flex: 1, borderRadius: radius[6], backgroundColor: color.surface, justifyContent: 'center', paddingHorizontal: space[8] },
  tileText: { color: color.text, fontSize: typeScale.caption.fontSize },
  list: { padding: space[16], gap: space[8] },
  modes: { flexDirection: 'row', gap: space[8] },
  mode: { flex: 1, minHeight: size.touchMin, borderRadius: radius[6], borderWidth: 1, borderColor: color.borderStrong, justifyContent: 'center', alignItems: 'center' },
  modeOn: { backgroundColor: color.surface, borderColor: color.accent },
  modeText: { color: color.muted, fontSize: typeScale.body.fontSize },
  modeTextOn: { color: color.accent, fontWeight: typeScale.cta.fontWeight },
  h4: { color: color.muted, fontSize: typeScale.h4.fontSize, fontWeight: typeScale.h4.fontWeight, marginTop: space[8] },
  stageWrap: { gap: space[8] },
  note: { color: color.muted, fontSize: typeScale.caption.fontSize, marginTop: space[8] },
  toast: { position: 'absolute', left: space[16], right: space[16], backgroundColor: color.surface, borderRadius: radius[6], padding: space[12] },
  toastText: { color: color.text, fontSize: typeScale.body.fontSize },
});
