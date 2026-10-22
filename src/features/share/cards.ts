// Зміст картинки для поширення (007 FR-27): документ зі штампом без позивного, рівня, балансу й інших даних гравця.
// Тексти беруться ті самі, що й на екранах; позивний на картинку не потрапляє ніколи (AC-16).
import { award, TYPES } from '@/awards/content';
import { recordNow } from '@/dub/dub';
import type { ConveyorStore } from '@/features/conveyor/store';
import { dupT, recordLine } from '@/features/dub/texts';
import { finT } from '@/features/finale/texts';
import { ddmmyyyy } from '@/features/museum/present';
import { muT } from '@/features/museum/texts';
import { dur } from '@/features/race/present';
import { raceT } from '@/features/race/texts';
import { gendered } from '@/features/onboarding/callsign';
import { stackT } from '@/features/stack/texts';
import { lineAt } from '@/features/telegrams/lines';
import { fill } from '@/features/telegrams/present';
import { t as tgT } from '@/features/telegrams/texts';
import { journal } from '@/museum/journals';
import type { ShareCardInfo, ShareEntry } from '@/share/types';
import { packDef, telegram } from '@/telegrams/content';
import type { InboxItem } from '@/telegrams/types';

import { shT } from './texts';

type Snap = ReturnType<ConveyorStore['getState']>;

export interface CardModel {
  /** `doc` - телеграма, акт, запис; `journal` - експонат; `award` - грамота */
  variant: 'doc' | 'journal' | 'award';
  meta: string[];
  title: string;
  body: string;
  rows: [string, string][];
  signer: string | null;
  stamp: string;
  date: string;
  /** `curio_entry_share`: тип і id запису, тип подарунка */
  analytics: ShareCardInfo;
}

/** Позивний на картинку не потрапляє: якщо текст його містить, заміняємо прочерком (AC-16, 007 FR-27) */
export function scrub(text: string, callsign: string | undefined): string {
  if (!callsign || callsign.trim().length < 2) return text;
  return text.split(callsign).join('___');
}

function telegramCard(s: Snap, item: InboxItem | undefined, telegramId: string, atMs: number, choiceId: string | undefined, resultText: string | null, id: string): CardModel | null {
  const tel = telegram(telegramId);
  if (!tel) return null;
  const g = s.onboarding.gender;
  const f = (x: string) => (item ? fill(x, item, g) : gendered(x, g));
  const choice = choiceId ? tel.choices.find((c) => c.id === choiceId) : undefined;
  const tail = choice ? [f(choice.title), resultText ?? choice.result ? f((resultText ?? choice.result)!) : null].filter(Boolean).join('. ') : '';
  return {
    variant: 'doc',
    meta: [`${tgT.title(tel.no ?? '')}`, ...(tel.from ? [tgT.from(tgT.who[tel.from] ?? tel.from)] : []), ...(tel.to ? [tgT.to(tgT.who[tel.to] ?? tel.to)] : [])],
    title: f(tel.title),
    body: tail ? `${f(tel.body)}\n\n${tail}` : f(tel.body),
    rows: [],
    signer: shT.signer,
    stamp: choice ? shT.stamp.done : shT.stamp.agreed,
    date: ddmmyyyy(atMs),
    analytics: { type: 'telegram', id },
  };
}

function curioCard(s: Snap, seq: number): CardModel | null {
  const e = s.museum.curios.find((c) => c.seq === seq);
  if (!e) return null;
  if (e.kind === 'gift' && e.gift) {
    const g = e.gift;
    return {
      variant: 'doc',
      meta: [muT.entryOf(e.seq), `${raceT.docKind} · ${raceT.short[g.type]}`],
      title: raceT.act(g.raceNo),
      body: `${raceT.lostEntry[g.type]}${raceT.lostEntryTail}`,
      rows: [
        [raceT.stepsDone, raceT.stepsOf(g.stepsDone, g.stepsTotal)],
        [raceT.lacked, dur(g.marginSec * 1000)],
        [raceT.penalty, raceT.none],
      ],
      signer: shT.signer,
      stamp: shT.stamp.cancelled,
      date: ddmmyyyy(e.atMs),
      analytics: { type: 'gift_written_off', id: g.raceId, giftType: g.type },
    };
  }
  if (e.kind === 'pack' && e.pack) {
    const def = packDef(e.pack.packId);
    const sum = def?.summary[e.pack.kind];
    return {
      variant: 'doc',
      meta: [muT.entryOf(e.seq), tgT.pkResultMeta(e.pack.no)],
      title: tgT.pkResultTitle(e.pack.no),
      body: [sum?.reply ?? sum?.note, sum?.result].filter(Boolean).join('\n\n'),
      rows: [],
      signer: shT.signer,
      stamp: shT.stamp.done,
      date: ddmmyyyy(e.atMs),
      analytics: { type: 'pack', id: e.pack.packId },
    };
  }
  if (e.kind === 'stack') {
    return {
      variant: 'doc',
      meta: [muT.entryOf(e.seq), stackT.share(e.stack?.cm ?? 0)],
      title: muT.stackTitle,
      body: lineAt('stack.meter', 0),
      rows: [],
      signer: shT.signer,
      stamp: shT.stamp.credited,
      date: ddmmyyyy(e.atMs),
      analytics: { type: 'stack_meter', id: `curio_${e.seq}` },
    };
  }
  if (e.kind === 'telegram' && e.telegramId) {
    const item = s.telegrams.inbox.find((x) => x.uid === e.uid);
    return telegramCard(s, item, e.telegramId, e.atMs, e.choiceId ?? undefined, e.text ?? null, e.telegramId);
  }
  // записи сюжету поки не діляться: для них немає типу в плані, крім «Пташки-3» (014)
  return null;
}

