#!/usr/bin/env node
// Ядро економіки (src/economy/core) → balance/economy.js для симулятора й пісочниці (001, принцип II).
//   node tools/build_economy.mjs           # зібрати
//   node tools/build_economy.mjs --check   # вихід 1, якщо бандл застарів (CI)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'balance/economy.js');

const res = await build({
  entryPoints: [join(root, 'src/economy/core/index.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'StroiovaEconomy',
  target: 'es2015',
  charset: 'utf8',
  legalComments: 'none',
  write: false,
  banner: {
    js: '// Згенеровано tools/build_economy.mjs з src/economy/core. Руками не правити: npm run build:economy.',
  },
  footer: { js: "if (typeof module !== 'undefined') module.exports = StroiovaEconomy;" },
});
const code = res.outputFiles[0].text;

if (process.argv.includes('--check')) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (cur !== code) {
    console.error('balance/economy.js застарів: npm run build:economy');
    process.exit(1);
  }
  console.log('ok economy.js');
} else {
  writeFileSync(OUT, code);
  console.log(`ok balance/economy.js, ${code.length} байт`);
}
