// curio-detail (007 FR-24): документ запису - телеграма з вибором і наслідком або акт списаного подарунка. «Поділитися» (FR-26) - share-card.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { stackT } from '@/features/stack/texts';
import { fromName } from '@/features/story/texts';
import { Route } from '@/features/race/Route';
import { dur } from '@/features/race/present';
import { raceT } from '@/features/race/texts';
import { fill, resultRows } from '@/features/telegrams/present';
import { lineAt, poolSize } from '@/features/telegrams/lines';
import { t as tgT } from '@/features/telegrams/texts';
import { storyText } from '@/story/text';
import { packDef, telegram } from '@/telegrams/content';
import { repTier } from '@/telegrams/reputation';
import { color, radius, space } from '@/theme';
import { ShareAction } from '@/features/share/ShareCard';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { ddmmyyyy } from './present';
import { muT } from './texts';

export function CurioDetail({ store, seq, onClose }: { store: ConveyorStore; seq: number; onClose: () => void }) {
  const s = useStore(store);
  const e = s.museum.curios.find((c) => c.seq === seq);
  if (!e) return null;
  return (
    <View style={styles.scrim} testID="curio-detail">
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{muT.curioDetailTitle}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{muT.curioNo(e.seq)}</Text>
        <ScrollView contentContainerStyle={styles.scroll}>{e.kind === 'gift' ? <GiftDoc store={store} seq={seq} /> : e.kind === 'pack' ? <PackDoc store={store} seq={seq} /> : e.kind === 'stack' ? <StackDoc store={store} seq={seq} /> : e.kind === 'story' ? <StoryDoc store={store} seq={seq} /> : <TelegramDoc store={store} seq={seq} />}</ScrollView>
        <ShareAction store={store} entry={{ kind: 'curio', seq }} />
        <Button testID="curio-detail-ok" label={muT.curioBack} variant="ghost" onPress={onClose} />
      </View>
    </View>
  );
}

function TelegramDoc({ store, seq }: { store: ConveyorStore; seq: number }) {
  const s = useStore(store);
  const e = s.museum.curios.find((c) => c.seq === seq)!;
  const tel = e.telegramId ? telegram(e.telegramId) : undefined;
  const item = s.telegrams.inbox.find((x) => x.uid === e.uid);
  if (!tel) return null;
  const g = s.onboarding.gender;
  const f = (x: string) => (item ? fill(x, item, g) : x);
  const choice = e.choiceId ? tel.choices.find((c) => c.id === e.choiceId) : undefined;
  const tier = tgT.tier[repTier(s.telegrams.reputation.value, s.cfg.params)];
  const rows = item && item.result ? resultRows(item, tel, s.cfg, tier) : [];
  return (
    <View style={styles.paper} testID="curio-telegram">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{`${tgT.title(tel.no ?? '')} · ${ddmmyyyy(e.atMs)}`}</Text>
      {tel.from ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{tgT.from(tgT.who[tel.from] ?? tel.from)}</Text> : null}
      {tel.to ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{tgT.to(tgT.who[tel.to] ?? tel.to)}</Text> : null}
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{f(tel.title)}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{f(tel.body)}</Text>
      {choice ? (
        <>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{muT.choice}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc} testID="curio-choice">{f(choice.title)}</Text>
          {e.text ?? choice.result ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{f((e.text ?? choice.result)!)}</Text> : null}
        </>
      ) : (
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{muT.status.info}</Text>
      )}
      {rows.map(([k, v]) => (
        <View key={k + v} style={styles.row}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{k}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function PackDoc({ store, seq }: { store: ConveyorStore; seq: number }) {
  const s = useStore(store);
  const e = s.museum.curios.find((c) => c.seq === seq)!;
  const pk = e.pack!;
  const def = packDef(pk.packId);
  if (!def) return null;
  const sum = def.summary[pk.kind];
  const nos = pk.uids.map((u) => s.telegrams.inbox.find((x) => x.uid === u)).map((i) => (i ? telegram(i.id)?.no : undefined)).filter(Boolean).join(', ');
  return (
    <View style={styles.paper} testID="curio-pack">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{`${tgT.pkResultMeta(pk.no)} · ${ddmmyyyy(e.atMs)}`}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{tgT.pkResultTitle(pk.no)}</Text>
      {nos ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{muT.packNos(nos)}</Text> : null}
      {sum?.reply ?? sum?.note ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{(sum.reply ?? sum.note)!}</Text> : null}
      {sum?.result ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{sum.result}</Text> : null}
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{muT.status[e.status ?? 'info']}</Text>
    </View>
  );
}

function StoryDoc({ store, seq }: { store: ConveyorStore; seq: number }) {
  const s = useStore(store);
  const e = s.museum.curios.find((c) => c.seq === seq)!;
  const st = e.story!;
  const g = s.onboarding.gender;
  const me = s.onboarding.callsign?.text ?? '';
  return (
    <View style={styles.paper} testID="curio-story">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{`${muT.entryOf(e.seq)} · ${ddmmyyyy(e.atMs)}`}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{fromName(st.from)}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{storyText(st.title, g, me)}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{storyText(st.body, g, me)}</Text>
    </View>
  );
}

function StackDoc({ store, seq }: { store: ConveyorStore; seq: number }) {
  const s = useStore(store);
  const e = s.museum.curios.find((c) => c.seq === seq)!;
  return (
    <View style={styles.paper} testID="curio-stack">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{`${muT.entryOf(e.seq)} · ${ddmmyyyy(e.atMs)}`}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{muT.stackTitle}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{lineAt('stack.meter', 0)}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{stackT.share(e.stack?.cm ?? 0)}</Text>
    </View>
  );
}

function GiftDoc({ store, seq }: { store: ConveyorStore; seq: number }) {
  const s = useStore(store);
  const e = s.museum.curios.find((c) => c.seq === seq)!;
  const gft = e.gift!;
  const key = `lina.lost.${gft.type}`;
  const n = poolSize(key);
  // репліка Ліни стабільна для запису: не з мішка сесії, а за номером запису
  const line = n ? lineAt(key, e.seq) : '';
  return (
    <View style={styles.paper} testID="curio-gift">
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{muT.entryOf(e.seq)}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{raceT.act(gft.raceNo)}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{`${raceT.docKind} · ${raceT.short[gft.type]}`}</Text>
      <Route race={{ steps: gft.steps }} stepIdx={gft.stepsDone} />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{`${raceT.lostEntry[gft.type]}${raceT.lostEntryTail}`}</Text>
      <Row k={raceT.stepsDone} v={raceT.stepsOf(gft.stepsDone, gft.stepsTotal)} />
      <Row k={raceT.lacked} v={dur(gft.marginSec * 1000)} />
      <Row k={raceT.penalty} v={raceT.none} />
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{`${raceT.cancelled} ${ddmmyyyy(e.atMs)}`}</Text>
      {line ? (
        <>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{raceT.lina}</Text>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc} testID="curio-line">{line}</Text>
        </>
      ) : null}
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{k}</Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.cell}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: color.bg, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  scroll: { gap: space[8] },
  h2: { ...type('h2'), color: color.text },
  muted: { ...type('caption'), color: color.muted },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[6] },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('docTitle'), color: color.ink },
  doc: { ...type('docBody'), color: color.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8], borderBottomWidth: 1, borderBottomColor: color.paperLine, paddingVertical: space[2] },
  cell: { ...type('docBody'), color: color.ink, flexShrink: 1 },
});
