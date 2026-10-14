// Головний екран (002 FR-13…FR-20; ігровий цикл — у Game, app/index.tsx): конвеєр 001, таббар, коуч онбордингу, clerk-first, телеграма № 1, дзвінок «Археологу».
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { formatBig, formatMult, formatRate } from '@/economy/format';
import { fuelMult, income, multStack, tankPct } from '@/economy/game/income';
import { quote } from '@/economy/game/purchase';
import { itemsFor } from '@/economy/game/state';
import type { BuyMode } from '@/economy/game/types';
import { OfflineReturn } from '@/features/conveyor/OfflineReturn';
import { Seal } from '@/features/conveyor/Seal';
import { birdEffect, canHireNow, type ConveyorStore, type Toast } from '@/features/conveyor/store';
import { t } from '@/features/conveyor/texts';
import { UnitRow } from '@/features/conveyor/UnitRow';
import { CallOverlay } from '@/features/onboarding/CallOverlay';
import { ClerkFirst } from '@/features/onboarding/ClerkFirst';
import { ready } from '@/features/onboarding/steps';
import { t as onb } from '@/features/onboarding/texts';
import { choiceEffects, firstTelegram, type TgChoice } from '@/features/telegrams/first';
import { TelegramDetail } from '@/features/telegrams/TelegramDetail';
import { TelegramResult } from '@/features/telegrams/TelegramResult';
import { color, duration, radius, size, space, typeScale } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { TabBar, type TabId } from '@/ui/TabBar';
import { type } from '@/ui/type';

const MODES: BuyMode[] = ['x1', 'x10', 'toMilestone'];

type TgView = { kind: 'closed' } | { kind: 'detail' } | { kind: 'result'; choice: TgChoice };

function toastText(toast: Toast): string {
  switch (toast.kind) {
    case 'clockBack':
      return t.clockBack;
    case 'text':
      return toast.text;
    case 'archive':
      return onb.b9Toast(formatBig(toast.amount, 'balance'));
    case 'offline':
      return t.offToast(formatBig(toast.amount, 'balance'));
  }
}