/** Картка для запису; null - ділитися нічим (запис зник, тип не ділиться) */
export function cardOf(s: Snap, entry: ShareEntry, nowMs: number = s.lastMs): CardModel | null {
  const me = s.onboarding.callsign?.text;
  const card = ((): CardModel | null => {
    switch (entry.kind) {
      case 'curio':
        return curioCard(s, entry.seq);
      case 'telegram': {
        const item = s.telegrams.inbox.find((x) => x.uid === entry.uid);
        if (!item) return null;
        return telegramCard(s, item, item.id, item.answeredAt ?? item.receivedAt, item.choiceId, null, item.id);
      }
      case 'journal': {
        const j = journal(entry.no);
        const owned = s.museum.owned.find((o) => o.no === entry.no);
        if (!j || !owned) return null;
        // № 5: у грі - позивний, на картинці - sh.j5_flavor (AC-16)
        const flavor = j.flavor.includes('{позивний}') ? shT.j5Flavor : gendered(j.flavor, s.onboarding.gender);
        return {
          variant: 'journal',
          meta: [shT.museum, muT.detailTitle(j.no), muT.rarity[j.rarity]],
          title: j.title,
          body: `${flavor}\n\n${j.history}`,
          rows: j.sourceLabel ? [[muT.whence, j.sourceLabel]] : [],
          signer: null,
          stamp: shT.stamp.cancelled,
          date: ddmmyyyy(owned.atMs),
          analytics: { type: 'journal', id: j.id },
        };
      }
      case 'award': {
        const a = award(entry.id);
        if (!a || !s.awards.got[entry.id]) return null;
        // на грамоті немає позивного й дати (016 FR-36): бланк із прочерками; номер наказу - як на award-detail (AC-18)
        return {
          variant: 'award',
          meta: [TYPES[a.type].docTitle.replace('{orderNo}', String(s.awards.got[entry.id]!.orderNo ?? ''))],
          title: a.title,
          body: a.text,
          rows: [],
          signer: shT.awardee,
          stamp: shT.stamp.agreed,
          date: shT.blankDate,
          analytics: { type: 'award', id: a.id },
        };
      }
      case 'finale':
        // картка є лише після «Y» на сценарії фіналу (013 FR-21)
        if (s.finale.yMs == null) return null;
        return {
          variant: 'doc',
          meta: [finT.orderTitle],
          title: shT.finaleTitle,
          body: finT.off,
          rows: [],
          signer: shT.signer,
          stamp: shT.stamp.digital,
          date: ddmmyyyy(s.finale.yMs ?? nowMs),
          analytics: { type: 'finale_card', id: 'finale' },
        };
      case 'record': {
        const r = recordNow(s.dub, s.state.lifetimeCycle);
        if (r.dub < 1) return null;
        return {
          variant: 'doc',
          meta: [dupT.title(r.dub)],
          title: dupT.recTitle,
          body: recordLine(r.dub, r.lifetimeLog10),
          rows: [],
          signer: shT.signer,
          stamp: shT.stamp.credited,
          date: ddmmyyyy(nowMs),
          analytics: { type: 'personal_record', id: `dub_${r.dub}` },
        };
      }
    }
  })();
  if (!card) return null;
  return {
    ...card,
    meta: card.meta.map((m) => scrub(m, me)),
    title: scrub(card.title, me),
    body: scrub(card.body, me),
    rows: card.rows.map(([k, v]) => [scrub(k, me), scrub(v, me)] as [string, string]),
  };
}
