// 013 FR-27, FR-28: пул Дублів № 278-287 у спільному мішку з архівними повторами, умови dubMin/dubModifier; «У двох примірниках» у відповідях.
import { dubConfig, makeOffer, accept, newDub } from '@/dub/dub';

import { pick } from '../bag';
import { endlessPool, poolFor, telegram } from '../content';
import { answer, canChoose, copiesK, paperCost } from '../effects';
import { newCount, releaseKept } from '../schedule';
import { cfg, ctx, eco, tgWith } from '../test-utils';

const D0 = Date.UTC(2025, 9, 10);
const base = (dub?: { n: number; modifier: string | null }) => ({ nowMs: D0, level: 1, digitizations: 20, conversions: 0, month: 9, raceActive: null, repeatMinDays: 7, ...(dub ? { dub } : {}) });

/** Усе, що в пулах рівнів, уже отримано й відповіло давно: лишаються лише Дублі й архівні повтори */
function exhausted(extraIds: string[] = []) {
  const ids = [...new Set([...poolFor(1), ...poolFor(2), ...poolFor(3), ...poolFor(4), ...poolFor(5)].map((t) => t.id))];
  // телеграми з repeatEveryDays (№ 13) повертаються за власним графіком і заважали б перевірці мішка: вони щойно приходили
  const inbox = [...ids, ...extraIds].map((id, i) => {
    const recent = telegram(id)?.schedule?.repeatEveryDays != null;
    return { uid: `${id}#${i}`, id, kind: 'telegram' as const, receivedAt: D0 - (recent ? 1 : 400) * 86_400_000, status: 'archive' as const, answeredAt: D0 - (recent ? 1 : 399) * 86_400_000 };
  });
  return tgWith([], { inbox, deliveries: inbox.length });
}

describe('пул Дублів у мішку', () => {
  test('endlessPool: десять записів № 278-287, у звичайні пули рівнів не входять', () => {
    const ids = endlessPool().map((t) => t.id);
    expect(ids).toHaveLength(10);
    for (const lvl of [1, 2, 3, 4, 5]) for (const t of poolFor(lvl)) expect(ids).not.toContain(t.id);
  });

  test('без Дубля телеграми Дублів не приходять', () => {
    const endless = new Set(endlessPool().map((t) => t.id));
    for (let i = 0; i < 300; i++) {
      const c = pick(exhausted(), base(), () => Math.random());
      if (c) expect(endless.has(c.id)).toBe(false);
    }
  });

  test('Дубль 1: приходять лише ті, що за умовами (dubMin 2 і чужий модифікатор - ні)', () => {
    const got = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      const c = pick(exhausted(), base({ n: 1, modifier: 'two_copies' }), () => Math.random());
      if (c && telegram(c.id)?.schedule?.endless) got.add(c.id);
    }
    expect(got.size).toBeGreaterThan(3);
    for (const id of got) {
      const r = telegram(id)!.schedule!.requires!;
      expect(r.dubMin ?? 0).toBeLessThanOrEqual(1);
      if (r.dubModifier) expect(r.dubModifier).toBe('two_copies');
    }
    expect([...got]).not.toContain('tg_0285_mastic_seal');
    expect([...got]).not.toContain('tg_0286_no_printer');
    expect([...got]).not.toContain('tg_0287_qr_signer');
  });

  test('Дубль 2: № 283 і 287 (dubMin 2) стають доступні', () => {
    const got = new Set<string>();
    for (let i = 0; i < 2500; i++) {
      const c = pick(exhausted(), base({ n: 2, modifier: 'wet_seal' }), () => Math.random());
      if (c) got.add(c.id);
    }
    expect(got.has('tg_0287_qr_signer')).toBe(true);
    expect(got.has('tg_0285_mastic_seal')).toBe(true);
    expect(got.has('tg_0284_two_originals')).toBe(false);
  });

  test('отримана телеграма Дублів повертається лише як архівний повтор не частіше repeatMinDays', () => {
    const all = endlessPool().map((t) => t.id);
    const tg = exhausted(all);
    // відповіли 399 діб тому - повтор дозволений
    const c = pick(tg, base({ n: 2, modifier: 'wet_seal' }), () => 0);
    expect(c).not.toBeNull();
    // щойно відповіли - всі повтори ще рано
    const fresh = { ...tg, inbox: tg.inbox.map((x) => ({ ...x, receivedAt: D0 - 86_400_000, answeredAt: D0 - 86_400_000 })) };
    expect(pick(fresh, base({ n: 2, modifier: 'wet_seal' }), () => 0)).toBeNull();
  });
});

