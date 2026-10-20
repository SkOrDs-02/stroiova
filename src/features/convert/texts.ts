// Рядки конвертацій ланок Р5 (013 «Тексти»: cv.*, stage-convert; на вичитку). Без довгого тире (рішення 55).
export const cvT = {
  /** cv.names: назви цифрових ланок за id паперової */
  names: {
    kombat: 'Пакетне підписання',
    stroy: 'Електронний журнал',
    fin: 'КЕП на первинці',
    kazna: 'Електронні платежі',
    narada: 'Нарада скасована',
    dopovid: 'Дашборд',
  } as Record<string, string>,
  immune: 'Телеграми цю ланку не сповільнюють.',
  immuneNote: 'Цифрова ланка: без сповільнення',
  title: 'Оцифрувати ланку',
  was: 'Було',
  now: 'Стало',
  price: 'Ціна',
  cta: 'Оцифрувати ланку',
  rowCta: 'Оцифрувати',
  index: (k: number, total: number) => `Конвертація ${k} з ${total}`,
  perMin: (rate: string) => `${rate}`,
  status: {
    available: 'Доступна',
    locked_cycle: 'Замкнено до цифровізації',
    locked_streams: 'Спершу відкрий усі потоки',
    done: 'Усі ланки цифрові',
  } as Record<string, string>,
  lack: (n: string) => `Бракує ${n} підписів`,
  back: 'Назад',
  done: 'Ланку оцифровано',
};

/** «Збій СЕДО» (013 FR-12, sedo.*; на вичитку) */
export const sedoT = {
  title: 'Збій СЕДО',
  unit: (name: string, mult: string, left: string) => `${name}, ${mult} · ще ${left}`,
  waitText: (t: string) => `Збій минеться сам за ${t}. Безкоштовно. Ланка тим часом працює повільніше.`,
  wait: (t: string) => `Чекати ${t}`,
  print: (paper: number) => `Роздрукувати · ${paper} аркушів`,
  printHint: 'Збій буде знято одразу.',
  doc: 'Паперова копія електронного документа',
  docStamp: 'Роздруковано',
  ok: 'Добре',
};
