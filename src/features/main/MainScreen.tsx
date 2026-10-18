// Головний екран (002 FR-13…FR-20; ігровий цикл — у Game, app/index.tsx): конвеєр 001, таббар, коуч онбордингу, clerk-first, телеграма № 1, дзвінок «Археологу».
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { formatBig, formatCountdown, formatDuration, formatMult, formatRate } from '@/economy/format';
import { fuelMult, income, multStack, tankPct } from '@/economy/game/income';
import { quote } from '@/economy/game/purchase';
import { itemsFor } from '@/economy/game/state';
import type { BuyMode } from '@/economy/game/types';
import { OfflineReturn } from '@/features/conveyor/OfflineReturn';
import { InspCall } from '@/features/inspections/InspCall';
import { InspPrep } from '@/features/inspections/InspPrep';
import { InspResult } from '@/features/inspections/InspResult';
import { InspWarning } from '@/features/inspections/InspWarning';
import { offlineRows } from '@/features/inspections/present';
import { inspT } from '@/features/inspections/texts';
import { status as digitStatus } from '@/digitization/digitization';
import { DigitalScreen } from '@/features/digitization/DigitalScreen';
import { DigitConfirm } from '@/features/digitization/DigitConfirm';
import { DigitResult } from '@/features/digitization/DigitResult';
import { LevelUp } from '@/features/digitization/LevelUp';
import { digitT } from '@/features/digitization/texts';
import { GiftArrived } from '@/features/race/GiftArrived';
import { offlineRaceRows } from '@/features/race/present';
import { RaceCard } from '@/features/race/RaceCard';
import { RaceResult } from '@/features/race/RaceResult';
import { RaceSheet } from '@/features/race/RaceSheet';
import { Seal } from '@/features/conveyor/Seal';
import { birdEffect, canHireNow, type ConveyorStore, type Toast } from '@/features/conveyor/store';
import { t } from '@/features/conveyor/texts';
import { UnitRow } from '@/features/conveyor/UnitRow';
import { CallOverlay } from '@/features/onboarding/CallOverlay';
import { ClerkFirst } from '@/features/onboarding/ClerkFirst';
import { ready } from '@/features/onboarding/steps';
import { FIRST_TELEGRAM_ID } from '@/telegrams/content';
import { repTier } from '@/telegrams/reputation';
import type { InboxItem } from '@/telegrams/types';
import { t as onb } from '@/features/onboarding/texts';
import { KombatSheet } from '@/features/telegrams/KombatSheet';
import { NoteDetail } from '@/features/telegrams/NoteDetail';
import { ReputationSheet } from '@/features/telegrams/ReputationSheet';
import { TelegramFlag } from '@/features/telegrams/TelegramFlag';
import { TelegramList } from '@/features/telegrams/TelegramList';
import { TelegramDetail } from '@/features/telegrams/TelegramDetail';
import { t as tgT } from '@/features/telegrams/texts';
import { TelegramResult } from '@/features/telegrams/TelegramResult';
import { color, duration, radius, size, space, typeScale } from '@/theme';
import { MAX_FONT_SCALE } from '@/ui/Button';
import { TabBar, type TabId } from '@/ui/TabBar';
import { type } from '@/ui/type';

const MODES: BuyMode[] = ['x1', 'x10', 'toMilestone'];

