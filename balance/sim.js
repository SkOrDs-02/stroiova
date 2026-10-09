// Economy model for «Стройова» (v6): document streams feed one approval pipe.
// income = min(sum of stream output, narrowest pipe stage) × multipliers.
// v5 adds level 2 «Бригада», the generator fuel bonus, exact offline ad doubling and telegram slowdowns.
// v6 adds the events around the conveyor: the 20% fuel mark and fuel on taps, the onboarding «Пташка» and the
// archive bonus, Кіт Сейф, «Комбата шукають», scheduled inspections (checklist, ×3, failure), gifts and the race,
// the starter pack (paid scenario), the museum journals and paper as a tracked resource.
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
  // level 2 «Бригада»: the level 1 streams and stages come back with the multipliers applied,
  // plus one new stream and one new stage (given in level 1 units, the multipliers apply to them too)
  level2: {
    afterDigitizations: 3, // the n-th digitization on level 1 moves the player up; 0 = no level 2
    rateMult: 10, // output of streams and stages
    costMult: 5, // level prices and stream unlocks
    clerkMult: 1, // clerks
    stream: { id: 'nakazy', name: 'Накази по частині', rate: 60000, unlock: 3000000, cost: 1000000, growth: 1.16, manager: 6000000 },
    stage: { id: 'kazna', name: 'Казначейство', rate: 21, cost: 40, growth: 1.12, manager: 400 }
  },
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
  prestigeDivisor: 75000, // v5: 65 000
  prestigeExponent: 0.5,
  prestigeBonus: 0.02,
  prestigeMinPoints: 30,
  prestigeGrowth: 1, // v5: 0,8 — the next digitization waits for as many points as already earned
  prestigeStallHours: 4,
  prestigeStallShare: 0.2, // …if the digitization brings at least this share of the points already earned
  days: 21,
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
  // scheduled inspections (04), reputation «норма»; checklist price in minutes of base income at the announcement
  inspFirstAfterHours: 8,
  inspIntervalMinH: 24,
  inspIntervalMaxH: 48, // 0 = no inspections
  inspWarnMinH: 2,
  inspWarnMaxH: 3,
  inspChecklistMin: 129, // level 1: 19 + 6 + 4 + 11 + 89
  inspChecklistMinL2: 51, // level 2: 13 + 6 + 4 + 28
  inspMult: 3,
  inspHours: 2,
  inspFailMult: 0.5, // «Стройова частина» on a failed inspection
  inspFailHours: 1,
  inspPushVisit: 1, // minutes: the player opens the game on push № 3 (2 h before arrival) if no session falls between warning and arrival; 0 = never
  // gifts and the race (05, decision 30): service hours, act steps in hours (Акти, Комбат, Стройова, Фін.), the Казначейство step on level 2
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

// Fill a saved parameter set up to the current model. A preset saved before a mechanic existed
// gets it switched off, so it behaves exactly as when it was saved.
function withDefaults(params) {
  var base = JSON.parse(JSON.stringify(DEFAULTS));
  var src = JSON.parse(JSON.stringify(params || {}));
  if (src.prestigeStallHours == null) base.prestigeStallHours = 0; // v3
  if (src.prestigeStallShare == null) base.prestigeStallShare = 0.5; // v3, v4: fixed at a half
  if (src.level2 == null) base.level2.afterDigitizations = 0; // v3, v4
  if (src.offlineAdPerDay == null) { base.offlineAdPerDay = 99; base.offlineAdMult = 1.5; } // v3, v4: the average multiplier on every return
  if (src.fuelBonus == null) base.fuelBonus = 1;
  if (src.slowPerDayMax == null) { base.slowPerDayMin = 0; base.slowPerDayMax = 0; }
  if (src.giftOrder == null) { // v5 and older: none of the v6 events
    base.fuelBonusThreshold = 0; base.fuelOnTaps = 0; base.onboardingBirdMin = 0; base.archiveBonusMin = 0; base.catBonusMin = 0;
    base.kombatChance = 0; base.inspIntervalMaxH = 0; base.giftOrder = []; base.museum = 0; base.starterSignatures = 0; base.starterFuelHours = 0;
  }
  var l2 = src.level2;
  delete src.level2;
  for (var k in src) base[k] = src[k];
  if (l2) {
    for (var k2 in l2) if (k2 !== 'stream' && k2 !== 'stage') base.level2[k2] = l2[k2];
    if (l2.stream) for (var k3 in l2.stream) base.level2.stream[k3] = l2.stream[k3];
    if (l2.stage) for (var k4 in l2.stage) base.level2.stage[k4] = l2.stage[k4];
  }
  return base;
}

