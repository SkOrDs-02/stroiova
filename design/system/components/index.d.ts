// Стройова — контракт пропсів компонентів для React Native + react-native-skia.
// Це документація: прев'ю в системі зроблені на HTML/CSS, а реалізація в грі — на RN і Skia.
import type * as React from 'react';

type Big = number | string; // великі числа приходять із break_infinity.js як рядок або число
type Press = () => void;

/** Слово штампа. Базовий набір; за арт-біблією можна додати НЕВІДКЛАДНО, ПЕРЕВІРЕНО, КОПІЯ, ПОВЕРНУТО. */
export type StampWord = 'ПОГОДЖЕНО' | 'ТЕРМІНОВО' | 'НЕГАЙНО' | 'СКАСОВАНО' | 'ВИКОНАНО' | 'ОЦИФРОВАНО' | 'ЗАРАХОВАНО';

export interface StampProps {
  word: StampWord;
  /** s — 11 px, рамка 1,5; m — 13 px, рамка 2; l — 16 px, рамка 3. */
  size?: 's' | 'm' | 'l';
  /** paper — колір stamp з opacity-ink; dark — stamp-on-dark без прозорості. */
  on?: 'paper' | 'dark';
  /** Другий рядок, наприклад «08.10.2026». */
  date?: string;
  /** Нахил у градусах, 2–8 за модулем. Без значення — випадковий із сіду. */
  rotation?: number;
  /** Сід відбитка: обирає один із 10–20 заздалегідь згенерованих варіантів. */
  seed?: number;
  /** Програти удар (dur-stamp або великий dur-stamp-big). З Reduce Motion — лише проявлення. */
  animateIn?: 'hit' | 'bigHit' | false;
}
export declare function Stamp(props: StampProps): React.ReactElement;

export interface RouteStep { label: string; state: 'done' | 'now' | 'late' | 'todo' }

export interface DocumentSheetProps {
  kind: 'telegram' | 'spravka' | 'act' | 'order' | 'raport' | 'receipt';
  /** Шапка капсом, TT2020: «ТЕЛЕГРАМА № 4471». */
  title: string;
  /** Службові поля, ink-2: «вх. 12/318 від 08.10.2026», «Від: …», «Кому: …». */
  meta?: string[];
  /** Тіло машинописом (doc-body). */
  body?: string;
  /** Рядки довідки з крапками: назва — значення; alert — рядок тривоги кольором alert-paper зі словом. */
  rows?: { label: string; value: string; alert?: boolean }[];
  route?: RouteStep[];
  stamp?: StampProps;
  /** Процедурний підпис і посада під лінією. */
  signature?: { seed: number; position: string };
  /** Кругла печатка «ДЛЯ ПАКЕТІВ», захоплює кінець посади. */
  seal?: boolean;
  /** Резолюція пастою (Caveat), наприклад «Не заперечую. Граніт.». */
  resolution?: string;
  /** Номер аркуша олівцем у правому верхньому куті. */
  sheetNumber?: number;
  /** Скільки аркушів показати під верхнім (0–3). */
  stack?: number;
  /** card — аркуш-картка на темному (radius-6, без сліду підшивки). */
  variant?: 'sheet' | 'card';
  children?: React.ReactNode;
}
export declare function DocumentSheet(props: DocumentSheetProps): React.ReactElement;

interface UnitBase {
  name: string;
  icon: string;
  /** Рівень; undefined — замкнено. */
  level?: number;
  /** Швидкість за хвилину, уже з множниками. */
  ratePerMin?: Big;
  /** Діловод: ім'я й прізвисько, або null — ланка працює лише поки гравець у грі. */
  clerk?: { name: string; nickname: string } | null;
  /** Прогрес до наступної віхи (кожні 25 рівнів — ×2), 0–1. */
  milestoneProgress?: number;
  /** Ціна покращення чи відкриття (округлена вгору) і чи вистачає підписів. */
  price?: Big;
  affordable?: boolean;
  /** Скільки секунд до доступності, для підпису «ще 2 хв». */
  affordableInSec?: number;
  /** Ціна найму діловода, якщо його немає. */
  hirePrice?: Big;
  onPress?: Press;
  onBuy?: Press;
  onHire?: Press;
}
export interface StreamCardProps extends UnitBase {
  /** Опис для замкненого потоку: «Швидкі документи великими обсягами». */
  lockedHint?: string;
}
export declare function StreamCard(props: StreamCardProps): React.ReactElement;

