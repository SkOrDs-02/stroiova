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
import { BossBrief } from '@/features/inspections/BossBrief';
import { InspWarning } from '@/features/inspections/InspWarning';
import { offlineRows } from '@/features/inspections/present';
import { inspT } from '@/features/inspections/texts';
import { status as digitStatus } from '@/digitization/digitization';
import { DigitalScreen } from '@/features/digitization/DigitalScreen';
import { DigitConfirm } from '@/features/digitization/DigitConfirm';
import { DigitResult } from '@/features/digitization/DigitResult';
import { LevelUp } from '@/features/digitization/LevelUp';
import { byLevel } from '@/features/digitization/present';
import { digitT } from '@/features/digitization/texts';
import { BoostsSheet } from '@/features/monetization/BoostsSheet';
import { IapSuccess } from '@/features/monetization/IapSuccess';
import { ShopScreen } from '@/features/monetization/ShopScreen';
import { StarterOffer } from '@/features/monetization/StarterOffer';
import { JournalNew } from '@/features/museum/JournalNew';
import { MuseumScreen } from '@/features/museum/MuseumScreen';
import { MenuHost } from '@/features/settings/MenuHost';
import { setT } from '@/features/settings/texts';
import { titleOf } from '@/features/museum/present';
import { muT } from '@/features/museum/texts';
import { boostsT } from '@/features/monetization/texts';
import { nextReveal, unseen } from '@/museum/museum';
import { GiftArrived } from '@/features/race/GiftArrived';
import { offlineRaceRows } from '@/features/race/present';
import { RaceCard } from '@/features/race/RaceCard';
import { RaceResult } from '@/features/race/RaceResult';
import { RaceSheet } from '@/features/race/RaceSheet';
import { Seal } from '@/features/conveyor/Seal';
import { birdEffect, canHireNow, type ConveyorStore, type Toast } from '@/features/conveyor/store';
import { t } from '@/features/conveyor/texts';
import { UnitRow } from '@/features/conveyor/UnitRow';
import { SedoSheet } from '@/features/convert/SedoSheet';
import { StageConvert } from '@/features/convert/StageConvert';
import { DubClosed } from '@/features/dub/DubClosed';
import { EndlessIntro } from '@/features/dub/EndlessIntro';
import { dupT } from '@/features/dub/texts';
import { Credits } from '@/features/finale/Credits';
import { FinaleOrder } from '@/features/finale/FinaleOrder';
import { FinaleShutdown } from '@/features/finale/FinaleShutdown';
import { LastBook } from '@/features/finale/LastBook';
import { finT } from '@/features/finale/texts';
import { pendingAction } from '@/finale/finale';
import { telegramOf } from '@/telegrams/effects';
import { cvT, sedoT } from '@/features/convert/texts';
import { convertInfo } from '@/economy/game/convert';
import { StackTower } from '@/features/stack/StackTower';
import { FinaleScript } from '@/features/story/FinaleScript';
import { StoryCall } from '@/features/story/StoryCall';
import { storyT } from '@/features/story/texts';
import { CallOverlay } from '@/features/onboarding/CallOverlay';
import { ClerkFirst } from '@/features/onboarding/ClerkFirst';
import { ready } from '@/features/onboarding/steps';
import { FIRST_TELEGRAM_ID } from '@/telegrams/content';
import { newRows } from '@/telegrams/packs';
import { repTier } from '@/telegrams/reputation';
import type { InboxItem } from '@/telegrams/types';
import { award, TYPES } from '@/awards/content';
import { unseen as unseenAwards } from '@/awards/awards';
import { awT } from '@/features/awards/texts';
import { t as onb } from '@/features/onboarding/texts';
import { KombatSheet } from '@/features/telegrams/KombatSheet';
import { NoteDetail } from '@/features/telegrams/NoteDetail';
import { ReputationSheet } from '@/features/telegrams/ReputationSheet';
import { PackResult } from '@/features/telegrams/PackResult';
import { PackScreen } from '@/features/telegrams/PackScreen';
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
  | { kind: 'detail'; uid: string; coach: boolean; pack?: number }
  | { kind: 'result'; uid: string; back: 'main' | 'list'; pack?: number }
  | { kind: 'pack'; no: number }
  | { kind: 'pack-result'; no: number }
  | { kind: 'flag'; uid: string; back: 'detail' | 'list' }
  | { kind: 'note'; uid: string }
  | { kind: 'rep'; back: 'main' | 'list' }
  | { kind: 'kombat' }
  | { kind: 'meeting' }
  | { kind: 'convert' }
  | { kind: 'fin-order' }
  | { kind: 'fin-script' }
  | { kind: 'last-book' }
  | { kind: 'credits' }
  | { kind: 'endless-intro' }
  | { kind: 'sedo' }
  | { kind: 'digital' }
  | { kind: 'museum'; seg?: 'journals' | 'curios' | 'awards'; award?: string; source?: 'award_toast' | 'profile' }
  | { kind: 'menu' }
  | { kind: 'shop' }
  | { kind: 'boosts' }
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
    case 'exhibit':
      return muT.toast(titleOf(toast.no));
    case 'award': {
      const a = award(toast.id);
      return a ? TYPES[a.type].toast.replace('{title}', a.title) : '';
    }
    case 'awardMore':
      return awT.toastMore(toast.count);
    case 'awardRetro':
      return awT.toastRetro(toast.count);
    case 'story':
      return storyT.toast(toast.from, toast.title, toast.body);
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

  // 008 FR-26, FR-27: на запуску тихо звіряємо права зі стором
  useEffect(() => {
    void store.getState().syncPurchases();
  }, [store]);

  const toast = s.toast;
  const actionable = toast != null && (toast.kind === 'exhibit' || toast.kind === 'award' || toast.kind === 'awardMore' || toast.kind === 'awardRetro');
  useEffect(() => {
    if (toast == null) return;
    // тост «Новий експонат» з «Відкрити» тримаємо втричі довше: тапнути треба встигнути
    const id = setTimeout(() => store.getState().clearToast(), duration.toast * (actionable ? 3 : 1));
    return () => clearTimeout(id);
  }, [toast, actionable, store]);

  // «Комбата шукають» (003 FR-28): шторка відкривається сама на початку події
  const kombat = s.telegrams.kombat.active;
  const kombatOn = kombat != null && kombat.endMs > now;
  // подію, яку гравець уже бачив, шторка не відкриває вдруге
  const [kombatSeen, setKombatSeen] = useState<number | null>(null);
  const kombatAuto = kombatOn && kombat!.startMs !== kombatSeen && view.kind === 'main' && s.offline == null;
  // «Нарада затягнулась» (011 FR-25): так само, на Р3+
  const meeting = s.telegrams.meeting.active;
  const meetingOn = meeting != null && meeting.endMs > now;
  const [meetingSeen, setMeetingSeen] = useState<number | null>(null);
  const meetingAuto = meetingOn && meeting!.startMs !== meetingSeen && view.kind === 'main' && s.offline == null && !kombatAuto;

  const conv = convertInfo(s.state, s.cfg, s.digit.counts[String(s.state.level)] ?? 0);
  // 013 FR-12: «Збій СЕДО» - той самий шаблон, шторка відкривається сама на початку
  const sedo = s.telegrams.sedo.active;
  const sedoOn = sedo != null && sedo.endMs > now;
  const [sedoSeen, setSedoSeen] = useState<number | null>(null);
  const sedoAuto = sedoOn && sedo!.startMs !== sedoSeen && view.kind === 'main' && s.offline == null && !kombatAuto && !meetingAuto;
  const inbox = s.telegrams.inbox;
  // пачка Р3 займає в «Нових» один рядок (011 FR-18)
  const badge = newRows(s.telegrams) + inbox.filter((x) => x.kind === 'note' && !x.read).length;
  const tier = repTier(s.telegrams.reputation.value, s.cfg.params);
  // 006 FR-22: церемонія цифровізації (акт, наказ про переведення) показується, поки гравець її не закрив, і при запуску
  const ceremony = s.digit.ceremony;
  const storyCallOpen = s.storyCall != null || s.storyScene != null;
  const overlay = s.offline != null || s.clerkFirstOpen || storyCallOpen || view.kind !== 'main' || kombatAuto || meetingAuto || sedoAuto;
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
  // без гравця результат іде в довідку й позначається показаним (FR-25); коротка відсутність без довідки — акт.
  // Хронологічно: непоказаний результат іде раніше за оголошення нової (011: провал підсумкової оголошує повтор одразу)
  const inspResult = inspFree && !inspCall && ins.last != null && !ins.last.seen;
  const inspWarn = inspFree && !inspCall && !inspResult && insp != null && insp.modal && !insp.warned;
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

  // 007: розкриття журналів - після інших модалок; digit-result іде першим, level-up - після (FR-18, spec «Перехід рівня»)
  // `last-book`: журнал № 24 розкривається всередині цього кроку (013 FR-20)
  const viewFree = view.kind === 'main' || view.kind === 'list' || view.kind === 'last-book';
  const revealOpen =
    viewFree && s.offline == null && !s.clerkFirstOpen && !kombatAuto && !meetingAuto && !sedoAuto && !showCall && !inspCall && !inspWarn && !inspResult && !s.inspPrepOpen && !raceResult && !giftOpen && !raceSheet && !storyCallOpen && !(ceremonyOpen && ceremony!.step === 'result') && nextReveal(s.museum) != null;

  // 008: iap-success і starter-offer - після інших модалок і розкриття журналів (порядок «оцінка → журнал → оферта», 09)
  const calm =
    (view.kind === 'main' || view.kind === 'list' || view.kind === 'shop') && s.offline == null && !s.clerkFirstOpen && !kombatAuto && !meetingAuto && !sedoAuto && !showCall && !inspCall && !inspWarn && !inspResult && !s.inspPrepOpen && !raceResult && !giftOpen && !raceSheet && !ceremonyOpen && !storyCallOpen && nextReveal(s.museum) == null;
  const iapOpen = calm && s.busy == null && !onboarding && s.monetization.success.length > 0;
  // оферта лишається на екрані й під час власної оплати (стан «Чекаємо оплату»), але не відкривається поверх чужої
  const starterOpen = calm && (s.busy == null || s.busy === 'purchase') && !iapOpen && s.monetization.offer === 'due' && s.services.purchases.status() === 'ready' && !!s.services.purchases.prices().starter_pack && !onboarding;
  // 014 FR-6: сюжет віддає кроки лише тоді, коли жодна модалка, церемонія чи результат не чекають черги
  const storyFree = calm && !iapOpen && !starterOpen && o.step === 'done';
  const storyMinute = Math.floor(now / 60_000);
  useEffect(() => {
    if (storyFree) store.getState().storyRun();
  }, [store, storyFree, storyMinute, s.story]);

  // 013 FR-16: незавершений крок фіналу - банер на `main`; наказ і титри відкриваються самі, коли нічого не заважає
  const finStep = pendingAction(s.finale);
  const [finAuto, setFinAuto] = useState<string | null>(null);
  // наказ і титри відкриваються самі поверх усього (крайовий випадок: перевірка чи гонка під час конвертації № 6 стають у чергу після кроку)
  const finAutoOpen = finStep != null && (finStep === 'order' || finStep === 'credits') && !onboarding && s.offline == null && view.kind === 'main' && finAuto !== finStep;

  // 013 FR-26: акт «Дубль N закрито» відкривається сам, коли нічого не заважає; далі - наказ про наступний Дубль
  const dubActOpen = s.dub.closed != null && !s.dub.closed.seen && !onboarding && s.offline == null && view.kind === 'main' && !ceremonyOpen;
  // 013 FR-23: пропозиція Дубля чекає - банер на `main`
  const dubBanner = s.dub.offer != null && !dubActOpen && view.kind === 'main' && !onboarding;

  // 016 FR-32: тости грамот чекають онбординг, церемонії й модалки; решта тостів іде перед ними у спільній черзі
  const awardsFree = calm && !iapOpen && !starterOpen && o.step === 'done';
  const awardsPending = s.awardQueue.length;
  useEffect(() => {
    if (awardsFree && awardsPending > 0) store.getState().flushAwardToasts();
  }, [store, awardsFree, awardsPending]);

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
    else if (tab === 'shop') setView({ kind: 'shop' });
    else if (tab === 'museum') {
      if (view.kind !== 'museum') s.openMuseum();
      setView({ kind: 'museum' });
    }
    else if (tab === 'stroyova') setView({ kind: 'main' });
  };
  const openItem = (item: InboxItem, pack?: number) => {
    if (item.kind === 'note') {
      s.openItem(item.uid);
      setView({ kind: 'note', uid: item.uid });
    } else {
      if (item.kind === 'notice') s.openItem(item.uid);
      // 013 FR-23: № 112 «Дублювати на папері» відкриває `endless-intro` (поки пропозиція чекає)
      if (item.kind === 'notice' && telegramOf(item)?.effects?.openScreen === 'endless-intro' && store.getState().dub.offer) {
        setView({ kind: 'endless-intro' });
        return;
      }
      if (item.kind === 'telegram' && item.status === 'new') s.kavaLineFor(item.uid);
      setView({ kind: 'detail', uid: item.uid, coach: false, pack });
    }
  };
  const tabsEnabled: TabId[] = coachRow ? [] : o.step !== 'done' && o.step < 8 ? ['stroyova'] : ['stroyova', 'telegrams', 'digital', 'museum', 'shop'];

  return (
    <View style={styles.root}>
      {view.kind === 'list' ? (
        <TelegramList store={store} onOpen={openItem} onOpenPack={(no) => setView({ kind: 'pack', no })} onReputation={() => setView({ kind: 'rep', back: 'list' })} />
      ) : view.kind === 'digital' || view.kind === 'digit-confirm' ? (
        <DigitalScreen store={store} onOpenConfirm={() => setView({ kind: 'digit-confirm' })} />
      ) : view.kind === 'shop' ? (
        <ShopScreen store={store} insetTop={insets.top + space[16]} />
      ) : view.kind === 'museum' ? (
        <MuseumScreen key={`${view.seg ?? ''}-${view.award ?? ''}-${view.source ?? ''}`} store={store} initialSeg={view.seg} initialAward={view.award ?? null} awardsSource={view.source} insetTop={insets.top + space[16]} onToDigital={() => setView({ kind: 'digital' })} />
      ) : (
        <>
      <View style={[styles.header, { paddingTop: insets.top + space[16] }]} pointerEvents={coachOn ? 'none' : 'auto'}>
        {s.state.level >= 2 ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.place} testID="place">{byLevel.place(s.state.level)}</Text> : null}
        {s.dub.n >= 1 && s.dub.modifier ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.place} testID="dub-chip">{dupT.chip(s.dub.n, dupT.mod[s.dub.modifier].name)}</Text> : null}
        <StackTower store={store} />
        {!onboarding ? (
          <Pressable testID="menu-open" accessibilityRole="button" accessibilityLabel={setT.menuOpen} onPress={() => setView({ kind: 'menu' })} style={[styles.menuBtn, { top: insets.top + space[8] }]}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.menuText}>{setT.menu}</Text>
          </Pressable>
        ) : null}
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.balance} testID="balance">{formatBig(s.state.signatures, 'counter')}</Text>
        <Pressable testID="income-open" accessibilityRole="button" accessibilityLabel={boostsT.title} onPress={() => setView({ kind: 'boosts' })} disabled={coachOn} style={styles.incomeHit}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.income} testID="income">{`${formatRate(inc.perMin)} · ${formatMult(M)}`}</Text>
        </Pressable>
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
        {finStep && view.kind === 'main' ? (
          <Pressable
            testID="finale-banner"
            accessibilityRole="button"
            onPress={() => setView({ kind: finStep === 'order' ? 'fin-order' : finStep === 'script' ? 'fin-script' : finStep === 'last_book' ? 'last-book' : 'credits' })}
            style={styles.inspBar}
          >
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.inspText}>{finT.banner[finStep as keyof typeof finT.banner]}</Text>
          </Pressable>
        ) : null}
        {dubBanner ? (
          <Pressable testID="dub-banner" accessibilityRole="button" onPress={() => setView({ kind: 'endless-intro' })} style={styles.inspBar}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.inspText}>{dupT.banner(s.dub.offer!.n)}</Text>
          </Pressable>
        ) : null}
        {race && race.seen ? <RaceCard race={race} nowMs={now} p={s.cfg.params} onOpen={() => setRaceSheetId(race.id)} /> : null}
        {kombatOn ? (
          <Pressable testID="kombat-bar" accessibilityRole="button" onPress={() => setView({ kind: 'kombat' })} style={styles.kombatBar}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.kombatText}>{`${tgT.kbTitle} · ${tgT.left(formatDuration(Math.max(0, (kombat!.endMs - now) / 1000)))}`}</Text>
          </Pressable>
        ) : null}
        {meetingOn ? (
          <Pressable testID="meeting-bar" accessibilityRole="button" onPress={() => setView({ kind: 'meeting' })} style={styles.kombatBar}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.kombatText}>{`${tgT.mtTitle} · ${tgT.left(formatDuration(Math.max(0, (meeting!.endMs - now) / 1000)))}`}</Text>
          </Pressable>
        ) : null}
        {sedoOn ? (
          <Pressable testID="sedo-bar" accessibilityRole="button" onPress={() => setView({ kind: 'sedo' })} style={styles.kombatBar}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.kombatText}>{`${sedoT.title} · ${tgT.left(formatDuration(Math.max(0, (sedo!.endMs - now) / 1000)))}`}</Text>
          </Pressable>
        ) : null}
        {s.state.level >= 5 ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.place} testID="cv-counter">{digitT.cvCounter(s.state.digital.length, s.cfg.params.convert.order.length)}</Text> : null}
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
              digital={s.state.digital.includes(def.id)}
              convert={conv.next && conv.next.stageId === def.id && conv.status !== 'none' && conv.status !== 'done' ? { label: conv.status === 'available' ? cvT.rowCta : cvT.status[conv.status]!, disabled: conv.status !== 'available', onPress: () => setView({ kind: 'convert' }) } : undefined}
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
        active={view.kind === 'list' ? 'telegrams' : view.kind === 'digital' || view.kind === 'digit-confirm' ? 'digital' : view.kind === 'museum' ? 'museum' : view.kind === 'shop' ? 'shop' : 'stroyova'}
        digitalDot={s.digitRec}
        museumDot={unseen(s.museum) > 0 || unseenAwards(s.awards).length > 0}
        telegramsNew={badge}
        coachTab={coachTab ? 'telegrams' : undefined}
        enabled={tabsEnabled}
        bottomInset={insets.bottom}
        onChange={onTab}
      />
      {/* над таббаром: тост (один, решта в черзі) і під ним підказка коуча кроку 8 */}
      <View style={[styles.bottomStack, { bottom: insets.bottom + size.tabHeight }]} pointerEvents="box-none">
        {toast != null ? (
          <View style={styles.toast} testID="toast" pointerEvents={actionable ? 'auto' : 'none'}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.toastText}>{toastText(toast)}</Text>
            {toast.kind === 'exhibit' ? (
              <Pressable
                testID="toast-open"
                accessibilityRole="button"
                onPress={() => {
                  s.clearToast();
                  s.openMuseum('unlock_toast');
                  setView({ kind: 'museum' });
                }}
                style={styles.toastBtn}
              >
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.toastOpen}>{muT.toastOpen}</Text>
              </Pressable>
            ) : null}
            {toast.kind === 'award' || toast.kind === 'awardMore' || toast.kind === 'awardRetro' ? (
              <Pressable
                testID="toast-awards"
                accessibilityRole="button"
                onPress={() => {
                  s.clearToast();
                  setView({ kind: 'museum', seg: 'awards', source: 'award_toast', ...(toast.kind === 'award' ? { award: toast.id } : {}) });
                }}
                style={styles.toastBtn}
              >
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.toastOpen}>{awT.toastCta}</Text>
              </Pressable>
            ) : null}
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
          onAnswered={(uid) => {
            // 013 FR-19: «Y» на № 109 відкриває серверну (`openScreen: finale-script`), поки крок script не завершено
            const item = s.telegrams.inbox.find((x) => x.uid === uid) ?? store.getState().telegrams.inbox.find((x) => x.uid === uid);
            const open = item ? telegramOf(item)?.choices.find((c) => c.id === item.choiceId)?.effects?.openScreen : undefined;
            if (open === 'finale-script' && store.getState().finale.done.script == null) setView({ kind: 'fin-script' });
            else setView({ kind: 'result', uid, back: view.coach ? 'main' : 'list', pack: view.pack });
          }}
          onFlag={(uid) => setView({ kind: 'flag', uid, back: 'detail' })}
          onReputation={view.coach ? undefined : () => setView({ kind: 'rep', back: 'list' })}
          onBack={view.coach ? undefined : () => setView(view.pack != null ? { kind: 'pack', no: view.pack } : { kind: 'list' })}
        />
      ) : null}
      {view.kind === 'result' ? (
        <TelegramResult store={store} uid={view.uid} firstText={onb.b8Rep} onClose={() => setView(view.pack != null ? { kind: 'pack', no: view.pack } : { kind: view.back })} />
      ) : null}
      {view.kind === 'pack' ? (
        <PackScreen store={store} no={view.no} onBack={() => setView({ kind: 'list' })} onOpen={(item) => openItem(item, view.no)} onSummed={(no) => setView({ kind: 'pack-result', no })} />
      ) : null}
      {view.kind === 'pack-result' ? <PackResult store={store} no={view.no} onClose={() => setView({ kind: 'list' })} /> : null}
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
      {view.kind === 'sedo' || sedoAuto ? (
        <SedoSheet
          store={store}
          onPrinted={() => setView({ kind: 'sedo' })}
          onClose={() => {
            setSedoSeen(sedo?.startMs ?? null);
            setView({ kind: 'main' });
          }}
        />
      ) : null}
      {view.kind === 'fin-order' ? <FinaleOrder store={store} onClose={() => setView({ kind: 'main' })} /> : null}
      {view.kind === 'fin-script' ? <FinaleShutdown store={store} onClose={() => setView({ kind: 'main' })} onNext={() => setView({ kind: 'last-book' })} /> : null}
      {view.kind === 'last-book' ? <LastBook store={store} onNext={() => setView({ kind: 'main' })} /> : null}
      {view.kind === 'credits' ? <Credits store={store} final onClose={() => setView({ kind: 'main' })} /> : null}
      {view.kind === 'endless-intro' ? <EndlessIntro store={store} onClose={() => setView({ kind: 'main' })} /> : null}
      {dubActOpen ? <DubClosed store={store} onNext={() => setView({ kind: 'endless-intro' })} /> : null}
      {view.kind === 'convert' ? <StageConvert store={store} onClose={() => setView({ kind: 'main' })} /> : null}
      {view.kind === 'meeting' || meetingAuto ? (
        <KombatSheet
          store={store}
          kind="meeting"
          onClose={() => {
            setMeetingSeen(meeting?.startMs ?? null);
            setView({ kind: 'main' });
          }}
        />
      ) : null}
      {s.storyCall != null ? <StoryCall store={store} /> : null}
      {s.storyScene != null ? <FinaleScript store={store} /> : null}
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
      {inspWarn ? (s.inspections.active?.kind === 'final' ? <BossBrief store={store} /> : <InspWarning store={store} />) : null}
      {inspResult ? <InspResult store={store} /> : null}
      {s.inspPrepOpen && insp ? <InspPrep store={store} /> : null}
      {view.kind === 'digit-confirm' ? <DigitConfirm store={store} onClose={() => setView({ kind: 'digital' })} onDone={() => setView({ kind: 'main' })} /> : null}
      {ceremonyOpen && ceremony!.step === 'result' ? <DigitResult store={store} /> : null}
      {ceremonyOpen && ceremony!.step === 'levelUp' && nextReveal(s.museum) == null ? <LevelUp store={store} /> : null}
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
      {revealOpen ? <JournalNew store={store} /> : null}
      {finAutoOpen && finStep === 'order' ? (
        <FinaleOrder
          store={store}
          onClose={() => {
            setFinAuto('order');
            setView({ kind: 'main' });
          }}
        />
      ) : null}
      {finAutoOpen && finStep === 'credits' ? (
        <Credits
          store={store}
          final
          onClose={() => {
            setFinAuto('credits');
            setView({ kind: 'main' });
          }}
        />
      ) : null}
      {view.kind === 'menu' ? <MenuHost store={store} insetTop={insets.top + space[8]} onClose={() => setView({ kind: 'main' })} onCurios={() => setView({ kind: 'museum', seg: 'curios' })} onAwards={() => setView({ kind: 'museum', seg: 'awards', source: 'profile' })} /> : null}
      {view.kind === 'boosts' ? <BoostsSheet store={store} onClose={() => setView({ kind: 'main' })} onShop={() => setView({ kind: 'shop' })} /> : null}
      {iapOpen ? <IapSuccess store={store} /> : null}
      {starterOpen ? <StarterOffer store={store} /> : null}
      {s.offline ? <OfflineReturn store={store} res={s.offline} inspRows={[...offlineRows(ins.last, s.cfg.params, s.offlineBackAt ?? now), ...offlineRaceRows(s.race.last)]} onClaim={() => s.claim()} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { padding: space[16], gap: space[4], backgroundColor: color.bgDeep },
  balance: { ...type('displayM'), color: color.text },
  income: { ...type('numL'), color: color.accent },
  incomeHit: { minHeight: size.touchMin, justifyContent: 'center' },
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
  menuBtn: { position: 'absolute', right: space[16], minHeight: size.touchMin, minWidth: size.touchMin, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  menuText: { ...type('bodyS'), color: color.accent },
  hintBar: { minHeight: size.touchMin, justifyContent: 'center', marginTop: space[8], paddingHorizontal: space[12], borderRadius: radius[6], backgroundColor: color.surface2, borderWidth: 1, borderColor: color.accent },
  hintText: { ...type('bodyS'), color: color.accent },
  inspBar: { minHeight: size.touchMin, justifyContent: 'center', marginTop: space[8], paddingHorizontal: space[12], borderRadius: radius[6], backgroundColor: color.alertBg, borderWidth: 1, borderColor: color.alertLine },
  inspText: { ...type('bodyS'), color: color.alertText },
  coachTab: { ...type('bodyS'), color: color.accent, fontWeight: typeScale.cta.fontWeight, backgroundColor: color.bgDeep, paddingHorizontal: space[16], paddingVertical: space[8] },
  bottomStack: { position: 'absolute', left: 0, right: 0, gap: space[8] },
  toast: { marginHorizontal: space[16], backgroundColor: color.surface, borderRadius: radius[6], padding: space[12] },
  toastText: { ...type('body'), color: color.text },
  toastBtn: { minHeight: size.touchMin, justifyContent: 'center', alignSelf: 'flex-start' },
  toastOpen: { ...type('cta'), color: color.accent },
});
