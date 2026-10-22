// Підставні сервіси для тестів 010: доставка сповіщень, посилання й буфер, поведінку яких задає тест.
import type { LinkService, NotificationService, PlannedPush, PushOpen, PushPermission, ReviewService } from './types';

export function fakeNotifications(init: { permission?: PushPermission; requestResult?: PushPermission; initial?: PushOpen } = {}) {
  const st = { permission: init.permission ?? ('not_asked' as PushPermission), requestResult: init.requestResult ?? ('granted' as PushPermission) };
  const log = { scheduled: [] as PlannedPush[], cancels: 0, requests: 0, opened: 0 };
  const subs = new Set<(p: PushOpen) => void>();
  const svc: NotificationService & { log: typeof log; set: (p: Partial<typeof st>) => void; tap: (p: PushOpen) => void } = {
    log,
    set: (p) => Object.assign(st, p),
    /** Тап по сповіщенню, поки гра жива */
    tap: (p) => subs.forEach((cb) => cb(p)),
    initialOpen: () => init.initial ?? null,
    listen: (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    permission: async () => st.permission,
    request: async () => {
      log.requests++;
      st.permission = st.requestResult;
      return st.permission;
    },
    schedule: async (items) => {
      log.scheduled = [...items];
    },
    cancelAll: async () => {
      log.cancels++;
      log.scheduled = [];
    },
    openSystemSettings: () => {
      log.opened++;
    },
  };
  return svc;
}

export function fakeLinks() {
  const log = { opened: [] as string[], copied: [] as string[] };
  const svc: LinkService & { log: typeof log } = {
    log,
    open: (url) => {
      log.opened.push(url);
    },
    copy: (text) => {
      log.copied.push(text);
    },
  };
  return svc;
}

export function fakeReview() {
  const log = { requests: 0 };
  const svc: ReviewService & { log: typeof log } = { log, request: () => void log.requests++ };
  return svc;
}
