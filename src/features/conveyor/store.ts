// Стан гри зрізу (zustand). Збереження в MMKV — 009: початковий стан приходить із запису, toSave() віддає його назад.
import { create } from 'zustand';

import { bundledConfig } from '@/economy/config';
import { formatDuration, formatMult } from '@/economy/format';
import { advance, claimOffline, creditedAwayMs, offline, type OfflineResult } from '@/economy/game/advance';
import { baseIncomePerMin } from '@/economy/game/income';
import { catTap, refuel, tap } from '@/economy/game/actions';
import { buy, hire, isOk } from '@/economy/game/purchase';
import { newGame } from '@/economy/game/state';
import { absence, isNewSession, shiftTimers } from '@/economy/game/time';
import type { BuyMode, DomainEvent, EconomyConfig, EconomyState, Effect, StoredEffect, UnitRef } from '@/economy/game/types';
import { complete, isDone, isFullScreenStep, newOnboarding, receiveTg1, type CompleteExtra, type OnboardingState, type StepNo } from '@/features/onboarding/steps';
import { inspT } from '@/features/inspections/texts';
import { completeAll, shiftInspections, buyItem as buyInsp, fromTelegramEvent as inspFromTelegram, newInspections, onSessionStart as inspSessionStart, tick as tickInsp } from '@/inspections/lifecycle';
import type { InspectionState } from '@/inspections/types';
import { adSpeedup, digitalSpeedup, fromTelegram as raceFromTelegram, newRace, resume as raceResume, shiftRace, tick as tickRace } from '@/race/race';
import type { RaceState } from '@/race/types';
import { closeCeremonyStep, digitize as digitizeNow, finalDue, newDigitization, shiftDigitization, status as digitStatus } from '@/digitization/digitization';
import type { DigitizationState } from '@/digitization/types';
import { closeInspReveal, closeReveal as closeRevealMuseum, curioFromPack, curioFromRace, curioFromStack, curioFromTelegram, fromEvents as museumFromEvents, interrupted as museumInterrupted, count as countMuseum, newMuseum, openTab as openMuseumTab, markCuriosSeen, raceJournals, unseen as unseenMuseum } from '@/museum/museum';
import type { MuseumState } from '@/museum/types';
import { addBoost, addPending, boostView, bump, closeSuccess, grantProduct, inspAdView, newMonetization, offerDue, applyRights, offerShown, offlineView, raceAdView, syncRights } from '@/monetization/monetization';
import type { AdResult, AdService, MonetizationState, Placement, ProductId, PurchaseResult, PurchaseService } from '@/monetization/types';
import { adT, iapT, shopT } from '@/features/monetization/texts';
import { newNotifications, newSettings, plan as planPushes, settle } from '@/notifications/planner';
import type { LinkService, NotificationService, NotificationsState, PushCategory, PushPermission, Settings } from '@/notifications/types';
import { pushText } from '@/features/settings/pushText';
import { setHapticsEnabled, setSoundEnabled } from '@/features/onboarding/haptics';
import { unavailableLinks } from '@/services/links';
import { newStats, statsFromEvents, type Stats } from '@/profile/stats';
import { newStory } from '@/story/engine';
import type { SessionBudget, StoryState } from '@/story/types';
import { applyEvents, diaryStart, newBudget, newEvents, run as storyRunPatch, syncAway } from './story';
import { unavailableNotifications } from '@/services/notifications';
import { unavailableAds } from '@/services/ads';
import { unavailablePurchases } from '@/services/purchases';
import { digitT } from '@/features/digitization/texts';
import { dayKey } from '@/telegrams/clock';
import { FIRST_TELEGRAM_ID, telegram } from '@/telegrams/content';
import { answer as answerTg, openNotice as openNoticeTg, type AnswerResult } from '@/telegrams/effects';
import { answerPack as answerPackTg, lastPack, resolvedSeparately, type SummaryKind } from '@/telegrams/packs';
import { convertStage as convertStageDomain } from '@/economy/game/convert';
import { briefOnSessionStart, fromTelegram, hasStage, onSessionStart, printSedo as printSedoTg, sedoOnSessionStart, sendRunner as sendRunnerTg } from '@/telegrams/events';
import { grow as growStack, growOffline as growStackOffline, startSession as startStackSession } from '@/stack/stack';
import { deliverFirst, newTelegrams, tick as tickTg } from '@/telegrams/schedule';
import type { TelegramState } from '@/telegrams/types';
import { lineAt, poolSize } from '@/features/telegrams/lines';
import { pickLine } from '@/telegrams/lines';
export type { StoredEffect } from '@/economy/game/types';

/** Рішення 45: не більше 2 реплік персонажів за сесію (сюжет, онбординг, перевірки, телеграми й пуші — поза лімітом). */
const SESSION_LINES_MAX = 2;
/** Сповільнення ланки, що знімаються на конвертації (013 «Крайові випадки»); провал перевірки й відрядження діловода лишаються */
const SLOW_SOURCES: readonly Effect['source'][] = ['telegram_slow', 'telegram_stop', 'kombat_away', 'meeting_overrun', 'pack_beats'];

/** Зсув місцевого часу пристрою, хв (= −getTimezoneOffset): розклад телеграм за годинником пристрою (003 FR-2). */
export function tzOffsetAt(ms: number): number {
  return -new Date(ms).getTimezoneOffset();
}

export type Toast =
  | { kind: 'offline'; amount: number }
  | { kind: 'clockBack' }
  | { kind: 'text'; text: string }
  | { kind: 'archive'; amount: number }
  | { kind: 'rep'; tier: 'low' | 'norm' | 'high' }
  /** Журнал, розкриття якого перервало вбивство застосунку (007 AC-18): тост з «Відкрити» */
  | { kind: 'exhibit'; no: number }
  /** Сюжетний тост (014, носій `event_toast`) */
  | { kind: 'story'; from: string; title: string; body: string };

/** Підписів за перший акт: 8 тапів × tapValue, на 8-му тапі (рішення 57). */
export const ACT_TAPS = 8;