export interface StageCardProps extends UnitBase {
  /** Найвужча ланка труби: рамка accent, тег «вузько». */
  narrow?: boolean;
  /** Ланка стоїть або сповільнена: причина словами й залишок часу. */
  stall?: { reason: string; remainingSec: number; multiplier?: 0 | 0.5 };
  /** Лише для «Стройової частини»: кругла тап-печатка замість плашки іконки. */
  onTapSeal?: () => number;
  /** Замкнено до рівня 2 (Казначейство). */
  lockedUntilLevel?: 2;
}
export declare function StageCard(props: StageCardProps): React.ReactElement;

export interface BottleneckLineProps {
  streamsPerMin: Big;
  pipePerMin: Big;
  /** Назва найвужчої ланки або 'streams', або 'even'. */
  narrow: string | 'streams' | 'even';
  /** Ланка стоїть: секунди до відновлення. */
  stalledSec?: number;
}
export declare function BottleneckLine(props: BottleneckLineProps): React.ReactElement;

export interface ResourceTileProps {
  resource: 'paper' | 'fuel' | 'reputation';
  /** Коротке значення ≤ 8 знаків: «4 120», «5 год», «норма». */
  value: string;
  /** Підпис ≤ 10 знаків: «аркушів», «×1,25», «без бонусу». */
  caption: string;
  /** fuel: bonus (> 20%) | low | empty; reputation: low | norm | high. */
  state?: 'bonus' | 'low' | 'empty' | 'norm' | 'high';
  accessibilityLabel: string;
  onPress?: Press;
}
export declare function ResourceTile(props: ResourceTileProps): React.ReactElement;

export interface ProgressBarProps {
  value: number;
  max: number;
  variant?: 'card' | 'large' | 'paper' | 'steps';
  label?: string;
  /** Текст значення: «60%», «5 з 8», «100% · готово». */
  valueText?: string;
}
export declare function ProgressBar(props: ProgressBarProps): React.ReactElement;

export interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'neutral' | 'quiet' | 'paper';
  size?: 'l' | 'm' | 's';
  icon?: string;
  /** Число чи ціна, набирається Plex Mono: «372 800», «412 тис.». */
  amount?: string;
  /** Рядок під кнопкою: «Реклама 30 секунд», «Ще 8 балів до мінімуму в 30.». */
  note?: string;
  /** Недоступна: причина обов'язкова й показується текстом. */
  disabledReason?: string;
  accessibilityLabel?: string;
  onPress?: Press;
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface AdRewardButtonProps {
  /** Нагорода: «Забрати ×2 · 372 800» або «×2 до підписів на 4 год». */
  reward: string;
  state: 'ready' | 'loading' | 'unavailable' | 'limit';
  /** Скільки спроб лишилось сьогодні і скільки всього (3 з 3). */
  left?: number;
  total?: number;
  /** Для unavailable: «Немає зв'язку. Гра працює далі, спробуйте пізніше.» */
  reason?: string;
  /** Куплено «Без реклами»: кнопка «Забрати» без ролика, ліміти ті самі. */
  noAds?: boolean;
  layout?: 'cta' | 'row';
  onPress?: Press;
}
export declare function AdRewardButton(props: AdRewardButtonProps): React.ReactElement;

export interface SegmentedProps {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  /** fill — сегменти ділять ширину порівну (шторка); інакше — пігулки за вмістом (фільтр). */
  fill?: boolean;
  accessibilityLabel: string;
}
export declare function Segmented(props: SegmentedProps): React.ReactElement;

export interface BottomSheetProps {
  title: string;
  subtitle?: string;
  icon?: string;
  /** Закріплена внизу дія. */
  action?: ButtonProps;
  onClose: Press;
  children?: React.ReactNode;
}
export declare function BottomSheet(props: BottomSheetProps): React.ReactElement;

