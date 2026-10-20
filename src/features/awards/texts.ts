// Тексти грамот (016 «Тексти»): таблиця aw.* у spec; на вичитку. Без довгого тире (рішення 55).
export const awT = {
  seg: 'Грамоти',
  head: (n: number, m: number) => `Грамоти · ${n} з ${m}`,
  filter: { all: 'Усі', owned: 'Отримані', ahead: 'Попереду' },
  sectionTitle: (title: string, n: number, m: number) => `${title} · ${n} з ${m}`,
  empty: 'Грамот поки немає. Першу оголосять швидше, ніж підпишуть.',
  allDone: 'Нагороджено всім, що передбачено. Нове передбачать.',
  hiddenTitle: 'Для службового користування',
  hiddenHint: 'Умову оголосять після нагородження',
  ownedOn: (date: string) => `Оголошено ${date}`,
  awardee: (gender: 'm' | 'f' | null, callsign: string) => `Нагороджується: ${gender === 'f' ? 'стройовичка' : 'стройовик'} ${callsign}`,
  progress: (k: number, n: number) => `${k} з ${n}`,
  toastMore: (n: number) => `Ще ${n} на стіні грамот`,
  toastRetro: (n: number) => `Оголошено заднім числом: ${n}`,
  toastCta: 'Переглянути',
  profile: (n: number, m: number) => `Грамоти: ${n} з ${m}`,
  ok: 'Зрозуміло',
} as const;
