// Підставні сервіси для тестів 010: доставка сповіщень, посилання й буфер, поведінку яких задає тест.
import type { LinkService, NotificationService, PlannedPush, PushPermission } from './types';

export function fakeNotifications(init: { permission?: PushPermission; requestResult?: PushPermission } = {}) {
  const st = { permission: init.permission ?? ('not_asked' as PushPermission), requestResult: init.requestResult ?? ('granted' as PushPermission) };
  const log = { scheduled: [] as PlannedPush[], cancels: 0, requests: 0, opened: 0 };
  const svc: NotificationService & { log: typeof log; set: (p: Partial<typeof st>) => void } = {
    log,
    set: (p) => Object.assign(st, p),
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
