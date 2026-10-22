// Тексти Дублів (013 «Тексти»): dup.* і rec.* зі spec; рядки поза таблицею - нові, на вичитку. Без довгого тире (рішення 55).
import type { DubModifier } from '@/dub/dub';

export const dupT = {
  title: (n: number) => `Дубль ${n}`,
  accept: 'Прийняти до виконання',
  later: 'Пізніше',
  hold: 'Утримуй: рівні й підписи почнуться з батальйону',
  /** Підзаголовок документа пропозиції */
  docTitle: 'Наказ про дублювання на папері',
  docLead: 'Усе, що оцифровано, дублювати на папері. Нумерація продовжується.',
  modifierLabel: 'Модифікатор',
  mod: {
    two_copies: { name: 'У двох примірниках', text: 'У двох примірниках. Телеграми коштують удвічі більше паперу і дають удвічі більше репутації.' },
    wet_seal: { name: 'Мокра печатка', text: 'Мокра печатка. Перевірки частіше, ×3 після них триває довше.' },
    no_did: { name: 'Без Діда', text: (m: string) => `Без Діда. Генератор дає ×${m} замість ×1,25.` },
  } as Record<DubModifier, { name: string; text: string | ((m: string) => string) }>,
  closed: (n: number) => `Дубль ${n} закрито. Наказ про наступний уже друкують.`,
  closedTitle: 'Дубль закрито',
  closedCycle: (t: string) => `Цей Дубль: ${t}`,
  next: 'До наказу',
  banner: (n: number) => `Наказ про Дубль ${n} чекає`,
  chip: (n: number, name: string) => `Дубль ${n} · ${name}`,
  recordToast: 'Новий особистий рекорд',
  recTitle: 'Особистий рекорд',
  recLine: (n: number, x: string) => `Дубль ${n} · підписів за весь час: 10^${x}`,
  levelUpShort: (n: number) => `Дубль ${n}`,
} as const;

/** Текст модифікатора: у `no_did` підставляється `dup.noDid.fuelMult` (a не число з коду) */
export function modifierText(m: DubModifier, fuelMult: string): string {
  const t = dupT.mod[m].text;
  return typeof t === 'function' ? t(fuelMult) : t;
}
