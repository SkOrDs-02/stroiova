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
// v7.1 (decisions 35, 38, 41): the player without ads gets one free offline ×N a day on the longest return of the day;
// «Звести в одну відповідь» has its own price (a stronger, longer «Нарада» slowdown) and the bot picks per pack (merge 2);
// eventStats() counts the content moments (sessions, telegrams, pushes, inspections, races…) per level for the content budget.
// v7.2 (spec 016, decision 44): the museum of 24 journals (museum 2). № 9–24 come from the digitizations of Р2–Р4, the final
// inspections, the Р4 story telegram (the «Аудит усього» announcement), the conversions № 2, 4, 5 and the finale; their
// bonuses go through the systems the model already has (stream and stage output, telegram slowdowns, checklist price,
// the race, gift service, conversion price); series 2–5 give +museumSeriesPct % each to all income; № 24 multiplies
// the bonuses of № 9–23. museum 1 keeps the 8 journals of 07, so older presets give the same results.
// Pure functions, no DOM, deterministic (seeded random); the sandbox page embeds this file as is.
// v7.2+ (spec 001, decision 52, principle II): the parameters and the formulas live in the economy module of the game
// (src/economy/core), built into balance/economy.js; this file keeps the bot, the scenarios and the events.
var E = typeof StroiovaEconomy !== 'undefined' ? StroiovaEconomy : require('./economy.js');
var DEFAULTS = E.DEFAULTS, SCENARIOS = E.SCENARIOS, LEGACY = E.LEGACY;
var copyInto = E.copyInto, withDefaults = E.withDefaults, reachableLevels = E.reachableLevels, levelItems = E.levelItems;
var capAt = E.capAt, priceAt = E.priceAt;

