// Тексти перевірок (004 «Тексти»): з артбордів InspWarning, InspPrep, InspResult, OfflineReturn і нові з spec.
// Нові рядки й короткі назви пунктів для акта — на вичитку (text-review).
import type { BossId } from '@/inspections/types';

interface ItemText {
  title: string;
  meta: string;
  /** Рядок акта: назва й значення, коли виконано */
  short: string;
  ok: string;
  /** Значення, коли не виконано (за замовчуванням — `notDone`) */
  no?: string;
}

const notDone = 'не виконано';

export const inspT = {
  title: 'Їде комісія',
  titleUnsched: 'Позапланова перевірка',
  boss: { brigade_commission: 'Комісія бригади', command_commission: 'Комісія командування' } satisfies Record<BossId, string>,
  bossWho: (b: BossId) => `${inspT.boss[b]} · полковник Тумбочкін`,
  reason: (no: string, title: string) => `Причина: відписка на телеграму № ${no} «${title}»`,
  untilArrival: 'До приїзду комісії',
  untilArrivalLabel: (t: string) => `До приїзду комісії ${t}`,
  tumb: 'Полковник Тумбочкін',
  /** «Перша поява» (texts.md §4): одноразова */
  firstQuote: 'Буржуйку відкрийте. Що надворі літо, мене не цікавить.',
  firstRule: 'Поки комісія в дорозі, виконай чекліст за підписи.',
  passRuleK: 'Пройшли:',
  passRule: (mult: string, hours: number) => `${mult} до підписів на ${hours} год`,
  passUnschedRule: 'нічого не змінюється. Позапланова множника не дає.',
  failRuleK: 'Провалили:',
  /** insp.fail_rule */
  failRule: (factor: string, hours: number) => `пояснювальні, Стройова частина ${factor} на ${hours} год`,
  repRule: 'Відписки кличуть позапланові. З високою репутацією рідше.',
  prepare: 'Готуватися',
  later: 'Пізніше',
  /** Банер на main (FR-9) */
  banner: (t: string) => `Перевірка через ${t}`,
  // insp-prep
  prepTitle: 'Перевірка',
  back: 'Назад',
  backLabel: 'Назад до стройової',
  scope: {
    brigade_commission: 'Перевіряє бордюри, тумбочки й кегль. Бойову підготовку не перевіряє.',
    command_commission: 'Міряє коридор рулеткою, пил білою рукавичкою. Бойову підготовку не перевіряє.',
  } satisfies Record<BossId, string>,
  readiness: 'Готовність до перевірки',
  readyPct: (pct: number) => (pct >= 100 ? '100% · готово' : `${pct}%`),
  checklist: 'Чекліст за підписи',
  have: (balance: string, rate: string) => `Є ${balance} · ${rate}`,
  rate: (v: string) => `+${v}/хв`,
  lack: (v: string) => `бракує ${v}`,
  eta: (t: string) => `ще ${t}`,
  /** insp.added */
  added: (no: string) => `Додано після відписки на № ${no}`,
  /** insp.toast_item */
  toastItem: (short: string) => `Комісія додала пункт: ${short}`,
  readyLine: {
    brigade_commission: 'Бордюри білі. Комісія буде задоволена.',
    command_commission: 'Пилу немає. Рукавичка лишилась білою.',
  } satisfies Record<BossId, string>,
  // insp-result
  act: (no: number) => `Акт перевірки № ${no}`,
  signer: { brigade_commission: 'Голова комісії полковник Тумбочкін', command_commission: 'Голова комісії командування полковник Тумбочкін' } satisfies Record<BossId, string>,
  checked: 'Перевірено',
  verdict: 'Висновок',
  passed: 'зауважень немає',
  passedUnsched: 'позапланова, пройшли',
  failedV: 'провалили',
  remarkV: 'пройшли із зауваженням',
  /** Резолюція на акті із зауваженням (артборд InspResult) */
  remarkRes: 'Пройшли. Кегль виправити до 18:00.',
  remarkFont: '13 замість 14 · зауваження',
  passK: 'Пройшли.',
  /** «Пройшли. ×3 до підписів уже діє, ще 2 год.» */
  passX3: (mult: string, left: string) => `${mult} до підписів уже діє, ще ${left}.`,
  /** insp.r_pass_unsched: «Пройшли. Позапланова: без множника.» */
  passUnsched: 'Позапланова: без множника.',
  failK: 'Провалили.',
  /** insp.r_fail */
  fail: (factor: string, hours: number) => `Стройова пише пояснювальні: ${factor} на ${hours} год.`,
  toMain: 'До стройової',
  item: {
    paint_borders: { title: 'Пофарбувати бордюри', meta: 'Білим, під лінійку', short: 'Бордюри', ok: 'пофарбовано' },
    lockers_cleanup: { title: 'Прибрати цивільне з тумбочок', meta: 'Комісія перевіряє особисто', short: 'Тумбочки', ok: 'без цивільного' },
    stove_open: { title: 'Відкрити буржуйку', meta: 'Комісія дивиться навіть улітку', short: 'Буржуйка', ok: 'відкрита' },
    font_check: { title: 'Перевірити кегль', meta: 'Чотирнадцятий, без винятків', short: 'Кегль', ok: '14' },
    journals_stitch: { title: 'Підшити журнали', meta: 'Суровою ниткою, з написом', short: 'Журнали', ok: 'підшито', no: 'не підшито' },
    sergeants_count: { title: 'Перерахувати сержантів десятьма формулами', meta: '', short: 'Сержанти', ok: 'перераховано' },
    dust_glove: { title: 'Перевірити пил білою рукавичкою', meta: 'Шафи, підвіконня, сейф', short: 'Пил', ok: 'не виявлено' },
    corridor_tape: { title: 'Переміряти коридор рулеткою', meta: 'Доріжка має лежати посередині', short: 'Коридор', ok: 'доріжка посередині' },
    sign_rehang: { title: 'Перевісити табличку «Гурток крою та шиття»', meta: 'Знімати не можна: інвентарна', short: 'Табличка', ok: 'перевішено' },
    orders_stitch: { title: 'Підшити накази по частині', meta: 'Кожен рівень у свій журнал', short: 'Накази по частині', ok: 'підшито', no: 'не підшито' },
    where_journal: { title: 'А де журнал?', meta: '', short: 'Журнал', ok: 'знайдено' },
  } as Record<string, ItemText>,
  notDone,
  // довідка повернення (FR-25)
  offInsp: 'Перевірка Тумбочкіна',
  offPassed: 'без зауважень',
  offRemark: 'із зауваженням',
  offMult: 'Множник за перевірку',
  offMultV: (mult: string, left: string) => `${mult} ще ${left}`,
  offFail: 'Перевірку провалено',
  /** off.insp_fail_v */
  offFailV: (factor: string, hours: number) => `Стройова ${factor} на ${hours} год`,
  // call перед першою (FR-2)
  callName: 'Археолог',
  /** call.insp1 */
  call1: 'Їде Тумбочкін. Бордюри фарбуй заздалегідь, він дивиться першими.',
  callOk: 'Прийнято',
};
