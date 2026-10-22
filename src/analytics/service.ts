// Сервіс аналітики (docs/analytics.md «Налаштування SDK»): інтерфейс, який реалізує PostHog у збірці з SDK (етап 2 релізу).
// У грі, тестах і розробці працює заглушка; справжня реалізація додається без зміни коду гри (як AdService, PurchaseService).
import type { UserProps } from './plan.generated';

export interface AnalyticsService {
  /** Надіслати подію; властивості вже перевірено й доповнено глобальними */
  capture(name: string, props: Record<string, unknown>): void;
  /** Один раз на першому запуску: distinct_id = install_id (UUID v4), `$set_once` для властивостей встановлення */
  identify(installId: string, setOnce?: Partial<UserProps>): void;
  /** Властивості користувача, що змінюються (`set`) */
  setUserProps(props: Partial<UserProps>): void;
  /** Вимикач «Аналітика» в налаштуваннях (010 FR-14): true - нічого не шлемо */
  optOut(out: boolean): void;
  /** При переході у фон і `session_end` */
  flush(): Promise<void>;
}

export const unavailableAnalytics: AnalyticsService = {
  capture: () => {},
  identify: () => {},
  setUserProps: () => {},
  optOut: () => {},
  flush: () => Promise.resolve(),
};

/** Службовий сервіс для тестів: запам'ятовує все, що надійшло */
export function memoryAnalytics() {
  const events: { name: string; props: Record<string, unknown> }[] = [];
  const calls: { identify: { installId: string; setOnce?: Partial<UserProps> }[]; user: Partial<UserProps>[]; optOut: boolean[]; flush: number } = { identify: [], user: [], optOut: [], flush: 0 };
  const service: AnalyticsService = {
    capture: (name, props) => {
      events.push({ name, props });
    },
    identify: (installId, setOnce) => {
      calls.identify.push({ installId, setOnce });
    },
    setUserProps: (props) => {
      calls.user.push(props);
    },
    optOut: (out) => {
      calls.optOut.push(out);
    },
    flush: () => {
      calls.flush++;
      return Promise.resolve();
    },
  };
  return { service, events, calls };
}
