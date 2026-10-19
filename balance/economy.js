// Згенеровано tools/build_economy.mjs з src/economy/core. Руками не правити: npm run build:economy.
"use strict";
var StroiovaEconomy = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/economy/core/index.ts
  var index_exports = {};
  __export(index_exports, {
    DEFAULTS: () => DEFAULTS,
    LEGACY: () => LEGACY,
    SCENARIOS: () => SCENARIOS,
    capAt: () => capAt,
    copyInto: () => copyInto,
    flow: () => flow,
    integrate: () => integrate,
    levelItems: () => levelItems,
    milestoneTarget: () => milestoneTarget,
    packPrice: () => packPrice,
    points: () => points,
    prestigeMult: () => prestigeMult,
    priceAt: () => priceAt,
    reachableLevels: () => reachableLevels,
    withDefaults: () => withDefaults,
    zpzShare: () => zpzShare
  });

  // src/economy/core/defaults.ts
  var DEFAULTS = {
    rev: "7.2",
    // v6 re-tune: the events speed the ad player up by about half, so level 1 output is ×0,66 and stream prices ×1,1 (v5 in comments)
    streams: [
      { id: "raporty", name: "Рапорти", rate: 3.96, unlock: 0, cost: 8.8, growth: 1.12, manager: 165 },
      // v5: 6, 8, clerk 90
      { id: "akty", name: "Акти на майно", rate: 39.6, unlock: 330, cost: 132, growth: 1.13, manager: 770 },
      // v5: 60, 300, 120, 700
      { id: "dovidky", name: "Довідки", rate: 396, unlock: 11e3, cost: 6600, growth: 1.14, manager: 22e3 },
      // v5: 600, 10000, 6000, 20000
      { id: "nakladni", name: "Накладні", rate: 3960, unlock: 99e4, cost: 33e4, growth: 1.15, manager: 198e4 }
      // v5: 6000, 900000, 300000, 1800000
    ],
    stages: [
      { id: "kombat", name: "Резолюції комбата", rate: 7.92, cost: 25.7, growth: 1.12, manager: 132 },
      // v5: 12, 26, 120
      { id: "stroy", name: "Стройова частина", rate: 9.9, cost: 34.6, growth: 1.12, manager: 220 },
      // v5: 15, 35, 200
      { id: "fin", name: "Фінслужба", rate: 11.9, cost: 51.5, growth: 1.12, manager: 330 }
      // v5: 18, 52, 300
    ],
    // v7 — levels Р1–Р5. Level k plays the level 1 streams and stages plus the new ones of levels 2..k, all scaled by
    // level k's multipliers (new items are given in level 1 units). exitDigitizations: the n-th digitization on the level
    // moves up (boss 0) or announces the final inspection (boss 1; once it is passed, the next digitization moves up);
    // 0 = the player stays. growthMult flattens the price growth of the level (1 + (growth − 1) × growthMult): with the
    // decision 2 nudge (digitize when the next purchase is 4 h away) cycles last about a day whatever the divisor, so a
    // 2–3 day cycle needs a longer price ladder plus a larger divisor. packs / share / convert switch on the level twists.
    levels: [
      {
        id: "batalion",
        name: "Батальйон",
        rateMult: 1,
        costMult: 1,
        clerkMult: 1,
        stream: null,
        stage: null,
        prestigeDivisor: 75e3,
        exitDigitizations: 3,
        boss: 0,
        inspChecklistMin: 129
      },
      // 129 = 19 + 6 + 4 + 11 + 89
      {
        id: "bryhada",
        name: "Бригада",
        rateMult: 10,
        costMult: 5,
        clerkMult: 1,
        growthMult: 0.45,
        stream: { id: "nakazy", name: "Накази по частині", rate: 6e4, unlock: 3e6, cost: 1e6, growth: 1.16, manager: 6e6 },
        stage: { id: "kazna", name: "Казначейство", rate: 21, cost: 40, growth: 1.12, manager: 400 },
        prestigeDivisor: 627e7,
        exitDigitizations: 4,
        boss: 1,
        inspChecklistMin: 51
      },
      // 51 = 13 + 6 + 4 + 28; v6: growth ×1, divisor 75 000, no exit
      {
        id: "komanduvannia",
        name: "Командування",
        rateMult: 100,
        costMult: 25,
        clerkMult: 1,
        growthMult: 0.45,
        stream: { id: "zvedennia", name: "Зведення", rate: 6e5, unlock: 3e7, cost: 1e7, growth: 1.17, manager: 6e7 },
        stage: { id: "narada", name: "Нарада", rate: 30, cost: 60, growth: 1.12, manager: 600 },
        prestigeDivisor: 676e9,
        exitDigitizations: 6,
        boss: 1,
        bossMech: "pack",
        packs: 1,
        inspChecklistMin: 51
      },
      {
        id: "genshtab",
        name: "Генштаб",
        rateMult: 1e3,
        costMult: 125,
        clerkMult: 1,
        growthMult: 0.45,
        stream: { id: "zpz", name: "Звіти про звіти", rate: 0, share: 1, unlock: 3e8, cost: 1e8, growth: 1.18, manager: 6e8 },
        stage: { id: "dopovid", name: "Доповідь", rate: 40, cost: 80, growth: 1.12, manager: 800 },
        prestigeDivisor: 229e11,
        exitDigitizations: 6,
        boss: 1,
        bossMech: "zpz",
        inspChecklistMin: 51
      },
      {
        id: "bez-paperu",
        name: "Армія без паперу",
        rateMult: 1e4,
        costMult: 625,
        clerkMult: 1,
        growthMult: 0.35,
        stream: null,
        stage: null,
        prestigeDivisor: 901e20,
        exitDigitizations: 0,
        boss: 0,
        convert: 1,
        inspChecklistMin: 51
      }
    ],
    // the final inspection (бос) of a level: an inspection 04 with other numbers
    boss: {
      warnH: 24,
      // warning before the arrival
      retryH: 24,
      // after a failure the commission comes again this much later; bought items stay
      checklistMin: 420,
      // price of the whole checklist in minutes of base income at the announcement
      items: 6,
      // 5 basic + 1 item of the level mechanic
      adItems: 5,
      // «Усе за рекламу» closes the basic items only
      saveH: 12,
      // the bot: this many hours before the arrival the player saves for the items left instead of buying
      zpzMin: 0.4
      // Р4: «Звіти про звіти» give at least this share of all streams at the arrival
    },
    // Р3: telegrams come in packs; the player answers «Звести в одну відповідь» (merge 1), one by one (merge 0) or picks per
    // pack the answer that loses less income over the next hours at the current state (merge 2, v7.1). The merged answer:
    // «Нарада» × slowMult for slowHours (its price) and, all three diligent, «Зведення» × summaryBuff for summaryBuffHours;
    // one by one: size slowdowns × p.slowMult for p.slowHours on random stages (as the other levels).
    pack: { size: 3, perDay: 1, singleChance: 0.5, merge: 2, slowMult: 0.4, slowHours: 1.75, summaryBuff: 1.5, summaryBuffHours: 2 },
    // v7: merge 1, ×0,5 for 1,5 h
    // Р4: «Звіти про звіти» = s(n) × sum of the other streams, s(n) = shareMax · n / (n + K)
    zpz: { shareMax: 1.5, K: 9 },
    // s(1) = 0,15 → 13% of all streams on entry; the bot keeps it at 57–60% (s → 1,5 = 60%)
    // Р5: stage conversions to digital in this order; k opens after the (k−1)-th digitization on the level, once all streams
    // are open in the cycle; cost in minutes of base income at that moment; a digital stage gives ×mult, immune to slowdowns
    convert: { order: ["kombat", "stroy", "fin", "kazna", "narada", "dopovid"], mult: 3, costMin: 120 },
    // «Збій СЕДО» (Р5): at a session start, ≤ 1 a day; one digital stage × mult for min, unless the player prints (paper)
    sedoFailChance: 0.1,
    sedoFailMult: 0.5,
    sedoFailMin: 30,
    sedoPrintPaper: 5,
    // «Нарада затягнулась» (Р3+): the «Комбата шукають» template on the «Нарада» stage
    naradaChance: 0.2,
    naradaMult: 0.25,
    naradaMinMin: 10,
    naradaMaxMin: 30,
    milestoneEvery: 25,
    milestoneMult: 2,
    tapValue: 2,
    tapsPerSession: 60,
    sessionsPerDay: 5,
    sessionMin: 4,
    firstSessionMin: 10,
    storageHours: 8,
    adsPerDay: 3,
    adHours: 4,
    storageHoursPaid: 24,
    // the offline storage with «Розширене сховище» (08)
    adMult: 2,
    // the multiplier of an ad boost (sim.js models it as the average 1 + adFrac, i.e. ×2 while it runs)
    adCapHours: 12,
    // the boost stacks up to this much; the button is active while ≤ adCapHours − adHours is left
    offlineAdMult: 2,
    // offline income × this for an ad (or «Забрати» after the purchase)…
    offlineAdPerDay: 3,
    // …on the first N returns of each day
    offlineFreeMult: 3,
    // v7.1, decision 35: the player without ads gets offline income × this for free (no video)… (×2: finale ≈ 137 days)
    offlineFreePerDay: 1,
    // …on the N longest returns of each day (the night); 1 and 1 = off
    paidMult: 1.3,
    fuelHours: 6,
    // the player refuels at every session start; a tank lasts this long, offline too
    fuelBonus: 1.25,
    // conveyor income × this while there is fuel; 1 = no generator
    slowPerDayMin: 2,
    // telegrams done «сумлінно»: one random stage × slowMult for slowHours,
    slowPerDayMax: 4,
    // a random number of times per day in this range; 0 and 0 = off
    slowHours: 1,
    slowMult: 0.5,
    seed: 1,
    prestigeExponent: 0.5,
    prestigeBonus: 0.02,
    prestigeMinPoints: 30,
    prestigeGrowth: 1,
    // v5: 0,8 — the next digitization waits for as many points as already earned
    prestigeStallHours: 4,
    prestigeStallShare: 0.2,
    // …if the digitization brings at least this share of the points already earned
    days: 150,
    // v6 — clock: the game is installed and the first session starts at this local hour
    dayStartHour: 8,
    fuelBonusThreshold: 0.2,
    // the fuel bonus works while the tank is above this share (decision 9)
    fuelOnTaps: 1,
    // 1 = the fuel bonus also multiplies taps (01 FR-16)
    // onboarding (02): «Пташка в небі» ×2 for N minutes of play from the first stamp; the archive bonus once
    onboardingBirdMin: 20,
    onboardingBirdMult: 2,
    onboardingBirdStartSec: 80,
    archiveBonusMin: 60,
    // minutes of base income
    archiveBonusAtSec: 420,
    catBonusMin: 5,
    // Кіт Сейф: minutes of base income, at most once per catCooldownMin, taken whenever the player is in the game
    catCooldownMin: 60,
    catFromSec: 600,
    // the cat is not part of the onboarding: from the 2nd session
    // «Комбата шукають» (03): at a session start (not the first), ≤ 1 a day, with this chance; the player waits it out
    kombatChance: 0.2,
    kombatMult: 0.25,
    kombatMinMin: 10,
    kombatMaxMin: 30,
    // scheduled inspections (04), reputation «норма»; checklist price in minutes of base income at the announcement (per level)
    inspFirstAfterHours: 8,
    inspIntervalMinH: 24,
    inspIntervalMaxH: 48,
    // 0 = no inspections
    inspWarnMinH: 2,
    inspWarnMaxH: 3,
    inspMult: 3,
    inspHours: 2,
    inspFailMult: 0.5,
    // «Стройова частина» on a failed inspection
    inspFailHours: 1,
    inspFirstFromHour: 8,
    // the first inspection: a session at 08:00–18:00 local time (decision 69)
    inspFirstToHour: 18,
    inspArriveFromHour: 10,
    // arrival only 10:00–21:00, else 10:00 + 0–inspArriveJitterMin min
    inspArriveToHour: 21,
    inspArriveJitterMin: 60,
    inspMinPrice: 50,
    // a checklist item costs at least this
    // checklist items (04 «Пункти чекліста»): minutes of base income; the base items of a level sum to inspChecklistMin
    inspItems: [
      { id: "paint_borders", level: 1, min: 19 },
      { id: "lockers_cleanup", level: 1, min: 6 },
      { id: "stove_open", level: 1, min: 4 },
      { id: "font_check", level: 1, min: 11 },
      { id: "journals_stitch", level: 1, min: 89 },
      { id: "sergeants_count", level: 1, min: 15, added: true },
      { id: "dust_glove", level: 2, min: 13 },
      { id: "corridor_tape", level: 2, min: 6 },
      { id: "sign_rehang", level: 2, min: 4 },
      { id: "orders_stitch", level: 2, min: 28 },
      { id: "where_journal", level: 2, min: 21, added: true },
      // 011 (рішення 95): Р3 - дзеркало Р2 за вагою пунктів, разом inspChecklistMin = 51
      { id: "minutes_stitch", level: 3, min: 28 },
      { id: "door_plates", level: 3, min: 13 },
      { id: "carafe_full", level: 3, min: 6 },
      { id: "kettles_hide", level: 3, min: 4 },
      // 012 (рішення 103): Р4 - дзеркало Р3 за вагою пунктів, разом inspChecklistMin = 51
      { id: "slides_number", level: 4, min: 28 },
      { id: "stack_meter", level: 4, min: 13 },
      { id: "report_prep", level: 4, min: 6 },
      { id: "brief_onepage", level: 4, min: 4 }
    ],
    digitJournals: { "1": { "1": [1, 2, 3], "2": [4, 5] }, "2": { "1": [9], "2": [10], "3": [11] } },
    inspPushVisit: 1,
    // minutes: the player opens the game on push № 3 (2 h before arrival) if no session falls between warning and arrival; 0 = never
    // v7.3 (003): reputation and formal replies. repTiers 0 = off (the old model: every telegram «сумлінно», «норма» forever)
    repTiers: 0,
    replyShare: 0,
    // the bot's strategy: share of telegrams answered with a formal reply (no slowdown, no paper)
    repStart: 50,
    repLow: 35,
    // «низька» below this
    repHigh: 70,
    // «висока» from this
    repDiligent: 7,
    // average reputation for «сумлінно» in telegrams № 1–40 (+5…+10)
    repReply: -5,
    // a formal reply
    replyInspPct: 13,
    // average inspPct of a formal reply in № 1–40
    replyChanceLow: 1.5,
    // the unscheduled-inspection chance × this at «низька»…
    replyChanceHigh: 0.5,
    // …and × this at «висока» («норма» ×1)
    unscheduledPerDay: 1,
    // unscheduled inspections a day at most; no ×3, only the failure risk (decision 28)
    unscheduledWarnH: 2,
    // 003: telegram schedule and events in the app (sim.js models telegrams as slowdowns at session starts, slowPerDayMin/Max a day)
    tgFromHour: 8,
    // telegrams arrive 08:00–22:00 device time…
    tgToHour: 22,
    tgMinGapMin: 120,
    // …at least this far apart
    tgMaxNew: 5,
    // slots are skipped while this many telegrams wait unanswered in «Нові»
    tgRepeatMinDays: 7,
    // an archived telegram comes again at most this often (decision 27)
    overrideFromDay: 2,
    // «Новий наказ скасовує старий»: from day 2…
    overrideMinGapDays: 3,
    // …at least this many days apart…
    overrideChance: 0.3,
    // …taking a telegram slot with this chance
    kombatRunnerMin: 3,
    // «Відправити посильного»: the kombat is found in this many minutes…
    kombatRunnerCostMin: 4,
    // …for this many minutes of base income
    // gifts and the race (05, decision 30): service hours, act steps in hours (Акти, Комбат, Стройова, Фін.), the Казначейство step on level 2+
    gifts: {
      drone: { mult: 2, serviceH: 9, steps: [1.5, 1.8333, 1.5, 2.6667] },
      shovel: { mult: 1.5, serviceH: 12, steps: [1.3333, 1.6667, 1.3333, 2.3333] },
      generator: { mult: 1, fuel: 1, serviceH: 10, steps: [2.3333, 2.8333, 2.1667, 4] }
    },
    giftOrder: ["drone", "shovel", "drone", "generator"],
    // [] = no gifts
    giftL2StepH: 2,
    giftFirstDay: 1,
    // calendar day index: 1 = the 2nd day
    giftGapHours: 20,
    giftFromHour: 8,
    giftToHour: 22,
    raceAdPerDay: 3,
    // ad speed-ups (−50% of what is left), all races together
    raceAdPerSession: 1,
    // how many of them the ad player uses in one session
    raceAdCut: 0.5,
    raceDigitalCutH: 2,
    // «Послатися на цифру»: once per race when P ≥ 1, points are not spent
    // paper (01 FR-22): only telegrams spend it, the conveyor never waits for it
    paperStart: 30,
    paperPerMinPerLevel: 5e-4,
    // per level of Накладні
    paperGift: 20,
    paperPerTelegram: 4,
    // average sheets of a diligent answer on level 1
    // museum (07): journals by the drop table; bonuses in percent, № 8 doubles them. 0 — off, 1 — № 1–8 (07), 2 — № 1–24 (016)
    museum: 2,
    museumJ6DelayHours: 36,
    // telegram 25 after the 1st digitization, the notice the next day
    museumUnitPct: 5,
    // № 1 Стройова, № 4 Накладні, № 5 Рапорти
    museumStoragePct: 5,
    // № 2
    museumPaperPct: 10,
    // № 3
    museumRacePct: 10,
    // № 6 every step, № 7 the Фінслужба step; № 14 the Казначейство step
    // v7.2, spec 016 (museum 2): museumUnitPct also gives № 9, 10, 13, 15, 17, 18, 19, 21, 22
    // (decision 44: the start values of levels-3-5 §2.4 except the series, 5 → 1: at 5 % the finale came 5–7 % earlier)
    museumUnitRarePct: 10,
    // № 16 «Нарада»
    museumSlowCutPct: 10,
    // № 11: telegram slowdowns last this much less (packs too; not the events)
    museumChecklistCutPct: 10,
    // № 12: checklist items (inspections and final ones) cost this much less
    museumGiftServicePct: 10,
    // № 20: gift service lasts this much longer (gifts that come after the journal)
    museumConvertCutPct: 10,
    // № 23: conversion price (in the first run only conversion № 6)
    museumSeriesPct: 1,
    // each complete series 2–5: +% to all income, a multiplier of its own in M
    museumLegendaryMult: 2,
    // № 24 multiplies the bonuses of № 9–23 (№ 8 keeps ×2 on № 1–7, 07); comes with the finale
    // the paid scenario also buys the starter pack after the first inspection result (08 FR-17, FR-19)
    starterSignatures: 5e4,
    starterFuelHours: 12,
    tapRateMax: 10,
    // 01 FR-16: зараховуємо не більше стількох тапів за секунду (гра; бот не читає)
    offlineReturnMin: 5
    // 01 FR-25: коротша відсутність — тост без довідки повернення (гра; бот не читає)
  };
  var SCENARIOS = [
    { id: "free", name: "Без реклами й покупок", ads: false, paid: false },
    { id: "ads", name: "Дивиться рекламу", ads: true, paid: false },
    { id: "paid", name: "Купив «Без реклами» і набір", ads: true, paid: true, starter: true }
  ];
  var LEGACY = {
    prestigeDivisor: 75e3,
    inspChecklistMin: 129,
    inspChecklistMinL2: 51,
    level2: {
      afterDigitizations: 3,
      rateMult: 10,
      costMult: 5,
      clerkMult: 1,
      stream: { id: "nakazy", name: "Накази по частині", rate: 6e4, unlock: 3e6, cost: 1e6, growth: 1.16, manager: 6e6 },
      stage: { id: "kazna", name: "Казначейство", rate: 21, cost: 40, growth: 1.12, manager: 400 }
    }
  };
  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }
  function copyInto(dst, src) {
    for (const k in src) {
      const v = src[k];
      if (v && typeof v === "object" && !Array.isArray(v) && dst[k] && typeof dst[k] === "object") copyInto(dst[k], v);
      else dst[k] = v;
    }
    return dst;
  }
  function withDefaults(params) {
    const base = clone(DEFAULTS);
    const src = clone(params || {});
    if (src.prestigeStallHours == null) base.prestigeStallHours = 0;
    if (src.prestigeStallShare == null) base.prestigeStallShare = 0.5;
    if (src.offlineAdPerDay == null) {
      base.offlineAdPerDay = 99;
      base.offlineAdMult = 1.5;
    }
    if (src.offlineFreeMult == null) {
      base.offlineFreeMult = 1;
      base.offlineFreePerDay = 0;
    }
    if (src.pack && src.pack.merge == null) src.pack.merge = 1;
    if (src.levels != null && !src.pack) src.pack = { merge: 1, slowMult: 0.5, slowHours: 1.5 };
    if (src.fuelBonus == null) base.fuelBonus = 1;
    if (src.slowPerDayMax == null) {
      base.slowPerDayMin = 0;
      base.slowPerDayMax = 0;
    }
    if (src.giftOrder == null) {
      base.fuelBonusThreshold = 0;
      base.fuelOnTaps = 0;
      base.onboardingBirdMin = 0;
      base.archiveBonusMin = 0;
      base.catBonusMin = 0;
      base.kombatChance = 0;
      base.inspIntervalMaxH = 0;
      base.giftOrder = [];
      base.museum = 0;
      base.starterSignatures = 0;
      base.starterFuelHours = 0;
    }
    let levels;
    if (src.levels == null) {
      const L1 = clone(DEFAULTS.levels[0]);
      L1.prestigeDivisor = src.prestigeDivisor != null ? src.prestigeDivisor : LEGACY.prestigeDivisor;
      L1.inspChecklistMin = src.inspChecklistMin != null ? src.inspChecklistMin : LEGACY.inspChecklistMin;
      L1.exitDigitizations = 0;
      levels = [L1];
      if (src.level2 != null) {
        const l2 = copyInto(clone(LEGACY.level2), src.level2);
        if (l2.afterDigitizations > 0) {
          L1.exitDigitizations = l2.afterDigitizations;
          levels.push({
            id: "bryhada",
            name: "Бригада",
            rateMult: l2.rateMult,
            costMult: l2.costMult,
            clerkMult: l2.clerkMult,
            stream: l2.stream,
            stage: l2.stage,
            prestigeDivisor: L1.prestigeDivisor,
            exitDigitizations: 0,
            boss: 0,
            inspChecklistMin: src.inspChecklistMinL2 != null ? src.inspChecklistMinL2 : LEGACY.inspChecklistMinL2
          });
        }
      }
    } else {
      levels = src.levels.map(function(b, i) {
        const d = clone(DEFAULTS.levels[Math.min(i, DEFAULTS.levels.length - 1)]);
        delete d.packs;
        delete d.convert;
        delete d.bossMech;
        for (const k in b) {
          if ((k === "stream" || k === "stage") && b[k] && d[k]) d[k] = copyInto(d[k], b[k]);
          else d[k] = b[k];
        }
        return d;
      });
    }
    delete src.levels;
    delete src.level2;
    delete src.prestigeDivisor;
    delete src.inspChecklistMin;
    delete src.inspChecklistMinL2;
    ["boss", "pack", "zpz", "convert", "gifts"].forEach(function(k) {
      if (src[k]) {
        copyInto(base[k], src[k]);
        delete src[k];
      }
    });
    for (const k5 in src) base[k5] = src[k5];
    base.levels = levels;
    return base;
  }
  function reachableLevels(p) {
    let n = 1;
    while (n < p.levels.length && p.levels[n - 1].exitDigitizations > 0) n++;
    return n;
  }
  function levelItems(p, level) {
    const L = p.levels[level - 1];
    if (level === 1 && L.rateMult === 1 && L.costMult === 1 && (L.clerkMult == null || L.clerkMult === 1) && (L.growthMult == null || L.growthMult === 1)) return { streams: p.streams, stages: p.stages };
    function scale(x) {
      const y = {};
      for (const k in x) y[k] = x[k];
      y.rate = x.rate * L.rateMult;
      y.cost = x.cost * L.costMult;
      y.manager = x.manager * (L.clerkMult == null ? L.costMult : L.clerkMult);
      if (x.unlock != null) y.unlock = x.unlock * L.costMult;
      if (L.growthMult != null && L.growthMult !== 1) y.growth = 1 + (x.growth - 1) * L.growthMult;
      return y;
    }
    const S = p.streams.slice(), G = p.stages.slice();
    for (let i = 1; i < level; i++) {
      const b = p.levels[i];
      if (b.stream) S.push(b.stream);
      if (b.stage) G.push(b.stage);
    }
    return { streams: S.map(scale), stages: G.map(scale) };
  }

  // src/economy/core/formulas.ts
  function capAt(item, L, p) {
    if (L <= 0) return 0;
    return item.rate * L * Math.pow(p.milestoneMult, Math.floor(L / p.milestoneEvery));
  }
  function priceAt(item, L) {
    if (L === 0) return item.unlock || 0;
    return item.cost * Math.pow(item.growth, L - 1);
  }
  function packPrice(item, L, n) {
    let c = 0;
    for (let k = L; k < L + n; k++) c += priceAt(item, k);
    return c;
  }
  function milestoneTarget(L, p) {
    return (Math.floor(L / p.milestoneEvery) + 1) * p.milestoneEvery;
  }
  function prestigeMult(P, p) {
    return 1 + p.prestigeBonus * P;
  }
  function points(life, divisor, p) {
    return Math.floor(Math.pow(life / (divisor || 75e3), p.prestigeExponent));
  }
  function zpzShare(n, p) {
    return n > 0 ? p.zpz.shareMax * n / (n + p.zpz.K) : 0;
  }

  // src/economy/core/flow.ts
  function flow(streams, stages) {
    let sum = 0;
    let zi = -1;
    for (let i = 0; i < streams.length; i++) {
      const s = streams[i];
      if (s.share) {
        zi = i;
        continue;
      }
      if (s.on) sum += s.cap;
    }
    if (zi >= 0) {
      const z0 = streams[zi];
      if (z0.on && z0.share) {
        let z = z0.share.base * sum;
        for (const f of z0.share.factors) z *= f;
        sum += z;
      }
    }
    let pipe = Infinity;
    let which = -1;
    for (let j = 0; j < stages.length; j++) {
      const g = stages[j];
      const c = g.on ? g.cap : 0;
      if (c < pipe) {
        pipe = c;
        which = j;
      }
    }
    return { sum, pipe, which, v: Math.min(sum, pipe) };
  }

  // src/economy/core/integrate.ts
  function integrate(cuts, rateAt) {
    let got = 0;
    for (let c = 0; c + 1 < cuts.length; c++) {
      const x0 = cuts[c];
      const x1 = cuts[c + 1];
      if (x1 <= x0) continue;
      const mid = (x0 + x1) / 2;
      got += rateAt(mid) * (x1 - x0);
    }
    return got;
  }
  return __toCommonJS(index_exports);
})();
if (typeof module !== 'undefined') module.exports = StroiovaEconomy;
