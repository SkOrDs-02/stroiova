// Перевірка події проти плану (analytics/tracking-plan.yaml): `before_send` з docs/analytics.md. Чиста функція.
import { EVENTS, GLOBAL_PROPS, type EventName, type PropDef } from './plan.generated';

function typeError(def: PropDef, v: unknown): string | null {
  switch (def.type) {
    case 'string':
    case 'date':
      return typeof v === 'string' ? null : 'очікується рядок';
    case 'integer':
      return typeof v === 'number' && Number.isInteger(v) ? null : 'очікується ціле число';
    case 'number':
      return typeof v === 'number' && Number.isFinite(v) ? null : 'очікується число';
    case 'boolean':
      return typeof v === 'boolean' ? null : 'очікується true/false';
    case 'array<string>':
      return Array.isArray(v) && v.every((x) => typeof x === 'string') ? null : 'очікується масив рядків';
    case 'object':
      return typeof v === 'object' && v !== null && !Array.isArray(v) ? null : 'очікується об’єкт';
  }
}

function checkProp(name: string, def: PropDef, v: unknown): string | null {
  const t = typeError(def, v);
  if (t) return `${name}: ${t}`;
  if (def.enum && !def.enum.includes(v as string)) return `${name}: значення ${JSON.stringify(v)} поза переліком`;
  return null;
}

/** Помилки події; порожній список - можна слати. Невідома подія - єдина помилка (її відкидає `before_send`). */
export function validateEvent(name: string, props: Readonly<Record<string, unknown>>): string[] {
  const def = (EVENTS as Record<string, (typeof EVENTS)[EventName] | undefined>)[name];
  if (!def) return [`подію ${name} не описано в tracking-plan.yaml`];
  const errors: string[] = [];
  for (const [p, pd] of Object.entries(def.props)) {
    if (props[p] === undefined) {
      if (pd.required) errors.push(`${p}: обов’язкова властивість відсутня`);
      continue;
    }
    const e = checkProp(p, pd, props[p]);
    if (e) errors.push(e);
  }
  for (const p of Object.keys(props)) {
    if (!(p in def.props)) errors.push(`${p}: властивості немає в плані`);
  }
  return errors;
}

/** Глобальні властивості (усі обов'язкові у плані) */
export function validateGlobals(globals: Readonly<Record<string, unknown>>): string[] {
  const errors: string[] = [];
  for (const [p, pd] of Object.entries(GLOBAL_PROPS)) {
    if (globals[p] === undefined) {
      if (pd.required) errors.push(`${p}: глобальна властивість відсутня`);
      continue;
    }
    const e = checkProp(p, pd, globals[p]);
    if (e) errors.push(e);
  }
  return errors;
}