export function MainScreen({ store }: { store: ConveyorStore }) {
  const insets = useSafeAreaInsets();
  const s = useStore(store);
  const now = s.lastMs;
  const o = s.onboarding;
  const eff = [...s.effects, ...birdEffect(s.cfg, o, now)];
  const inc = income(s.state, s.cfg, now, eff);
  const M = multStack(s.state, s.cfg, now, eff).total;
  const it = itemsFor(s.state, s.cfg);
  const neck = inc.bottleneck;
  const neckName = neck === 'streams' ? null : (it.stages.find((u) => u.id === neck.id)?.name ?? '');
  const tank = tankPct(s.state, now);
  const fuelM = fuelMult(s.state, s.cfg, now, eff);
  const [tg, setTg] = useState<TgView>({ kind: 'closed' });
  // дзвінок лишається на екрані й після бонусу (крок 9 уже закрито), доки гравець не натисне «До стройової»
  const [callHeld, setCallHeld] = useState(false);
  const onboarding = o.step !== 'done';

  const stroy = it.stages.find((u) => u.id === 'stroy');
  const rd = s.offline
    ? null // 002 «Гра у фоні»: спершу offline-return, потім коуч
    : ready(o, {
        playMs: s.playtimeMs,
        signatures: s.state.signatures,
        raportyPrice: quote(s.state, s.cfg, { type: 'stream', id: 'raporty' }, 'x1', now, eff).price,
        stroyClerkPrice: stroy?.manager ?? Infinity,
        callAtMs: s.cfg.params.archiveBonusAtSec * 1000,
      });

  // крок 8: телеграма № 1 приходить — тост b8.toast, бейдж «1», коуч на вкладці (FR-18).
  // Поки відкрита модалка чи шторка, телеграма чекає (крайовий випадок), тож b7.toast іде першим.
  const blocked = s.offline != null || s.clerkFirstOpen;
  useEffect(() => {
    if (rd !== 'telegramArrive' || blocked) return;
    store.getState().receiveTg1();
    store.getState().showToast({ kind: 'text', text: onb.b8Toast });
  }, [rd, blocked, store]);

  // тости першої сесії: віха Рапортів (b6.toast1) і вузьке місце на резолюціях комбата (b6.toast2)
  const lastEvent = s.events.at(-1);
  const seenEvents = useRef(s.events.length);
  useEffect(() => {
    if (s.events.length === seenEvents.current) return;
    seenEvents.current = s.events.length;
    if (onboarding && lastEvent?.type === 'milestone' && lastEvent.target.id === 'raporty') store.getState().showToast({ kind: 'text', text: onb.b6Toast1 });
  }, [s.events.length, lastEvent, onboarding, store]);
  const neckId = neck === 'streams' ? 'streams' : neck.id;
  const prevNeck = useRef(neckId);
  useEffect(() => {
    if (neckId === prevNeck.current) return;
    prevNeck.current = neckId;
    if (onboarding && neckId === 'kombat') store.getState().showToast({ kind: 'text', text: onb.b6Toast2 });
  }, [neckId, onboarding, store]);

  const toast = s.toast;
  useEffect(() => {
    if (toast == null) return;
    const id = setTimeout(() => store.getState().clearToast(), duration.toast);
    return () => clearTimeout(id);
  }, [toast, store]);

  const overlay = s.offline != null || s.clerkFirstOpen || tg.kind !== 'closed';
  const coachRow = !overlay && (rd === 'coachUpgrade' || rd === 'coachHire');
  const coachTab = !overlay && rd === 'coachTelegram';
  const coachOn = coachRow || coachTab;
  const showCall = callHeld || (!overlay && rd === 'call');

  const coachFor = (id: string) => {
    if (!coachOn) return undefined;
    if (rd === 'coachUpgrade' && id === 'raporty') return { target: 'buy' as const, text: onb.b6Arrow };
    if (rd === 'coachHire' && id === 'stroy') return { target: 'hire' as const, text: onb.b7Tip };
    return 'dim' as const;
  };

  const onTab = (tab: TabId) => {
    if (tab === 'telegrams' && o.step === 8 && o.tg1ReceivedAtPlayMs != null) setTg({ kind: 'detail' });
  };

  const onChoose = (c: TgChoice) => {
    store.getState().answerTg1(c.id, choiceEffects(c, s.cfg, store.getState().lastMs));
    setTg({ kind: 'result', choice: c });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space[16] }]} pointerEvents={coachOn ? 'none' : 'auto'}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.balance} testID="balance">{formatBig(s.state.signatures, 'counter')}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.income} testID="income">{`${formatRate(inc.perMin)} · ${formatMult(M)}`}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.flow} testID="flow-line">
          {neck === 'streams' ? t.flowStreams : t.flow(formatBig(inc.flow.sum), formatBig(inc.flow.pipe), neckName ?? '')}
        </Text>
        <View style={styles.tiles}>
          <Pressable testID="refuel" accessibilityRole="button" onPress={() => s.refuel(Date.now())} style={styles.tile}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tileText}>{`${t.fuel(tank, fuelM > 1 ? formatMult(fuelM) : null)} · ${t.refuel}`}</Text>
          </Pressable>
          <View style={styles.tile}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tileText}>{t.paper(Math.floor(s.state.paper))}</Text>
          </View>
        </View>
        {coachOn ? <View style={styles.scrim} /> : null}
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.modes} accessibilityRole="tablist" pointerEvents={coachOn ? 'none' : 'auto'}>
          {MODES.map((m) => (
            <Pressable
              key={m}
              testID={`mode-${m}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: s.mode === m }}
              onPress={() => s.setMode(m)}
              style={[styles.mode, s.mode === m && styles.modeOn]}
            >
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.modeText, s.mode === m && styles.modeTextOn]}>{t.modes[m]}</Text>
            </Pressable>
          ))}
          {coachOn ? <View style={styles.scrim} /> : null}
        </View>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{t.streams}</Text>
        {it.streams.map((def, i) => (
          <UnitRow
            key={def.id}
            def={def}
            unit={{ type: 'stream', id: def.id }}
            level={s.state.streamLevels[i] ?? 0}
            hasClerk={!!s.state.streamClerks[i]}
            isNeck={neck === 'streams' && (s.state.streamLevels[i] ?? 0) > 0}
            needsClerk={s.state.hiredEver && (s.state.streamLevels[i] ?? 0) > 0 && !s.state.streamClerks[i]}
            state={s.state}
            cfg={s.cfg}
            effects={eff}
            mode={s.mode}
            nowMs={now}
            coach={coachFor(def.id)}
            hireLocked={!canHireNow(o, { type: 'stream', id: def.id })}
            onBuy={() => s.buy({ type: 'stream', id: def.id }, Date.now())}
            onHire={() => s.hire({ type: 'stream', id: def.id })}
          />
        ))}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h4}>{t.stages}</Text>
        {it.stages.map((def, j) => (
          <View key={def.id} style={styles.stageWrap}>
            <UnitRow
              def={def}
              unit={{ type: 'stage', id: def.id }}
              level={s.state.stageLevels[j] ?? 0}
              hasClerk={!!s.state.stageClerks[j]}
              isNeck={neck !== 'streams' && neck.id === def.id}
              needsClerk={s.state.hiredEver && !s.state.stageClerks[j]}
              state={s.state}
              cfg={s.cfg}
              effects={eff}
              mode={s.mode}
              nowMs={now}
              coach={coachFor(def.id)}
              hireLocked={!canHireNow(o, { type: 'stage', id: def.id })}
              onBuy={() => s.buy({ type: 'stage', id: def.id }, Date.now())}
              onHire={() => s.hire({ type: 'stage', id: def.id })}
            />
            {def.id === 'stroy' ? (
              <View pointerEvents={coachOn ? 'none' : 'auto'}>
                <Seal onPress={() => s.tapSeal(Date.now())} />
              </View>
            ) : null}
          </View>
        ))}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.note}>{t.formula}</Text>
      </ScrollView>
      <TabBar
        active="stroyova"
        telegramsNew={o.step === 8 && o.tg1ReceivedAtPlayMs != null ? 1 : 0}
        coachTab={coachTab ? 'telegrams' : undefined}
        enabled={coachRow ? [] : o.step === 8 ? ['stroyova', 'telegrams'] : ['stroyova']}
        bottomInset={insets.bottom}
        onChange={onTab}
      />
      {/* над таббаром: тост (один, решта в черзі) і під ним підказка коуча кроку 8 */}
      <View style={[styles.bottomStack, { bottom: insets.bottom + size.tabHeight }]} pointerEvents="none">
        {toast != null ? (
          <View style={styles.toast} testID="toast">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.toastText}>{toastText(toast)}</Text>
          </View>
        ) : null}
        {coachTab ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.coachTab} testID="coach-text">{onb.b8Toast}</Text>
        ) : null}
      </View>
      {s.clerkFirstOpen ? (
        <ClerkFirst
          onNext={() => {
            s.closeClerkFirst();
            s.showToast({ kind: 'text', text: onb.b7Toast });
          }}
        />
      ) : null}
      {tg.kind === 'detail' ? <TelegramDetail tg={firstTelegram} cfg={s.cfg} coachText={onb.b8Tip} onChoose={onChoose} /> : null}
      {tg.kind === 'result' ? (
        <TelegramResult tg={firstTelegram} choice={tg.choice} cfg={s.cfg} firstText={onb.b8Rep} onClose={() => setTg({ kind: 'closed' })} />
      ) : null}
      {showCall ? (
        <CallOverlay
          onClaim={() => {
            setCallHeld(true);
            return store.getState().claimArchive();
          }}
          onClose={() => setCallHeld(false)}
        />
      ) : null}
      {s.offline ? <OfflineReturn res={s.offline} onClaim={s.claim} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { padding: space[16], gap: space[4], backgroundColor: color.bgDeep },
  balance: { ...type('displayM'), color: color.text },
  income: { ...type('numL'), color: color.accent },
  flow: { ...type('caption'), color: color.muted },
  tiles: { flexDirection: 'row', gap: space[8], marginTop: space[8] },
  tile: { minHeight: size.touchMin, flex: 1, borderRadius: radius[6], backgroundColor: color.surface, justifyContent: 'center', paddingHorizontal: space[8] },
  tileText: { ...type('caption'), color: color.text },
  list: { padding: space[16], gap: space[8], paddingBottom: space[24] },
  modes: { flexDirection: 'row', gap: space[8] },
  mode: { flex: 1, minHeight: size.touchMin, borderRadius: radius[6], borderWidth: 1, borderColor: color.borderStrong, justifyContent: 'center', alignItems: 'center' },
  modeOn: { backgroundColor: color.surface, borderColor: color.accent },
  modeText: { ...type('body'), color: color.muted },
  modeTextOn: { color: color.accent, fontWeight: typeScale.cta.fontWeight },
  h4: { ...type('h4'), color: color.muted, marginTop: space[8] },
  stageWrap: { gap: space[8] },
  note: { ...type('caption'), color: color.muted, marginTop: space[8] },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim },
  coachTab: { ...type('bodyS'), color: color.accent, fontWeight: typeScale.cta.fontWeight, backgroundColor: color.bgDeep, paddingHorizontal: space[16], paddingVertical: space[8] },
  bottomStack: { position: 'absolute', left: 0, right: 0, gap: space[8] },
  toast: { marginHorizontal: space[16], backgroundColor: color.surface, borderRadius: radius[6], padding: space[12] },
  toastText: { ...type('body'), color: color.text },
});
