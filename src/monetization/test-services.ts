// Підставні сервіси для тестів 008: ролик і стор, поведінку яких задає тест.
import type { AdAvailability, AdResult, AdService, ProductId, PurchaseResult, PurchaseService, Rights, StoreStatus } from './types';

export function fakeAds(init: { availability?: AdAvailability; result?: AdResult } = {}): AdService & { shown: string[]; set: (p: { availability?: AdAvailability; result?: AdResult }) => void } {
  const st = { availability: init.availability ?? 'ready', result: init.result ?? ({ kind: 'earned' } as AdResult) };
  const shown: string[] = [];
  return {
    shown,
    set: (p) => Object.assign(st, p),
    availability: () => st.availability,
    show: async (placement) => {
      shown.push(placement);
      return st.result;
    },
  };
}

export function fakePurchases(init: { status?: StoreStatus; prices?: Partial<Record<ProductId, string>>; result?: PurchaseResult; rights?: Rights | null; restore?: { kind: 'ok'; owned: ProductId[] } | { kind: 'error' } } = {}) {
  const st = {
    status: init.status ?? ('ready' as StoreStatus),
    prices: init.prices ?? { no_ads: '199 ₴', starter_pack: '79 ₴', storage_24h: '99 ₴' },
    result: init.result ?? ({ kind: 'success' } as PurchaseResult),
    rights: init.rights === undefined ? null : init.rights,
    restore: init.restore ?? ({ kind: 'ok', owned: [] } as { kind: 'ok'; owned: ProductId[] } | { kind: 'error' }),
  };
  const bought: ProductId[] = [];
  const svc: PurchaseService & { bought: ProductId[]; set: (p: Partial<typeof st>) => void } = {
    bought,
    set: (p) => Object.assign(st, p),
    status: () => st.status,
    prices: () => st.prices,
    purchase: async (id) => {
      bought.push(id);
      return st.result;
    },
    restore: async () => st.restore,
    rights: async () => st.rights,
  };
  return svc;
}
