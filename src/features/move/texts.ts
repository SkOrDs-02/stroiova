// Тексти «Переїзду» (017 «Тексти»): нові рядки, на вичитку (рішення 122). Без довгого тире (рішення 55), на «ти».
import { plural } from '@/features/telegrams/texts';

export const moveT = {
  introTitle: 'Частина міняє позицію',
  introBody: (sec: number, boxes: number) => `Бус уже під'їхав. Склади ${boxes} ${plural(boxes, 'ящик', 'ящики', 'ящиків')} з паперами за ${sec} с: ящики виносять по одному. Що не влізе, загубиться в дорозі.`,
  start: 'Вантажити',
  skip: 'Хай вантажать без мене',
  gameTitle: 'Переїзд',
  left: (sec: number) => `Лишилось ${sec} с`,
  stacked: (n: number, total: number) => `У бусі: ${n} з ${total}`,
  box: (no: number) => `Ящик № ${no}`,
  boxHint: 'Тап кладе ящик у бус',
  wait: 'Виносять наступний ящик',
  resultMeta: 'Акт переїзду',
  resultTitle: (level: number) => `Переїзд на рівні ${level}`,
  resultStacked: (n: number, total: number) => `Складено ящиків: ${n} з ${total}`,
  resultLost: (n: number) => `Втрачено паперу: ${n}`,
  perfect: 'Усе доїхало. Паперу не втрачено.',
  skipped: 'Ящики вантажили без тебе.',
  sheet: 'Між ящиками знайшовся аркуш Археолога.',
  close: 'Прийняти',
} as const;
