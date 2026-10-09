// Economy model for «Стройова» (v7): document streams feed one approval pipe.
// income = min(sum of stream output, narrowest pipe stage) × multipliers.
// v5 adds level 2 «Бригада», the generator fuel bonus, exact offline ad doubling and telegram slowdowns.
// v6 adds the events around the conveyor: the 20% fuel mark and fuel on taps, the onboarding «Пташка» and the
// archive bonus, Кіт Сейф, «Комбата шукають», scheduled inspections (checklist, ×3, failure), gifts and the race,
// the starter pack (paid scenario), the museum journals and paper as a tracked resource.
// v7 (docs/levels-3-5.md) turns the single level2 block into levels[] (Р1–Р5): per-level multipliers, new stream and
// stage, prestige divisor, checklist price and exit rule (N digitizations on the level, then the final inspection «бос»,
// then the next digitization moves up). Level twists: telegram packs and «Звести в одну відповідь» (Р3), the
// «Звіти про звіти» stream as a saturating share of the other streams (Р4), stage conversions to digital (Р5);
// the finale is all stages digital, the run stops there. «Нарада затягнулась» and «Збій СЕДО» events.
// Pure functions, no DOM, deterministic (seeded random); the sandbox page embeds this file as is.
var DEFAULTS = {
  // v6 re-tune: the events speed the ad player up by about half, so level 1 output is ×0,66 and stream prices ×1,1 (v5 in comments)
  streams: [
    { id: 'raporty', name: 'Рапорти', rate: 3.96, unlock: 0, cost: 8.8, growth: 1.12, manager: 165 }, // v5: 6, 8, clerk 90
    { id: 'akty', name: 'Акти на майно', rate: 39.6, unlock: 330, cost: 132, growth: 1.13, manager: 770 }, // v5: 60, 300, 120, 700
    { id: 'dovidky', name: 'Довідки', rate: 396, unlock: 11000, cost: 6600, growth: 1.14, manager: 22000 }, // v5: 600, 10000, 6000, 20000
    { id: 'nakladni', name: 'Накладні', rate: 3960, unlock: 990000, cost: 330000, growth: 1.15, manager: 1980000 } // v5: 6000, 900000, 300000, 1800000
  ],
  stages: [
    { id: 'kombat', name: 'Резолюції комбата', rate: 7.92, cost: 25.7, growth: 1.12, manager: 132 }, // v5: 12, 26, 120
    { id: 'stroy', name: 'Стройова частина', rate: 9.9, cost: 34.6, growth: 1.12, manager: 220 }, // v5: 15, 35, 200
    { id: 'fin', name: 'Фінслужба', rate: 11.9, cost: 51.5, growth: 1.12, manager: 330 } // v5: 18, 52, 300
  ],
  // v7 — levels Р1–Р5. Level k plays the level 1 streams and stages plus the new ones of levels 2..k, all scaled by
  // level k's multipliers (new items are given in level 1 units). exitDigitizations: the n-th digitization on the level
  // moves up (boss 0) or announces the final inspection (boss 1; once it is passed, the next digitization moves up);
  // 0 = the player stays. growthMult flattens the price growth of the level (1 + (growth − 1) × growthMult): with the
  // decision 2 nudge (digitize when the next purchase is 4 h away) cycles last about a day whatever the divisor, so a
  // 2–3 day cycle needs a longer price ladder plus a larger divisor. packs / share / convert switch on the level twists.
  levels: [
    { id: 'batalion', name: 'Батальйон', rateMult: 1, costMult: 1, clerkMult: 1, stream: null, stage: null,
      prestigeDivisor: 75000, exitDigitizations: 3, boss: 0, inspChecklistMin: 129 }, // 129 = 19 + 6 + 4 + 11 + 89
    { id: 'bryhada', name: 'Бригада', rateMult: 10, costMult: 5, clerkMult: 1, growthMult: 0.45,
      stream: { id: 'nakazy', name: 'Накази по частині', rate: 60000, unlock: 3000000, cost: 1000000, growth: 1.16, manager: 6000000 },
      stage: { id: 'kazna', name: 'Казначейство', rate: 21, cost: 40, growth: 1.12, manager: 400 },
      prestigeDivisor: 6.27e9, exitDigitizations: 4, boss: 1, inspChecklistMin: 51 }, // 51 = 13 + 6 + 4 + 28; v6: growth ×1, divisor 75 000, no exit
    { id: 'komanduvannia', name: 'Командування', rateMult: 100, costMult: 25, clerkMult: 1, growthMult: 0.45,
      stream: { id: 'zvedennia', name: 'Зведення', rate: 600000, unlock: 30000000, cost: 10000000, growth: 1.17, manager: 60000000 },
      stage: { id: 'narada', name: 'Нарада', rate: 30, cost: 60, growth: 1.12, manager: 600 },
      prestigeDivisor: 6.76e11, exitDigitizations: 6, boss: 1, bossMech: 'pack', packs: 1, inspChecklistMin: 51 },
    { id: 'genshtab', name: 'Генштаб', rateMult: 1000, costMult: 125, clerkMult: 1, growthMult: 0.45,
      stream: { id: 'zpz', name: 'Звіти про звіти', rate: 0, share: 1, unlock: 300000000, cost: 100000000, growth: 1.18, manager: 600000000 },
      stage: { id: 'dopovid', name: 'Доповідь', rate: 40, cost: 80, growth: 1.12, manager: 800 },
      prestigeDivisor: 2.29e13, exitDigitizations: 6, boss: 1, bossMech: 'zpz', inspChecklistMin: 51 },
    { id: 'bez-paperu', name: 'Армія без паперу', rateMult: 10000, costMult: 625, clerkMult: 1, growthMult: 0.35, stream: null, stage: null,
      prestigeDivisor: 9.01e22, exitDigitizations: 0, boss: 0, convert: 1, inspChecklistMin: 51 }
  ],
  // the final inspection (бос) of a level: an inspection 04 with other numbers
  boss: {
    warnH: 24, // warning before the arrival
    retryH: 24, // after a failure the commission comes again this much later; bought items stay
    checklistMin: 420, // price of the whole checklist in minutes of base income at the announcement
    items: 6, // 5 basic + 1 item of the level mechanic
    adItems: 5, // «Усе за рекламу» closes the basic items only
    saveH: 12, // the bot: this many hours before the arrival the player saves for the items left instead of buying
    zpzMin: 0.4 // Р4: «Звіти про звіти» give at least this share of all streams at the arrival
  },
  // Р3: telegrams come in packs; the player answers «Звести в одну відповідь» (merge 1) or one by one (merge 0)
  pack: { size: 3, perDay: 1, singleChance: 0.5, merge: 1, slowMult: 0.5, slowHours: 1.5, summaryBuff: 1.5, summaryBuffHours: 2 },
  // Р4: «Звіти про звіти» = s(n) × sum of the other streams, s(n) = shareMax · n / (n + K)
  zpz: { shareMax: 1.5, K: 9 }, // s(1) = 0,15 → 13% of all streams on entry; the bot keeps it at 57–60% (s → 1,5 = 60%)
  // Р5: stage conversions to digital in this order; k opens after the (k−1)-th digitization on the level, once all streams
  // are open in the cycle; cost in minutes of base income at that moment; a digital stage gives ×mult, immune to slowdowns
  convert: { order: ['kombat', 'stroy', 'fin', 'kazna', 'narada', 'dopovid'], mult: 3, costMin: 120 },
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
  offlineAdMult: 2, // offline income × this for an ad (or «Забрати» after the purchase)…
  offlineAdPerDay: 3, // …on the first N returns of each day
  paidMult: 1.3,
  fuelHours: 6, // the player refuels at every session start; a tank lasts this long, offline too
  fuelBonus: 1.25, // conveyor income × this while there is fuel; 1 = no generator
  slowPerDayMin: 2, // telegrams done «сумлінно»: one random stage × slowMult for slowHours,
  slowPerDayMax: 4, // a random number of times per day in this range; 0 and 0 = off
  slowHours: 1,
  slowMult: 0.5,
  seed: 1,
  prestigeExponent: 0.5,
  prestigeBonus: 0.02,
  prestigeMinPoints: 30,
  prestigeGrowth: 1, // v5: 0,8 — the next digitization waits for as many points as already earned
  prestigeStallHours: 4,
  prestigeStallShare: 0.2, // …if the digitization brings at least this share of the points already earned
  days: 150,
  // v6 — clock: the game is installed and the first session starts at this local hour
  dayStartHour: 8,
  fuelBonusThreshold: 0.2, // the fuel bonus works while the tank is above this share (decision 9)
  fuelOnTaps: 1, // 1 = the fuel bonus also multiplies taps (01 FR-16)
  // onboarding (02): «Пташка в небі» ×2 for N minutes of play from the first stamp; the archive bonus once
  onboardingBirdMin: 20,
  onboardingBirdMult: 2,
  onboardingBirdStartSec: 80,
  archiveBonusMin: 60, // minutes of base income
  archiveBonusAtSec: 420,
  catBonusMin: 5, // Кіт Сейф: minutes of base income, at most once per catCooldownMin, taken whenever the player is in the game
  catCooldownMin: 60,
  catFromSec: 600, // the cat is not part of the onboarding: from the 2nd session
  // «Комбата шукають» (03): at a session start (not the first), ≤ 1 a day, with this chance; the player waits it out
  kombatChance: 0.2,
  kombatMult: 0.25,
  kombatMinMin: 10,
  kombatMaxMin: 30,
  // scheduled inspections (04), reputation «норма»; checklist price in minutes of base income at the announcement (per level)
  inspFirstAfterHours: 8,
  inspIntervalMinH: 24,
  inspIntervalMaxH: 48, // 0 = no inspections
  inspWarnMinH: 2,
  inspWarnMaxH: 3,
  inspMult: 3,
  inspHours: 2,
  inspFailMult: 0.5, // «Стройова частина» on a failed inspection
  inspFailHours: 1,
  inspPushVisit: 1, // minutes: the player opens the game on push № 3 (2 h before arrival) if no session falls between warning and arrival; 0 = never
  // gifts and the race (05, decision 30): service hours, act steps in hours (Акти, Комбат, Стройова, Фін.), the Казначейство step on level 2+
  gifts: {
    drone: { mult: 2, serviceH: 9, steps: [1.5, 1.8333, 1.5, 2.6667] },
    shovel: { mult: 1.5, serviceH: 12, steps: [1.3333, 1.6667, 1.3333, 2.3333] },
    generator: { mult: 1, fuel: 1, serviceH: 10, steps: [2.3333, 2.8333, 2.1667, 4] }
  },
  giftOrder: ['drone', 'shovel', 'drone', 'generator'], // [] = no gifts
  giftL2StepH: 2,
  giftFirstDay: 1, // calendar day index: 1 = the 2nd day
  giftGapHours: 20,
  giftFromHour: 8,
  giftToHour: 22,
  raceAdPerDay: 3, // ad speed-ups (−50% of what is left), all races together
  raceAdPerSession: 1, // how many of them the ad player uses in one session
  raceAdCut: 0.5,
  raceDigitalCutH: 2, // «Послатися на цифру»: once per race when P ≥ 1, points are not spent
  // paper (01 FR-22): only telegrams spend it, the conveyor never waits for it
  paperStart: 30,
  paperPerMinPerLevel: 0.0005, // per level of Накладні
  paperGift: 20,
  paperPerTelegram: 4, // average sheets of a diligent answer on level 1
  // museum (07): journals by the drop table; bonuses in percent, № 8 doubles them
  museum: 1,
  museumJ6DelayHours: 36, // telegram 25 after the 1st digitization, the notice the next day
  museumUnitPct: 5, // № 1 Стройова, № 4 Накладні, № 5 Рапорти
  museumStoragePct: 5, // № 2
  museumPaperPct: 10, // № 3
  museumRacePct: 10, // № 6 every step, № 7 the Фінслужба step
  // the paid scenario also buys the starter pack after the first inspection result (08 FR-17, FR-19)
  starterSignatures: 50000,
  starterFuelHours: 12
};

