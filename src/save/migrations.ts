// Міграції збереження (009 FR-9): чиста функція vN → vN+1 над полем `game`; ключ — версія «з».
// Правило: нова форма запису = CURRENT_SCHEMA + 1, міграція сюди, фікстура попередньої версії в тести (принцип III).
import { DEFAULTS } from '@/economy/core';
import { newInspections } from '@/inspections/lifecycle';
import { newDigitization } from '@/digitization/digitization';
import { newStack } from '@/stack/stack';
import { BEATS } from '@/story/content';
import { storyForLevel } from '@/story/engine';
import { newMonetization } from '@/monetization/monetization';
import { newNotifications, newSettings } from '@/notifications/planner';
import { newStats } from '@/profile/stats';
import { newMuseum } from '@/museum/museum';
import { newRace } from '@/race/race';
import { overrideStartNo } from '@/telegrams/schedule';

export type Migration = (game: unknown) => unknown;

export const MIGRATIONS: Record<number, Migration> = {
  // 1 → 2 (002): ігровий час і онбординг. Записи v1 — гравці, що вже на конвеєрі: онбординг пройдено,
  // позивний спитає «Рапорт на зміну позивного» (10).
  1: (game) => ({ ...(game as object), playtimeMs: 0, onboarding: onboardingDone() }),
  // 2 → 3 (003): телеграми й репутація. Гравець, що вже пройшов крок 8 (чи весь зріз 001/009), отримує розклад одразу:
  // startMs = 0 означає «доба 1 давно минула», слоти підуть з наступного tick. № 1 з відповіддю — в архіві з тим самим
  // вибором; прийшла без відповіді (крок 8) — у «Нових», щоб онбординг не застряг. Репутацію заднім числом не рахуємо.
  2: (game) => {
    const g = game as { onboarding?: { step?: number | 'done'; tg1?: { choiceId: string; atPlayMs: number } | null; tg1ReceivedAtPlayMs?: number | null } };
    const tg = telegramsV3();
    const o = g.onboarding ?? {};
    const pastStep8 = o.step === 'done' || (typeof o.step === 'number' && o.step > 8);
    if (o.tg1) {
      tg.inbox.push({ uid: 'tg_0001_sergeants#1', id: 'tg_0001_sergeants', kind: 'telegram', receivedAt: 0, status: 'archive', choiceId: o.tg1.choiceId, answeredAt: 0 });
      tg.deliveries = 1;
    } else if (o.step === 8 && o.tg1ReceivedAtPlayMs != null) {
      tg.inbox.push({ uid: 'tg_0001_sergeants#1', id: 'tg_0001_sergeants', kind: 'telegram', receivedAt: 0, status: 'new' } as never);
      tg.deliveries = 1;
    }
    if (pastStep8 || tg.deliveries > 0) tg.startMs = 0;
    return { ...(game as object), telegrams: tg };
  },
  // 3 → 4 (004): перевірки. Точної мітки встановлення в записі немає: беремо старт розкладу телеграм (крок 7),
  // а для записів, де він 0 чи ще не настав, — 0 («давно»): першу перевірку стор однаково не оголосить до кінця онбордингу.
  3: (game) => ({ ...(game as object), inspections: inspectionsV4((game as { telegrams?: { startMs?: number | null } }).telegrams?.startMs ?? 0) }),
  // 4 → 5 (005): гонок ще не було — порожній стан; перший подарунок рахується від встановлення (inspections.installMs)
  4: (game) => ({ ...(game as object), race: raceV5() }),
  // 5 → 6 (006): цифровізацій ще не було; цикл рахується від встановлення (`inspections.installMs`, як у 4 → 5)
  5: (game) => ({ ...(game as object), digitization: digitizationV6((game as { inspections?: { installMs?: number } }).inspections?.installMs ?? 0) }),
  // 6 → 7 (007): музею й курйозів ще не було - порожній стан (006 ще не вийшла: цифровізацій, що скасували б журнали, немає)
  6: (game) => ({ ...(game as object), museum: museumV7() }),
  // 7 → 8 (008): покупок і реклами ще не було. Прапори з економіки (`hasNoAds` тощо) лишаються: права починаються з кешу, а перше ж
  // опитування стору або відновлення виправить його. Набір, що вже діє в економіці, не дублює 50 000.
  7: (game) => {
    const g = game as { economy?: { hasNoAds?: boolean; storageHours?: number; fuelCapacityMs?: number } };
    const m = newMonetization();
    const e = g.economy ?? {};
    const rights = { no_ads: !!e.hasNoAds, storage_24h: (e.storageHours ?? DEFAULTS.storageHours) >= DEFAULTS.storageHoursPaid, starter_pack: (e.fuelCapacityMs ?? 0) >= DEFAULTS.starterFuelHours * 3_600_000 };
    return { ...(game as object), monetization: { ...m, rights, starterGranted: rights.starter_pack, offer: rights.starter_pack ? 'done' : 'wait' } };
  },
  // 8 → 9 (010): налаштування за замовчуванням, нічого не заплановано; записи курйозів, що вже є, вважаються баченими (бейдж «нове» з нуля)
  8: (game) => {
    const g = game as { museum?: { curioSeq?: number } };
    return { ...(game as object), settings: newSettings(), notifications: newNotifications(), stats: newStats(), museum: { ...(g.museum ?? {}), curiosSeen: g.museum?.curioSeq ?? 0 } };
  },
  // 9 → 10 (011): вихід з рівня - прапорець у цифровізації (лічильник на рівні вже є в `counts`); перевірки - звичайні, перша спроба;
  // «Нарада затягнулась» - порожній стан
  9: (game) => {
    const g = game as {
      digitization?: object;
      telegrams?: object;
      inspections?: { active?: object | null; last?: { items?: object[] } | null };
    };
    const insp = g.inspections;
    return {
      ...(game as object),
      digitization: { ...(g.digitization ?? {}), levelExitAllowed: false },
      telegrams: { ...(g.telegrams ?? {}), meeting: { lastDayKey: null, active: null } },
      inspections: insp && {
        ...insp,
        active: insp.active ? { ...insp.active, kind: 'regular', attempt: 1 } : null,
        last: insp.last ? { ...insp.last, kind: 'regular', attempt: 1, exitUnlocked: false } : null,
      },
    };
  },
  // 10 → 11 (011 етап 2): пачок ще не було - порожній стан доби й лічильника
  10: (game) => {
    const g = game as { telegrams?: object };
    return { ...(game as object), telegrams: { ...(g.telegrams ?? {}), packs: { day: null, seq: 0 } } };
  },
  // 11 → 12 (012 етап 2): стос до наради в цифровізації (порожній) і стан «Доповіді тезово» у телеграмах
  11: (game) => {
    const g = game as { telegrams?: object; digitization?: object };
    return {
      ...(game as object),
      telegrams: { ...(g.telegrams ?? {}), brief: { lastDay: null } },
      digitization: { ...(g.digitization ?? {}), stack: newStack() },
    };
  },
  // 12 → 13 (013 етап 1): цифрові ланки Р5, початок рівня й тривалість циклу, «Збій СЕДО»
  12: (game) => {
    const g = game as { economy?: object; telegrams?: object; digitization?: { cycleStartMs?: number; ceremony?: object | null } };
    const d = g.digitization ?? {};
    return {
      ...(game as object),
      economy: { ...(g.economy ?? {}), digital: [] },
      telegrams: { ...(g.telegrams ?? {}), sedo: { lastDayKey: null, active: null } },
      digitization: {
        ...d,
        levelStartMs: d.cycleStartMs ?? 0,
        lastCycleMs: null,
        ceremony: d.ceremony ? { ...d.ceremony, cycleMs: 0, prevCycleMs: null } : null,
      },
    };
  },
  // 13 → 14 (014 етап 1): сюжет і щоденник. Кроки пройдених рівнів закрито, поточного рівня наздоганяють з лічильників (FR-29)
  13: (game) => {
    const g = game as { economy?: { level?: number } };
    return { ...(game as object), story: storyForLevel(BEATS, g.economy?.level ?? 1) };
  },
  // 14 → 15 (014 етап 2): аркуші Археолога й пройдені підсумкові; відсутні аркуші минулих рівнів видасть наздоганяння (FR-29)
  14: (game) => {
    const g = game as { story?: object };
    return { ...(game as object), story: { ...(g.story ?? {}), sheets: {}, bosses: [] } };
  },
};

