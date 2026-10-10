// Рядки tg-detail і tg-result для телеграми № 1 (артборди TgDetail, TgResult; новий, на вичитку). Решту станів описує 03.
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
  minutes: (n: number) => `${n} ${n === 1 ? 'хвилина' : n < 5 ? 'хвилини' : 'хвилин'}`,
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
