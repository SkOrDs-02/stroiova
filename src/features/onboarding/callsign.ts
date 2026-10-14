// Позивний (002 FR-5…FR-9, рішення 58): перевірка і шаблони форми «він / вона».
import stopwordsFile from '../../../content/callsign-stopwords.json';

import type { Gender } from './steps';

export const CALLSIGN_MIN = 2;
export const CALLSIGN_MAX = 16;
/** Стоп-слова до стількох літер шукаються цілим словом (рішення 60). */
const SHORT_WORD = 3;

export type CallsignError = 'empty' | 'tooShort' | 'tooLong' | 'chars' | 'stopword';

/** Літери кирилиці й латиниці, цифри, дефіс і пробіл (рішення 58). */
const ALLOWED = /^[\p{Script=Cyrillic}\p{Script=Latin}\p{Nd} -]+$/u;

// латинські й цифрові двійники кириличних літер: «ЗCУ», «3СУ» ловляться як «зсу»
const TWINS: Record<string, string> = { a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', i: 'і', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у', '3': 'з', '0': 'о' };

function folded(s: string, twins: boolean): string {
  const low = s.toLowerCase().replace(/[\s-]+/g, '');
  return twins ? [...low].map((ch) => TWINS[ch] ?? ch).join('') : low;
}

/** Довжина в знаках (кодових точках), як на лічильнику «n/16». */
export function callsignLength(text: string): number {
  return [...text.trim()].length;
}

export const STOPWORDS: readonly string[] = stopwordsFile.words;

/**
 * Перевірка на тап «Вписати в графу» (FR-6, FR-7): довжина 2–16, дозволені знаки, стоп-слова за входженням
 * підрядка без регістру. Порівнюємо і як є (латинські слова списку), і з двійниками, зведеними до кирилиці.
 */
export function validateCallsign(text: string, stopwords: readonly string[] = STOPWORDS): { ok: true } | { ok: false; error: CallsignError } {
  const v = text.trim();
  const n = callsignLength(v);
  if (n === 0) return { ok: false, error: 'empty' };
  if (n < CALLSIGN_MIN) return { ok: false, error: 'tooShort' };
  if (n > CALLSIGN_MAX) return { ok: false, error: 'tooLong' };
  if (!ALLOWED.test(v)) return { ok: false, error: 'chars' };
  const plain = folded(v, false);
  const twin = folded(v, true);
  // слова до 3 літер — цілим словом між пробілами, дефісами й цифрами або весь позивний разом (рішення 60)
  const tokens = v.split(/[\s-]+/).flatMap((tok) => [folded(tok, false).replace(/^\d+|\d+$/g, ''), folded(tok, true).replace(/^\d+|\d+$/g, '')]);
  const hit = (w: string) => {
    const fw = folded(w, true);
    if ([...w].length <= SHORT_WORD) return plain === w || twin === fw || tokens.includes(w) || tokens.includes(fw);
    return plain.includes(w) || twin.includes(fw);
  };
  if (stopwords.some(hit)) return { ok: false, error: 'stopword' };
  return { ok: true };
}

/** Шаблон {m:…|f:…} у формі гравця (FR-9). */
export function gendered(text: string, g: Gender | null): string {
  return text.replace(/\{m:([^|}]*)\|f:([^}]*)\}/g, (_, m: string, f: string) => (g === 'f' ? f : m));
}