/** Що поверх головного екрана (003): список вхідних, телеграма, результат, позначка, записка, шторки. */
type View3 =
  | { kind: 'main' }
  | { kind: 'list' }
  | { kind: 'detail'; uid: string; coach: boolean }
  | { kind: 'result'; uid: string; back: 'main' | 'list' }
  | { kind: 'flag'; uid: string; back: 'detail' | 'list' }
  | { kind: 'note'; uid: string }
  | { kind: 'rep'; back: 'main' | 'list' }
  | { kind: 'kombat' }
  | { kind: 'digital' }
  | { kind: 'digit-confirm' };

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
    case 'rep':
      return tgT.repToast(tgT.tier[toast.tier]);
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
  const [view, setView] = useState<View3>({ kind: 'main' });
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

  // «Комбата шукають» (003 FR-28): шторка відкривається сама на початку події
  const kombat = s.telegrams.kombat.active;
  const kombatOn = kombat != null && kombat.endMs > now;
  // подію, яку гравець уже бачив, шторка не відкриває вдруге
  const [kombatSeen, setKombatSeen] = useState<number | null>(null);
  const kombatAuto = kombatOn && kombat!.startMs !== kombatSeen && view.kind === 'main' && s.offline == null;

  const inbox = s.telegrams.inbox;
  const badge = inbox.filter((x) => (x.status === 'new' && x.kind !== 'note') || (x.kind === 'note' && !x.read)).length;
  const tier = repTier(s.telegrams.reputation.value, s.cfg.params);
  // 006 FR-22: церемонія цифровізації (акт, наказ про переведення) показується, поки гравець її не закрив, і при запуску
  const ceremony = s.digit.ceremony;
  const overlay = s.offline != null || s.clerkFirstOpen || (view.kind !== 'main' && view.kind !== 'digital') || kombatAuto;
  const coachRow = !overlay && (rd === 'coachUpgrade' || rd === 'coachHire');
  const coachTab = !overlay && rd === 'coachTelegram';
  const coachOn = coachRow || coachTab;
  const showCall = callHeld || (!overlay && rd === 'call');

  // 004: перевірки — у черзі після інших модалок (FR-10, FR-22): call → insp-warning → insp-result
  const ins = s.inspections;
  const insp = ins.active;
  const ceremonyOpen = ceremony != null && s.offline == null && !s.clerkFirstOpen;
  const inspFree = !overlay && !showCall && !ceremonyOpen;
  const inspCall = inspFree && insp != null && ins.callPending;
  const inspWarn = inspFree && !inspCall && insp != null && insp.modal && !insp.warned;
  // без гравця результат іде в довідку й позначається показаним (FR-25); коротка відсутність без довідки — акт
  const inspResult = inspFree && !inspCall && !inspWarn && ins.last != null && !ins.last.seen;
  const inspBanner = insp != null && (insp.warned || !insp.modal);
  const digitEta = s.digitRec ? digitStatus(s.state, s.digit, s.cfg, now, s.effects).etaSec : null;
  // 005: gift-arrived і результат гонки — у тій самій черзі, після перевірок (крайовий випадок spec)
  const race = s.race.active;
  // race-sheet прив'язано до гонки: скінчилась — шторка зникає й не відкривається над наступним подарунком
  const [raceSheetId, setRaceSheetId] = useState<string | null>(null);
  const raceSheet = race != null && raceSheetId === race.id;
  const raceFree = inspFree && !inspCall && !inspWarn && !inspResult;
  // хронологічно: спершу фінал попередньої гонки, потім новий подарунок
  const raceResult = raceFree && s.race.last != null && !s.race.last.seen;
  const giftOpen = raceFree && !raceResult && race != null && !race.seen;

  const coachFor = (id: string) => {
    if (!coachOn) return undefined;
    if (rd === 'coachUpgrade' && id === 'raporty') return { target: 'buy' as const, text: onb.b6Arrow };
    if (rd === 'coachHire' && id === 'stroy') return { target: 'hire' as const, text: onb.b7Tip };
    return 'dim' as const;
  };

  const tg1 = inbox.find((x) => x.id === FIRST_TELEGRAM_ID);
  const onTab = (tab: TabId) => {
    // 002 FR-19: на кроці 8 підсвічена вкладка відкриває саму телеграму № 1, без списку
    if (tab === 'telegrams' && o.step === 8 && tg1?.status === 'new') setView({ kind: 'detail', uid: tg1.uid, coach: true });
    else if (tab === 'telegrams') setView({ kind: 'list' });
    else if (tab === 'digital') setView({ kind: 'digital' });
    else if (tab === 'stroyova') setView({ kind: 'main' });
  };
  const openItem = (item: InboxItem) => {
    if (item.kind === 'note') {
      s.openItem(item.uid);
      setView({ kind: 'note', uid: item.uid });
    } else {
      if (item.kind === 'notice') s.openItem(item.uid);
      if (item.kind === 'telegram' && item.status === 'new') s.kavaLineFor(item.uid);
      setView({ kind: 'detail', uid: item.uid, coach: false });
    }
  };
  const tabsEnabled: TabId[] = coachRow ? [] : o.step !== 'done' && o.step < 8 ? ['stroyova'] : ['stroyova', 'telegrams', 'digital'];

  return (
    <View style={styles.root}>
      {view.kind === 'list' ? (
        <TelegramList store={store} onOpen={openItem} onReputation={() => setView({ kind: 'rep', back: 'list' })} />
      ) : view.kind === 'digital' || view.kind === 'digit-confirm' ? (
        <DigitalScreen store={store} onOpenConfirm={() => setView({ kind: 'digit-confirm' })} />
      ) : (
        <>
      <View style={[styles.header, { paddingTop: insets.top + space[16] }]} pointerEvents={coachOn ? 'none' : 'auto'}>
        {s.state.level >= 2 ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.place} testID="place">{digitT.placeR2}</Text> : null}
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
          {s.telegrams.startMs != null ? (
            <Pressable testID="rep-tile" accessibilityRole="button" onPress={() => setView({ kind: 'rep', back: 'main' })} style={styles.tile}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.tileText}>{tgT.repTile(tgT.tier[tier])}</Text>
            </Pressable>
          ) : null}
        </View>
        {s.digitRec ? (
          <Pressable testID="digit-hint" accessibilityRole="button" onPress={() => setView({ kind: 'digital' })} style={styles.hintBar}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.hintText}>{digitT.hint(formatDuration(Math.max(0, (digitEta ?? 0)))) }</Text>
          </Pressable>
        ) : null}
        {inspBanner ? (
          <Pressable testID="insp-banner" accessibilityRole="button" onPress={s.openInspPrep} style={styles.inspBar}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.inspText}>{`${inspT.banner(formatCountdown((insp!.arrMs - now) / 1000))} · ${inspT.prepare}`}</Text>
          </Pressable>
        ) : null}
        {race && race.seen ? <RaceCard race={race} nowMs={now} p={s.cfg.params} onOpen={() => setRaceSheetId(race.id)} /> : null}
        {kombatOn ? (
          <Pressable testID="kombat-bar" accessibilityRole="button" onPress={() => setView({ kind: 'kombat' })} style={styles.kombatBar}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.kombatText}>{`${tgT.kbTitle} · ${tgT.left(formatDuration(Math.max(0, (kombat!.endMs - now) / 1000)))}`}</Text>
          </Pressable>
        ) : null}
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
        </>
      )}
      <TabBar
        active={view.kind === 'list' ? 'telegrams' : view.kind === 'digital' || view.kind === 'digit-confirm' ? 'digital' : 'stroyova'}
        digitalDot={s.digitRec}
        telegramsNew={badge}
        coachTab={coachTab ? 'telegrams' : undefined}
        enabled={tabsEnabled}
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
      {view.kind === 'detail' ? (
        <TelegramDetail
          store={store}
          uid={view.uid}
          coachText={view.coach ? onb.b8Tip : undefined}
          onAnswered={(uid) => setView({ kind: 'result', uid, back: view.coach ? 'main' : 'list' })}
          onFlag={(uid) => setView({ kind: 'flag', uid, back: 'detail' })}
          onReputation={view.coach ? undefined : () => setView({ kind: 'rep', back: 'list' })}
          onBack={view.coach ? undefined : () => setView({ kind: 'list' })}
        />
      ) : null}
      {view.kind === 'result' ? (
        <TelegramResult store={store} uid={view.uid} firstText={onb.b8Rep} onClose={() => setView({ kind: view.back })} />
      ) : null}
      {view.kind === 'flag' ? <TelegramFlag store={store} uid={view.uid} onClose={() => setView(view.back === 'detail' ? { kind: 'detail', uid: view.uid, coach: false } : { kind: 'list' })} /> : null}
      {view.kind === 'note' ? <NoteDetail store={store} uid={view.uid} onClose={() => setView({ kind: 'list' })} /> : null}
      {view.kind === 'rep' ? <ReputationSheet store={store} onClose={() => setView(view.back === 'list' ? { kind: 'list' } : { kind: 'main' })} /> : null}
      {view.kind === 'kombat' || kombatAuto ? (
        <KombatSheet
          store={store}
          onClose={() => {
            setKombatSeen(kombat?.startMs ?? null);
            setView({ kind: 'main' });
          }}
        />
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
      {inspCall ? <InspCall onClose={s.ackInspCall} /> : null}
      {inspWarn ? <InspWarning store={store} /> : null}
      {inspResult ? <InspResult store={store} /> : null}
      {s.inspPrepOpen && insp ? <InspPrep store={store} /> : null}
      {view.kind === 'digit-confirm' ? <DigitConfirm store={store} onClose={() => setView({ kind: 'digital' })} onDone={() => setView({ kind: 'main' })} /> : null}
      {ceremonyOpen && ceremony!.step === 'result' ? <DigitResult store={store} /> : null}
      {ceremonyOpen && ceremony!.step === 'levelUp' ? <LevelUp store={store} /> : null}
      {raceSheet ? <RaceSheet store={store} onClose={() => setRaceSheetId(null)} /> : null}
      {giftOpen ? (
        <GiftArrived
          store={store}
          onRegister={() => {
            // FR-6: «Зареєструвати акт» закриває модалку й відкриває race-sheet
            s.ackGift();
            setRaceSheetId(race!.id);
          }}
        />
      ) : null}
      {raceResult ? <RaceResult store={store} /> : null}
      {s.offline ? <OfflineReturn res={s.offline} inspRows={[...offlineRows(ins.last, s.cfg.params, s.offlineBackAt ?? now), ...offlineRaceRows(s.race.last)]} onClaim={s.claim} /> : null}
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
  kombatBar: { minHeight: size.touchMin, justifyContent: 'center', marginTop: space[8], paddingHorizontal: space[12], borderRadius: radius[6], backgroundColor: color.surface2, borderWidth: 1, borderColor: color.accent },
  kombatText: { ...type('bodyS'), color: color.accent },
  place: { ...type('caption'), color: color.muted },
  hintBar: { minHeight: size.touchMin, justifyContent: 'center', marginTop: space[8], paddingHorizontal: space[12], borderRadius: radius[6], backgroundColor: color.surface2, borderWidth: 1, borderColor: color.accent },
  hintText: { ...type('bodyS'), color: color.accent },
  inspBar: { minHeight: size.touchMin, justifyContent: 'center', marginTop: space[8], paddingHorizontal: space[12], borderRadius: radius[6], backgroundColor: color.alertBg, borderWidth: 1, borderColor: color.alertLine },
  inspText: { ...type('bodyS'), color: color.alertText },
  coachTab: { ...type('bodyS'), color: color.accent, fontWeight: typeScale.cta.fontWeight, backgroundColor: color.bgDeep, paddingHorizontal: space[16], paddingVertical: space[8] },
  bottomStack: { position: 'absolute', left: 0, right: 0, gap: space[8] },
  toast: { marginHorizontal: space[16], backgroundColor: color.surface, borderRadius: radius[6], padding: space[12] },
  toastText: { ...type('body'), color: color.text },
});
