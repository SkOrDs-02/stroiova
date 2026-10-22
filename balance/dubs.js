// Дублі (013, рішення 111): тривалість кожного Дубля за сценарієм і зерном.
//   node balance/dubs.js [сценарій|all] [зерно] [Дублів=4] [JSON з перевизначенням dup]
// Приклад: node balance/dubs.js ads 1 4 '{"exitDigitizations":8}'
// Дні: перший стовпчик - фінал (Дубль 0), далі - скільки тривав кожен Дубль від свого початку (тиждень тиші не рахується).
var S = require('./sim.js'), P = require('./preset-v7.json');

function dubDays(sc, seed, dubs, dup) {
  var p = S.withDefaults(P.params);
  p.seed = seed; p.dubs = dubs; p.days = 150 + dubs * 60;
  if (dup) p.dup = Object.assign({}, p.dup, dup);
  var o = S.simulate(p, sc).out, ends = (o.dubs || []).map(function (d) { return d.end; });
  return { days: ends.map(function (e, i) { return (e - (i ? ends[i - 1] : 0)) / 86400; }), digs: (o.dubs || []).map(function (d) { return d.digitizations; }) };
}
module.exports = dubDays;

if (require.main === module) {
  var a = process.argv.slice(2), want = a[0] || 'all', seed = +(a[1] || 1), dubs = +(a[2] || 4), dup = a[3] ? JSON.parse(a[3]) : null;
  S.SCENARIOS.filter(function (x) { return want === 'all' || x.id === want; }).forEach(function (sc) {
    var r = dubDays(sc, seed, dubs, dup);
    console.log(sc.id, 'зерно', seed, r.days.map(function (x) { return x.toFixed(1); }).join(' | '), '· цифровізацій', r.digs.join(','));
  });
}
