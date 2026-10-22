// track(name, props): одна обгортка для всіх подій (docs/analytics.md). Перевіряє тип і перелік за планом, додає глобальні властивості,
// поважає вимикач «Аналітика» і вибірку. Невідому подію чи хибні властивості відкидає (`before_send`), у dev і тестах - гучно.
import type { AnalyticsService } from './service';
import { EVENTS, PLAN_VERSION, type EventName, type EventProps, type GlobalProps } from './plan.generated';
import { validateEvent, validateGlobals } from './validate';

export interface TrackerCtx {
  service: AnalyticsService;
  /** Глобальні властивості на мить події (стор збирає зі стану); `analytics_plan_version` додає обгортка */
  globals: () => Omit<GlobalProps, 'analytics_plan_version'>;
  /** Вимикач «Аналітика» в налаштуваннях увімкнено */
  enabled: () => boolean;
  /** Пристрій у вибірці детальних економічних подій */
  sampled: () => boolean;
  /** dev і тести: помилка плану кидається, а не лише повідомляється */
  strict?: boolean;
  /** Куди повідомити про відкинуту подію (за замовчуванням консоль у dev) */
  onInvalid?: (name: string, errors: string[]) => void;
}

export interface Tracker {
  track<N extends EventName>(name: N, props: EventProps[N], globals?: Partial<GlobalProps>): boolean;
  /** Кількість відкинутих через помилки плану подій (для тестів і `app_error_log`) */
  readonly dropped: () => number;
}

export function createTracker(ctx: TrackerCtx): Tracker {
  let dropped = 0;
  const fail = (name: string, errors: string[]) => {
    dropped++;
    ctx.onInvalid?.(name, errors);
    if (ctx.strict) throw new Error(`track(${name}): ${errors.join('; ')}`);
  };
  return {
    dropped: () => dropped,
    track(name, props, override) {
      if (!ctx.enabled()) return false;
      const def = EVENTS[name];
      // невідому подію відкидає `before_send`; типи цього не допустять, але JS-виклик чи застарілий мапінг - можуть
      if (!def) {
        fail(name, [`подію ${name} не описано в tracking-plan.yaml`]);
        return false;
      }
      if (def.sampling === 'econ_detail' && !ctx.sampled()) return false;
      const errors = validateEvent(name, props as Record<string, unknown>);
      if (errors.length) {
        fail(name, errors);
        return false;
      }
      const globals = { ...ctx.globals(), ...override, analytics_plan_version: PLAN_VERSION };
      const gErrors = validateGlobals(globals);
      if (gErrors.length) {
        fail(name, gErrors);
        return false;
      }
      ctx.service.capture(name, { ...globals, ...(props as Record<string, unknown>) });
      return true;
    },
  };
}