describe('№ 112 лежить у «Нових»', () => {
  test('не займає ліміт «Нових»; на dub_start іде в архів', () => {
    const tg = tgWith(['tg_0112_duplicate_on_paper'], {}, 'notice');
    expect(newCount(tg)).toBe(0);
    const r = releaseKept(tg, D0 + 5);
    expect(r.inbox[0]).toMatchObject({ status: 'archive', read: true, answeredAt: D0 + 5 });
    expect(releaseKept(r, D0 + 9)).toBe(r);
  });
});

describe('«У двох примірниках» (AC-19)', () => {
  const d = (() => {
    let x = makeOffer(newDub('t'), D0);
    x = accept({ ...x, offer: { ...x.offer!, modifier: 'two_copies' } }, D0, 0)!.d;
    return x;
  })();
  const c2 = dubConfig(cfg, d);
  const withPaper = (() => {
    for (const t of poolFor(1)) {
      const ch = t.choices.find((c) => (c.effects.paper ?? 0) > 0 && (c.effects.rep ?? 0) > 0);
      if (ch) return { tel: t, choice: ch };
    }
    throw new Error('немає варіанта з папером і репутацією');
  })();

  test('копія коштує вдвічі більше паперу, ціна й нагорода репутації ×2', () => {
    expect(copiesK(cfg)).toBe(1);
    expect(copiesK(c2)).toBe(2);
    const paper = withPaper.choice.effects.paper!;
    expect(paperCost(withPaper.choice.effects, {}, 2)).toBe(paper * 2);
    const tg = tgWith([withPaper.tel.id]);
    const uid = tg.inbox[0]!.uid;
    const r1 = answer(tg, eco({ paper: 100 }), uid, withPaper.choice.id, ctx())! as Exclude<ReturnType<typeof answer>, { error: string }>;
    const r2 = answer(tg, eco({ paper: 100 }), uid, withPaper.choice.id, { ...ctx(), cfg: c2 })! as Exclude<ReturnType<typeof answer>, { error: string }>;
    expect(r2.eco.paper).toBe(100 - paper * 2);
    expect(r1.eco.paper).toBe(100 - paper);
    expect(r2.item.result!.rep).toBe(withPaper.choice.effects.rep! * 2);
    expect(r1.item.result!.rep).toBe(withPaper.choice.effects.rep!);
  });

  test('штраф репутації не подвоюється; папір без запасу - відмова за подвоєною ціною', () => {
    const neg = poolFor(1).flatMap((t) => t.choices).find((c) => (c.effects.rep ?? 0) < 0 && !c.effects.paper);
    if (neg) {
      const tel = poolFor(1).find((t) => t.choices.includes(neg))!;
      const tg = tgWith([tel.id]);
      const r = answer(tg, eco({ paper: 100 }), tg.inbox[0]!.uid, neg.id, { ...ctx(), cfg: c2 }) as Exclude<ReturnType<typeof answer>, { error: string }>;
      expect(r.item.result!.rep).toBe(neg.effects.rep);
    }
    const paper = withPaper.choice.effects.paper!;
    const tg = tgWith([withPaper.tel.id]);
    expect(canChoose(tg, eco({ paper }), withPaper.choice, false, 1).ok).toBe(true);
    expect(canChoose(tg, eco({ paper }), withPaper.choice, false, 2).ok).toBe(false);
  });
});
