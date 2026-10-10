#!/usr/bin/env node
// Відбитки симулятора (001, принцип II): SHA-1 від simulate, levelStats, eventStats
// для пресетів × зерен × сценаріїв. Знімаються з sim.js до рефакторингу й мають лишатися незмінними.
//   node tools/golden.mjs           # переписати balance/golden/fingerprints.json
//   node tools/golden.mjs --check   # порівняти, вихід 1 при розбіжності
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const S = require(join(root, 'balance/sim.js'));
const OUT = join(root, 'balance/golden/fingerprints.json');
const PRESETS = ['preset-v5', 'preset-v6', 'preset-v7'];
const SEEDS = [1, 2, 3];

export function fingerprints() {
  const res = {};
  for (const name of PRESETS) {
    const P = JSON.parse(readFileSync(join(root, 'balance', name + '.json'), 'utf8'));
    for (const seed of SEEDS) {
      for (const sc of S.SCENARIOS) {
        const p = S.withDefaults(P.params);
        p.seed = seed;
        const r = S.simulate(p, sc);
        const body = JSON.stringify({ simulate: r, levelStats: S.levelStats(r), eventStats: S.eventStats(r) });
        res[`${name}/seed${seed}/${sc.id}`] = createHash('sha1').update(body).digest('hex');
      }
    }
  }
  return res;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const got = fingerprints();
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  if (process.argv.includes('--check')) {
    const want = JSON.parse(readFileSync(OUT, 'utf8'));
    const bad = Object.keys(want).filter((k) => want[k] !== got[k]);
    if (bad.length || Object.keys(got).length !== Object.keys(want).length) {
      console.error(`Відбиток змінився (${bad.length}): ${bad.join(', ')}`);
      process.exit(1);
    }
    console.log(`ok ${Object.keys(got).length} відбитків, ${sec} с`);
  } else {
    writeFileSync(OUT, JSON.stringify(got, null, 2) + '\n');
    console.log(`записано ${Object.keys(got).length} відбитків, ${sec} с`);
  }
}
