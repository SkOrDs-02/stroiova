// Формат чисел (001 FR-30, «NumberFormat»; дизайн-система «Формат чисел»). Одна функція для всіх екранів.
import type { Big } from './core';

const NBSP = ' ';
const NAMES = ['', 'тис.', 'млн', 'млрд'];

/** Розряд: 1 тис., 2 млн, 3 млрд, далі aa = 10¹², ab = 10¹⁵ … az, ba … */
function suffix(tier: number): string {
  if (tier < NAMES.length) return NAMES[tier]!;
  const k = tier - NAMES.length;
  return String.fromCharCode(97 + Math.floor(k / 26)) + String.fromCharCode(97 + (k % 26));
}

type Rounding = 'down' | 'up' | 'nearest';

function round(x: number, decimals: number, how: Rounding): number {
  const f = Math.pow(10, decimals);
  const y = x * f;
  // 1e-9 гасить похибку на кшталт 8.96 * 100 = 895.9999…
  const r = how === 'down' ? Math.floor(y + 1e-9) : how === 'up' ? Math.ceil(y - 1e-9) : Math.round(y);
  return r / f;
}

/** Ціле з нерозривними пробілами між тисячами: 1 248 360. */
function groupInt(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

function decimalsText(v: number, decimals: number): string {
  return v.toFixed(decimals).replace(/\.?0+$/, '').replace('.', ',');
}

export type FormatMode = 'balance' | 'price' | 'counter' | 'plain';

/**
 * balance — униз, price — угору, plain — до найближчого; counter — лічильник у шапці: повне число до 10 млн,
 * далі два знаки після коми, униз. До 10 000 — повне число; далі 3 значущі цифри й розряд.
 */
export function formatBig(x: Big, mode: FormatMode = 'plain'): string {
  if (!Number.isFinite(x)) return '∞';
  const neg = x < 0;
  const a = Math.abs(x);
  const how: Rounding = mode === 'price' ? 'up' : mode === 'balance' || mode === 'counter' ? 'down' : 'nearest';
  const full = mode === 'counter' ? 1e7 : 1e4;
  let out: string;
  if (a < full) {
    out = groupInt(round(a, 0, how));
  } else {
    let tier = Math.floor(Math.log10(a) / 3);
    let v = a / Math.pow(1000, tier);
    let decimals = mode === 'counter' ? 2 : 2 - Math.floor(Math.log10(v));
    let r = round(v, decimals, how);
    if (r >= 1000) {
      tier += 1;
      v = a / Math.pow(1000, tier);
      decimals = 2;
      r = round(v, decimals, how);
    }
    out = decimalsText(r, decimals) + NBSP + suffix(tier);
  }
  return neg ? '−' + out : out;
}

/** «+412/хв» */
export function formatRate(perMin: Big): string {
  return '+' + formatBig(perMin, 'plain') + '/хв';
}

/** «×1,5», «×5,72» */
export function formatMult(m: number): string {
  return '×' + decimalsText(round(m, 2, 'nearest'), 2);
}

/** «5 год 12 хв», «12 хв», «45 с» */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}${NBSP}год${NBSP}${m}${NBSP}хв` : `${h}${NBSP}год`;
  if (m > 0) return `${m}${NBSP}хв`;
  return `${s}${NBSP}с`;
}

/** «3:41:12», «41:12» */
export function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
