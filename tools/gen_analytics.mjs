#!/usr/bin/env node
// План трекінгу (analytics/tracking-plan.yaml) -> src/analytics/plan.generated.ts: типи подій і властивостей, таблиці для перевірки в dev.
//   node tools/gen_analytics.mjs           # згенерувати
//   node tools/gen_analytics.mjs --check   # вихід 1, якщо файл застарів (CI)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'analytics/tracking-plan.yaml');
const OUT = join(root, 'src/analytics/plan.generated.ts');

const plan = parse(readFileSync(SRC, 'utf8'));

const q = (s) => JSON.stringify(s);
const tsType = (p) => {
  if (p.enum) return p.enum.map(q).join(' | ');
  switch (p.type) {
    case 'string':
    case 'date':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array<string>':
      return 'string[]';
    case 'object':
      return 'Record<string, unknown>';
    default:
      throw new Error(`невідомий тип ${p.type}`);
  }
};
const propDef = (p) => `{ type: ${q(p.type)}, required: ${p.required !== false}${p.enum ? `, enum: [${p.enum.map(q).join(', ')}]` : ''} }`;

const names = new Set();
for (const e of plan.events) {
  if (names.has(e.name)) throw new Error(`дубль події ${e.name}`);
  names.add(e.name);
}

const out = [];
out.push('// Згенеровано tools/gen_analytics.mjs з analytics/tracking-plan.yaml. Руками не правити: node tools/gen_analytics.mjs.');
out.push('');
out.push(`export const PLAN_VERSION = ${plan.version};`);
out.push('');
out.push("export type PropType = 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array<string>' | 'date';");
out.push('export interface PropDef {');
out.push('  type: PropType;');
out.push('  required: boolean;');
out.push('  enum?: readonly string[];');
out.push('}');
out.push("export type Sampling = 'all' | 'econ_detail';");
out.push('export interface EventDef {');
out.push('  sampling: Sampling;');
out.push('  props: Readonly<Record<string, PropDef>>;');
out.push('}');
out.push('');
out.push('export interface GlobalProps {');
for (const p of plan.global_properties) out.push(`  ${p.name}${p.required === false ? '?' : ''}: ${tsType(p)};`);
out.push('}');
out.push('');
out.push('export const GLOBAL_PROPS: Readonly<Record<keyof GlobalProps, PropDef>> = {');
for (const p of plan.global_properties) out.push(`  ${p.name}: ${propDef(p)},`);
out.push('};');
out.push('');
out.push('export interface UserProps {');
for (const p of plan.user_properties) out.push(`  ${p.name}?: ${tsType(p)};`);
out.push('}');
out.push('');
out.push('/** Які властивості користувача ставляться один раз (`set_once`) */');
out.push(`export const USER_PROPS_ONCE: readonly (keyof UserProps)[] = [${plan.user_properties.filter((p) => p.set === 'set_once').map((p) => q(p.name)).join(', ')}];`);
out.push('');
out.push('export interface EventProps {');
for (const e of plan.events) {
  const props = e.properties ?? [];
  if (!props.length) out.push(`  ${e.name}: Record<string, never>;`);
  else {
    out.push(`  ${e.name}: {`);
    for (const p of props) out.push(`    ${p.name}${p.required === false ? '?' : ''}: ${tsType(p)};`);
    out.push('  };');
  }
}
out.push('}');
out.push('');
out.push('export type EventName = keyof EventProps;');
out.push('');
out.push('export const EVENTS: Readonly<Record<EventName, EventDef>> = {');
for (const e of plan.events) {
  const props = e.properties ?? [];
  out.push(`  ${e.name}: {`);
  out.push(`    sampling: ${q(e.sampling ?? 'all')},`);
  if (!props.length) out.push('    props: {},');
  else {
    out.push('    props: {');
    for (const p of props) out.push(`      ${p.name}: ${propDef(p)},`);
    out.push('    },');
  }
  out.push('  },');
}
out.push('};');
out.push('');

const code = out.join('\n');
if (process.argv.includes('--check')) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (cur !== code) {
    console.error('src/analytics/plan.generated.ts застарів: node tools/gen_analytics.mjs');
    process.exit(1);
  }
  console.log(`ok plan.generated.ts (${plan.events.length} подій)`);
} else {
  writeFileSync(OUT, code);
  console.log(`src/analytics/plan.generated.ts: ${plan.events.length} подій, ${plan.global_properties.length} глобальних властивостей`);
}