/** Налаштування й сповіщення схеми 9. */
export function settingsV9() {
  return { settings: newSettings(), notifications: newNotifications(), stats: newStats() };
}

/** Порожній стан реклами й покупок схеми 8. */
export function monetizationV8() {
  return newMonetization();
}

/** Порожній стан музею схеми 7. */
export function museumV7() {
  return newMuseum();
}

/** Порожній стан цифровізації схеми 6. */
export function digitizationV6(cycleStartMs: number) {
  return newDigitization(cycleStartMs);
}

/** Порожній стан гонки схеми 5. */
export function raceV5() {
  return newRace('race-migrated');
}

/** Порожній стан перевірок схеми 4. */
export function inspectionsV4(installMs: number) {
  return newInspections(installMs, 'insp-migrated');
}

/** Порожній стан телеграм схеми 3: старт репутації — `DEFAULTS.repStart`, перший номер override — з контенту. */
export function telegramsV3() {
  return {
    rng: 1,
    day: null,
    startMs: null as number | null,
    inbox: [] as { uid: string; id: string; kind: 'telegram'; receivedAt: number; status: 'archive'; choiceId: string; answeredAt: number }[],
    queue: [],
    timers: [],
    flags: {},
    reputation: { value: DEFAULTS.repStart, history: [] },
    firstInspectionPassed: false,
    unscheduledDays: [],
    refuelBlockedUntil: 0,
    override: { lastDayKey: null, nextNo: overrideStartNo() },
    kombat: { lastDayKey: null, active: null },
    meeting: { lastDayKey: null, active: null },
    packs: { day: null, seq: 0 },
    brief: { lastDay: null },
    sedo: { lastDayKey: null, active: null },
    deliveries: 0,
    lineBags: {},
  };
}

/** Онбординг, якого гравець уже не проходить (міграція 1 → 2). */
export function onboardingDone() {
  return {
    step: 'done' as const,
    callsign: null,
    gender: null,
    birdLeftMs: 0,
    completed: [],
    stepStartedAtPlayMs: 0,
    tg1ReceivedAtPlayMs: null,
    tg1: null,
    archiveBonus: null,
  };
}