function simulate(p, scenario) {
  var p0 = p, dubN = 0; // v7.4 (013 FR-23…FR-27): `p.dubs` > 0 plays the loop «Дубль N» after the finale; p0 is the original, p the scaled one
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
    levelAt: { 1: 0 }, bossAnn: {}, bosses: [], conversions: [], finaleAt: null, zpzShare: {}, dubs: [], dubLevelAt: {},
    sessions: [], returns: [], telegrams: [], packs: [], pushes: [], naradaAt: [], sedoAt: [], kombatAt: [], earned: {}, earned0: { 1: 0 } }; // v7.1: content counters
  var H = 3600, day = 86400, clock0 = (p.dayStartHour || 0) * H;
  function localH(t) { return ((clock0 + t) % day + day) % day / H; }
  function calDay(t) { return Math.floor((clock0 + t) / day); }
  function atLocal(d, hour) { return d * day + hour * H - clock0; }
  var buyVer = 0, buyCache = null; // the bot's decision depends only on the state and the signatures (see tryBuy)

  // museum (07): journal number → time it came
  var J = {};
  function jm() { return J[8] ? 2 : 1; }
  // v7.2 (016): journals № 9–24 and series 2–5 (museum 2); m24 collects their times and the effects for the report
  var M24 = p.museum >= 2, SERIES = { 2: [9, 10, 11, 12], 3: [13, 14, 15, 16], 4: [17, 18, 19, 20], 5: [21, 22, 23, 24] }, seriesDone = 0;
  if (M24) out.m24 = { series: {}, checklistSaved: 0, convertSaved: 0, kaznaCutSec: 0, giftExtraSec: 0, clerkAt: [], catAt: [], zpzHalfAt: null, zpzHalfOthersAt: null, clerksAllR3At: null };
  function k24() { return J[24] != null ? p.museumLegendaryMult : 1; }
  function grant(n, t) {
    if (!p.museum || J[n]) return;
    if (n > 8 && !M24) return;
    J[n] = t; out.journals[n] = t; buyVer++;
    var k = 0; for (var i = 1; i <= 7; i++) if (J[i]) k++;
    if (k === 7 && !J[8]) { J[8] = t; out.journals[8] = t; }
    if (M24 && n > 8) for (var sN in SERIES) if (out.m24.series[sN] == null && SERIES[sN].every(function (j) { return J[j] != null; })) { out.m24.series[sN] = t; seriesDone++; }
  }
  var U24 = { nakazy: 9, kazna: 10, akty: 13, zvedennia: 15, dovidky: 17, dopovid: 18, fin: 22 }; // museumUnitPct; № 16 «Нарада» museumUnitRarePct
  function musU(item) {
    if (!p.museum) return 1;
    var b = p.museumUnitPct / 100 * jm();
    if (!M24) {
      if ((item.id === 'stroy' && J[1]) || (item.id === 'nakladni' && J[4]) || (item.id === 'raporty' && J[5])) return 1 + b;
      return 1;
    }
    var x = 0, u = p.museumUnitPct / 100 * k24();
    if ((item.id === 'stroy' && J[1]) || (item.id === 'nakladni' && J[4]) || (item.id === 'raporty' && J[5])) x += b;
    if (U24[item.id] && J[U24[item.id]] != null) x += u;
    if (item.id === 'narada' && J[16] != null) x += p.museumUnitRarePct / 100 * k24();
    if (J[21] != null && nDigital && digital[item.id] != null) x += u; // № 21: every digital stage
    return 1 + x;
  }
  function zMus() { return M24 && J[19] != null ? 1 + p.museumUnitPct / 100 * k24() : 1; } // № 19: «Звіти про звіти» after the share formula
  function mSeries() { return M24 ? 1 + seriesDone * p.museumSeriesPct / 100 : 1; }
  function cut(n, pct) { return M24 && J[n] != null ? 1 - pct / 100 * k24() : 1; } // № 11, 12, 14, 23
  // № 11: a telegram slowdown that starts after the journal lasts less, rounded up to a minute; the «Зведення б'ється» buff is not a slowdown
  function slEnd(ev) {
    if (!M24 || J[11] == null || J[11] > ev.t || ev.stream) return ev.end;
    return ev.t + Math.ceil((ev.end - ev.t) * cut(11, p.museumSlowCutPct) / 60) * 60;
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

  function mult() { return M24 ? boost * E.prestigeMult(prestigeTotal, p) * mSeries() : boost * E.prestigeMult(prestigeTotal, p); }
  function unlockedStreams() { var k = 0; for (var i = 0; i < SR.length; i++) if (st.sl[i] > 0) k = i + 1; return k; }
  // fac: optional per-stage slowdown (telegrams); sfac: per-stream factors (Р3 «Зведення б'ється»); the bot plans without them
  function flow(sl, gl, idle, fac, sfac) {
    var S = [], G = [];
    for (var i = 0; i < SR.length; i++) {
      var on = sl[i] > 0 && (!idle || st.sm[i]);
      if (SR[i].share) {
        var zf = []; if (M24) zf.push(zMus()); if (sfac) zf.push(sfac[i]);
        S.push({ cap: 0, on: on, share: { base: on ? zShare(sl[i]) : 0, factors: zf } });
      } else {
        var c0 = 0; if (on) { c0 = capU(SR[i], sl[i]); if (sfac) c0 *= sfac[i]; }
        S.push({ cap: c0, on: on });
      }
    }
    for (var j = 0; j < ST.length; j++) {
      var c = (!idle || st.gm[j]) ? capU(ST[j], gl[j]) : 0;
      if (fac) c *= fac[j];
      G.push({ cap: c, on: true });
    }
    return E.flow(S, G);
  }
  // what one stream alone gives at level L (the share stream: its part of the others in `sl`)
  function othersSum(sl) { var s = 0; for (var i = 0; i < SR.length; i++) if (!SR[i].share && sl[i] > 0) s += capU(SR[i], sl[i]); return s; }
  function zpzIdx() { for (var i = 0; i < SR.length; i++) if (SR[i].share) return i; return -1; }
  function zpzShareNow() { var i = zpzIdx(); if (i < 0) return 0; var s = zShare(st.sl[i]); return s / (1 + s); }
  function ipm(idle) { return flow(st.sl, st.gl, idle).v * mult(); }
  // «базовий дохід» (01 FR-31): no temporary multipliers, no event factors; prices and rewards «in minutes of income» use it
  function baseInc() { var b0 = flow(st.sl, st.gl, false).v * E.prestigeMult(prestigeTotal, p) * (scenario.paid ? p.paidMult : 1); return M24 ? b0 * mSeries() : b0; }
  function points(life) { return E.points(life, B.prestigeDivisor, p); }

  // the final inspection of the level and the Р5 conversions: the bot saves for them before anything else
  var boss = null, bossPassed = false, bossPending = false, convCost = null;
  function bossNeedsZpz() { return boss && !boss.done && boss.mech === 'zpz' && zpzShareNow() < p.boss.zpzMin; }
  function convOpen() { // the next conversion is open on this level
    if (!B.convert || nDigital >= ST.length) return false;
    var nL = 0; out.prestiges.forEach(function (x) { if (x.level === level && x.dub === dubN) nL++; });
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
        var own1 = SR[a].share ? zShare(1) * othersSum(st.sl) * zMus() : capU(SR[a], 1);
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
          var dv = SR[k].share ? (zShare(sl6[k] + 1) - zShare(sl6[k])) * othersSum(sl6) * zMus() : capU(SR[k], sl6[k] + 1) - capU(SR[k], sl6[k]), pr = priceAt(SR[k], sl6[k]);
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
    if (M24) track(o, t);
    if (t > lastBuy) out.waits.push({ t: t, w: t - lastBuy, level: level });
    lastBuy = t;
    buyVer++;
  }

  // v7.2: counters for the awards check (016): clerks hired, «Звіти про звіти» ≥ 50%, full staff on Р3
  function track(o, t) {
    var m = out.m24;
    if (o.kind === 'clerkS' || o.kind === 'clerkG' || o.kind === 'unlock') m.clerkAt.push(t);
    var zi = zpzIdx();
    if (zi >= 0 && st.sl[zi] > 0) {
      var s0 = zShare(st.sl[zi]) * zMus();
      if (m.zpzHalfAt == null && s0 / (1 + s0) >= 0.5) m.zpzHalfAt = t; // share of all streams
      if (m.zpzHalfOthersAt == null && s0 >= 0.5) m.zpzHalfOthersAt = t; // share of the other streams (the counter note)
    }
    if (level === 3 && m.clerksAllR3At == null && st.sm.every(function (x, i) { return x || SR[i].share; }) && st.gm.every(function (x) { return x; })) m.clerksAllR3At = t;
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
      if (convCost == null) {
        var cc = p.convert.costMin * baseInc();
        if (M24 && J[23] != null) { var cc2 = cc * cut(23, p.museumConvertCutPct); out.m24.convertSaved += (cc - cc2) / Math.max(baseInc(), 1e-9); cc = cc2; }
        convCost = Math.max(50, Math.ceil(cc));
      }
      if (st.sig < convCost) return 0;
      st.sig -= convCost;
      var id = p.convert.order[nDigital] || ST[nDigital].id;
      digital[id] = t; nDigital++; buyVer++;
      out.conversions.push({ t: t, id: id, cost: convCost, n: nDigital });
      convCost = null;
      if (M24) { if (nDigital === 2) grant(21, t); if (nDigital === 4) grant(22, t); if (nDigital === 5) grant(23, t); if (nDigital >= ST.length) grant(24, t); } // № 24: «Остання книга» of the finale
      if (nDigital >= ST.length) return finishRun(t);
      return priorityBuys(t);
    }
    return 0;
  }

  // v7.4: scaled parameters of Дубль N (013 FR-25): rateMult, costMult (and clerks) × dup.mult^N, the points divisor × dup.divisorMult^N;
  // the exit from Р1–Р4 is dup.exitDigitizations digitizations (+ the final inspection on Р2–Р4); modifiers change the plain parameters
  function dubParams(N) {
    var D = p0.dup, q = JSON.parse(JSON.stringify(p0)), pw = Math.pow(D.mult, N), dw = Math.pow(D.divisorMult, N);
    q.levels = p0.levels.map(function (L, i) {
      var c = JSON.parse(JSON.stringify(L));
      c.rateMult = L.rateMult * pw; c.costMult = L.costMult * pw;
      if (L.clerkMult != null) c.clerkMult = L.clerkMult * pw;
      c.prestigeDivisor = L.prestigeDivisor * dw;
      if (L.exitDigitizations > 0) c.exitDigitizations = D.exitDigitizations;
      return c;
    });
    return q;
  }
  function finishRun(t) {
    if (dubN === 0) out.finaleAt = t;
    out.dubs.push({ n: dubN, end: t, digitizations: out.prestiges.filter(function (x) { return x.dub === dubN; }).length });
    if (p0.dubs > 0 && dubN < p0.dubs && p0.dup) { // «Прийняти до виконання»: the loop starts at once (the quiet week is not modelled)
      dubN++; p = dubParams(dubN); fuelBonus = p.fuelBonus || 1;
      level = 1; B = p.levels[0]; items = levelItems(p, 1); SR = items.streams; ST = items.stages;
      boss = null; bossPassed = false; bossPending = false; convCost = null; digital = {}; nDigital = 0;
      out.dubLevelAt[dubN] = { 1: t };
      reset(); lastBuy = t;
      return 0;
    }
    ended = true;
    return Infinity;
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
    if (dubN === 0) out.earned[level] = earned - (out.earned0[level] || 0);
    level++;
    if (dubN === 0) { out.levelAt[level] = t; out.earned0[level] = earned; } else out.dubLevelAt[dubN][level] = t;
    if (level === 2 && dubN === 0) out.level2At = t;
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
      out.prestiges.push({ t: t, points: pts, total: prestigeTotal, level: level, dub: dubN });
      var nL = 0; out.prestiges.forEach(function (x) { if (x.level === level && x.dub === dubN) nL++; });
      if (level === 1) {
        if (nL === 1) { grant(1, t); grant(2, t); grant(3, t); firstDigT = t; }
        if (nL === 2) { grant(4, t); grant(5, t); }
      }
      if (M24) { // 016 FR-5, FR-6: the digitization counts on the level the player leaves
        if (level === 2 && nL <= 3) grant(8 + nL, t); // № 9, 10, 11
        if (level === 3 && (nL === 1 || nL === 2 || nL === 4)) grant(nL === 4 ? 15 : 12 + nL, t); // № 13, 14, 15
        if (level === 4 && (nL === 1 || nL === 3)) grant(nL === 1 ? 17 : 18, t); // № 17, 18
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
  // v7.3 (003): the bot answers a share of telegrams with a formal reply (no slowdown, no paper, reputation down);
  // reputation 0–100 is a step function of the telegram times, so it is known before the run like the slowdowns
  var repOn = p.repTiers > 0, repT = [], repV = [], replyList = [];
  if (repOn) {
    var randR = lcg((p.seed || 1) * 22695477 + 3);
    var allTg = []; slowByDay.forEach(function (evs) { evs.forEach(function (ev) { allTg.push(ev); }); });
    allTg.sort(function (x, y) { return x.t - y.t; });
    var R0 = p.repStart;
    allTg.forEach(function (ev) {
      ev.reply = randR() < (p.replyShare || 0);
      R0 = Math.min(100, Math.max(0, R0 + (ev.reply ? p.repReply : p.repDiligent)));
      repT.push(ev.t); repV.push(R0);
      if (ev.reply) replyList.push(ev);
    });
  }
  function repAt(t) { // reputation after every telegram answered by t
    if (!repOn) return null;
    var lo = 0, hi = repT.length; while (lo < hi) { var mid = (lo + hi) >> 1; if (repT[mid] <= t) lo = mid + 1; else hi = mid; }
    return lo ? repV[lo - 1] : p.repStart;
  }
  function tierAt(t) { var r = repAt(t); return r == null ? 'norm' : r < p.repLow ? 'low' : r >= p.repHigh ? 'high' : 'norm'; }
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
        if (!ev.reply && ev.t <= t && t < (M24 ? slEnd(ev) : ev.end)) {
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
  // Р3 packs: one pack a day at a random session (not the first one of the game) plus 0–1 single telegram.
  // A pack keeps both answers (M merged, S one by one) when the bot picks (merge 2); merge 0 and 1 fix the answer as in v7.
  var packEv = [], packPaper = [], packs = [], packSingles = [], randP = lcg((p.seed || 1) * 214013 + 2531011), randPx = lcg((p.seed || 1) * 16807 + 7);
  var hasPacks = p.levels.slice(0, nLevels).some(function (x) { return x.packs; });
  var mergeMode = p.pack.merge === 2 ? 2 : p.pack.merge ? 1 : 0;
  if (hasPacks) for (var dp = 0; dp < p.days; dp++) {
    var poolP = [];
    for (var sp = 0; sp < p.sessionsPerDay; sp++) if (dp > 0 || sp > 0) poolP.push(starts[dp * p.sessionsPerDay + sp]);
    for (var np = 0; np < (p.pack.perDay || 0) && poolP.length; np++) {
      var ip = Math.floor(randP() * poolP.length), tp = poolP[ip]; poolP.splice(ip, 1);
      var ppt = p.paperPerTelegram || 0;
      var pk = { t: tp, choice: mergeMode === 2 ? null : mergeMode ? 'M' : 'S', M: [], S: [] };
      // one answer for all three: one slowdown on «Нарада», «Зведення б'ється»
      pk.M.push({ t: tp, end: tp + p.pack.slowHours * H, stage: 'narada', m: p.pack.slowMult, pk: pk, opt: 'M' });
      pk.M.push({ t: tp, end: tp + p.pack.summaryBuffHours * H, stream: 'zvedennia', m: p.pack.summaryBuff, pk: pk, opt: 'M' });
      // one by one: the picks come from randP as in v7; with merge 1 they are only a what-if for the statistics (own generator)
      for (var ix = 0; ix < p.pack.size; ix++) pk.S.push({ t: tp, end: tp + (p.slowHours || 0) * H, pick: mergeMode === 1 ? randPx() : randP(), m: p.slowMult, pk: pk, opt: 'S' });
      (mergeMode === 2 ? pk.M.concat(pk.S) : mergeMode ? pk.M : pk.S).forEach(function (ev) { packEv.push(ev); });
      packPaper.push({ t: tp, pk: pk, xM: p.pack.size * ppt - (p.pack.size - 1), xS: p.pack.size * ppt });
      packs.push(pk);
    }
    if (poolP.length && randP() < p.pack.singleChance) {
      var is = Math.floor(randP() * poolP.length), ts1 = poolP[is];
      packEv.push({ t: ts1, end: ts1 + (p.slowHours || 0) * H, pick: randP(), m: p.slowMult });
      packPaper.push({ t: ts1, x: p.paperPerTelegram || 0 });
      packSingles.push(ts1);
    }
  }
  // the bot's pick for a pack (merge 2): the answer that loses less conveyor output over the window at the current state;
  // a tie goes to the merged one (it saves paper). Other events are left out: they hit both answers alike.
  function packLoss(evs, t0, W) {
    var cuts = [t0, t0 + W];
    evs.forEach(function (ev) { var e0 = M24 ? slEnd(ev) : ev.end; if (e0 > t0 && e0 < t0 + W) cuts.push(e0); });
    cuts.sort(function (x, y) { return x - y; });
    var base = flow(st.sl, st.gl, true).v, loss = 0;
    for (var c = 0; c + 1 < cuts.length; c++) {
      var x0 = cuts[c], x1 = cuts[c + 1]; if (x1 <= x0) continue;
      var mid = (x0 + x1) / 2, fac = [], sf = [];
      for (var j = 0; j < ST.length; j++) fac.push(1);
      for (var k = 0; k < SR.length; k++) sf.push(1);
      evs.forEach(function (ev) {
        if (mid >= (M24 ? slEnd(ev) : ev.end)) return;
        if (ev.stream) { var si = streamIdx(ev.stream); if (si >= 0) sf[si] *= ev.m; }
        else { var jj = ev.stage ? stageIdx(ev.stage) : Math.floor(ev.pick * ST.length); if (jj >= 0) fac[jj] *= ev.m; }
      });
      if (nDigital) for (var j3 = 0; j3 < ST.length; j3++) if (digital[ST[j3].id] != null) fac[j3] = 1;
      loss += (base - flow(st.sl, st.gl, true, fac, sf).v) * (x1 - x0) / 60;
    }
    return { loss: loss * mult(), base: base * W / 60 * mult() };
  }
  function decidePack(pk) {
    if (!B.packs) { if (pk.choice == null) pk.choice = 'M'; return; }
    var W = Math.max(p.pack.slowHours, p.pack.summaryBuffHours, p.slowHours || 0) * H;
    var lM = packLoss(pk.M, pk.t, W), lS = packLoss(pk.S, pk.t, W);
    if (pk.choice == null) pk.choice = lM.loss <= lS.loss ? 'M' : 'S';
    out.packs.push({ t: pk.t, level: level, choice: pk.choice, lossM: lM.loss, lossS: lS.loss, base: lM.base, streams: unlockedStreams() + '/' + SR.length, slack: (function () { var f0 = flow(st.sl, st.gl, true); return f0.pipe > 0 ? Math.round(f0.sum / f0.pipe * 100) / 100 : null; })(),
      naradaRoom: (function () { var j = stageIdx('narada'), f0 = flow(st.sl, st.gl, true); return j >= 0 && f0.v > 0 ? Math.round(capU(ST[j], st.gl[j]) / f0.v * 100) / 100 : null; })() }); // slack: streams / pipe; naradaRoom: «Нарада» / income
  }
  function packFac(t, fac, sfac) {
    for (var i = 0; i < packEv.length; i++) {
      var ev = packEv[i];
      if (ev.t > t) break;
      if (t >= (M24 ? slEnd(ev) : ev.end)) continue;
      if (ev.pk && ev.pk.choice !== ev.opt) continue;
      if (ev.stream) { var si = streamIdx(ev.stream); if (si >= 0) sfac[si] *= ev.m; }
      else { var j = ev.stage ? stageIdx(ev.stage) : Math.floor(ev.pick * ST.length); if (j >= 0) fac[j] *= ev.m; }
    }
  }
  // scheduled inspections: the schedule does not depend on the player or reputation (decision 61)
  var insps = [];
  var arrWindow = function (t, rnd) { // arrival only inspArriveFromHour–inspArriveToHour, else the next window start + 0–inspArriveJitterMin min
    var h = localH(t);
    if (h >= p.inspArriveFromHour && h < p.inspArriveToHour) return t;
    return atLocal(calDay(t) + (h >= p.inspArriveToHour ? 1 : 0), p.inspArriveFromHour) + Math.floor(rnd() * p.inspArriveJitterMin) * 60;
  };
  if (p.inspIntervalMaxH > 0) {
    var warn = function () { return Math.round((p.inspWarnMinH + randI() * (p.inspWarnMaxH - p.inspWarnMinH)) * 60) * 60; };
    var s0 = null;
    for (var si0 = 0; si0 < starts.length; si0++) { var h0 = localH(starts[si0]); if (starts[si0] >= p.inspFirstAfterHours * H && h0 >= p.inspFirstFromHour && h0 < p.inspFirstToHour) { s0 = starts[si0]; break; } }
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
    // v7.3: a formal reply after the first scheduled inspection may bring an unscheduled one (no ×3, failure risk);
    // at most unscheduledPerDay a day, none while another inspection is announced (its checklist only grows)
    if (repOn && insps.length) {
      var randU = lcg((p.seed || 1) * 1103515245 + 12345), firstArr = insps[0].arr, uDay = {}, uns = [];
      replyList.forEach(function (ev) {
        if (ev.t < firstArr) return;
        var tr = tierAt(ev.t), k = tr === 'low' ? p.replyChanceLow : tr === 'high' ? p.replyChanceHigh : 1;
        var pr = Math.min(1, p.replyInspPct / 100 * k), dU = calDay(ev.t);
        if (randU() >= pr || (uDay[dU] || 0) >= p.unscheduledPerDay) return;
        var busy = insps.concat(uns).some(function (q) { return q.ann <= ev.t && ev.t < q.arr; });
        if (busy) return;
        uDay[dU] = (uDay[dU] || 0) + 1;
        uns.push({ ann: ev.t, arr: arrWindow(ev.t + p.unscheduledWarnH * H, randU), n: 0, unsched: true, cost: null, paid: false, how: null, done: false });
      });
      insps = insps.concat(uns).sort(function (x, y) { return x.ann - y.ann; });
      out.rep = { replies: replyList.length, unscheduled: uns.length };
    }
  }
  // the final inspection: announced in the cycle after the N-th digitization on the level, once all streams are open again;
  // arrives warnH later in the 10:00–21:00 window
  var randB = lcg((p.seed || 1) * 134775813 + 1);
  var bossWins = []; // ×3 windows and failure windows of final inspections
  function announceBoss(t) {
    var bc = p.boss.checklistMin * baseInc();
    if (M24 && J[12] != null) { var bc2 = bc * cut(12, p.museumChecklistCutPct); out.m24.checklistSaved += (bc - bc2) / Math.max(baseInc(), 1e-9); bc = bc2; }
    boss = { level: level, ann: t, arr: arrWindow(t + p.boss.warnH * H, randB), cost: Math.max(50, Math.ceil(bc)),
      paidItems: 0, adUsed: false, how: 'sig', done: false, tries: 0, mech: B.bossMech || null };
    if (out.bossAnn[level] == null) out.bossAnn[level] = t;
    if (M24 && level === 4) grant(19, t); // the last story telegram of Р4 comes with the «Аудит усього» announcement (014, boss_announced)
    buyVer++;
  }
  function resolveBoss(tA) {
    boss.tries++;
    var mechOk = boss.mech === 'zpz' ? zpzShareNow() >= p.boss.zpzMin : true; // Р3: the bot always closes the last pack «сумлінно»
    var pass = boss.paidItems >= p.boss.items && mechOk;
    out.bosses.push({ level: boss.level, ann: boss.ann, arr: tA, pass: pass, try: boss.tries, cost: boss.cost, paidItems: boss.paidItems, how: boss.how, zpz: boss.mech === 'zpz' ? Math.round(zpzShareNow() * 1000) / 1000 : null });
    bossWins.push({ t: tA, pass: pass });
    if (pass) { boss.done = true; bossPassed = true; if (M24 && boss.level >= 2 && boss.level <= 4) grant([0, 0, 12, 16, 20][boss.level], tA); }
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
    var k14 = cut(14, p.museumRacePct), svc = g.serviceH * H;
    var tot = 0; steps.forEach(function (h, i) { var x = h * H * k6 * (i === 3 ? k7 : 1); if (M24 && i === 4 && k14 !== 1) { out.m24.kaznaCutSec += x * (1 - k14); x *= k14; } tot += x; });
    if (M24 && J[20] != null) { var svc2 = svc * (1 + p.museumGiftServicePct / 100 * k24()); out.m24.giftExtraSec += svc2 - svc; svc = svc2; }
    race = { type: type, start: t, actEnd: t + tot, svcEnd: t + svc, mult: g.mult || 1, fuel: !!g.fuel, digUsed: false, ads: 0, level: level };
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
    for (var i = 0; i < insps.length; i++) { var q = insps[i]; if (q.arr > t) break; if (q.paid && !q.unsched && t < q.arr + p.inspHours * H) return p.inspMult; }
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
    if (B.packs) packEv.forEach(function (ev) { add(ev.t); add(M24 ? slEnd(ev) : ev.end); });
  }
  var slowList = []; slowByDay.forEach(function (evs) { evs.forEach(function (ev, i) { slowList.push({ t: ev.t, i: i, n: evs.length, reply: !!ev.reply }); }); });
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
        q.level = level;
        var qc = B.inspChecklistMin * baseInc();
        if (M24 && J[12] != null) { var qc2 = qc * cut(12, p.museumChecklistCutPct); q.saved = (qc - qc2) / Math.max(baseInc(), 1e-9); qc = qc2; }
        q.cost = Math.max(p.inspMinPrice, Math.ceil(qc));
      }
      if (!q.done && q.arr <= b) {
        q.done = true;
        var rec = { n: q.n, ann: q.ann, arr: q.arr, pass: q.paid, how: q.how, cost: q.cost, level: q.level }; if (q.unsched) rec.unsched = true; out.insp.push(rec);
        if (q.paid && firstDigT != null && firstDigT < q.arr) grant(7, q.arr);
        if (q.n === 1) starterDue = true;
      }
    }
    packs.forEach(function (pk) { if (pk.t > a && pk.t <= b && !pk.seen) { pk.seen = true; decidePack(pk); if (B.packs) out.telegrams.push({ t: pk.t, level: level, pack: 1, n: p.pack.size }); } });
    if (B.packs) packSingles.forEach(function (ts) { if (ts > a && ts <= b) out.telegrams.push({ t: ts, level: level, pack: 0, n: 1 }); });
    else slowList.forEach(function (ev) { if (ev.t > a && ev.t <= b && (!lateCut() || ev.i < Math.ceil(ev.n / 2))) out.telegrams.push({ t: ev.t, level: level, pack: 0, n: 1 }); });
    if (p.museum && firstDigT != null && !J[6] && firstDigT + p.museumJ6DelayHours * H <= b) grant(6, firstDigT + p.museumJ6DelayHours * H);
    // a diligent telegram costs paper; with too little the player would have to pick another answer
    if (p.paperPerTelegram > 0) {
      if (!B.packs) slowList.forEach(function (ev) {
        if (!ev.reply && ev.t > a && ev.t <= b && (!lateCut() || ev.i < Math.ceil(ev.n / 2))) { if (paper >= p.paperPerTelegram) { paper -= p.paperPerTelegram; paperSpent += p.paperPerTelegram; } else paperShort++; }
      });
      else packPaper.forEach(function (ev) { if (ev.t > a && ev.t <= b) spendPaper(ev.pk ? (ev.pk.choice === 'S' ? ev.xS : ev.xM) : ev.x); });
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
      else if (st.sig >= q.cost) { st.sig -= q.cost; q.paid = true; q.how = 'sig'; if (q.saved) out.m24.checklistSaved += q.saved; }
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
    if (p.catBonusMin > 0 && playSec >= p.catFromSec && t - lastCat >= p.catCooldownMin * 60) { var cb = p.catBonusMin * baseInc(); st.sig += cb; st.life += cb; lastCat = t; out.cats++; if (M24) out.m24.catAt.push(t); }
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
  // v7.1: the free offline bonus of the player without ads goes to the N longest returns of each day (the bot knows the night is the longest)
  var freeX2 = {};
  if (!scenario.ads && p.offlineFreeMult > 1 && p.offlineFreePerDay > 0) {
    var byD = {};
    for (var sf = 1; sf < sess.length; sf++) { var dF = Math.floor(sess[sf].t / day); (byD[dF] = byD[dF] || []).push({ i: sf, gap: sess[sf].t - sess[sf - 1].t }); }
    for (var dF2 in byD) byD[dF2].sort(function (x, y) { return y.gap - x.gap || x.i - y.i; }).slice(0, p.offlineFreePerDay).forEach(function (x) { freeX2[x.i] = true; });
  }

  var tPrev = 0, nextSample = 0, every = 1800, adDay = -1, adUsed = 0, tEnd = p.days * day;
  var earned = 0, storageFull = [];
  for (var si = 0; si < sess.length && !ended; si++) {
    var t0 = sess[si].t;
    var len = sess[si].visit ? Math.max(1, Math.round(p.inspPushVisit * 60)) : (si === 0 ? p.firstSessionMin : p.sessionMin) * 60;
    sess[si].len = len;
    if (si > 0) {
      var gap = t0 - tPrev, fuelEnd = sess[si - 1].t + fuelSec * (1 - fuelThr);
      advance(tPrev, t0);
      var eff = Math.min(gap, storSec()), a0 = tPrev, a1 = tPrev + eff;
      var idleInc = flow(st.sl, st.gl, true).v * mult() / 60;
      // offline income piece by piece: fuel runs out, slowdowns end, the storage fills up
      var cuts = [a0, a1];
      if (fuelEnd > a0 && fuelEnd < a1) cuts.push(fuelEnd);
      [slowByDay[Math.floor(a0 / day)], slowByDay[Math.floor(a0 / day) - 1]].forEach(function (evs5) {
        if (evs5) evs5.forEach(function (ev5) { var e5 = M24 ? slEnd(ev5) : ev5.end; if (e5 > a0 && e5 < a1) cuts.push(e5); });
      });
      eventCuts(a0, a1, cuts);
      cuts.sort(function (x, y) { return x - y; });
      var got = E.integrate(cuts, function (mid) {
        return flow(st.sl, st.gl, true, facAt(mid), sfacAt(mid)).v * mult() / 60 * (mid < fuelEnd || genOn(mid) ? fuelBonus : 1) * giftMult(mid) * inspMult(mid);
      });
      if (idleInc > 0) { offlineTotal += gap; lostToStorage += gap - eff; if (gap > storSec()) storageFull.push(tPrev + storSec()); }
      // an ad (or «Забрати» after the purchase) multiplies the offline income on the first N returns of a day
      var dNow = Math.floor(t0 / day);
      if (dNow !== adDay) { adDay = dNow; adUsed = 0; }
      var x2 = null;
      if (scenario.ads && got > 0 && adUsed < p.offlineAdPerDay) { got *= p.offlineAdMult; adUsed++; x2 = 'ad'; }
      else if (freeX2[si] && got > 0) { got *= p.offlineFreeMult; x2 = 'free'; }
      if (got > 0) out.returns.push({ t: t0, level: level, x2: x2, visit: sess[si].visit });
      st.sig += got; st.life += got; earned += got;
      var ni = nakIdx(); if (ni >= 0 && st.sm[ni]) addPaper(paperRate() * eff / 60);
      while (nextSample < t0) { series.push({ t: nextSample, ipm: idleInc * 60 * (nextSample < Math.min(fuelEnd, a1) ? fuelBonus : 1), prestige: prestigeTotal, level: level, paper: paper }); nextSample += every; }
    }
    if (si === 0) advance(-1, 0);
    raceAdSession = 0;
    maybePrestige(t0);
    out.sessions.push({ t: t0, level: level, visit: sess[si].visit });
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
      st.sig += g; st.life += g; earned += g;
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
  if (dubN === 0) out.earned[level] = earned - (out.earned0[level] || 0);
  // v7.1 content counters: random events that really happened, with the level at that moment
  function levelAtT(t) { var L = 1; for (var k in out.levelAt) if (out.levelAt[k] <= t && +k > L) L = +k; return L; }
  kombats.forEach(function (k) { if (k.t <= tEnd) out.kombatAt.push({ t: k.t, level: levelAtT(k.t) }); });
  naradas.forEach(function (k) { if (k.t <= tEnd && levelItems(p, levelAtT(k.t)).stages.some(function (x) { return x.id === 'narada'; })) out.naradaAt.push({ t: k.t, level: levelAtT(k.t) }); });
  sedos.forEach(function (k) { if (k.state) out.sedoAt.push({ t: k.t, level: levelAtT(k.t), printed: k.state === 'printed' }); });
  // pushes (010): candidates while the player is away, default categories (no «Бусти й комбат»), at most 2 a calendar day
  // by priority: inspection → race → storage → the rest; the generator push at most once a day
  function away(t) { for (var i = 0; i < sess.length; i++) { if (sess[i].t > t) return true; if (sess[i].len != null && t < sess[i].t + sess[i].len) return false; } return true; }
  var cand = [];
  function addC(t, type, pr) { if (t >= 0 && t <= tEnd && away(t)) cand.push({ t: t, type: type, pr: pr }); }
  storageFull.forEach(function (t) { addC(t, 'storage_full', 2); });
  out.telegrams.forEach(function (x) { cand.push({ t: x.t, type: 'telegram_new', pr: 3 }); }); // in the game a telegram lands on its schedule, mostly while away
  out.insp.forEach(function (q) { addC(q.arr - 2 * H, 'inspection', 0); if (q.pass) addC(q.arr, 'inspection_passed', 0); });
  out.bosses.forEach(function (b) { addC(b.arr - 2 * H, 'inspection', 0); });
  out.races.forEach(function (r) {
    addC(r.start, 'gift_arrived', 1);
    if (r.actEnd > r.svcEnd - 2 * H) addC(r.svcEnd - 2 * H, 'race_reminder', 1);
    if (r.win) addC(r.actEnd, 'race_won', 1);
  });
  if (fuelBonus > 1) for (var fi = 0; fi < sess.length; fi++) { var fe = sess[fi].t + fuelSec * (1 - fuelThr); if (fi + 1 < sess.length && fe < sess[fi + 1].t) addC(fe, 'fuel_bonus_end', 3); }
  var byDay = {};
  cand.forEach(function (c) { (byDay[calDay(c.t)] = byDay[calDay(c.t)] || []).push(c); });
  out.pushCandidates = cand.length;
  Object.keys(byDay).forEach(function (d) {
    var fuel = 0;
    byDay[d].sort(function (x, y) { return x.pr - y.pr || x.t - y.t; }).filter(function (c) { return c.type !== 'fuel_bonus_end' || fuel++ < 1; }).slice(0, 2)
      .forEach(function (c) { out.pushes.push({ t: c.t, type: c.type, level: levelAtT(c.t) }); });
  });
  out.pushes.sort(function (x, y) { return x.t - y.t; });
  delete out.earned0;
  var longest = { w: 0, t: 0, level: 1 };
  out.waits.forEach(function (w) { if (w.t > 3600 && w.w > longest.w) longest = w; });
  var byLevel = [];
  for (var bl = 0; bl < Math.max(2, p.levels.length); bl++) byLevel.push(0);
  out.prestiges.forEach(function (x) { byLevel[x.level - 1]++; });
  if (out.rep) { // time share of the three tiers up to the end of the run, and reputation at the end
    var shr = { low: 0, norm: 0, high: 0 }, step = H;
    for (var tt = 0; tt < tEnd; tt += step) shr[tierAt(tt)] += step / tEnd;
    out.rep.share = shr; out.rep.end = repAt(tEnd);
  }
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

// v7.1 content budget (decision 41): how many times each content moment happens on each level, for the whole stay on the
// level (n) and at most in any 7 days on it (w7: a pool with fewer lines repeats a line within a week). Unscheduled
// inspections are an estimate: the bot always answers «сумлінно», so opt.formalShare of the telegrams after the first
// scheduled inspection are taken as «відписка» with opt.inspPct % (≤ 1 a day, 03 FR-15).
function eventStats(r, opt) {
  opt = opt || {};
  var D = 86400, o = r.out, share = opt.formalShare == null ? 0.25 : opt.formalShare, pct = opt.inspPct == null ? 14 : opt.inspPct;
  var end = r.endT, levels = [], firstInsp = o.insp.length ? o.insp[0].arr : Infinity;
  for (var L in o.levelAt) levels.push(+L);
  levels.sort(function (a, b) { return a - b; });
  var res = {};
  levels.forEach(function (L, i) {
    var a = o.levelAt[L], b = i + 1 < levels.length ? o.levelAt[levels[i + 1]] : (o.finaleAt != null ? o.finaleAt : end);
    function on(t) { return t >= a && t < b || (t === b && i === levels.length - 1); }
    function count(list, f, w) { // w: weight of an item (default 1); returns { n, w7 }
      var xs = list.filter(function (x) { return x.level != null ? x.level === L : on(x.t); }).filter(f || function () { return true; });
      var n = 0, w7 = 0; xs.forEach(function (x) { n += w ? w(x) : 1; });
      for (var d = a; d < b; d += D) { var c = 0; xs.forEach(function (x) { if (x.t >= d && x.t < d + 7 * D) c += w ? w(x) : 1; }); if (c > w7) w7 = c; }
      return { n: Math.round(n * 10) / 10, w7: Math.round(w7 * 10) / 10 };
    }
    var days = (b - a) / D;
    // unscheduled: expected per calendar day, capped at 1
    var byDay = {};
    o.telegrams.forEach(function (x) { if (x.level === L && on(x.t) && x.t > firstInsp) { var d = Math.floor(x.t / D); byDay[d] = (byDay[d] || 0) + x.n; } });
    var uns = Object.keys(byDay).map(function (d) { return { t: +d * D, v: Math.min(1, byDay[d] * share * pct / 100) }; }).map(function (x) { x.t = Math.max(x.t, a); return x; });
    var pushTypes = {};
    o.pushes.forEach(function (x) { if (x.level === L) pushTypes[x.type] = 1; });
    for (var ty in pushTypes) pushTypes[ty] = count(o.pushes, function (x) { return x.type === ty; });
    res[L] = {
      days: Math.round(days * 10) / 10,
      sessions: count(o.sessions, function (x) { return !x.visit; }),
      pushVisits: count(o.sessions, function (x) { return x.visit; }),
      returns: count(o.returns),
      returnsX2: count(o.returns, function (x) { return x.x2; }),
      telegrams: count(o.telegrams, null, function (x) { return x.n; }),
      packs: count(o.telegrams, function (x) { return x.pack; }),
      pushes: count(o.pushes), pushTypes: pushTypes,
      inspections: count(o.insp.map(function (q) { return { t: q.arr, level: q.level, pass: q.pass }; })),
      inspPassed: count(o.insp.map(function (q) { return { t: q.arr, level: q.level, pass: q.pass }; }), function (x) { return x.pass; }),
      unscheduled: count(uns, null, function (x) { return x.v; }),
      finals: count(o.bosses.map(function (x) { return { t: x.arr, level: x.level, pass: x.pass }; })),
      racesWon: count(o.races.map(function (x) { return { t: x.start, level: x.level, win: x.win }; }), function (x) { return x.win; }),
      racesLost: count(o.races.map(function (x) { return { t: x.start, level: x.level, win: x.win }; }), function (x) { return !x.win; }),
      kombat: count(o.kombatAt), narada: count(o.naradaAt), sedo: count(o.sedoAt),
      digitizations: count(o.prestiges),
      conversions: count(o.conversions.map(function (x) { return { t: x.t, level: 5 }; })),
      packMerged: (o.packs || []).filter(function (x) { return x.level === L && on(x.t) && x.choice === 'M'; }).length
    };
  });
  return res;
}

if (typeof module !== 'undefined') module.exports = { DEFAULTS: DEFAULTS, SCENARIOS: SCENARIOS, simulate: simulate, waitStats: waitStats, stallStats: stallStats, withDefaults: withDefaults, levelItems: levelItems, levelStats: levelStats, reachableLevels: reachableLevels, eventStats: eventStats };