// streams and stages of a level; level 2 = level 1 plus the new ones, all scaled
function levelItems(p, level) {
  if (level === 1) return { streams: p.streams, stages: p.stages };
  var L = p.level2;
  function scale(x) {
    var y = {};
    for (var k in x) y[k] = x[k];
    y.rate = x.rate * L.rateMult; y.cost = x.cost * L.costMult; y.manager = x.manager * (L.clerkMult == null ? L.costMult : L.clerkMult);
    if (x.unlock != null) y.unlock = x.unlock * L.costMult;
    return y;
  }
  return { streams: p.streams.concat([L.stream]).map(scale), stages: p.stages.concat([L.stage]).map(scale) };
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
  var lv2On = p.level2 && p.level2.afterDigitizations > 0;
  var level = 1, items = levelItems(p, 1);
  var SR = items.streams, ST = items.stages;
  var adFrac = scenario.ads ? Math.min(p.adsPerDay * p.adHours, 24) / 24 : 0;
  var boost = (scenario.paid ? p.paidMult : 1) * (1 + adFrac);
  var fuelBonus = p.fuelBonus || 1, fuelSec = (p.fuelHours || 0) * 3600, fuelThr = p.fuelBonusThreshold || 0;
  var prestigeTotal = 0;
  var st;
  var out = { firstClerk: null, allStreams: null, level2At: null, prestiges: [], unlocks: [], purchases: 0, waits: [], stalls: [],
    insp: [], races: [], journals: {}, kombats: 0, cats: 0, archive: 0, starterAt: null };
  var H = 3600, day = 86400, clock0 = (p.dayStartHour || 0) * H;
  function localH(t) { return ((clock0 + t) % day + day) % day / H; }
  function calDay(t) { return Math.floor((clock0 + t) / day); }
  function atLocal(d, hour) { return d * day + hour * H - clock0; }

  // museum (07): journal number → time it came
  var J = {};
  function jm() { return J[8] ? 2 : 1; }
  function grant(n, t) {
    if (!p.museum || J[n]) return;
    J[n] = t; out.journals[n] = t;
    var k = 0; for (var i = 1; i <= 7; i++) if (J[i]) k++;
    if (k === 7 && !J[8]) { J[8] = t; out.journals[8] = t; }
  }
  function musU(item) {
    if (!p.museum) return 1;
    var b = p.museumUnitPct / 100 * jm();
    if ((item.id === 'stroy' && J[1]) || (item.id === 'nakladni' && J[4]) || (item.id === 'raporty' && J[5])) return 1 + b;
    return 1;
  }
  function capU(item, L) { return capAt(item, L, p) * musU(item); }
  function storSec() { return p.storageHours * 3600 * (J[2] ? 1 + p.museumStoragePct / 100 * jm() : 1); }

  // paper (01 FR-22): a counter beside the conveyor
  var paper = p.paperStart || 0, paperMin = paper, paperShort = 0, paperSpent = 0, paperGot = 0, paperByDay = [];
  function paperMult() { return J[3] ? 1 + p.museumPaperPct / 100 * jm() : 1; }
  function addPaper(x) { x *= paperMult(); paper += x; paperGot += x; }
  function nakIdx() { for (var i = 0; i < SR.length; i++) if (SR[i].id === 'nakladni') return i; return -1; }
  function paperRate() { var i = nakIdx(); return i >= 0 && st.sl[i] > 0 ? st.sl[i] * (p.paperPerMinPerLevel || 0) * paperMult() : 0; } // sheets a minute
  var series = [];
  var lostToStorage = 0, offlineTotal = 0, lastBuy = 0;
  var nStages = p.stages.length + (lv2On ? 1 : 0);
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
  }
  reset();

  function mult() { return boost * (1 + p.prestigeBonus * prestigeTotal); }
  function unlockedStreams() { var k = 0; for (var i = 0; i < SR.length; i++) if (st.sl[i] > 0) k = i + 1; return k; }
  // fac: optional per-stage slowdown (telegrams); the bot plans without it
  function flow(sl, gl, idle, fac) {
    var sum = 0;
    for (var i = 0; i < SR.length; i++) if (sl[i] > 0 && (!idle || st.sm[i])) sum += capU(SR[i], sl[i]);
    var pipe = Infinity, which = -1;
    for (var j = 0; j < ST.length; j++) {
      var c = (!idle || st.gm[j]) ? capU(ST[j], gl[j]) : 0;
      if (fac) c *= fac[j];
      if (c < pipe) { pipe = c; which = j; }
    }
    return { sum: sum, pipe: pipe, which: which, v: Math.min(sum, pipe) };
  }
  function ipm(idle) { return flow(st.sl, st.gl, idle).v * mult(); }
  // «базовий дохід» (01 FR-31): no temporary multipliers, no event factors; prices and rewards «in minutes of income» use it
  function baseInc() { return flow(st.sl, st.gl, false).v * (1 + p.prestigeBonus * prestigeTotal) * (scenario.paid ? p.paidMult : 1); }
  function points(life) { return Math.floor(Math.pow(life / p.prestigeDivisor, p.prestigeExponent)); }

  function options() {
    var opts = [];
    // clerks first: without them the conveyor stops when the player leaves
    for (var i = 0; i < SR.length; i++) if (st.sl[i] > 0 && !st.sm[i]) opts.push({ kind: 'clerkS', i: i, cost: SR[i].manager, pay: -1 });
    for (var j = 0; j < ST.length; j++) if (!st.gm[j]) opts.push({ kind: 'clerkG', i: j, cost: ST[j].manager, pay: -1 });
    var cur = flow(st.sl, st.gl, false).v;
    for (var a = 0; a < SR.length; a++) {
      if (st.sl[a] === 0 && (a === 0 || st.sl[a - 1] > 0)) {
        var sl1 = st.sl.slice(); sl1[a] = 1;
        var n1 = flow(sl1, st.gl, false).v, c1 = priceAt(SR[a], 0) + SR[a].manager;
        // a new stream behind a narrow pipe adds nothing now, but it is the gate to the next level: rank it by its own output
        var gain1 = Math.max(n1 - cur, capU(SR[a], 1) * 0.25);
        opts.push({ kind: 'unlock', i: a, cost: c1, pay: c1 / gain1 });
      } else if (st.sl[a] > 0) {
        var sl2 = st.sl.slice(); sl2[a]++;
        var n2 = flow(sl2, st.gl, false).v, c2 = priceAt(SR[a], st.sl[a]);
        opts.push({ kind: 'stream', i: a, to: st.sl[a] + 1, cost: c2, pay: n2 > cur ? c2 / (n2 - cur) : Infinity });
        // look ahead to the next milestone: players buy up to the ×2 jump
        var goal = (Math.floor(st.sl[a] / p.milestoneEvery) + 1) * p.milestoneEvery;
        if (goal - st.sl[a] > 1) {
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
          var dv = capU(SR[k], sl6[k] + 1) - capU(SR[k], sl6[k]), pr = priceAt(SR[k], sl6[k]);
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
  }

  function tryBuy(t) {
    for (var guard = 0; guard < 300; guard++) {
      var opts = options();
      var best = opts[0];
      if (!best || !isFinite(best.cost) || best.pay === Infinity) return;
      if (best.cost <= st.sig) { apply(best, t); continue; }
      if (best.pay < 0) return; // saving for a clerk
      var tBest = (best.cost - st.sig) / Math.max(ipm(false), 1e-9);
      var took = false;
      for (var q = 1; q < opts.length; q++) {
        var o = opts[q];
        if (o.cost <= st.sig && isFinite(o.pay) && o.pay >= 0 && o.pay < tBest) { apply(o, t); took = true; break; }
      }
      if (!took) return;
    }
  }

  // the player sees "next purchase in N hours": stuck that long, they digitize with fewer points
  function stuck() {
    var best = options()[0];
    if (!best || !isFinite(best.pay)) return true;
    if (best.cost <= st.sig) return false;
    return (best.cost - st.sig) / Math.max(ipm(false), 1e-9) / 60 >= p.prestigeStallHours;
  }
  function maybePrestige(t) {
    if (unlockedStreams() < SR.length) return;
    var pts = points(st.life);
    var need = Math.max(p.prestigeMinPoints, p.prestigeGrowth * prestigeTotal);
    var share = p.prestigeStallShare == null ? 0.5 : p.prestigeStallShare;
    if (pts < need && p.prestigeStallHours > 0 && pts >= Math.max(p.prestigeMinPoints, share * prestigeTotal) && stuck()) need = pts;
    if (pts >= need && pts > 0) {
      prestigeTotal += pts;
      out.prestiges.push({ t: t, points: pts, total: prestigeTotal, level: level });
      if (level === 1) {
        var nL1 = 0; out.prestiges.forEach(function (x) { if (x.level === 1) nL1++; });
        if (nL1 === 1) { grant(1, t); grant(2, t); grant(3, t); firstDigT = t; }
        if (nL1 === 2) { grant(4, t); grant(5, t); }
      }
      // the stretch without purchases right before a digitization (waiting for points) is kept apart from purchase waits
      if (t > lastBuy) out.stalls.push({ t: t, w: t - lastBuy, level: level });
      // digital points carry over; the n-th digitization on level 1 opens «Бригада»
      if (level === 1 && lv2On && out.prestiges.length >= p.level2.afterDigitizations) {
        level = 2; out.level2At = t;
        items = levelItems(p, 2); SR = items.streams; ST = items.stages;
      }
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
  function slowAt(t) {
    var fac = null, d3 = Math.floor(t / day);
    for (var back = 0; back < 2; back++) {
      var evs3 = slowByDay[d3 - back];
      if (!evs3) continue;
      for (var e4 = 0; e4 < evs3.length; e4++) {
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
  // «Комбата шукають»: at a session start (not the first), at most once a calendar day
  var kombats = [], kDay = -1;
  if (p.kombatChance > 0) for (var sk = 1; sk < starts.length; sk++) {
    var dk = calDay(starts[sk]);
    if (dk === kDay) continue;
    if (randK() < p.kombatChance) { kDay = dk; kombats.push({ t: starts[sk], end: starts[sk] + (p.kombatMinMin + randK() * (p.kombatMaxMin - p.kombatMinMin)) * 60 }); }
  }
  out.kombats = kombats.length;
  // scheduled inspections, reputation «норма»: the schedule does not depend on the player
  var insps = [];
  if (p.inspIntervalMaxH > 0) {
    var arrWindow = function (t) { // arrival only 10:00–21:00, else 10:00 + 0–60 min
      var h = localH(t);
      if (h >= 10 && h < 21) return t;
      return atLocal(calDay(t) + (h >= 21 ? 1 : 0), 10) + Math.floor(randI() * 60) * 60;
    };
    var warn = function () { return Math.round((p.inspWarnMinH + randI() * (p.inspWarnMaxH - p.inspWarnMinH)) * 60) * 60; };
    var s0 = null;
    for (var si0 = 0; si0 < starts.length; si0++) { var h0 = localH(starts[si0]); if (starts[si0] >= p.inspFirstAfterHours * H && h0 >= 8 && h0 < 19) { s0 = starts[si0]; break; } }
    if (s0 != null) {
      var arr = arrWindow(s0 + warn());
      insps.push({ ann: s0, arr: arr });
      for (var gi = 0; gi < 200; gi++) {
        arr = arrWindow(arr + (p.inspIntervalMinH + randI() * (p.inspIntervalMaxH - p.inspIntervalMinH)) * H);
        if (arr > p.days * day) break;
        insps.push({ ann: arr - warn(), arr: arr });
      }
    }
    insps.forEach(function (q, i) { q.n = i + 1; q.cost = null; q.paid = false; q.how = null; q.done = false; });
  }
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
    var steps = g.steps.slice(); if (level === 2) steps.push(p.giftL2StepH);
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
    return 1;
  }
  // slowdowns from telegrams, «Комбата шукають» and a failed inspection
  function facAt(t) {
    var fac = slowAt(t);
    function mul(id, m) { var j = stageIdx(id); if (j < 0) return; if (!fac) { fac = []; for (var j2 = 0; j2 < ST.length; j2++) fac.push(1); } fac[j] *= m; }
    for (var i = 0; i < kombats.length; i++) { if (kombats[i].t > t) break; if (t < kombats[i].end) mul('kombat', p.kombatMult); }
    for (var q = 0; q < insps.length; q++) { var ins = insps[q]; if (ins.arr > t) break; if (ins.done && !ins.paid && t < ins.arr + p.inspFailHours * H) mul('stroy', p.inspFailMult); }
    return fac;
  }
  // every rate change inside (a0, a1), to cut the offline stretch
  function eventCuts(a0, a1, cuts) {
    function add(x) { if (x > a0 && x < a1) cuts.push(x); }
    kombats.forEach(function (k) { add(k.t); add(k.end); });
    insps.forEach(function (q) { add(q.arr); add(q.arr + p.inspHours * H); add(q.arr + p.inspFailHours * H); });
    races.forEach(function (r) { add(r.actEnd); add(r.svcEnd); });
  }
  var slowList = []; slowByDay.forEach(function (evs) { evs.forEach(function (ev) { slowList.push(ev.t); }); });
  // discrete events in (a, b]; between sessions the state is frozen, so this also works offline
  function advance(a, b) {
    settleRace(b);
    var c = giftTime(a, b);
    if (c != null) { startRace(c); settleRace(b); }
    for (var i = 0; i < insps.length; i++) {
      var q = insps[i];
      if (q.ann > b) break;
      if (q.cost == null) { q.level = level; q.cost = Math.max(50, Math.ceil((level === 2 ? p.inspChecklistMinL2 : p.inspChecklistMin) * baseInc())); }
      if (!q.done && q.arr <= b) {
        q.done = true;
        out.insp.push({ n: q.n, ann: q.ann, arr: q.arr, pass: q.paid, how: q.how, cost: q.cost, level: q.level });
        if (q.paid && firstDigT != null && firstDigT < q.arr) grant(7, q.arr);
        if (q.n === 1) starterDue = true;
      }
    }
    if (p.museum && firstDigT != null && !J[6] && firstDigT + p.museumJ6DelayHours * H <= b) grant(6, firstDigT + p.museumJ6DelayHours * H);
    // a diligent telegram costs paper; with too little the player would have to pick another answer
    if (p.paperPerTelegram > 0) slowList.forEach(function (ts) {
      if (ts > a && ts <= b) { if (paper >= p.paperPerTelegram) { paper -= p.paperPerTelegram; paperSpent += p.paperPerTelegram; } else paperShort++; }
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

  var tPrev = 0, nextSample = 0, every = 1800, adDay = -1, adUsed = 0;
  for (var si = 0; si < sess.length; si++) {
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
        got += flow(st.sl, st.gl, true, facAt(mid)).v * mult() / 60 * (mid < fuelEnd || genOn(mid) ? fuelBonus : 1) * giftMult(mid) * inspMult(mid) * (x1 - x0);
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
      var fl = flow(st.sl, st.gl, false, fac);
      if (fl.sum <= fl.pipe) neck.streams++; else neck.stage[fl.which]++;
      var fuelNow = x < fuelSec * (1 - fuelThr) || genOn(t) ? fuelBonus : 1;
      var bird = p.onboardingBirdMin > 0 && playSec >= p.onboardingBirdStartSec && playSec < p.onboardingBirdStartSec + p.onboardingBirdMin * 60 ? p.onboardingBirdMult : 1;
      var evm = bird * giftMult(t) * inspMult(t);
      var g = (fl.v * mult() * fuelNow / 60 + tapRate * p.tapValue * mult() * (p.fuelOnTaps ? fuelNow : 1)) * evm;
      st.sig += g; st.life += g;
      addPaper(paperRate() / 60);
      playSec++;
      tryBuy(t);
      if (x === len - 1) maybePrestige(t);
      if (t >= nextSample) { series.push({ t: t, ipm: fl.v * mult() * fuelNow * evm, prestige: prestigeTotal, level: level, paper: paper }); nextSample += every; }
    }
    tPrev = t0 + len;
    if (paper < paperMin) paperMin = paper;
    if (si === sess.length - 1 || Math.floor(sess[si + 1].t / day) > Math.floor(t0 / day)) paperByDay.push(Math.round(paper * 10) / 10);
  }
  settleRace(p.days * day);
  var longest = { w: 0, t: 0, level: 1 };
  out.waits.forEach(function (w) { if (w.t > 3600 && w.w > longest.w) longest = w; });
  var byLevel = [0, 0];
  out.prestiges.forEach(function (x) { byLevel[x.level - 1]++; });
  return {
    scenario: scenario, out: out, series: series, prestigeTotal: prestigeTotal,
    storageLostShare: offlineTotal ? lostToStorage / offlineTotal : 0,
    longestWait: longest.w, longestWaitAt: longest.t, longestWaitLevel: longest.level, neck: neck,
    level: level, digitizations: byLevel,
    stageNames: levelItems(p, lv2On ? 2 : 1).stages.map(function (x) { return x.name; }),
    finalStreams: st.sl.slice(), finalStages: st.gl.slice(),
    paper: { start: p.paperStart || 0, end: paper, min: paperMin, short: paperShort, spent: paperSpent, got: paperGot, byDay: paperByDay }
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

if (typeof module !== 'undefined') module.exports = { DEFAULTS: DEFAULTS, SCENARIOS: SCENARIOS, simulate: simulate, waitStats: waitStats, stallStats: stallStats, withDefaults: withDefaults, levelItems: levelItems };