interface Store {
  cfg: EconomyConfig;
  /** Закріплений конфіг (009 FR-22): null до першої покупки рівня */
  pinned: EconomyConfig | null;
  state: EconomyState;
  effects: StoredEffect[];
  /** Ігровий час на передньому плані (002 FR-29) */
  playtimeMs: number;
  onboarding: OnboardingState;
  /** Телеграми й репутація (003) */
  telegrams: TelegramState;
  /** Перевірки (004) */
  inspections: InspectionState;
  /** insp-prep відкрито (з банера, insp-warning чи «Готуватися» в tg-result); лише в пам'яті */
  inspPrepOpen: boolean;
  /** Гонка з часом (005) */
  race: RaceState;
  /** Цифровізація (006) */
  digit: DigitizationState;
  /** Музей і курйози (007) */
  museum: MuseumState;
  /** Реклама й покупки (008) */
  monetization: MonetizationState;
  services: { ads: AdService; purchases: PurchaseService; notifications: NotificationService; links: LinkService };
  /** Налаштування (010) */
  settings: Settings;
  /** Заплановані сповіщення й лічильник доби (010) */
  notifications: NotificationsState;
  stats: Stats;
  /** Сюжет і щоденник (014) */
  story: StoryState;
  /** Перебивні кроки й тости цієї сесії (014 FR-7); лише в пам'яті */
  storySession: SessionBudget;
  /** Дзвінок сюжету на екрані: id кроку (014); лише в пам'яті */
  storyCall: string | null;
  /** Рядок щоденника першої сесії доби для `offline-return`; лише в пам'яті */
  diaryToday: string | null;
  /** Анонімний ID встановлення (009): для «Про гру» й листа про видалення даних */
  installId: string;
  /** «Пізніше» на push-preprompt у цій сесії: не перепитуємо (010 FR-10); у запис не йде */
  pushDeclined: boolean;
  /** Ролик чи оплата йде: повторні тапи ігноруються (крайовий випадок); лише в пам'яті */
  busy: 'ad' | 'purchase' | null;
  /** Підказка «Час цифровізуватися» активна (FR-9); оновлюється раз на хвилину гри, лише в пам'яті */
  digitRec: boolean;
  /** Остання перевірка підказки, мс */
  digitCheckedAt: number;
  /** `digitization_hint_show` уже надіслано цієї сесії (FR-10) */
  digitHintShown: boolean;
  /** Репліки персонажів цієї сесії (рішення 45: ≤ 2 за сесію); лише в пам'яті */
  sessionLines: { count: number; byUid: Record<string, string> };
  /** Тапи першого акта; лише в пам'яті: після вбивства «0 з 8» (002 R4) */
  actTaps: number;
  /** Модалка clerk-first після найму на кроці 7 */
  clerkFirstOpen: boolean;
  /** Результат першого акта («Пташка в небі», «До стройової») ще на екрані */
  actResultOpen: boolean;
  /** Остання мітка часу, до якої нараховано дохід (мс, годинник пристрою) */
  lastMs: number;
  mode: BuyMode;
  offline: OfflineResult | null;
  /** Коли гравець повернувся: ліміт ×2 рахується за датою повернення (крайовий випадок «через північ») */
  offlineBackAt: number | null;
  toast: Toast | null;
  /** Черга тостів: на екрані один, решта чекає (артборд Toasts) */
  toastQueue: Toast[];
  events: DomainEvent[];
  tick: (nowMs: number) => void;
  tapSeal: (nowMs: number) => void;
  buy: (ref: UnitRef, nowMs: number) => void;
  hire: (ref: UnitRef) => void;
  refuel: (nowMs: number) => void;
  cat: (nowMs: number) => void;
  setMode: (mode: BuyMode) => void;
  away: (leftAtMs: number, backAtMs: number) => void;
  /** Забрати довідку; `doubled` - ×2 за ролик чи «Забрати» (008 FR-4); false - ліміт ×2 на добу вичерпано */
  claim: (doubled?: boolean) => boolean;
  clearToast: () => void;
  /** Віддати готові кроки сюжету (014): лише в безпечний момент (FR-6) */
  storyRun: () => void;
  /** Дзвінок сюжету закрито */
  closeStoryCall: () => void;
  showToast: (toast: Toast) => void;
  /** Закрити крок онбордингу (002 FR-1); false — крок не поточний */
  onbComplete: (step: StepNo, extra?: CompleteExtra) => boolean;
  /** Тап «Підписати» на першому акті; повертає n з 8 */
  actSign: () => number;
  /** Кінець анімації ПОГОДЖЕНО: крок 5, «Пташка» злітає (FR-12) */
  stamp: () => void;
  /** «До стройової» з результату першого акта */
  toMain: () => void;
  /** Закрити clerk-first (крок 7 уже закрито наймом) */
  closeClerkFirst: () => void;
  /** Крок 8: телеграма № 1 у вхідних (002 FR-18, 003 FR-1) */
  receiveTg1: () => void;
  /** Відповідь на телеграму (003 FR-12…FR-20); на № 1 закриває крок 8 онбордингу */
  answerTelegram: (uid: string, choiceId: string) => AnswerResult['item'] | { error: string };
  /** «Роздрукувати» у «Збої СЕДО» (013 FR-12): −5 аркушів, збій знято */
  printSedo: () => { ok: true } | { error: 'none' } | { error: 'paper'; lack: number };
  /** Оцифрувати наступну ланку Р5 (013 FR-7); `price` - ціна зі шторки (ВП-1) */
  convertStage: (price?: number) => { ok: true } | { error: string };
  /** «Звести в одну відповідь» (011 FR-19…FR-24): зведена відповідь пачки № N видом `kind` */
  answerPack: (no: number, kind: SummaryKind) => { ok: true } | { error: string };
  /** Відкрити телеграму без вибору чи записку (FR-11, FR-27) */
  openItem: (uid: string) => void;
  /** «Це не смішно» (FR-26): лише позначка, без впливу на гру */
  flagTelegram: (uid: string, reason?: number | null, hasComment?: boolean) => void;
  /** «Готуватися» до позапланової перевірки (перебіг — 04) */
  prepareInspection: (uid: string) => void;
  /** «Відправити посильного» (FR-28) */
  sendRunner: () => boolean;
  /** «Передати записку на нараду» (011 FR-25) */
  sendNote: () => boolean;
  /** Репліка Кави над новою телеграмою: одна на телеграму, ≤ 2 реплік за сесію (рішення 41, 45) */
  kavaLineFor: (uid: string) => string | null;
  /** Бонус архіву «Археолога» (крок 9, FR-20): archiveBonusMin × базовий дохід, один раз */
  claimArchive: () => number;
  /** Пункт чекліста за підписи (004 FR-14); false — не списано */
  buyInspItem: (itemId: string) => boolean;
  /** `call` «Археолога» перед першою перевіркою закрито (FR-2) */
  ackInspCall: () => void;
  /** insp-warning закрито: «Готуватися» відкриває insp-prep, «Пізніше» — ні (FR-8, FR-9) */
  ackInspWarning: (prepare: boolean) => void;
  openInspPrep: () => void;
  closeInspPrep: () => void;
  /** insp-result закрито (FR-22) */
  closeInspResult: () => void;
  /** Нагорода за рекламу чи «Забрати» (008 FR-1…FR-14): ролик показується лише з обробника тапу */
  watchAd: (placement: Placement) => Promise<'granted' | 'closed' | 'unavailable' | 'blocked' | 'busy'>;
  /** Купити товар (FR-15…FR-24) */
  purchase: (id: ProductId) => Promise<void>;
  /** Відновити покупки (FR-27) */
  restore: (trigger: 'shop_button' | 'settings_button' | 'auto_check') => Promise<void>;
  /** Тихо звірити права зі стором на запуску (FR-26, FR-27) */
  syncPurchases: () => Promise<void>;
  /** iap-success закрито */
  closeIapSuccess: () => void;
  /** starter-offer закрито (FR-19) */
  ackStarterOffer: () => void;
  /** Перемикачі налаштувань (010 FR-14, FR-16) */
  setSetting: (key: 'sound' | 'haptics' | 'analytics' | 'testUser', value: boolean) => void;
  /** Категорія сповіщень (FR-15) */
  setNotifCategory: (cat: PushCategory, value: boolean) => void;
  /** Системний запит дозволу після `push-preprompt` (FR-9…FR-11); повертає відповідь ОС */
  requestPush: (trigger: 'onboarding_session_end' | 'settings') => Promise<PushPermission>;
  /** Дозвіл ОС міг змінитись поза грою (FR-12) */
  refreshPermission: () => Promise<void>;
  declinePush: (trigger: 'onboarding_session_end' | 'settings') => void;
  /** Гра пішла у фон: сповіщення за станом (FR-5) */
  goBackground: (nowMs: number) => Promise<void>;
  /** Гра повернулась: заплановане скасовано (FR-5) */
  comeForeground: (nowMs: number) => Promise<void>;
  /** «Підписати й скинути» (FR-19, FR-20, рішення 88) */
  resetProgress: () => void;
  /** Рапорт на зміну позивного (FR-26) */
  changeCallsign: (text: string, gender: 'm' | 'f') => void;
  /** Список курйозів відкрито: бейдж «нове» гасне (FR-30) */
  markCuriosSeen: () => void;
  /** `journal-new` закрито: журнал переглянуто (рішення 79) */
  closeReveal: () => void;
  /** Вкладку «Музей» відкрито: усе переглянуто (007 FR-20) */
  openMuseum: (source?: 'tab' | 'unlock_toast') => void;
  /** Репліка Тумбочкіна з пулу на момент перевірки; поза лімітом сесії (рішення 45) */
  tumbLine: (key: string, slot: string) => string | null;
  /** «Послатися на цифру» (005 FR-16); false — недоступно */
  raceDigital: () => boolean;
  /** gift-arrived закрито «Зареєструвати акт» (FR-6) */
  ackGift: () => void;
  /** race-won / race-lost закрито */
  closeRaceResult: () => void;
  /** Цифровізація (006 FR-14…FR-17); false — недоступно чи вже йде церемонія */
  digitize: (fromHint?: boolean) => boolean;
  /** Закрити крок церемонії: digit-result → level-up → кінець (FR-21, FR-25) */
  closeDigitStep: () => void;
  /** Картку «Як це працює» показано (FR-12) */
  ackDigitHow: () => void;
}

/** Рішення 59: до закриття кроку 7 наймати можна лише діловода «Стройової частини». */
export function canHireNow(o: OnboardingState, ref: UnitRef): boolean {
  const before7 = o.step !== 'done' && o.step <= 7;
  return !before7 || (ref.type === 'stage' && ref.id === 'stroy');
}

/** «Пташка» як тимчасовий множник від мітки a: діє ще birdLeftMs ігрового часу (002 R3). */
export function birdEffect(cfg: EconomyConfig, o: OnboardingState, a: number): Effect[] {
  if (o.birdLeftMs <= 0) return [];
  return [{ kind: 'mult', source: 'onboarding_bird', value: cfg.params.onboardingBirdMult, startMs: a, endMs: a + o.birdLeftMs }];
}