var SCENARIOS = [
  { id: 'free', name: 'Без реклами й покупок', ads: false, paid: false },
  { id: 'ads', name: 'Дивиться рекламу', ads: true, paid: false },
  { id: 'paid', name: 'Купив «Без реклами» і набір', ads: true, paid: true, starter: true }
];

// v6 and older kept level 2 in one block and the prestige divisor and checklist prices at the top level
var LEGACY = {
  prestigeDivisor: 75000, inspChecklistMin: 129, inspChecklistMinL2: 51,
  level2: { afterDigitizations: 3, rateMult: 10, costMult: 5, clerkMult: 1,
    stream: { id: 'nakazy', name: 'Накази по частині', rate: 60000, unlock: 3000000, cost: 1000000, growth: 1.16, manager: 6000000 },
    stage: { id: 'kazna', name: 'Казначейство', rate: 21, cost: 40, growth: 1.12, manager: 400 } }
};

function copyInto(dst, src) { for (var k in src) { var v = src[k]; if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object') copyInto(dst[k], v); else dst[k] = v; } return dst; }

// Fill a saved parameter set up to the current model. A preset saved before a mechanic existed
// gets it switched off, so it behaves exactly as when it was saved.
function withDefaults(params) {
  var base = JSON.parse(JSON.stringify(DEFAULTS));
  var src = JSON.parse(JSON.stringify(params || {}));
  if (src.prestigeStallHours == null) base.prestigeStallHours = 0; // v3
  if (src.prestigeStallShare == null) base.prestigeStallShare = 0.5; // v3, v4: fixed at a half
  if (src.offlineAdPerDay == null) { base.offlineAdPerDay = 99; base.offlineAdMult = 1.5; } // v3, v4: the average multiplier on every return
  if (src.fuelBonus == null) base.fuelBonus = 1;
  if (src.slowPerDayMax == null) { base.slowPerDayMin = 0; base.slowPerDayMax = 0; }
  if (src.giftOrder == null) { // v5 and older: none of the v6 events
    base.fuelBonusThreshold = 0; base.fuelOnTaps = 0; base.onboardingBirdMin = 0; base.archiveBonusMin = 0; base.catBonusMin = 0;
    base.kombatChance = 0; base.inspIntervalMaxH = 0; base.giftOrder = []; base.museum = 0; base.starterSignatures = 0; base.starterFuelHours = 0;
  }
  var levels;
  if (src.levels == null) { // v6 and older: level 1, and level 2 if the preset has it; the player stays on the last one
    var L1 = JSON.parse(JSON.stringify(DEFAULTS.levels[0]));
    L1.prestigeDivisor = src.prestigeDivisor != null ? src.prestigeDivisor : LEGACY.prestigeDivisor;
    L1.inspChecklistMin = src.inspChecklistMin != null ? src.inspChecklistMin : LEGACY.inspChecklistMin;
    L1.exitDigitizations = 0;
    levels = [L1];
    if (src.level2 != null) {
      var l2 = copyInto(JSON.parse(JSON.stringify(LEGACY.level2)), src.level2);
      if (l2.afterDigitizations > 0) {
        L1.exitDigitizations = l2.afterDigitizations;
        levels.push({ id: 'bryhada', name: 'Бригада', rateMult: l2.rateMult, costMult: l2.costMult, clerkMult: l2.clerkMult, stream: l2.stream, stage: l2.stage,
          prestigeDivisor: L1.prestigeDivisor, exitDigitizations: 0, boss: 0,
          inspChecklistMin: src.inspChecklistMinL2 != null ? src.inspChecklistMinL2 : LEGACY.inspChecklistMinL2 });
      }
    }
  } else {
    levels = src.levels.map(function (b, i) {
      var d = JSON.parse(JSON.stringify(DEFAULTS.levels[Math.min(i, DEFAULTS.levels.length - 1)]));
      // the twists of a level are only on when the saved block says so
      delete d.packs; delete d.convert; delete d.bossMech;
      for (var k in b) {
        if ((k === 'stream' || k === 'stage') && b[k] && d[k]) d[k] = copyInto(d[k], b[k]);
        else d[k] = b[k];
      }
      return d;
    });
  }
  delete src.levels; delete src.level2; delete src.prestigeDivisor; delete src.inspChecklistMin; delete src.inspChecklistMinL2;
  ['boss', 'pack', 'zpz', 'convert', 'gifts'].forEach(function (k) { if (src[k]) { copyInto(base[k], src[k]); delete src[k]; } });
  for (var k5 in src) base[k5] = src[k5];
  base.levels = levels;
  return base;
}

// how many levels the player can reach: each exit rule opens the next block
function reachableLevels(p) {
  var n = 1;
  while (n < p.levels.length && p.levels[n - 1].exitDigitizations > 0) n++;
  return n;
}

// streams and stages of a level: level 1 plus the new ones of levels 2..k, all scaled by level k's block
function levelItems(p, level) {
  var L = p.levels[level - 1];
  if (level === 1 && L.rateMult === 1 && L.costMult === 1 && (L.clerkMult == null || L.clerkMult === 1) && (L.growthMult == null || L.growthMult === 1)) return { streams: p.streams, stages: p.stages };
  function scale(x) {
    var y = {};
    for (var k in x) y[k] = x[k];
    y.rate = x.rate * L.rateMult; y.cost = x.cost * L.costMult; y.manager = x.manager * (L.clerkMult == null ? L.costMult : L.clerkMult);
    if (x.unlock != null) y.unlock = x.unlock * L.costMult;
    if (L.growthMult != null && L.growthMult !== 1) y.growth = 1 + (x.growth - 1) * L.growthMult; // v7: a flatter price ladder = a longer cycle
    return y;
  }
  var S = p.streams.slice(), G = p.stages.slice();
  for (var i = 1; i < level; i++) { if (p.levels[i].stream) S.push(p.levels[i].stream); if (p.levels[i].stage) G.push(p.levels[i].stage); }
  return { streams: S.map(scale), stages: G.map(scale) };
}

function capAt(item, L, p) {
  if (L <= 0) return 0;
  return item.rate * L * Math.pow(p.milestoneMult, Math.floor(L / p.milestoneEvery));
}
function priceAt(item, L) { // price of the next level at level L; level 1 of a locked stream costs `unlock`
  if (L === 0) return item.unlock || 0;
  return item.cost * Math.pow(item.growth, L - 1);
}

function simulate(p, scenario) {
  var nLevels = reachableLevels(p);
  var level = 1, items = levelItems(p, 1), B = p.levels[0];
  var SR = items.streams, ST = items.stages;
  var adFrac = scenario.ads ? Math.min(p.adsPerDay * p.adHours, 24) / 24 : 0;
  var boost = (scenario.paid ? p.paidMult : 1) * (1 + adFrac);
  var fuelBonus = p.fuelBonus || 1, fuelSec = (p.fuelHours || 0) * 3600, fuelThr = p.fuelBonusThreshold || 0;
  var prestigeTotal = 0;
  var st;
  var out = { firstClerk: null, allStreams: null, level2At: null, prestiges: [], unlocks: [], purchases: 0, waits: [], stalls: [],
    insp: [], races: [], journals: {}, kombats: 0, cats: 0, archive: 0, starterAt: null,
    levelAt: { 1: 0 }, bossAnn: {}, bosses: [], conversions: [], finaleAt: null, zpzShare: {} };
  var H = 3600, day = 86400, clock0 = (p.dayStartHour || 0) * H;
  function localH(t) { return ((clock0 + t) % day + day) % day / H; }
  function calDay(t) { return Math.floor((clock0 + t) / day); }
  function atLocal(d, hour) { return d * day + hour * H - clock0; }
  var buyVer = 0, buyCache = null; // the bot's decision depends only on the state and the signatures (see tryBuy)

  // museum (07): journal number → time it came
  var J = {};
  function jm() { return J[8] ? 2 : 1; }
  function grant(n, t) {
    if (!p.museum || J[n]) return;
    J[n] = t; out.journals[n] = t; buyVer++;
    var k = 0; for (var i = 1; i <= 7; i++) if (J[i]) k++;
    if (k === 7 && !J[8]) { J[8] = t; out.journals[8] = t; }
  }
  function musU(item) {
    if (!p.museum) return 1;
    var b = p.museumUnitPct / 100 * jm();
    if ((item.id === 'stroy' && J[1]) || (item.id === 'nakladni' && J[4]) || (item.id === 'raporty' && J[5])) return 1 + b;
    return 1;
  }
  // Р5: digital stages (stage id → time), kept through the digitizations of the level
  var digital = {}, nDigital = 0;
  function capU(item, L) { var c = capAt(item, L, p) * musU(item); if (nDigital && digital[item.id] != null) c *= p.convert.mult; return c; }
  function storSec() { return p.storageHours * 3600 * (J[2] ? 1 + p.museumStoragePct / 100 * jm() : 1); }
  // Р4: «Звіти про звіти» — a share of the other streams that saturates with its level
  function zShare(n) { return n > 0 ? p.zpz.shareMax * n / (n + p.zpz.K) : 0; }

  // paper (01 FR-22): a counter beside the conveyor
  var paper = p.paperStart || 0, paperMin = paper, paperShort = 0, paperSpent = 0, paperGot = 0, paperByDay = [];
  function paperMult() { return J[3] ? 1 + p.museumPaperPct / 100 * jm() : 1; }
  function addPaper(x) { x *= paperMult(); paper += x; paperGot += x; }
  function spendPaper(x) { if (paper >= x) { paper -= x; paperSpent += x; return true; } paperShort++; return false; }
  function nakIdx() { for (var i = 0; i < SR.length; i++) if (SR[i].id === 'nakladni') return i; return -1; }
  function paperRate() { var i = nakIdx(); return i >= 0 && st.sl[i] > 0 ? st.sl[i] * (p.paperPerMinPerLevel || 0) * paperMult() : 0; } // sheets a minute
  var series = [];
  var lostToStorage = 0, offlineTotal = 0, lastBuy = 0;
  var nStages = levelItems(p, nLevels).stages.length;
  var neck = { streams: 0, stage: [] };
  for (var n0 = 0; n0 < nStages; n0++) neck.stage.push(0);

  function reset() {
    st = {
      sl: SR.map(function (s, i) { return i === 0 ? 1 : 0; }),
      gl: ST.map(function () { return 1; }),
      sm: SR.map(function () { return false; }),
      gm: ST.map(function () { return false; }),
      sig: 0, life: 0
    };
    buyVer++;
  }
  reset();

  function mult() { return boost * (1 + p.prestigeBonus * prestigeTotal); }
  function unlockedStreams() { var k = 0; for (var i = 0; i < SR.length; i++) if (st.sl[i] > 0) k = i + 1; return k; }
  // fac: optional per-stage slowdown (telegrams); sfac: per-stream factors (Р3 «Зведення б'ється»); the bot plans without them
  function flow(sl, gl, idle, fac, sfac) {
    var sum = 0, zi = -1;
    for (var i = 0; i < SR.length; i++) {
      if (SR[i].share) { zi = i; continue; }
      if (sl[i] > 0 && (!idle || st.sm[i])) { var c0 = capU(SR[i], sl[i]); if (sfac) c0 *= sfac[i]; sum += c0; }
    }
    if (zi >= 0 && sl[zi] > 0 && (!idle || st.sm[zi])) { var z = zShare(sl[zi]) * sum; if (sfac) z *= sfac[zi]; sum += z; }
    var pipe = Infinity, which = -1;
    for (var j = 0; j < ST.length; j++) {
      var c = (!idle || st.gm[j]) ? capU(ST[j], gl[j]) : 0;
      if (fac) c *= fac[j];
      if (c < pipe) { pipe = c; which = j; }
    }
    return { sum: sum, pipe: pipe, which: which, v: Math.min(sum, pipe) };
  }
  // what one stream alone gives at level L (the share stream: its part of the others in `sl`)
  function othersSum(sl) { var s = 0; for (var i = 0; i < SR.length; i++) if (!SR[i].share && sl[i] > 0) s += capU(SR[i], sl[i]); return s; }
  function zpzIdx() { for (var i = 0; i < SR.length; i++) if (SR[i].share) return i; return -1; }
  function zpzShareNow() { var i = zpzIdx(); if (i < 0) return 0; var s = zShare(st.sl[i]); return s / (1 + s); }
  function ipm(idle) { return flow(st.sl, st.gl, idle).v * mult(); }
  // «базовий дохід» (01 FR-31): no temporary multipliers, no event factors; prices and rewards «in minutes of income» use it
  function baseInc() { return flow(st.sl, st.gl, false).v * (1 + p.prestigeBonus * prestigeTotal) * (scenario.paid ? p.paidMult : 1); }
  function points(life) { return Math.floor(Math.pow(life / (B.prestigeDivisor || 75000), p.prestigeExponent)); }

  // the final inspection of the level and the Р5 conversions: the bot saves for them before anything else
  var boss = null, bossPassed = false, bossPending = false, convCost = null;
  function bossNeedsZpz() { return boss && !boss.done && boss.mech === 'zpz' && zpzShareNow() < p.boss.zpzMin; }
  function convOpen() { // the next conversion is open on this level
    if (!B.convert || nDigital >= ST.length) return false;
    var nL = 0; out.prestiges.forEach(function (x) { if (x.level === level) nL++; });
    return nDigital < 1 + nL;
  }

  function options() {
    var opts = [];
    // clerks first: without them the conveyor stops when the player leaves
    for (var i = 0; i < SR.length; i++) if (st.sl[i] > 0 && !st.sm[i]) opts.push({ kind: 'clerkS', i: i, cost: SR[i].manager, pay: -1 });
    for (var j = 0; j < ST.length; j++) if (!st.gm[j]) opts.push({ kind: 'clerkG', i: j, cost: ST[j].manager, pay: -1 });
    var zi0 = zpzIdx();
    // Р4 boss: «Звіти про звіти» must give the share at the arrival, the player raises them on purpose
    if (zi0 >= 0 && st.sl[zi0] > 0 && bossNeedsZpz()) opts.push({ kind: 'stream', i: zi0, to: st.sl[zi0] + 1, cost: priceAt(SR[zi0], st.sl[zi0]), pay: -0.5 });
    var cur = flow(st.sl, st.gl, false).v;
    for (var a = 0; a < SR.length; a++) {
      if (st.sl[a] === 0 && (a === 0 || st.sl[a - 1] > 0)) {
        var sl1 = st.sl.slice(); sl1[a] = 1;
        var n1 = flow(sl1, st.gl, false).v, c1 = priceAt(SR[a], 0) + SR[a].manager;
        // a new stream behind a narrow pipe adds nothing now, but it is the gate to the next level: rank it by its own output
        var own1 = SR[a].share ? zShare(1) * othersSum(st.sl) : capU(SR[a], 1);
        var gain1 = Math.max(n1 - cur, own1 * 0.25);
        opts.push({ kind: 'unlock', i: a, cost: c1, pay: c1 / gain1 });
      } else if (st.sl[a] > 0) {
        var sl2 = st.sl.slice(); sl2[a]++;
        var n2 = flow(sl2, st.gl, false).v, c2 = priceAt(SR[a], st.sl[a]);
        opts.push({ kind: 'stream', i: a, to: st.sl[a] + 1, cost: c2, pay: n2 > cur ? c2 / (n2 - cur) : Infinity });
        // look ahead to the next milestone: players buy up to the ×2 jump
        var goal = (Math.floor(st.sl[a] / p.milestoneEvery) + 1) * p.milestoneEvery;
        if (!SR[a].share && goal - st.sl[a] > 1) {
          var c4 = 0; for (var L4 = st.sl[a]; L4 < goal; L4++) c4 += priceAt(SR[a], L4);
          var sl4 = st.sl.slice(); sl4[a] = goal;
          var n4 = flow(sl4, st.gl, false).v;
          opts.push({ kind: 'stream', i: a, to: goal, cost: c4, pay: n4 > cur ? c4 / (n4 - cur) : Infinity });
        }
      }
    }
    // the pipe: raise every stage tied at the narrowest point together
    var f = flow(st.sl, st.gl, false);
    var gl2 = st.gl.slice(), c3 = 0, ups = [];
    for (var b = 0; b < ST.length; b++) if (capU(ST[b], st.gl[b]) <= f.pipe * 1.0000001) { c3 += priceAt(ST[b], st.gl[b]); gl2[b]++; ups.push(b); }
    var n3 = flow(st.sl, gl2, false).v;
    opts.push({ kind: 'pipe', gl: gl2, cost: c3, pay: n3 > cur ? c3 / (n3 - cur) : Infinity });
    // look ahead: widen the whole pipe to the narrowest stage's next milestone
    var nb = Math.max(f.which, 0), goalL = (Math.floor(st.gl[nb] / p.milestoneEvery) + 1) * p.milestoneEvery; // which < 0 only if every stage overflowed
    var target = capU(ST[nb], goalL), gl5 = st.gl.slice(), c5 = 0;
    for (var e = 0; e < ST.length; e++) { var guard5 = 0; while (capU(ST[e], gl5[e]) < target && guard5++ < 400) { c5 += priceAt(ST[e], gl5[e]); gl5[e]++; } }
    var n5 = flow(st.sl, gl5, false).v;
    if (c5 > 0) opts.push({ kind: 'pipe', gl: gl5, cost: c5, pay: n5 > cur ? c5 / (n5 - cur) : Infinity });
    // when streams and pipe are level, neither alone helps: widen the pipe and raise streams to fill it
    [gl2, gl5].forEach(function (glT) {
      var pipeT = flow(st.sl, glT, false).pipe, cP = 0;
      for (var e2 = 0; e2 < ST.length; e2++) for (var L6 = st.gl[e2]; L6 < glT[e2]; L6++) cP += priceAt(ST[e2], L6);
      var sl6 = st.sl.slice(), cS = 0, sum6 = flow(sl6, glT, false).sum;
      for (var guard6 = 0; sum6 < pipeT && guard6 < 400; guard6++) {
        var bi = -1, bv = Infinity;
        for (var k = 0; k < SR.length; k++) if (sl6[k] > 0) {
          var dv = SR[k].share ? (zShare(sl6[k] + 1) - zShare(sl6[k])) * othersSum(sl6) : capU(SR[k], sl6[k] + 1) - capU(SR[k], sl6[k]), pr = priceAt(SR[k], sl6[k]);
          if (pr / dv < bv) { bv = pr / dv; bi = k; }
        }
        if (bi < 0) break;
        cS += priceAt(SR[bi], sl6[bi]); sl6[bi]++; sum6 = flow(sl6, glT, false).sum;
      }
      var n6 = flow(sl6, glT, false).v;
      if (cS > 0 && cP > 0 && n6 > cur) opts.push({ kind: 'both', sl: sl6, gl: glT.slice(), cost: cP + cS, pay: (cP + cS) / (n6 - cur) });
    });
    opts.sort(function (x, y) { return x.pay - y.pay; });
    return opts;
  }

  function apply(o, t) {
    st.sig -= o.cost;
    if (o.kind === 'clerkS') { st.sm[o.i] = true; if (out.firstClerk === null) out.firstClerk = t; }
    else if (o.kind === 'clerkG') { st.gm[o.i] = true; if (out.firstClerk === null) out.firstClerk = t; }
    else if (o.kind === 'unlock') {
      st.sl[o.i] = 1; st.sm[o.i] = true;
      out.unlocks.push({ t: t, i: o.i, cycle: out.prestiges.length, level: level });
      if (level === 1 && o.i === SR.length - 1 && out.allStreams === null) out.allStreams = t;
    }
    else if (o.kind === 'stream') st.sl[o.i] = o.to;
    else if (o.kind === 'both') { st.sl = o.sl.slice(); st.gl = o.gl.slice(); }
    else st.gl = o.gl.slice();
    out.purchases++;
    if (t > lastBuy) out.waits.push({ t: t, w: t - lastBuy, level: level });
    lastBuy = t;
    buyVer++;
  }

  var ended = false;
  // boss items and conversions come first whenever the player can afford them. Both open (and get their price in minutes
  // of base income) once all streams of the level are open in the cycle: right after a digitization the income is too
  // small for a price «in minutes of income» to mean anything. Returns a price the bot must save for first (0 = none).
  function priorityBuys(t) {
    if (bossPending && !boss && unlockedStreams() === SR.length) announceBoss(t);
    if (boss && !boss.done && boss.ann <= t) {
      var itemCost = boss.cost / p.boss.items;
      if (scenario.ads && !boss.adUsed) { boss.adUsed = true; if (boss.paidItems < p.boss.adItems) { boss.paidItems = p.boss.adItems; boss.how = scenario.paid ? 'take' : 'ad'; } buyVer++; }
      while (boss.paidItems < p.boss.items && st.sig >= itemCost) { st.sig -= itemCost; boss.paidItems++; buyVer++; }
      // the last hours before the arrival the player stops buying and saves for the items left
      if (boss.paidItems < p.boss.items && boss.arr - t <= (p.boss.saveH || 0) * H) return itemCost;
    }
    if (convOpen() && (convCost != null || unlockedStreams() === SR.length)) {
      if (convCost == null) convCost = Math.max(50, Math.ceil(p.convert.costMin * baseInc()));
      if (st.sig < convCost) return 0;
      st.sig -= convCost;
      var id = p.convert.order[nDigital] || ST[nDigital].id;
      digital[id] = t; nDigital++; buyVer++;
      out.conversions.push({ t: t, id: id, cost: convCost, n: nDigital });
      convCost = null;
      if (nDigital >= ST.length) { out.finaleAt = t; ended = true; return Infinity; }
      return priorityBuys(t);
    }
    return 0;
  }

  function priorityPrice() { // the lowest price among boss items and the open conversion still to buy
    var x = Infinity;
    if (boss && !boss.done && boss.paidItems < p.boss.items) x = boss.cost / p.boss.items;
    if (convOpen() && convCost != null && convCost < x) x = convCost;
    return x;
  }
  // The bot's choice depends only on the state (levels, clerks, journals, points) and on the signatures; while nothing
  // of the state changed and the signatures grew but stay under the next price that could change the choice, it is the same.
  function tryBuy(t) {
    if (buyCache && buyCache.ver === buyVer && st.sig >= buyCache.sig && st.sig < buyCache.thr) return;
    var hold = priorityBuys(t);
    if (ended) return;
    if (hold > 0) { buyCache = { ver: buyVer, sig: st.sig, thr: hold }; return; }
    var pthr = priorityPrice();
    for (var guard = 0; guard < 300; guard++) {
      var opts = options();
      var best = opts[0];
      if (!best || !isFinite(best.cost) || best.pay === Infinity) { buyCache = { ver: buyVer, sig: st.sig, thr: pthr }; return; }
      if (best.cost <= st.sig) { apply(best, t); continue; }
      if (best.pay < 0) { buyCache = { ver: buyVer, sig: st.sig, thr: Math.min(best.cost, pthr) }; return; } // saving for a clerk
      var tBest = (best.cost - st.sig) / Math.max(ipm(false), 1e-9);
      var took = false;
      for (var q = 1; q < opts.length; q++) {
        var o = opts[q];
        if (o.cost <= st.sig && isFinite(o.pay) && o.pay >= 0 && o.pay < tBest) { apply(o, t); took = true; break; }
      }
      if (!took) {
        var thr = best.cost;
        for (var q2 = 1; q2 < opts.length; q2++) { var o2 = opts[q2]; if (o2.cost > st.sig && o2.cost < thr && isFinite(o2.pay) && o2.pay >= 0) thr = o2.cost; }
        buyCache = { ver: buyVer, sig: st.sig, thr: Math.min(thr, pthr) };
        return;
      }
    }
  }

  // the player sees "next purchase in N hours": stuck that long, they digitize with fewer points
  function stuck() {
    var best = options()[0];
    if (!best || !isFinite(best.pay)) return true;
    if (best.cost <= st.sig) return false;
    return (best.cost - st.sig) / Math.max(ipm(false), 1e-9) / 60 >= p.prestigeStallHours;
  }
  function levelUp(t) {
    level++; out.levelAt[level] = t;
    if (level === 2) out.level2At = t;
    B = p.levels[level - 1];
    items = levelItems(p, level); SR = items.streams; ST = items.stages;
    boss = null; bossPassed = false; bossPending = false;
  }
  function maybePrestige(t) {
    if (unlockedStreams() < SR.length) return;
    var pts = points(st.life);
    var need = Math.max(p.prestigeMinPoints, p.prestigeGrowth * prestigeTotal);
    var share = p.prestigeStallShare == null ? 0.5 : p.prestigeStallShare;
    if (pts < need && p.prestigeStallHours > 0 && pts >= Math.max(p.prestigeMinPoints, share * prestigeTotal) && stuck()) need = pts;
    if (pts >= need && pts > 0) {
      var zs = zpzShareNow(); if (zpzIdx() >= 0) (out.zpzShare[level] = out.zpzShare[level] || []).push(Math.round(zs * 1000) / 1000);
      prestigeTotal += pts;
      out.prestiges.push({ t: t, points: pts, total: prestigeTotal, level: level });
      var nL = 0; out.prestiges.forEach(function (x) { if (x.level === level) nL++; });
      if (level === 1) {
        if (nL === 1) { grant(1, t); grant(2, t); grant(3, t); firstDigT = t; }
        if (nL === 2) { grant(4, t); grant(5, t); }
      }
      // the stretch without purchases right before a digitization (waiting for points) is kept apart from purchase waits
      if (t > lastBuy) out.stalls.push({ t: t, w: t - lastBuy, level: level });
      // digital points carry over; the exit rule of the level decides the move up
      if (level < nLevels && B.exitDigitizations > 0) {
        if (!B.boss) { if (nL >= B.exitDigitizations) levelUp(t); }
        else if (bossPassed) levelUp(t);
        else if (nL >= B.exitDigitizations && !boss) bossPending = true; // announced once all streams are open again
      }
      convCost = null;
      reset();
      lastBuy = t;
    }
  }

  var wake = 16 * 3600, starts = [], firstDigT = null;
  for (var d = 0; d < p.days; d++) for (var s = 0; s < p.sessionsPerDay; s++) starts.push(d * day + s * (wake / p.sessionsPerDay));

  // telegrams done «сумлінно»: at the start of random sessions (never the first one) one random stage slows down
  var slowByDay = [], seed = ((p.seed || 1) * 2654435761) % 4294967296;
  function rand() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  var sMin = Math.max(0, Math.round(p.slowPerDayMin || 0)), sMax = Math.max(sMin, Math.round(p.slowPerDayMax || 0));
  for (var d2 = 0; d2 < p.days; d2++) {
    var pool = [];
    for (var s2 = 0; s2 < p.sessionsPerDay; s2++) if (d2 > 0 || s2 > 0) pool.push(starts[d2 * p.sessionsPerDay + s2]);
    var nSlow = Math.min(pool.length, sMin + Math.floor(rand() * (sMax - sMin + 1))), evs = [];
    for (var e3 = 0; e3 < nSlow; e3++) {
      var pick = Math.floor(rand() * pool.length);
      evs.push({ t: pool[pick], end: pool[pick] + (p.slowHours || 0) * 3600, pick: rand() });
      pool.splice(pick, 1);
    }
    slowByDay.push(evs);
  }
  // Р5 after the 4th conversion: the script «weakens», about half the telegrams of a day (1–2)
  function lateCut() { return B.convert && nDigital >= 4; }
  function slowAt(t) {
    var fac = null, d3 = Math.floor(t / day);
    for (var back = 0; back < 2; back++) {
      var evs3 = slowByDay[d3 - back];
      if (!evs3) continue;
      var lim = lateCut() ? Math.ceil(evs3.length / 2) : evs3.length;
      for (var e4 = 0; e4 < lim; e4++) {
        var ev = evs3[e4];
        if (ev.t <= t && t < ev.end) {
          if (!fac) { fac = []; for (var j4 = 0; j4 < ST.length; j4++) fac.push(1); }
          fac[Math.floor(ev.pick * ST.length)] *= p.slowMult;
        }
      }
    }
    return fac;
  }

  // v6 events. Their random numbers come from their own generators, so switching one on does not move the others.
  function lcg(s0) { var sd = s0 % 4294967296; return function () { sd = (sd * 1664525 + 1013904223) % 4294967296; return sd / 4294967296; }; }
  var randK = lcg((p.seed || 1) * 40503 + 977), randI = lcg((p.seed || 1) * 69069 + 4111);
  function stageIdx(id) { for (var i = 0; i < ST.length; i++) if (ST[i].id === id) return i; return -1; }
  function streamIdx(id) { for (var i = 0; i < SR.length; i++) if (SR[i].id === id) return i; return -1; }
  // «Комбата шукають»: at a session start (not the first), at most once a calendar day
  var kombats = [], kDay = -1;
  if (p.kombatChance > 0) for (var sk = 1; sk < starts.length; sk++) {
    var dk = calDay(starts[sk]);
    if (dk === kDay) continue;
    if (randK() < p.kombatChance) { kDay = dk; kombats.push({ t: starts[sk], end: starts[sk] + (p.kombatMinMin + randK() * (p.kombatMaxMin - p.kombatMinMin)) * 60 }); }
  }
  out.kombats = kombats.length;
  // v7 events, each with its own generator: «Нарада затягнулась», «Збій СЕДО», the Р3 packs
  var naradas = [], nDay = -1, randN = lcg((p.seed || 1) * 22695477 + 31337);
  var hasNarada = levelItems(p, nLevels).stages.some(function (x) { return x.id === 'narada'; });
  if (p.naradaChance > 0 && hasNarada) for (var sn = 1; sn < starts.length; sn++) {
    var dn = calDay(starts[sn]);
    if (dn === nDay) continue;
    if (randN() < p.naradaChance) { nDay = dn; naradas.push({ t: starts[sn], end: starts[sn] + (p.naradaMinMin + randN() * (p.naradaMaxMin - p.naradaMinMin)) * 60 }); }
  }
  var sedos = [], sDay = -1, randS = lcg((p.seed || 1) * 1103515245 + 12345);
  var hasConvert = p.levels.slice(0, nLevels).some(function (x) { return x.convert; });
  if (p.sedoFailChance > 0 && hasConvert) for (var ss = 1; ss < starts.length; ss++) {
    var ds = calDay(starts[ss]);
    if (ds === sDay) continue;
    if (randS() < p.sedoFailChance) { sDay = ds; sedos.push({ t: starts[ss], end: starts[ss] + p.sedoFailMin * 60, pick: randS(), state: null }); }
  }
  // Р3 packs: one pack a day at a random session (not the first one of the game) plus 0–1 single telegram
  var packEv = [], packPaper = [], randP = lcg((p.seed || 1) * 214013 + 2531011);
  var hasPacks = p.levels.slice(0, nLevels).some(function (x) { return x.packs; });
  if (hasPacks) for (var dp = 0; dp < p.days; dp++) {
    var poolP = [];
    for (var sp = 0; sp < p.sessionsPerDay; sp++) if (dp > 0 || sp > 0) poolP.push(starts[dp * p.sessionsPerDay + sp]);
    for (var np = 0; np < (p.pack.perDay || 0) && poolP.length; np++) {
      var ip = Math.floor(randP() * poolP.length), tp = poolP[ip]; poolP.splice(ip, 1);
      var ppt = p.paperPerTelegram || 0;
      if (p.pack.merge) { // one answer for all three: one slowdown on «Нарада», «Зведення б'ється»
        packEv.push({ t: tp, end: tp + p.pack.slowHours * H, stage: 'narada', m: p.pack.slowMult });
        packEv.push({ t: tp, end: tp + p.pack.summaryBuffHours * H, stream: 'zvedennia', m: p.pack.summaryBuff });
        packPaper.push({ t: tp, x: p.pack.size * ppt - (p.pack.size - 1) });
      } else {
        for (var ix = 0; ix < p.pack.size; ix++) packEv.push({ t: tp, end: tp + (p.slowHours || 0) * H, pick: randP(), m: p.slowMult });
        packPaper.push({ t: tp, x: p.pack.size * ppt });
      }
    }
    if (poolP.length && randP() < p.pack.singleChance) {
      var is = Math.floor(randP() * poolP.length), ts1 = poolP[is];
      packEv.push({ t: ts1, end: ts1 + (p.slowHours || 0) * H, pick: randP(), m: p.slowMult });
      packPaper.push({ t: ts1, x: p.paperPerTelegram || 0 });
    }
  }
  function packFac(t, fac, sfac) {
    for (var i = 0; i < packEv.length; i++) {
      var ev = packEv[i];
      if (ev.t > t) break;
      if (t >= ev.end) continue;
      if (ev.stream) { var si = streamIdx(ev.stream); if (si >= 0) sfac[si] *= ev.m; }
      else { var j = ev.stage ? stageIdx(ev.stage) : Math.floor(ev.pick * ST.length); if (j >= 0) fac[j] *= ev.m; }
    }
  }
  // scheduled inspections, reputation «норма»: the schedule does not depend on the player
  var insps = [];
  var arrWindow = function (t, rnd) { // arrival only 10:00–21:00, else 10:00 + 0–60 min
    var h = localH(t);
    if (h >= 10 && h < 21) return t;
    return atLocal(calDay(t) + (h >= 21 ? 1 : 0), 10) + Math.floor(rnd() * 60) * 60;
  };
  if (p.inspIntervalMaxH > 0) {
    var warn = function () { return Math.round((p.inspWarnMinH + randI() * (p.inspWarnMaxH - p.inspWarnMinH)) * 60) * 60; };
    var s0 = null;
    for (var si0 = 0; si0 < starts.length; si0++) { var h0 = localH(starts[si0]); if (starts[si0] >= p.inspFirstAfterHours * H && h0 >= 8 && h0 < 19) { s0 = starts[si0]; break; } }
    if (s0 != null) {
      var arr = arrWindow(s0 + warn(), randI);
      insps.push({ ann: s0, arr: arr });
      for (var gi = 0; gi < 400; gi++) {
        arr = arrWindow(arr + (p.inspIntervalMinH + randI() * (p.inspIntervalMaxH - p.inspIntervalMinH)) * H, randI);
        if (arr > p.days * day) break;
        insps.push({ ann: arr - warn(), arr: arr });
      }
    }
    insps.forEach(function (q, i) { q.n = i + 1; q.cost = null; q.paid = false; q.how = null; q.done = false; });
  }
  // the final inspection: announced in the cycle after the N-th digitization on the level, once all streams are open again;
  // arrives warnH later in the 10:00–21:00 window
  var randB = lcg((p.seed || 1) * 134775813 + 1);
  var bossWins = []; // ×3 windows and failure windows of final inspections
  function announceBoss(t) {
    boss = { level: level, ann: t, arr: arrWindow(t + p.boss.warnH * H, randB), cost: Math.max(50, Math.ceil(p.boss.checklistMin * baseInc())),
      paidItems: 0, adUsed: false, how: 'sig', done: false, tries: 0, mech: B.bossMech || null };
    if (out.bossAnn[level] == null) out.bossAnn[level] = t;
    buyVer++;
  }
  function resolveBoss(tA) {
    boss.tries++;
    var mechOk = boss.mech === 'zpz' ? zpzShareNow() >= p.boss.zpzMin : true; // Р3: the bot always closes the last pack «сумлінно»
    var pass = boss.paidItems >= p.boss.items && mechOk;
    out.bosses.push({ level: boss.level, ann: boss.ann, arr: tA, pass: pass, try: boss.tries, cost: boss.cost, paidItems: boss.paidItems, how: boss.how, zpz: boss.mech === 'zpz' ? Math.round(zpzShareNow() * 1000) / 1000 : null });
    bossWins.push({ t: tA, pass: pass });
    if (pass) { boss.done = true; bossPassed = true; }
    else { boss.arr = arrWindow(tA + p.boss.retryH * H, randB); boss.adUsed = false; }
    buyVer++;
  }
  function bossBlocks(t) { return boss && !bossPassed && boss.ann <= t; } // no regular inspections while the final one is on
  var starterDue = false, starterDone = false;
  // gifts and the race
  var races = [], race = null, giftIdx = 0, lastRaceEnd = -Infinity, lastGiftDay = -1, raceAdDay = -1, raceAdUsed = 0, raceAdSession = 0;
  var giftsOn = p.giftOrder && p.giftOrder.length > 0;
  function raceEnd(r) { return r.actEnd <= r.svcEnd ? r.actEnd : r.svcEnd; }
  function settleRace(t) {
    if (race && raceEnd(race) <= t) {
      race.win = race.actEnd <= race.svcEnd; lastRaceEnd = raceEnd(race);
      out.races.push({ type: race.type, start: race.start, actEnd: race.actEnd, svcEnd: race.svcEnd, win: race.win, ads: race.ads, dig: race.digUsed, level: race.level });
      race = null;
    }
  }
  function startRace(t) {
    var type = p.giftOrder[giftIdx % p.giftOrder.length], g = p.gifts[type];
    giftIdx++;
    var k6 = J[6] ? 1 - p.museumRacePct / 100 * jm() : 1, k7 = J[7] ? 1 - p.museumRacePct / 100 * jm() : 1;
    var steps = g.steps.slice(); if (level >= 2) steps.push(p.giftL2StepH);
    var tot = 0; steps.forEach(function (h, i) { tot += h * H * k6 * (i === 3 ? k7 : 1); });
    race = { type: type, start: t, actEnd: t + tot, svcEnd: t + g.serviceH * H, mult: g.mult || 1, fuel: !!g.fuel, digUsed: false, ads: 0, level: level };
    races.push(race); lastGiftDay = calDay(t);
    addPaper(p.paperGift || 0);
  }
  // earliest gift in (a, b]; the streams do not change in between
  function giftTime(a, b) {
    if (!giftsOn || race || !(st.sl[1] > 0)) return null; // the race needs «Акти на майно» on this level
    var c = Math.max(a, lastRaceEnd + p.giftGapHours * H, atLocal(p.giftFirstDay, p.giftFromHour));
    for (var k = 0; k < 60 && c <= b; k++) {
      var h = localH(c), dd = calDay(c);
      if (dd === lastGiftDay || h >= p.giftToHour) { c = atLocal(dd + 1, p.giftFromHour); continue; }
      if (h < p.giftFromHour) { c = atLocal(dd, p.giftFromHour); continue; }
      return c > a ? c : (a < b ? Math.min(a + 1, b) : null);
    }
    return null;
  }
  function giftMult(t) {
    var m = 1;
    for (var i = races.length - 1; i >= 0 && i >= races.length - 3; i--) { var r = races[i]; if (r.actEnd <= r.svcEnd && r.actEnd <= t && t < r.svcEnd) m *= r.mult; }
    return m;
  }
  function genOn(t) {
    for (var i = races.length - 1; i >= 0 && i >= races.length - 3; i--) { var r = races[i]; if (r.fuel && r.actEnd <= r.svcEnd && r.actEnd <= t && t < r.svcEnd) return true; }
    return false;
  }
  function inspMult(t) {
    for (var i = 0; i < insps.length; i++) { var q = insps[i]; if (q.arr > t) break; if (q.paid && t < q.arr + p.inspHours * H) return p.inspMult; }
    for (var b = bossWins.length - 1; b >= 0; b--) { var w = bossWins[b]; if (w.pass && w.t <= t && t < w.t + p.inspHours * H) return p.inspMult; }
    return 1;
  }
  // slowdowns from telegrams, «Комбата шукають», «Нарада затягнулась» and a failed inspection; digital stages are immune
  // except to «Збій СЕДО». sfacOut (an array) gets the stream factors of the Р3 packs.
  function facAt(t, sfacOut) {
    var fac = B.packs ? null : slowAt(t);
    function ensure() { if (!fac) { fac = []; for (var j2 = 0; j2 < ST.length; j2++) fac.push(1); } }
    function mul(id, m) { var j = stageIdx(id); if (j < 0) return; ensure(); fac[j] *= m; }
    for (var i = 0; i < kombats.length; i++) { if (kombats[i].t > t) break; if (t < kombats[i].end) mul('kombat', p.kombatMult); }
    for (var q = 0; q < insps.length; q++) { var ins = insps[q]; if (ins.arr > t) break; if (ins.done && !ins.paid && !ins.skipped && t < ins.arr + p.inspFailHours * H) mul('stroy', p.inspFailMult); }
    if (bossWins.length) for (var b = 0; b < bossWins.length; b++) { var w = bossWins[b]; if (!w.pass && w.t <= t && t < w.t + p.inspFailHours * H) mul('stroy', p.inspFailMult); }
    if (naradas.length) for (var n = 0; n < naradas.length; n++) { if (naradas[n].t > t) break; if (t < naradas[n].end) mul('narada', p.naradaMult); }
    if (B.packs && packEv.length) {
      ensure(); var sf = []; for (var k = 0; k < SR.length; k++) sf.push(1);
      packFac(t, fac, sf);
      if (sfacOut) for (var k2 = 0; k2 < SR.length; k2++) sfacOut[k2] = sf[k2];
    }
    if (nDigital && fac) for (var j3 = 0; j3 < ST.length; j3++) if (digital[ST[j3].id] != null) fac[j3] = 1;
    if (nDigital && sedos.length) for (var e = 0; e < sedos.length; e++) {
      var sd = sedos[e]; if (sd.t > t) break;
      if (sd.state === 'fail' && t < sd.end) { var jd = stageIdx(sd.id); if (jd >= 0) { ensure(); fac[jd] *= p.sedoFailMult; } }
    }
    return fac;
  }
  function sfacAt(t) {
    if (!B.packs || !packEv.length) return null;
    var sf = []; for (var k = 0; k < SR.length; k++) sf.push(1);
    facAt(t, sf);
    for (var k2 = 0; k2 < sf.length; k2++) if (sf[k2] !== 1) return sf;
    return null;
  }
  // every rate change inside (a0, a1), to cut the offline stretch
  function eventCuts(a0, a1, cuts) {
    function add(x) { if (x > a0 && x < a1) cuts.push(x); }
    kombats.forEach(function (k) { add(k.t); add(k.end); });
    insps.forEach(function (q) { add(q.arr); add(q.arr + p.inspHours * H); add(q.arr + p.inspFailHours * H); });
    races.forEach(function (r) { add(r.actEnd); add(r.svcEnd); });
    naradas.forEach(function (k) { add(k.t); add(k.end); });
    sedos.forEach(function (k) { add(k.t); add(k.end); });
    bossWins.forEach(function (w) { add(w.t + p.inspHours * H); add(w.t + p.inspFailHours * H); });
    if (boss && !boss.done) { add(boss.arr); add(boss.arr + p.inspHours * H); add(boss.arr + p.inspFailHours * H); }
    if (B.packs) packEv.forEach(function (ev) { add(ev.t); add(ev.end); });
  }
  var slowList = []; slowByDay.forEach(function (evs) { evs.forEach(function (ev, i) { slowList.push({ t: ev.t, i: i, n: evs.length }); }); });
  // discrete events in (a, b]; between sessions the state is frozen, so this also works offline
  function advance(a, b) {
    settleRace(b);
    var c = giftTime(a, b);
    if (c != null) { startRace(c); settleRace(b); }
    // the final inspection arrives (at most once per stretch; a retry is a day later)
    if (boss && !boss.done && boss.arr <= b) resolveBoss(boss.arr);
    for (var i = 0; i < insps.length; i++) {
      var q = insps[i];
      if (q.ann > b) break;
      if (q.cost == null) {
        if (bossBlocks(q.ann)) { q.skipped = true; q.done = true; q.cost = 0; continue; }
        q.level = level; q.cost = Math.max(50, Math.ceil(B.inspChecklistMin * baseInc()));
      }
      if (!q.done && q.arr <= b) {
        q.done = true;
        out.insp.push({ n: q.n, ann: q.ann, arr: q.arr, pass: q.paid, how: q.how, cost: q.cost, level: q.level });
        if (q.paid && firstDigT != null && firstDigT < q.arr) grant(7, q.arr);
        if (q.n === 1) starterDue = true;
      }
    }
    if (p.museum && firstDigT != null && !J[6] && firstDigT + p.museumJ6DelayHours * H <= b) grant(6, firstDigT + p.museumJ6DelayHours * H);
    // a diligent telegram costs paper; with too little the player would have to pick another answer
    if (p.paperPerTelegram > 0) {
      if (!B.packs) slowList.forEach(function (ev) {
        if (ev.t > a && ev.t <= b && (!lateCut() || ev.i < Math.ceil(ev.n / 2))) { if (paper >= p.paperPerTelegram) { paper -= p.paperPerTelegram; paperSpent += p.paperPerTelegram; } else paperShort++; }
      });
      else packPaper.forEach(function (ev) { if (ev.t > a && ev.t <= b) spendPaper(ev.x); });
    }
    // «Збій СЕДО»: the player prints a paper copy if there is paper, else the stage runs at half speed for a while
    if (nDigital) sedos.forEach(function (sd) {
      if (sd.state == null && sd.t > a && sd.t <= b) {
        var ids = Object.keys(digital); sd.id = ids[Math.floor(sd.pick * ids.length)];
        sd.state = spendPaper(p.sedoPrintPaper) ? 'printed' : 'fail';
      }
    });
    if (paper < paperMin) paperMin = paper;
  }
  // what the player does when in the game
  function act(t, x) {
    if (scenario.starter && starterDue && !starterDone && p.starterSignatures > 0) {
      starterDone = true; out.starterAt = t; st.sig += p.starterSignatures;
      if (p.starterFuelHours > 0) fuelSec = p.starterFuelHours * H;
    }
    for (var i = 0; i < insps.length; i++) {
      var q = insps[i];
      if (q.ann > t) break;
      if (q.done || q.paid || q.arr <= t) continue;
      if (scenario.ads) { q.paid = true; q.how = scenario.paid ? 'take' : 'ad'; } // «Усе за рекламу» / «Забрати все», once per inspection
      else if (st.sig >= q.cost) { st.sig -= q.cost; q.paid = true; q.how = 'sig'; }
    }
    if (race && t < race.actEnd) {
      if (!race.digUsed && prestigeTotal >= 1 && p.raceDigitalCutH > 0) { race.digUsed = true; race.actEnd = Math.max(t, race.actEnd - p.raceDigitalCutH * H); }
      if (scenario.ads) {
        var dd = calDay(t); if (dd !== raceAdDay) { raceAdDay = dd; raceAdUsed = 0; }
        while (t < race.actEnd && raceAdUsed < p.raceAdPerDay && raceAdSession < p.raceAdPerSession) { race.actEnd = t + (race.actEnd - t) * p.raceAdCut; race.ads++; raceAdUsed++; raceAdSession++; }
      }
      settleRace(t);
    }
    if (p.archiveBonusMin > 0 && playSec === p.archiveBonusAtSec) { var ab = p.archiveBonusMin * baseInc(); st.sig += ab; st.life += ab; out.archive = ab; }
    if (p.catBonusMin > 0 && playSec >= p.catFromSec && t - lastCat >= p.catCooldownMin * 60) { var cb = p.catBonusMin * baseInc(); st.sig += cb; st.life += cb; lastCat = t; out.cats++; }
  }
  var playSec = 0, lastCat = -Infinity;
  // the sessions: the daily ones plus a short visit on the push 2 h before an inspection that no session would catch
  var sess = starts.map(function (t) { return { t: t, visit: false }; });
  if (p.inspPushVisit > 0) insps.forEach(function (q) {
    var caught = starts.some(function (t) { return t >= q.ann && t < q.arr; });
    if (!caught) sess.push({ t: Math.max(q.ann, q.arr - 2 * H), visit: true });
  });
  sess.sort(function (x, y) { return x.t - y.t; });
  out.visits = sess.filter(function (x) { return x.visit; }).length;

  var tPrev = 0, nextSample = 0, every = 1800, adDay = -1, adUsed = 0, tEnd = p.days * day;
  for (var si = 0; si < sess.length && !ended; si++) {
    var t0 = sess[si].t;
    var len = sess[si].visit ? Math.max(1, Math.round(p.inspPushVisit * 60)) : (si === 0 ? p.firstSessionMin : p.sessionMin) * 60;
    if (si > 0) {
      var gap = t0 - tPrev, fuelEnd = sess[si - 1].t + fuelSec * (1 - fuelThr);
      advance(tPrev, t0);
      var eff = Math.min(gap, storSec()), a0 = tPrev, a1 = tPrev + eff;
      var idleInc = flow(st.sl, st.gl, true).v * mult() / 60;
      // offline income piece by piece: fuel runs out, slowdowns end, the storage fills up
      var cuts = [a0, a1];
      if (fuelEnd > a0 && fuelEnd < a1) cuts.push(fuelEnd);
      [slowByDay[Math.floor(a0 / day)], slowByDay[Math.floor(a0 / day) - 1]].forEach(function (evs5) {
        if (evs5) evs5.forEach(function (ev5) { if (ev5.end > a0 && ev5.end < a1) cuts.push(ev5.end); });
      });
      eventCuts(a0, a1, cuts);
      cuts.sort(function (x, y) { return x - y; });
      var got = 0;
      for (var c = 0; c + 1 < cuts.length; c++) {
        var x0 = cuts[c], x1 = cuts[c + 1];
        if (x1 <= x0) continue;
        var mid = (x0 + x1) / 2;
        got += flow(st.sl, st.gl, true, facAt(mid), sfacAt(mid)).v * mult() / 60 * (mid < fuelEnd || genOn(mid) ? fuelBonus : 1) * giftMult(mid) * inspMult(mid) * (x1 - x0);
      }
      if (idleInc > 0) { offlineTotal += gap; lostToStorage += gap - eff; }
      // an ad (or «Забрати» after the purchase) multiplies the offline income on the first N returns of a day
      var dNow = Math.floor(t0 / day);
      if (dNow !== adDay) { adDay = dNow; adUsed = 0; }
      if (scenario.ads && got > 0 && adUsed < p.offlineAdPerDay) { got *= p.offlineAdMult; adUsed++; }
      st.sig += got; st.life += got;
      var ni = nakIdx(); if (ni >= 0 && st.sm[ni]) addPaper(paperRate() * eff / 60);
      while (nextSample < t0) { series.push({ t: nextSample, ipm: idleInc * 60 * (nextSample < Math.min(fuelEnd, a1) ? fuelBonus : 1), prestige: prestigeTotal, level: level, paper: paper }); nextSample += every; }
    }
    if (si === 0) advance(-1, 0);
    raceAdSession = 0;
    maybePrestige(t0);
    var tapRate = sess[si].visit ? 0 : p.tapsPerSession / len;
    for (var x = 0; x < len; x++) {
      var t = t0 + x;
      if (x > 0) advance(t - 1, t);
      act(t, x);
      var fac = facAt(t);
      var fl = flow(st.sl, st.gl, false, fac, sfacAt(t));
      if (fl.sum <= fl.pipe) neck.streams++; else neck.stage[fl.which]++;
      var fuelNow = x < fuelSec * (1 - fuelThr) || genOn(t) ? fuelBonus : 1;
      var bird = p.onboardingBirdMin > 0 && playSec >= p.onboardingBirdStartSec && playSec < p.onboardingBirdStartSec + p.onboardingBirdMin * 60 ? p.onboardingBirdMult : 1;
      var evm = bird * giftMult(t) * inspMult(t);
      var g = (fl.v * mult() * fuelNow / 60 + tapRate * p.tapValue * mult() * (p.fuelOnTaps ? fuelNow : 1)) * evm;
      st.sig += g; st.life += g;
      addPaper(paperRate() / 60);
      playSec++;
      tryBuy(t);
      if (ended) { tEnd = t; series.push({ t: t, ipm: fl.v * mult() * fuelNow * evm, prestige: prestigeTotal, level: level, paper: paper }); break; }
      if (x === len - 1) maybePrestige(t);
      if (t >= nextSample) { series.push({ t: t, ipm: fl.v * mult() * fuelNow * evm, prestige: prestigeTotal, level: level, paper: paper }); nextSample += every; }
    }
    tPrev = t0 + len;
    if (paper < paperMin) paperMin = paper;
    if (ended || si === sess.length - 1 || Math.floor(sess[si + 1].t / day) > Math.floor(t0 / day)) paperByDay.push(Math.round(paper * 10) / 10);
  }
  settleRace(tEnd);
  var longest = { w: 0, t: 0, level: 1 };
  out.waits.forEach(function (w) { if (w.t > 3600 && w.w > longest.w) longest = w; });
  var byLevel = [];
  for (var bl = 0; bl < Math.max(2, p.levels.length); bl++) byLevel.push(0);
  out.prestiges.forEach(function (x) { byLevel[x.level - 1]++; });
  return {
    scenario: scenario, out: out, series: series, prestigeTotal: prestigeTotal,
    storageLostShare: offlineTotal ? lostToStorage / offlineTotal : 0,
    longestWait: longest.w, longestWaitAt: longest.t, longestWaitLevel: longest.level, neck: neck,
    level: level, digitizations: byLevel,
    stageNames: levelItems(p, nLevels).stages.map(function (x) { return x.name; }),
    finalStreams: st.sl.slice(), finalStages: st.gl.slice(),
    paper: { start: p.paperStart || 0, end: paper, min: paperMin, short: paperShort, spent: paperSpent, got: paperGot, byDay: paperByDay },
    endT: tEnd
  };
}

// waits: the longest one before the first digitization, and when a wait first runs past wallHours
function waitStats(r, wallHours) {
  var t1 = r.out.prestiges[0] ? r.out.prestiges[0].t : Infinity, first = 0, wallAt = null;
  r.out.waits.forEach(function (w) {
    if (w.t <= 3600) return;
    if (w.t <= t1 + 1 && w.w > first) first = w.w;
    if (wallAt === null && w.w > wallHours * 3600) wallAt = w.t - w.w;
  });
  return { first: first, wallAt: wallAt };
}

// stalls: no purchases while the points for a digitization pile up; the longest one before the first
// digitization and the longest one that starts before day `untilDay`
function stallStats(r, untilDay) {
  var t1 = r.out.prestiges[0] ? r.out.prestiges[0].t : Infinity, first = 0, until = 0, untilAt = null;
  r.out.stalls.forEach(function (s) {
    if (s.t <= t1 + 1 && s.w > first) first = s.w;
    if (s.t - s.w < untilDay * 86400 && s.w > until) { until = s.w; untilAt = s.t - s.w; }
  });
  return { first: first, until: until, untilAt: untilAt };
}

// v7 milestones in days (docs/levels-3-5.md §4.1): level entries, final inspections announced, the finale;
// per level: digitizations, the mean gap between them, the longest purchase wait (waits), the final inspection tries
function levelStats(r) {
  var D = 86400, o = r.out, s = { firstDig: o.prestiges[0] ? o.prestiges[0].t / D : null, levelAt: {}, bossAnn: {}, finale: o.finaleAt == null ? null : o.finaleAt / D, perLevel: {} };
  for (var k in o.levelAt) s.levelAt[k] = o.levelAt[k] / D;
  for (var k2 in o.bossAnn) s.bossAnn[k2] = o.bossAnn[k2] / D;
  var lv = {};
  o.prestiges.forEach(function (x) { (lv[x.level] = lv[x.level] || []).push(x.t); });
  for (var L in lv) {
    var ts = lv[L], from = o.levelAt[L] != null ? o.levelAt[L] : 0, gaps = [], prev = from;
    ts.forEach(function (t) { gaps.push(t - prev); prev = t; });
    var mw = 0;
    (o.waits || []).forEach(function (w) { if (w.level == L && w.t > 3600 && w.w > mw) mw = w.w; });
    s.perLevel[L] = { n: ts.length, gapAvg: gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length / D, gapMax: Math.max.apply(null, gaps) / D, longestWaitH: mw / 3600,
      bossTries: o.bosses.filter(function (b) { return b.level == L; }).length };
  }
  return s;
}

if (typeof module !== 'undefined') module.exports = { DEFAULTS: DEFAULTS, SCENARIOS: SCENARIOS, simulate: simulate, waitStats: waitStats, stallStats: stallStats, withDefaults: withDefaults, levelItems: levelItems, levelStats: levelStats, reachableLevels: reachableLevels };
