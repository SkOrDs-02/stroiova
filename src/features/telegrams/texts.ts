// Рядки tg-detail і tg-result для телеграми № 1 (артборди TgDetail, TgResult; новий, на вичитку). Решту станів описує 03.
/** Українська множина: 1 хвилина, 2 хвилини, 5 хвилин, 21 хвилина, 11 хвилин. */
function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  return b >= 2 && b <= 4 ? few : many;
}

export const t = {
  screen: 'Телеграма',
  back: 'Назад',
  title: (no: string) => `Телеграма № ${no}`,
  from: (who: string) => `Від: ${who}`,
  to: (who: string) => `Кому: ${who}`,
  rowsLabel: 'Строк виконання на кожному рівні',
  who: { higher_hq: 'вищестоящий штаб', bn_commander: 'командиру батальйону' } as Record<string, string>,
  // підписи наслідків варіанта (артборд TgDetail): «Стройова ×0,5 на 1 год · +10 до репутації»
  slow: (unit: string, mult: string, hours: number) => `${unit} ${mult} на ${hours} год`,
  minutes: (n: number) => `${n} ${plural(n, 'хвилина', 'хвилини', 'хвилин')}`,
  slowFor: (mult: string, hours: number) => `${mult} на ${hours} год`,
  rep: (d: number) => `${d > 0 ? '+' : '−'}${Math.abs(d)} до репутації`,
  insp: (pct: number) => `${pct}% шанс перевірки`,
  resMeta: (no: string) => `Відповідь на телеграму № ${no}`,
  resSigner: 'Начальник стройової',
  resDecision: 'Рішення',
  resRep: 'Репутація',
  resSpent: 'Витрачено',
  kind: { diligent: 'сумлінно', formal_reply: 'відписка', drawer: 'шухляда', special: 'особливий' } as Record<string, string>,
  resStamp: 'Виконано',
  resFirstH: 'Що таке репутація',
  resCtaFirst: 'Зрозуміло',
};
