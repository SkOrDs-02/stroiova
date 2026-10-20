// Рядки інтерфейсу сюжету (014 «Тексти»: diary.*, на вичитку). Сюжетні тексти кроків - content/story.json.
import { plural } from '@/features/telegrams/texts';

/** Хто підписує запис (`from` кроку -> підпис) */
const FROM: Record<string, string> = {
  archaeologist: 'Археолог',
  kopiyka: 'Копійка',
  kava: 'Кава',
  lina: 'Ліна',
  stroy: 'Стройова частина',
  granit: 'Граніт',
  tumbochkin: 'Тумбочкін',
  museum: 'Музей скасованих журналів',
};

export const fromName = (id: string): string => FROM[id] ?? id;

export const storyT = {
  diary: {
    title: 'Щоденник стройовика',
    day: (n: number, date: string) => `День ${n} · ${date}`,
    count: (n: number) => `${n} ${plural(n, 'запис', 'записи', 'записів')}`,
    empty: 'Поки що нічого. Перший рядок з’явиться, коли повернешся до гри.',
    open: 'Відкрити щоденник',
  },
  arch: {
    title: 'Таблиці Археолога',
    count: (k: number) => `${k} з 12`,
    found: (title: string) => `Знайдено аркуш Археолога: ${title}`,
    foundMany: (n: number) => `Знайдено ${n} ${plural(n, 'аркуш', 'аркуші', 'аркушів')} Археолога`,
    unknown: (src: string) => `Не знайдено · ${src}`,
    slotUnknown: '???',
    open: 'Відкрити таблиці',
    back: 'Назад',
    sheetNo: (n: number) => `Аркуш ${n}`,
    gift: (level: number, nth: number) => `подарунок Ліни ${nth}-й на Р${level}`,
    move: (level: number) => `переїзд на Р${level}`,
    boss: (level: number) => (level === 4 ? 'Аудит усього' : `підсумкова Р${level}`),
    conversion: (k: number) => `конвертація № ${k}`,
  },
  finale: {
    foundLine: 'Вимкнути можна лише письмовим наказом, погодженим усіма ланками.',
    back: 'Повернутися',
    title: 'Серверна під залом доповідей',
    sticker: 'НЕ ВИМИКАТИ. 1998',
  },
  call: {
    title: (from: string) => `Дзвінок · ${from}`,
    ok: 'Зрозуміло',
  },
  /** Заголовок, що збігається з іменем відправника, не повторюємо */
  toast: (from: string, title: string, body: string) => (fromName(from) === title ? `${title}\n${body}` : `${fromName(from)} · ${title}\n${body}`),
};