export interface ModalProps {
  variant: 'gear' | 'paper';
  title: string;
  body?: string;
  primary: ButtonProps;
  secondary?: ButtonProps;
  /** Незворотна дія: тап по затемненню не закриває. */
  irreversible?: boolean;
  children?: React.ReactNode;
}
export declare function Modal(props: ModalProps): React.ReactElement;

export interface ToastProps {
  /** ≤ 60 знаків, щонайбільше 2 рядки. */
  text: string;
  icon: string;
  tone?: 'event' | 'muted' | 'fail';
  action?: { label: string; onPress: Press };
  /** За замовчуванням dur-toast (4 с), з дією — 6 с. */
  durationMs?: number;
}
export declare function Toast(props: ToastProps): React.ReactElement;

export interface BannerProps {
  tone: 'alert' | 'accent' | 'neutral';
  icon: string;
  text: string;
  /** Секунди для таймера в тексті (Plex Mono 600). */
  timerSec?: number;
  actionLabel: string;
  onPress: Press;
}
export declare function Banner(props: BannerProps): React.ReactElement;

export type TabId = 'stroyova' | 'telegrams' | 'digital' | 'museum' | 'shop';
export interface TabBarProps {
  active: TabId;
  /** Лічильник нових телеграм; понад 9 — «9+». */
  telegramsNew?: number;
  digitalRecommended?: boolean;
  museumNew?: boolean;
  hidden?: boolean;
  onChange: (tab: TabId) => void;
}
export declare function TabBar(props: TabBarProps): React.ReactElement;

export interface TimerChipProps {
  remainingSec: number;
  format: 'duration' | 'clock';
  prefix?: 'ще' | 'в дорозі' | 'лишилось';
  tone?: 'neutral' | 'boost' | 'urgent' | 'done';
}
export declare function TimerChip(props: TimerChipProps): React.ReactElement;

export interface MultiplierChipProps {
  /** Сумарний множник: 2 → «×2», 1.5 → «×1,5». */
  value: number;
  /** «ще 3:41:12», «4 джерела», «назавжди», «12 год · межа». */
  caption: string;
  permanent?: boolean;
  onPress?: Press;
}
export declare function MultiplierChip(props: MultiplierChipProps): React.ReactElement;

export interface TelegramCardProps {
  kind: 'telegram' | 'note';
  number?: string;
  stamp?: StampWord;
  status: 'new' | 'inProgress' | 'drawer' | 'answered' | 'note';
  remainingSec?: number;
  title: string;
  meta: string;
  onPress: Press;
}
export declare function TelegramCard(props: TelegramCardProps): React.ReactElement;

export interface JournalCoverProps {
  /** Колір обкладинки: cover-olive | cover-brown | cover-navy | cover-black | cover-earth. */
  cover: 'olive' | 'brown' | 'navy' | 'black' | 'earth';
  /** Перше слово назви, капсом на етикетці: «Книга», «Журнал», «Стелажні». */
  head: string;
  /** Решта назви, до 3 рядків на етикетці; повна — у шторці експоната. */
  name: string;
  rarity: 'common' | 'rare' | 'legendary';
  bonus: string;
  /** Не знайдено: показати «???» і джерело. */
  locked?: { source: string };
  onPress?: Press;
}
export declare function JournalCover(props: JournalCoverProps): React.ReactElement;

export interface ChecklistRowProps {
  title: string;
  meta: string;
  price: Big;
  state: 'todo' | 'done' | 'short';
  /** Скільки бракує для state = short. */
  missing?: Big;
  onToggle: Press;
}
export declare function ChecklistRow(props: ChecklistRowProps): React.ReactElement;

/** Форматер: compact — 3 значущі цифри й тис./млн/млрд/aa…; counter — повне число до 10 млн, далі два знаки. */
export declare function formatBig(n: Big, mode: 'compact' | 'counter', rounding?: 'floor' | 'ceil' | 'round'): string;
/** «38 с», «42 хв», «5 год 12 хв», «2 дн 3 год». */
export declare function formatDuration(sec: number): string;
/** «02:14:37» (pad) або «3:41:12». */
export declare function formatClock(sec: number, pad?: boolean): string;