/** Місцева дата пристрою РРРР-ММ-ДД: ліміти доби рахуються за нею (001 FR-26, 009 FR-15). */
export function localDate(ms: number): string {
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export interface Initial {
  state?: EconomyState;
  effects?: StoredEffect[];
  pinned?: EconomyConfig | null;
  playtimeMs?: number;
  onboarding?: OnboardingState;
  telegrams?: TelegramState;
  inspections?: InspectionState;
  race?: RaceState;
  digit?: DigitizationState;
  museum?: MuseumState;
  monetization?: MonetizationState;
  settings?: Settings;
  notifications?: NotificationsState;
  stats?: Stats;
  story?: StoryState;
  installId?: string;
  services?: Partial<{ ads: AdService; purchases: PurchaseService; notifications: NotificationService; links: LinkService }>;
}

export function createConveyorStore(nowMs: number, cfg: EconomyConfig = bundledConfig, init?: Initial) {
  const store = create<Store>((set, get) => {
  /** Доменні події телеграм → ефекти, тости, журнал подій (003). */
  const handleEvents = (evs: DomainEvent[], nowMs: number) => {
    if (!evs.length) return;
    let effects = get().effects;
    let tg = get().telegrams;
    let insp = get().inspections;
    const out: DomainEvent[] = [...evs];
    const added: string[] = [];
    let prep = false;
    for (const e of evs) {
      // 013 FR-10: з першої конвертації «Комбата шукають» не стартує і з телеграми
      if (e.type === 'kombatRequest' && get().state.digital.length === 0) {
        const k = fromTelegram(tg, get().cfg, nowMs, tzOffsetAt(nowMs), e.maxMin);
        tg = k.tg;
        if (k.effect) effects = [...effects.filter((x) => x.source !== 'kombat_away' || x.endMs <= nowMs), k.effect];
      }
      // 004 FR-5…FR-7, FR-18: позапланова, пункт з телеграми, зауваження № 16
      if (e.type === 'unscheduledInspection' || e.type === 'inspItem') {
        const r = inspFromTelegram(insp, get().state, get().cfg, e, nowMs, tzOffsetAt(nowMs), tg.reputation.value);
        insp = r.s;
        out.push(...r.events);
        if (r.addedItem) added.push(r.addedItem);
      }
      if (e.type === 'inspectionPrepare' && insp.active) prep = true;
      // 005 FR-18: телеграма № 20 змінює поточну гонку
      if (e.type === 'raceEffect') {
        // лише на гонку, під час якої телеграма прийшла: відповідь після кінця гонки не чіпає наступну
        const item = tg.inbox.filter((x) => x.id === e.telegramId).at(-1);
        set({ race: raceFromTelegram(get().race, e.effect, nowMs, item?.receivedAt ?? nowMs) });
      }
    }
    // «Готуватися» з tg-result відкриває insp-prep; insp-warning після цього не потрібен
    if (prep && insp.active) insp = { ...insp, active: { ...insp.active, warned: true } };
    set({ telegrams: tg, inspections: insp, effects, events: [...get().events, ...out].slice(-40), ...(prep ? { inspPrepOpen: true } : {}) });
    absorbMuseum(evs, nowMs);
    for (const id of added) {
      const short = inspT.item[id]?.short;
      if (short) get().showToast({ kind: 'text', text: inspT.toastItem(short) });
    }
    for (const e of evs) {
      if (e.type === 'reputationTierChange') get().showToast({ kind: 'rep', tier: e.to });
      // Граніт у «знайшли» — репліка персонажа, у ліміті сесії
      // 011 FR-22: «Зведення б'ється» - тост із пулу pack.beats
      if (e.type === 'packBeats') {
        const r = pickLine(get().telegrams, 'pack.beats', poolSize('pack.beats'));
        if (r.index != null) {
          set({ telegrams: r.tg });
          get().showToast({ kind: 'text', text: lineAt('pack.beats', r.index).replace('{m}', formatMult(e.mult)).replace('{h}', String(e.hours)) });
        }
      }
      if (e.type === 'kombatFound' && get().telegrams.kombat.active) characterLine('granit.success', `kombat:${get().telegrams.kombat.active!.startMs}`);
      if (e.type === 'meetingFound' && get().telegrams.meeting.active) characterLine('kava.narada_found', `meeting:${get().telegrams.meeting.active!.startMs}`);
    }
  };
  /** «Стартовий набір» після скидання: 50 000 знову, щойно онбординг пройдено (рішення 88) */
  const grantStarterIfDue = () => {
    const g = get();
    if (!g.monetization.rights.starter_pack || g.monetization.starterGranted || g.onboarding.step !== 'done') return;
    set({ state: { ...g.state, signatures: g.state.signatures + g.cfg.params.starterSignatures }, monetization: { ...g.monetization, starterGranted: true } });
  };
  /** Стос до наради (012): події росту - у журнал курйозів, тост із пулу `stack.meter`, подія аналітики */
  const stackEvents = (evs: DomainEvent[], atMs: number) => {
    if (!evs.length) return;
    set({ events: [...get().events, ...evs].slice(-40) });
    absorbMuseum(evs, atMs);
    const r = pickLine(get().telegrams, 'stack.meter', poolSize('stack.meter'));
    if (r.index != null) {
      set({ telegrams: r.tg });
      get().showToast({ kind: 'text', text: lineAt('stack.meter', r.index) });
    }
  };
  const pushEvent = (e: DomainEvent) => set({ events: [...get().events, e].slice(-40) });
  /** Товар отримано: права, ефект, події (008 FR-17, FR-18, FR-23); `silent` - відновлення без iap-success */
  const grantNow = (id: ProductId, silent: boolean) => {
    const g = get();
    const r = grantProduct(g.monetization, g.state, g.cfg, id, g.lastMs, { silent });
    if (r.ms === g.monetization) return;
    set({
      monetization: r.ms,
      state: r.eco,
      events: [...g.events, ...(silent ? [] : [{ type: 'purchaseComplete' as const, productId: id, isFirstPurchase: g.monetization.purchases === 0, purchaseNumber: r.ms.purchases }])].slice(-40),
    });
  };
  /** Нагорода за ролик чи «Забрати» (008 FR-2…FR-6, FR-12): записується в мить нагороди */
  const rewardAd = (placement: Placement, method: 'ad' | 'no_ads_pass'): boolean => {
    const g = get();
    const now = g.lastMs;
    const date = localDate(now);
    const p = g.cfg.params;
    let ok = false;
    if (placement === 'income_boost') {
      const v = boostView(g.monetization, g.effects, now, date, g.cfg, g.state.hasNoAds);
      if (v.button === 'limit' || v.button === 'cap') return false;
      set({ effects: addBoost(g.effects, now, g.cfg) as StoredEffect[], monetization: bump(g.monetization, 'boost', date) });
      pushEvent({ type: 'boostActivate', boostType: 'income_x2', mult: p.adMult, durationSec: p.adHours * 3600 });
      get().showToast({ kind: 'text', text: adT.reward });
      ok = true;
    } else if (placement === 'offline_double') {
      ok = get().claim(true);
    } else if (placement === 'race_speedup') {
      if (raceAdView(g.monetization, g.state, g.cfg, date).button === 'limit') return false;
      const r = adSpeedup(g.race, now, g.cfg, method);
      if ('error' in r) return false;
      set({ race: r.s, monetization: bump(g.monetization, 'race', date), events: [...g.events, ...r.events].slice(-40) });
      get().showToast({ kind: 'text', text: adT.rewardRace(formatDuration(r.events[0]!.type === 'raceSpeedup' ? r.events[0]!.secSaved : 0)) });
      ok = true;
    } else {
      const insp = g.inspections.active;
      if (!insp || inspAdView(g.monetization, insp.id, g.state).button === 'limit') return false;
      const r = completeAll(g.inspections, now, method);
      if ('error' in r) return false;
      set({ inspections: r.s, monetization: { ...g.monetization, inspAdId: insp.id }, events: [...g.events, ...r.events].slice(-40) });
      get().showToast({ kind: 'text', text: adT.rewardInsp });
      ok = true;
    }
    if (ok) pushEvent({ type: 'adRewardGrant', placement, isNoAdsClaim: method === 'no_ads_pass' });
    return ok;
  };
  /** Репліка персонажа з мішка пулу на слот (телеграма, подія): одна на слот, ≤ 2 за сесію (рішення 41, 45). */
  const characterLine = (key: string, slot: string): string | null => {
    const sl = get().sessionLines;
    if (sl.byUid[slot] != null) return sl.byUid[slot]!;
    if (sl.count >= SESSION_LINES_MAX) return null;
    const r = pickLine(get().telegrams, key, poolSize(key));
    if (r.index == null) return null;
    const text = lineAt(key, r.index);
    set({ telegrams: r.tg, sessionLines: { count: sl.count + 1, byUid: { ...sl.byUid, [slot]: text } } });
    return text;
  };
  /** Репліка події (перевірки): з мішка пулу, одна на слот, поза лімітом 2 за сесію (рішення 45). */
  const eventLine = (key: string, slot: string): string | null => {
    const sl = get().sessionLines;
    if (sl.byUid[slot] != null) return sl.byUid[slot]!;
    const r = pickLine(get().telegrams, key, poolSize(key));
    if (r.index == null) return null;
    const text = lineAt(key, r.index);
    set({ telegrams: r.tg, sessionLines: { count: sl.count, byUid: { ...sl.byUid, [slot]: text } } });
    return text;
  };
  /**
   * Підказка «Час цифровізуватися» (006 FR-8…FR-10): умова перевіряється раз на хвилину гри; подія — раз за сесію.
   */
  const DIGIT_HINT_EVERY_MS = 60_000;
  const checkDigitHint = (now: number, force = false) => {
    const g = get();
    if (!force && now - g.digitCheckedAt < DIGIT_HINT_EVERY_MS) return;
    const st = digitStatus(g.state, g.digit, g.cfg, now, g.effects);
    const patch: Partial<Store> = { digitCheckedAt: now };
    if (st.recommended !== g.digitRec) patch.digitRec = st.recommended;
    if (st.recommended && !g.digitHintShown) {
      patch.digitHintShown = true;
      patch.events = [...g.events, { type: 'digitizationHint' as const, etaSec: st.etaSec ?? 0, points: st.points, pointsTotal: g.state.prestigePoints, isFirst: g.digit.total === 0 }].slice(-40);
    }
    set(patch);
  };
  /**
   * Музей (007): журнали й записи курйозів з доменних подій інших фіч. Бонуси лягають у `state.museum` у мить отримання
   * (рішення 79), тож економіка рахує їх одразу.
   */
  const absorbMuseum = (evs: readonly DomainEvent[], atMs: number, offline = false) => {
    if (!evs.length) return;
    const g = get();
    const stats = statsFromEvents(g.stats, evs);
    if (stats !== g.stats) set({ stats });
    let ms = g.museum;
    for (const e of evs) {
      if (e.type === 'curio') ms = curioFromTelegram(ms, e, g.telegrams, atMs);
      if (e.type === 'raceCurio') ms = curioFromRace(ms, e);
      if (e.type === 'packCurio') ms = curioFromPack(ms, e, atMs);
      if (e.type === 'stackReach') ms = curioFromStack(ms, e, atMs);
    }
    // «У музеї з» - мітка самої перевірки, а не повернення гравця (крайовий випадок «Офлайн»)
    const r = museumFromEvents(ms, g.state, g.cfg, evs, atMs, { offline, inspAtMs: g.inspections.last?.arrMs });
    if (r.ms === g.museum && r.eco === g.state && !r.events.length) return;
    set({ museum: r.ms, state: r.eco, events: [...get().events, ...r.events].slice(-40) });
  };
  /**
   * Перевірки в (from, to] (004): оголошення й приїзди. Іде перед доходом: ×3 чи сповільнення з мітками приїзду
   * вже в ефектах, коли економіка ріже інтервал (01 FR-24).
   */
  const runInspections = (from: number, to: number, offline: boolean) => {
    const g = get();
    if (to <= from) return;
    const r = tickInsp(g.inspections, g.state, g.cfg, {
      fromMs: from,
      nowMs: to,
      tzOffsetMin: tzOffsetAt(to),
      offline,
      reputation: g.telegrams.reputation.value,
      digitizations: g.digit.total,
      finalDue: finalDue(g.cfg, g.digit, g.state.level),
      lastPack: lastPack(g.telegrams),
      effects: g.effects,
    });
    if (r.s === g.inspections && !r.events.length) return;
    // 003 FR-15: після першої планової відписки можуть кликати позапланові
    const tg = r.scheduledArrived && !g.telegrams.firstInspectionPassed ? { ...g.telegrams, firstInspectionPassed: true } : g.telegrams;
    // 011 FR-6: пройдена підсумкова дозволяє перехід; наступна цифровізація - з переходом
    const exit = r.events.some((e) => e.type === 'finalPassed');
    set({
      inspections: r.s,
      telegrams: tg,
      effects: [...g.effects, ...r.effects],
      events: [...g.events, ...r.events].slice(-40),
      ...(exit ? { digit: { ...g.digit, levelExitAllowed: true } } : {}),
      ...(r.s.active ? {} : { inspPrepOpen: false }),
    });
    absorbMuseum(r.events, to, offline);
  };
  /**
   * Гонка в (from, to] (005): фінал і прихід подарунка. Іде перед доходом: множник подарунка з мітками кінця акта
   * вже в ефектах, коли економіка ріже інтервал (FR-27).
   */
  const runRace = (from: number, to: number, offline: boolean) => {
    const g = get();
    if (to <= from) return;
    const r = tickRace(g.race, g.state, g.cfg, { fromMs: from, nowMs: to, tzOffsetMin: tzOffsetAt(to), installMs: g.inspections.installMs, offline, journals: raceJournals(g.museum, g.cfg) });
    if (r.s === g.race && !r.events.length) return;
    set({ race: r.s, state: r.eco, effects: [...g.effects, ...r.effects], events: [...g.events, ...r.events].slice(-40) });
    absorbMuseum(r.events, to, offline);
  };
  /** № 20 вийшла з шухляди (відповідь чи повернення): акт іде далі (FR-18). */
  const resumeRaceIfFree = (now: number) => {
    const r = get().race.active;
    if (!r || r.pausedAtMs == null) return;
    const held = get().telegrams.inbox.some((x) => x.status === 'drawer' && !!telegram(x.id)?.choices.find((c) => c.id === x.choiceId)?.effects.race);
    if (!held) set({ race: raceResume(get().race, now) });
  };
  /** Розклад і таймери телеграм у (from, to] (003 FR-2, FR-3, FR-17): лише після № 1. */
  const runTelegrams = (from: number, to: number, away: boolean) => {
    const g = get();
    if (g.telegrams.startMs == null || to <= from) return;
    const r = tickTg(g.telegrams, g.state, {
      cfg: g.cfg,
      fromMs: from,
      nowMs: to,
      tzOffsetMin: tzOffsetAt(to),
      level: g.state.level,
      digitizations: g.digit.total,
      conversions: g.state.digital.length,
      raceActive: g.race.active?.type ?? null,
      away,
    });
    set({ telegrams: r.tg, state: r.eco });
    handleEvents(r.events, to);
  };
  /** Повернення з фону чи холодний старт (001 FR-13, FR-25; 009 FR-14). */
  const awayInner = (leftAt: number, backAt: number) => {
    const { state, cfg: c, effects } = get();
    const a = absence(leftAt, backAt);
      if (a.clockBack) {
        // 009 FR-14: офлайн 0, таймери зсунуто так, щоб залишок дорівнював залишку на момент запису
        const sh = shiftTimers(state, effects, a.rawMs);
        set({ state: sh.state, effects: sh.effects as StoredEffect[], inspections: shiftInspections(get().inspections, a.rawMs), race: shiftRace(get().race, a.rawMs), digit: shiftDigitization(get().digit, a.rawMs), digitCheckedAt: 0, lastMs: backAt });
        get().showToast({ kind: 'clockBack' });
        return;
      }
      const res = offline(state, c, leftAt, backAt, effects);
      if (res.short) {
        const r = claimOffline(state, c, res, false, localDate(backAt));
        if ('error' in r) return;
        set({ state: r.state, lastMs: backAt });
        if (r.claimed > 0) get().showToast({ kind: 'offline', amount: r.claimed });
      } else {
        set({ offline: res, offlineBackAt: backAt, lastMs: backAt });
      }
    };
  // 007 AC-18: розкриття, перерване вбивством застосунку, стає тостами «Новий експонат» (рішення 79)
  const interrupted = museumInterrupted(init?.museum ?? newMuseum());
  return {
    cfg,
    pinned: init?.pinned ?? null,
    state: init?.state ?? newGame(cfg, nowMs),
    effects: init?.effects ?? [],
    playtimeMs: init?.playtimeMs ?? 0,
    onboarding: init?.onboarding ?? newOnboarding(0),
    telegrams: init?.telegrams ?? newTelegrams(cfg.params, `game-${nowMs}`),
    inspections: init?.inspections ?? newInspections(nowMs, `insp-${nowMs}`),
    inspPrepOpen: false,
    race: init?.race ?? newRace(`race-${nowMs}`),
    digit: init?.digit ?? newDigitization(nowMs),
    museum: interrupted.ms,
    monetization: init?.monetization ?? newMonetization(),
    services: { ads: init?.services?.ads ?? unavailableAds, purchases: init?.services?.purchases ?? unavailablePurchases, notifications: init?.services?.notifications ?? unavailableNotifications, links: init?.services?.links ?? unavailableLinks },
    settings: init?.settings ?? newSettings(),
    notifications: init?.notifications ?? newNotifications(),
    stats: init?.stats ?? newStats(),
    story: init?.story ?? newStory(),
    storySession: newBudget(),
    storyCall: null,
    diaryToday: null,
    installId: init?.installId ?? '',
    pushDeclined: false,
    busy: null,
    digitRec: false,
    digitCheckedAt: 0,
    digitHintShown: false,
    sessionLines: { count: 0, byUid: {} },
    // крок 5 закривається кінцем анімації ПОГОДЖЕНО; якщо застосунок вбито під час неї, акт уже підписано (FR-28)
    actTaps: init?.onboarding?.step === 5 ? ACT_TAPS : 0,
    clerkFirstOpen: false,
    actResultOpen: false,
    lastMs: nowMs,
    mode: 'x1',
    offline: null,
    offlineBackAt: null,
    toast: interrupted.nos.length ? ({ kind: 'exhibit', no: interrupted.nos[0]! } as Toast) : null,
    toastQueue: interrupted.nos.slice(1).map((no) => ({ kind: 'exhibit', no }) as Toast),
    events: [],
    tick: (now) => {
      if (now <= get().lastMs) return;
      runInspections(get().lastMs, now, false);
      runRace(get().lastMs, now, false);
      const { state, cfg: c, effects, lastMs, onboarding: o, playtimeMs } = get();
      const dt = now - lastMs;
      // tick іде лише на передньому плані: ігровий час і «Пташка» не рахуються у фоні (FR-12, FR-29).
      // До кінця першого акта конвеєр стоїть (як у sim.js: дохід з onboardingBirdStartSec), іде лише ігровий час.
      const idleConveyor = isFullScreenStep(o.step);
      set({
        state: idleConveyor ? state : advance(state, c, lastMs, now, [...effects, ...birdEffect(c, o, lastMs)]).state,
        lastMs: now,
        playtimeMs: playtimeMs + dt,
        ...(o.birdLeftMs > 0 ? { onboarding: { ...o, birdLeftMs: Math.max(0, o.birdLeftMs - dt) } } : {}),
      });
      runTelegrams(lastMs, now, false);
      // 012 FR-13, FR-14: стос росте від роботи «Звітів про звіти» на передньому плані
      const g4 = get();
      if (!idleConveyor && g4.state.level >= 4) {
        const st0 = g4.digit.stack.sessionStartMs == null ? startStackSession(g4.digit.stack, lastMs) : g4.digit.stack;
        const gr = growStack(st0, g4.state, c, lastMs, now, g4.effects);
        if (gr.st !== g4.digit.stack) set({ digit: { ...g4.digit, stack: gr.st } });
        stackEvents(gr.events, now);
      }
      resumeRaceIfFree(now);
      checkDigitHint(now);
      grantStarterIfDue();
    },
    tapSeal: (now) => {
      const { state, cfg: c, effects, onboarding: o, lastMs } = get();
      set({ state: tap(state, c, now, [...effects, ...birdEffect(c, o, Math.min(lastMs, now))]).state });
    },
    buy: (ref, now) => {
      const { state, cfg: c, effects, mode, pinned } = get();
      const r = buy(state, c, ref, mode, now, effects);
      if (!isOk(r)) return;
      // 009 FR-22: на першій покупці рівня конфіг закріплюється, далі його не змінює ні прапор, ні оновлення
      const purchased = r.events.some((e) => e.type === 'purchase');
      const firstUpgrade = pinned == null && purchased;
      set({ state: r.state, events: [...get().events, ...r.events].slice(-20), ...(firstUpgrade ? { pinned: c } : {}) });
      // 002 FR-16: крок 6 закриває перша покупка рівня
      if (purchased) get().onbComplete(6);
      // 006 FR-9: підказка зникає, щойно умова хибна (після покупки наступна покупка далі)
      checkDigitHint(now, true);
    },
    hire: (ref) => {
      if (!canHireNow(get().onboarding, ref)) return;
      const { state, cfg: c } = get();
      const r = hire(state, c, ref);
      if (!isOk(r)) return;
      set({ state: r.state, events: [...get().events, ...r.events].slice(-20) });
      // 002 FR-17: крок 7 — найм діловода «Стройової частини» (рішення 56), далі clerk-first
      if (ref.type === 'stage' && ref.id === 'stroy' && get().onbComplete(7)) set({ clerkFirstOpen: true });
    },
    refuel: (now) => {
      // № 24 «у шухляду»: заправку заблоковано на годину (003 FR-20)
      if (now < get().telegrams.refuelBlockedUntil) return;
      set({ state: refuel(get().state, get().cfg, now).state });
    },
    cat: (now) => set({ state: catTap(get().state, get().cfg, now).state }),
    setMode: (mode) => set({ mode }),
    away: (leftAt, backAt) => {
      // перевірки без гравця — за станом чекліста на мить виходу (FR-24); до доходу, щоб ×3 потрапив у офлайн
      runInspections(leftAt, backAt, true);
      runRace(leftAt, backAt, true);
      awayInner(leftAt, backAt);
      // 003: телеграми, що прийшли без гравця (FR-3); нова сесія — шанс «Комбата шукають» (FR-29)
      runTelegrams(leftAt, Math.max(leftAt, backAt), true);
      // 014 FR-8: що спрацювало без гравця, показується після довідки
      const sa = syncAway(get(), backAt);
      if (sa) set(sa);
      resumeRaceIfFree(backAt);
      if (isNewSession(leftAt, backAt)) {
        set({ sessionLines: { count: 0, byUid: {} }, digitHintShown: false, storySession: newBudget() });
        const g = get();
        // 013 FR-10: після конвертації № 1 «Комбата шукають» зникає з гри назавжди
        const k = g.state.digital.length >= 1 ? { tg: g.telegrams, effect: null, events: [] as DomainEvent[] } : onSessionStart(g.telegrams, g.cfg, backAt, tzOffsetAt(backAt), false);
        // чинна подія не накладається: ×0,25 не множиться вдруге (рішення 25)
        set({ telegrams: k.tg, ...(k.effect ? { effects: [...g.effects.filter((x) => x.source !== 'kombat_away' || x.endMs <= backAt), k.effect] } : {}) });
        handleEvents(k.events, backAt);
        // 011 FR-25: «Нарада затягнулась» - з Р3, той самий шаблон; поки йде комбат, не стартує
        const g1 = get();
        if (hasStage('meeting', g1.state) && !g1.state.digital.includes('narada')) {
          const m = onSessionStart(g1.telegrams, g1.cfg, backAt, tzOffsetAt(backAt), false, 'meeting');
          set({ telegrams: m.tg, ...(m.effect ? { effects: [...g1.effects.filter((x) => x.source !== 'meeting_overrun' || x.endMs <= backAt), m.effect] } : {}) });
          handleEvents(m.events, backAt);
        }
        // 013 FR-12: «Збій СЕДО» - з появи цифрових ланок, не більше однієї одночасно
        const gd = get();
        if (gd.state.digital.length > 0) {
          const sd = sedoOnSessionStart(gd.telegrams, gd.cfg, gd.state, backAt, tzOffsetAt(backAt));
          set({ telegrams: sd.tg, ...(sd.effect ? { effects: [...gd.effects, sd.effect] } : {}), ...(sd.events.length ? { events: [...gd.events, ...sd.events].slice(-40) } : {}) });
        }
        // 014 FR-24: рядок щоденника першої сесії доби - у довідці, а без довідки тостом
        const dp = diaryStart(get(), tzOffsetAt(backAt));
        if (dp) {
          set(dp);
          if (dp.diaryToday && get().offline == null) {
            get().showToast({ kind: 'text', text: dp.diaryToday });
            set({ diaryToday: null });
          }
        }
        // 012 FR-13: нова сесія - стос з нуля; зарахований офлайн додає висоту одразу
        const gs = get();
        if (gs.state.level >= 4) {
          const ab = absence(leftAt, backAt);
          const credited = ab.clockBack ? 0 : creditedAwayMs(gs.state, leftAt, backAt);
          const gr = growStackOffline(startStackSession(gs.digit.stack, backAt), gs.state, gs.cfg, credited, backAt, gs.effects);
          set({ digit: { ...gs.digit, stack: gr.st } });
          stackEvents(gr.events, backAt);
          // 012 FR-17: «Доповідь тезово» - документ у «Нові», поза квотою
          const gb = get();
          const br = briefOnSessionStart(gb.telegrams, gb.cfg, gb.state, backAt, tzOffsetAt(backAt));
          // rng просувається і на промаху: наступна сесія кидає новий кубик
          set({ telegrams: br.tg });
          if (br.item) handleEvents(br.events, backAt);
        }
        // 004 FR-2: перша перевірка — на старті сесії, коли онбординг етапу 1 пройдено (крок 9)
        const g2 = get();
        if (isDone(g2.onboarding, 9)) {
          const ins = inspSessionStart(g2.inspections, g2.state, g2.cfg, backAt, tzOffsetAt(backAt), g2.telegrams.reputation.value);
          if (ins.events.length) set({ inspections: ins.s, events: [...g2.events, ...ins.events].slice(-40) });
        }
      }
    },
    claim: (doubled = false) => {
      const { state, cfg: c, offline: res, offlineBackAt } = get();
      if (!res || offlineBackAt == null) return false;
      const r = claimOffline(state, c, res, doubled, localDate(offlineBackAt));
      if ('error' in r) return false;
      // рядки перевірки показано в довідці (FR-25): insp-result не потрібен
      const last = get().inspections.last;
      const seen = last?.offline && !last.seen ? { inspections: { ...get().inspections, last: { ...last, seen: true } } } : {};
      const claimEv: DomainEvent = { type: 'offlineIncomeClaim', isDoubled: doubled, doubleSource: doubled ? (state.hasNoAds ? 'no_ads_pass' : 'ad') : 'none', offlineDoublesToday: r.state.offlineDoubles.count };
      // 008 FR-19: результат перевірки побачено в довідці - час для стартової пропозиції
      const insp = last?.offline && !last.seen;
      set({ diaryToday: null, state: r.state, offline: null, offlineBackAt: null, events: [...get().events, ...(res.earned > 0 ? [claimEv] : [])].slice(-40), ...(insp ? { monetization: offerDue(get().monetization) } : {}), ...seen });
      return true;
    },
    storyRun: () => {
      const patch = storyRunPatch(get());
      if (patch) set(patch);
    },
    closeStoryCall: () => set({ storyCall: null }),
    clearToast: () => {
      const [next, ...rest] = get().toastQueue;
      set({ toast: next ?? null, toastQueue: rest });
    },
    showToast: (toast) => (get().toast ? set({ toastQueue: [...get().toastQueue, toast] }) : set({ toast })),
    onbComplete: (step, extra) => {
      const o = get().onboarding;
      const n = complete(o, step, get().playtimeMs, extra);
      if (n === o) return false;
      set({ onboarding: n });
      return true;
    },
    actSign: () => {
      const { actTaps, onboarding: o, state, cfg: c } = get();
      if (o.step !== 4 || actTaps >= ACT_TAPS) return actTaps;
      const n = actTaps + 1;
      if (n < ACT_TAPS) {
        set({ actTaps: n });
        return n;
      }
      // рішення 57: 8 × tapValue разом, без множників («Пташка» ще не злетіла)
      const add = ACT_TAPS * c.params.tapValue;
      set({ actTaps: n, state: { ...state, signatures: state.signatures + add, lifetimeCycle: state.lifetimeCycle + add } });
      get().onbComplete(4);
      return n;
    },
    stamp: () => {
      if (!get().onbComplete(5)) return;
      const o = get().onboarding;
      set({ onboarding: { ...o, birdLeftMs: get().cfg.params.onboardingBirdMin * 60_000 }, actResultOpen: true });
    },
    toMain: () => set({ actResultOpen: false }),
    closeClerkFirst: () => set({ clerkFirstOpen: false }),
    receiveTg1: () => {
      const g = get();
      const r = deliverFirst(g.telegrams, g.lastMs);
      set({ onboarding: receiveTg1(g.onboarding, g.playtimeMs), telegrams: r.tg });
      handleEvents(r.events, g.lastMs);
    },
    claimArchive: () => {
      const { state, cfg: c, onboarding: o } = get();
      if (o.step !== 9) return 0;
      const amount = c.params.archiveBonusMin * baseIncomePerMin(state, c);
      set({
        state: { ...state, signatures: state.signatures + amount, lifetimeCycle: state.lifetimeCycle + amount },
        onboarding: { ...o, archiveBonus: amount },
      });
      get().showToast({ kind: 'archive', amount });
      // 003 FR-27: підсумок дзвінка лягає в «Записки»
      const tg = get().telegrams;
      const note = { uid: `note_call#${tg.deliveries + 1}`, id: 'note_call', kind: 'note' as const, receivedAt: get().lastMs, status: 'archive' as const, read: false };
      set({ telegrams: { ...tg, inbox: [...tg.inbox, note], deliveries: tg.deliveries + 1 } });
      get().onbComplete(9);
      return amount;
    },
    answerTelegram: (uid, choiceId) => {
      const g = get();
      const now = g.lastMs;
      // повторна відповідь на запис із шухляди пачку вдруге не закриває (packResolve один раз)
      const wasNew = g.telegrams.inbox.find((x) => x.uid === uid)?.status === 'new';
      const r = answerTg(g.telegrams, g.state, uid, choiceId, { cfg: g.cfg, nowMs: now, dayKey: dayKey(now, tzOffsetAt(now)) });
      if ('error' in r) return r;
      set({ telegrams: r.tg, state: r.eco, effects: [...g.effects, ...r.effects] });
      handleEvents(r.events, now);
      // 011: остання з трьох відповідей пачки окремо - пачку закрито (summary_beats, аналітика)
      const sep = wasNew ? resolvedSeparately(get().telegrams, uid, now) : null;
      if (sep) handleEvents([sep], now);
      resumeRaceIfFree(now);
      // 002 FR-19: відповідь на № 1 закриває крок 8
      if (r.item.id === FIRST_TELEGRAM_ID && get().onboarding.step === 8) {
        set({ onboarding: { ...get().onboarding, tg1: { choiceId, atPlayMs: get().playtimeMs } } });
        get().onbComplete(8);
      }
      return r.item;
    },
    printSedo: () => {
      const g = get();
      const r = printSedoTg(g.telegrams, g.state, g.cfg, g.lastMs);
      if ('error' in r) return r;
      set({ telegrams: r.tg, state: r.eco, effects: g.effects.filter((e) => !(e.source === 'sedo_failure' && e.target?.id === r.stageId)), events: [...g.events, ...r.events].slice(-40) });
      return { ok: true };
    },
    convertStage: (price) => {
      const g = get();
      const lc = g.digit.counts[String(g.state.level)] ?? 0;
      const r = convertStageDomain(g.state, g.cfg, lc, { levelStartMs: g.digit.levelStartMs, nowMs: g.lastMs }, price);
      if ('error' in r) return r;
      // сповільнення, що діяло на ланку в мить конвертації, знімається (spec 013 «Крайові випадки»)
      const effects = g.effects.filter((e) => !(e.kind === 'factor' && e.target?.type === 'stage' && e.target.id === r.stageId && SLOW_SOURCES.includes(e.source)));
      // конвертація № 1: «Комбата шукають» зникає назавжди (FR-10)
      const tg = r.index === 1 && g.telegrams.kombat.active ? { ...g.telegrams, kombat: { ...g.telegrams.kombat, active: null } } : g.telegrams;
      set({ state: r.state, effects, telegrams: tg, events: [...g.events, ...r.events].slice(-40) });
      // 016 FR-5: конвертації № 2, 4, 5 дають журнали № 21, 22, 23
      absorbMuseum(r.events, g.lastMs);
      return { ok: true };
    },
    answerPack: (no, kind) => {
      const g = get();
      const now = g.lastMs;
      const r = answerPackTg(g.telegrams, g.state, no, kind, { cfg: g.cfg, nowMs: now, dayKey: dayKey(now, tzOffsetAt(now)) });
      if ('error' in r) return r;
      // новий баф "Зведення б'ється" поновлює тривалість, а не складається (FR-22)
      const renew = r.effects.some((e) => e.source === 'pack_beats');
      const kept = renew ? g.effects.filter((e) => e.source !== 'pack_beats') : g.effects;
      set({ telegrams: r.tg, state: r.eco, effects: [...kept, ...r.effects] });
      handleEvents(r.events, now);
      resumeRaceIfFree(now);
      return { ok: true };
    },
    openItem: (uid) => {
      const g = get();
      const item = g.telegrams.inbox.find((x) => x.uid === uid);
      if (!item) return;
      if (item.kind === 'notice') {
        const r = openNoticeTg(g.telegrams, uid, g.lastMs);
        set({ telegrams: r.tg });
        handleEvents(r.events, g.lastMs);
      } else if (item.kind === 'note' && !item.read) {
        set({ telegrams: { ...g.telegrams, inbox: g.telegrams.inbox.map((x) => (x.uid === uid ? { ...x, read: true } : x)) } });
      }
    },
    flagTelegram: (uid, reason = null, hasComment = false) => {
      const tg = get().telegrams;
      const item = tg.inbox.find((x) => x.uid === uid);
      if (!item || item.flagged) return;
      set({ telegrams: { ...tg, inbox: tg.inbox.map((x) => (x.uid === uid ? { ...x, flagged: true } : x)) } });
      // текст коментаря не зберігаємо до перевірки Data safety (003 ВП-6)
      handleEvents([{ type: 'telegramFlag', telegramId: item.id, reason, hasComment, afterChoice: item.choiceId != null }], get().lastMs);
    },
    prepareInspection: (uid) => {
      const item = get().telegrams.inbox.find((x) => x.uid === uid);
      if (item) handleEvents([{ type: 'inspectionPrepare', telegramId: item.id }], get().lastMs);
    },
    kavaLineFor: (uid) => characterLine('kava.tg_new', uid),
    // перевірки й цифровізація — поза лімітом 2 реплік за сесію (рішення 45, 74); Ліна (гонка) — у ліміті (рішення 70)
    tumbLine: (key, slot) => (key.startsWith('lina.') ? characterLine(key, slot) : eventLine(key, slot)),
    raceDigital: () => {
      const g = get();
      const r = digitalSpeedup(g.race, g.lastMs, g.state.prestigePoints, g.cfg);
      if ('error' in r) return false;
      set({ race: r.s, events: [...g.events, ...r.events].slice(-40) });
      return true;
    },
    ackGift: () => {
      const rc = get().race;
      if (rc.active && !rc.active.seen) set({ race: { ...rc, active: { ...rc.active, seen: true } } });
    },
    digitize: (fromHint = false) => {
      const g = get();
      const r = digitizeNow(g.state, g.digit, g.cfg, g.lastMs, fromHint);
      if ('error' in r) return false;
      // L і підписи в нуль, нові потоки: ціни й дохід інші, тож підказка перераховується
      set({ state: r.state, digit: { ...r.ds, howSeen: true }, digitRec: false, events: [...g.events, ...r.events].slice(-40) });
      absorbMuseum(r.events, g.lastMs);
      return true;
    },
    closeDigitStep: () => {
      const g = get();
      const c = g.digit.ceremony;
      const next = closeCeremonyStep(g.digit);
      set({ digit: next });
      // перехід на Р2: unit-unlock і coach Казначейства замінює тост k.tip (рішення 71, 73)
      // перехід на Р3: так само тост замість unit-unlock і coach (011 FR-15, відкладено, рішення 97)
      if (c?.step === 'levelUp') get().showToast({ kind: 'text', text: c.level >= 4 ? digitT.kTipR5 : c.level >= 3 ? digitT.kTipR4 : c.level >= 2 ? digitT.kTipR3 : digitT.kTip });
    },
    ackDigitHow: () => set({ digit: { ...get().digit, howSeen: true } }),
    closeRaceResult: () => {
      const rc = get().race;
      if (rc.last && !rc.last.seen) set({ race: { ...rc, last: { ...rc.last, seen: true } } });
    },
    buyInspItem: (itemId) => {
      const g = get();
      const r = buyInsp(g.inspections, g.state, itemId, g.lastMs);
      if ('error' in r) return false;
      set({ inspections: r.s, state: r.eco, events: [...g.events, ...r.events].slice(-40) });
      return true;
    },
    ackInspCall: () => set({ inspections: { ...get().inspections, callPending: false } }),
    ackInspWarning: (prepare) => {
      const ins = get().inspections;
      if (!ins.active) return;
      set({ inspections: { ...ins, active: { ...ins.active, warned: true } }, inspPrepOpen: prepare });
    },
    openInspPrep: () => {
      if (get().inspections.active) set({ inspPrepOpen: true });
    },
    closeInspPrep: () => set({ inspPrepOpen: false }),
    closeInspResult: () => {
      const ins = get().inspections;
      if (ins.last && !ins.last.seen) set({ inspections: { ...ins, last: { ...ins.last, seen: true } } });
      // блок «Новий експонат» показано в акті (007 FR-19)
      set({ museum: closeInspReveal(get().museum), monetization: offerDue(get().monetization) });
    },
    watchAd: async (placement) => {
      const g = get();
      if (g.busy) return 'busy';
      const noAds = g.state.hasNoAds;
      const date = localDate(g.lastMs);
      const blocked = (() => {
        if (placement === 'income_boost') return boostView(g.monetization, g.effects, g.lastMs, date, g.cfg, noAds).button;
        if (placement === 'offline_double') return offlineView(g.state, g.cfg, date).button;
        if (placement === 'race_speedup') return raceAdView(g.monetization, g.state, g.cfg, date).button;
        return g.inspections.active ? inspAdView(g.monetization, g.inspections.active.id, g.state).button : 'limit';
      })();
      if (blocked === 'limit' || blocked === 'cap') return 'blocked';
      if (noAds) return rewardAd(placement, 'no_ads_pass') ? 'granted' : 'blocked';
      const av = g.services.ads.availability();
      if (av === 'no_net' || av === 'no_fill' || av === 'no_consent') {
        pushEvent({ type: 'adFail', placement, stage: av === 'no_consent' ? 'consent_blocked' : 'not_ready' });
        get().showToast({ kind: 'text', text: av === 'no_net' ? adT.naNet : av === 'no_consent' ? adT.naConsent : adT.nofill });
        return 'unavailable';
      }
      set({ busy: 'ad' });
      // збій SDK не повинен лишити busy назавжди: виняток - це збій показу
      let res: AdResult;
      try {
        res = await get().services.ads.show(placement);
      } catch (e) {
        res = { kind: 'fail', stage: 'show', code: e instanceof Error ? e.message : undefined };
      } finally {
        set({ busy: null });
      }
      if (res.kind === 'earned') return rewardAd(placement, 'ad') ? 'granted' : 'blocked';
      if (res.kind === 'closed_early') {
        pushEvent({ type: 'adFail', placement, stage: 'closed_early' });
        get().showToast({ kind: 'text', text: adT.closed });
        return 'closed';
      }
      pushEvent({ type: 'adFail', placement, stage: res.stage, ...(res.code ? { code: res.code } : {}) });
      get().showToast({ kind: 'text', text: adT.nofill });
      return 'unavailable';
    },
    purchase: async (id) => {
      const g = get();
      if (g.busy) return;
      const svc = g.services.purchases;
      if (svc.status() !== 'ready' || g.monetization.rights[id]) return;
      set({ busy: 'purchase' });
      let r: PurchaseResult;
      try {
        r = await svc.purchase(id);
      } catch (e) {
        r = { kind: 'error', reason: 'unknown', code: e instanceof Error ? e.message : undefined };
      } finally {
        set({ busy: null });
      }
      if (r.kind === 'cancelled') {
        pushEvent({ type: 'purchaseFail', productId: id, reason: 'user_cancelled' });
      } else if (r.kind === 'pending') {
        set({ monetization: addPending(get().monetization, id) });
        pushEvent({ type: 'purchaseFail', productId: id, reason: 'payment_pending' });
        get().showToast({ kind: 'text', text: iapT.pending });
      } else if (r.kind === 'error' && r.reason === 'already_owned') {
        // «уже куплено» - це відновлення: ефект вмикається, тост rs.ok
        pushEvent({ type: 'purchaseFail', productId: id, reason: 'already_owned' });
        grantNow(id, true);
        get().showToast({ kind: 'text', text: id === 'no_ads' ? iapT.restoreNoAds : iapT.restoreDone(`«${shopT.products[id].name}»`) });
      } else if (r.kind === 'error') {
        pushEvent({ type: 'purchaseFail', productId: id, reason: r.reason, ...(r.code ? { code: r.code } : {}) });
        get().showToast({ kind: 'text', text: iapT.fail });
      } else {
        // ефект вмикає лише активний entitlement (FR-25): success без нього - не покупка
        const rights = await svc.rights().catch(() => null);
        if (rights && !rights[id]) {
          pushEvent({ type: 'purchaseFail', productId: id, reason: 'product_unavailable' });
          get().showToast({ kind: 'text', text: iapT.fail });
        } else grantNow(id, false);
      }
    },
    restore: async (trigger) => {
      const g = get();
      if (g.busy) return;
      set({ busy: 'purchase' });
      let r: Awaited<ReturnType<PurchaseService['restore']>>;
      try {
        r = await g.services.purchases.restore();
      } catch {
        r = { kind: 'error' };
      } finally {
        set({ busy: null });
      }
      if (r.kind === 'error') {
        pushEvent({ type: 'purchaseRestore', trigger, isSuccess: false, restoredProductIds: [] });
        if (trigger !== 'auto_check') get().showToast({ kind: 'text', text: iapT.restoreErr });
        return;
      }
      const fresh = r.owned.filter((id) => !get().monetization.rights[id]);
      for (const id of fresh) grantNow(id, true);
      pushEvent({ type: 'purchaseRestore', trigger, isSuccess: r.owned.length > 0, restoredProductIds: r.owned });
      if (trigger === 'auto_check' && !fresh.length) return;
      if (!r.owned.length) get().showToast({ kind: 'text', text: iapT.restoreNone });
      else if (r.owned.length === 1 && r.owned[0] === 'no_ads') get().showToast({ kind: 'text', text: iapT.restoreNoAds });
      else get().showToast({ kind: 'text', text: iapT.restoreDone(r.owned.map((id) => `«${shopT.products[id].name}»`).join(', ')) });
    },
    syncPurchases: async () => {
      const rights = await get()
        .services.purchases.rights()
        .catch(() => null);
      const g = get();
      const r = syncRights(g.monetization, g.state, g.cfg, rights, g.lastMs);
      if (r.ms !== g.monetization) set({ monetization: r.ms, state: r.eco });
      // нові права без Ask to Buy - тихе відновлення з тостом (FR-27); Ask to Buy дає iap-success
      if (r.restored.length) {
        pushEvent({ type: 'purchaseRestore', trigger: 'auto_check', isSuccess: true, restoredProductIds: r.restored });
        get().showToast({ kind: 'text', text: r.restored.length === 1 && r.restored[0] === 'no_ads' ? iapT.restoreNoAds : iapT.restoreDone(r.restored.map((id) => `«${shopT.products[id].name}»`).join(', ')) });
      }
    },
    closeIapSuccess: () => set({ monetization: closeSuccess(get().monetization) }),
    ackStarterOffer: () => set({ monetization: offerShown(get().monetization) }),
    setSetting: (key, value) => {
      const g = get();
      if (g.settings[key] === value) return;
      set({ settings: { ...g.settings, [key]: value } });
      if (key === 'haptics') setHapticsEnabled(value);
      if (key === 'sound') setSoundEnabled(value);
      if (key !== 'testUser') pushEvent({ type: 'settingChange', settingName: key, newValue: value });
    },
    setNotifCategory: (cat, value) => {
      const g = get();
      if (g.settings.notif[cat] === value) return;
      set({ settings: { ...g.settings, notif: { ...g.settings.notif, [cat]: value } } });
      pushEvent({ type: 'settingChange', settingName: `notif_${cat}` as 'notif_storage', newValue: value });
    },
    requestPush: async (trigger) => {
      const os = await get().services.notifications.request();
      set({ settings: { ...get().settings, pushPermission: os } });
      pushEvent({ type: 'pushPermissionRequest', trigger, prePromptResult: 'accepted', osResult: os === 'not_asked' ? 'not_shown' : os });
      return os;
    },
    declinePush: (trigger) => {
      set({ pushDeclined: true });
      pushEvent({ type: 'pushPermissionRequest', trigger, prePromptResult: 'declined', osResult: 'not_shown' });
    },
    refreshPermission: async () => {
      const p = await get().services.notifications.permission();
      const cur = get().settings.pushPermission;
      // not_asked від сервісу не затирає вже відому відповідь
      if (p !== cur && !(p === 'not_asked' && cur !== 'not_asked')) set({ settings: { ...get().settings, pushPermission: p } });
    },
    goBackground: async (nowMs) => {
      const g = get();
      await g.services.notifications.cancelAll();
      const tz = tzOffsetAt(nowMs);
      const cands = planPushes(
        { cfg: g.cfg, eco: g.state, effects: g.effects, telegrams: g.telegrams, inspections: g.inspections, race: g.race, settings: g.settings, notifications: g.notifications, tzOffsetMin: tz, installMs: g.inspections.installMs },
        nowMs,
      );
      let tg = get().telegrams;
      const planned = cands.map((c) => {
        const t = pushText(tg, c);
        tg = t.tg;
        return { type: c.type, atMs: c.atMs, title: t.title, body: t.body, target: c.target, ...(c.ref ? { ref: c.ref } : {}) };
      });
      set({ telegrams: tg, notifications: { ...get().notifications, planned } });
      if (planned.length) await g.services.notifications.schedule(planned);
    },
    comeForeground: async (nowMs) => {
      await get().services.notifications.cancelAll();
      set({ notifications: settle(get().notifications, nowMs, tzOffsetAt(nowMs)) });
      await get().refreshPermission();
    },
    resetProgress: () => {
      const g = get();
      const now = g.lastMs;
      const c = g.cfg;
      // покупки лишаються (рішення 88): права, лічильники реклами; «Стартовий набір» видасть 50 000 після онбордингу
      const fresh = applyRights(newGame(c, now), g.monetization.rights, c);
      set({
        pinned: null,
        state: fresh,
        effects: [],
        playtimeMs: 0,
        onboarding: newOnboarding(0),
        telegrams: newTelegrams(c.params, `game-${now}`),
        inspections: newInspections(now, `insp-${now}`),
        inspPrepOpen: false,
        race: newRace(`race-${now}`),
        digit: newDigitization(now),
        digitRec: false,
        digitCheckedAt: 0,
        digitHintShown: false,
        museum: newMuseum(),
        monetization: { ...g.monetization, starterGranted: false, offer: 'wait', success: [], inspAdId: null },
        notifications: newNotifications(),
        stats: newStats(),
        story: newStory(),
        storySession: newBudget(),
        storyCall: null,
        diaryToday: null,
        sessionLines: { count: 0, byUid: {} },
        actTaps: 0,
        clerkFirstOpen: false,
        actResultOpen: false,
        offline: null,
        offlineBackAt: null,
        toast: null,
        toastQueue: [],
        events: [...g.events, { type: 'settingChange' as const, settingName: 'progress_reset' as const, newValue: null, digitizationCount: g.digit.total, playtimeSec: Math.floor(g.playtimeMs / 1000) }].slice(-40),
      });
      void g.services.notifications.cancelAll();
    },
    changeCallsign: (text, gender) => {
      const o = get().onboarding;
      set({ onboarding: { ...o, callsign: { type: 'custom', text }, gender } });
    },
    markCuriosSeen: () => set({ museum: markCuriosSeen(get().museum) }),
    closeReveal: () => set({ museum: closeRevealMuseum(get().museum) }),
    openMuseum: (source = 'tab') => {
      const g = get();
      const ev: DomainEvent = { type: 'museumOpen', source, journalsOwned: countMuseum(g.museum), journalsUnseen: unseenMuseum(g.museum) };
      set({ museum: openMuseumTab(g.museum), events: [...g.events, ev].slice(-40) });
    },
    sendRunner: () => {
      const g = get();
      const r = sendRunnerTg(g.telegrams, g.state, g.cfg, g.lastMs);
      if ('error' in r) return false;
      // посильний знайде комбата раніше: кінець ефекту ×0,25 зсувається на мить знаходження
      set({ telegrams: r.tg, state: r.eco, effects: g.effects.map((e) => (e.source === 'kombat_away' && e.endMs > g.lastMs ? { ...e, endMs: r.endMs } : e)) });
      return true;
    },
    sendNote: () => {
      const g = get();
      const r = sendRunnerTg(g.telegrams, g.state, g.cfg, g.lastMs, 'meeting');
      if ('error' in r) return false;
      // записка закриває нараду раніше: кінець ефекту ×0,25 зсувається на мить кінця
      set({ telegrams: r.tg, state: r.eco, effects: g.effects.map((e) => (e.source === 'meeting_overrun' && e.endMs > g.lastMs ? { ...e, endMs: r.endMs } : e)) });
      return true;
    },
  };
  });
  // 014: події гри -> тригери сюжету (без правок у кожному місці, що пише в `events`)
  store.subscribe((s, prev) => {
    if (s.events === prev.events) return;
    const patch = applyEvents(s, newEvents(prev.events, s.events));
    if (patch) store.setState(patch);
  });
  return store;
}

export type ConveyorStore = ReturnType<typeof createConveyorStore>;

/** Ігрова частина запису (009 GameSave): прострочені ефекти не зберігаємо. */
export function gameSave(store: ConveyorStore): {
  economy: EconomyState;
  effects: StoredEffect[];
  pinned: EconomyConfig | null;
  playtimeMs: number;
  onboarding: OnboardingState;
  telegrams: TelegramState;
  inspections: InspectionState;
  race: RaceState;
  digitization: DigitizationState;
  museum: MuseumState;
  monetization: MonetizationState;
  settings: Settings;
  notifications: NotificationsState;
  stats: Stats;
  story: StoryState;
} {
  const { state, effects, lastMs, pinned, playtimeMs, onboarding, telegrams, inspections, race, digit, museum, monetization, settings, notifications, stats, story } = store.getState();
  return { economy: state, effects: effects.filter((e) => e.endMs > lastMs), pinned, playtimeMs, onboarding, telegrams, inspections, race, digitization: digit, museum, monetization, settings, notifications, stats, story };
}
