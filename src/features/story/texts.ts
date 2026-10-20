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
  call: {
    title: (from: string) => `Дзвінок · ${from}`,
    ok: 'Зрозуміло',
  },
  /** Заголовок, що збігається з іменем відправника, не повторюємо */
  toast: (from: string, title: string, body: string) => (fromName(from) === title ? `${title}\n${body}` : `${fromName(from)} · ${title}\n${body}`),
};
