// «Переїзд» (017): move-intro → move-game (20 с ігрового часу) → move-result. Пропуск - найгірший результат (FR-10, рішення 121).
// Таймер іде лише на передньому плані (FR-5): у фоні стоїть; вбивство застосунку повертає міні-гру на початок (стан гри - лише в пам'яті).
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ConveyorStore } from '@/features/conveyor/store';
import { MOVE_MS, boxAt } from '@/move/move';
import { color, radius, size, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { moveT } from './texts';

/** Крок таймера; довша пауза між тиками (фон, зависання) не зараховується */
const TICK_MS = 100;
const MAX_STEP_MS = 250;

export interface MoveOutcome {
  level: number;
  stacked: number;
  total: number;
  lost: number;
  skipped: boolean;
}

export function MoveIntro({ store, onStart, onDone }: { store: ConveyorStore; onStart: () => void; onDone: (r: MoveOutcome) => void }) {
  const p = store.getState().cfg.params;
  return (
    <View style={styles.scrim} testID="move-intro">
      <View style={styles.wrap} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header" testID="mi-title">
          {moveT.introTitle}
        </Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.body} testID="mi-body">
          {moveT.introBody(MOVE_MS / 1000, p.moveBoxes)}
        </Text>
        <Button testID="mi-start" label={moveT.start} onPress={onStart} />
        <Button testID="mi-skip" variant="ghost" label={moveT.skip} onPress={() => onDone(finish(store, 0, true))} />
      </View>
    </View>
  );
}

export function MoveGame({ store, onDone }: { store: ConveyorStore; onDone: (r: MoveOutcome) => void }) {
  const insets = useSafeAreaInsets();
  const total = store.getState().cfg.params.moveBoxes;
  const [elapsed, setElapsed] = useState(0);
  const [stacked, setStacked] = useState<number[]>([]);
  const st = useRef({ stacked: 0, ended: false });
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let prev = Date.now();
    let acc = 0;
    const id = setInterval(() => {
      const now = Date.now();
      const step = Math.min(MAX_STEP_MS, Math.max(0, now - prev));
      prev = now;
      if (store.getState().background || st.current.ended) return;
      acc += step;
      if (acc >= MOVE_MS) {
        st.current.ended = true;
        clearInterval(id);
        done.current(finish(store, st.current.stacked, false));
        return;
      }
      setElapsed(acc);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [store]);

  const box = boxAt(elapsed, store.getState().cfg.params);
  const ready = box != null && !stacked.includes(box);
  const tap = () => {
    if (box == null || stacked.includes(box) || st.current.ended) return;
    const next = [...stacked, box];
    st.current.stacked = next.length;
    setStacked(next);
    // склав усі - чекати кінця 20 с нема чого
    if (next.length >= total) {
      st.current.ended = true;
      done.current(finish(store, next.length, false));
    }
  };
  const left = Math.max(0, Math.ceil((MOVE_MS - elapsed) / 1000));
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="move-game" accessibilityViewIsModal>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">
        {moveT.gameTitle}
      </Text>
      <View style={styles.row}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.num} testID="mg-left" accessibilityLiveRegion="polite">
          {moveT.left(left)}
        </Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.num} testID="mg-count">
          {moveT.stacked(stacked.length, total)}
        </Text>
      </View>
      <Pressable testID="mg-box" accessibilityRole="button" accessibilityLabel={ready ? moveT.box(box + 1) : moveT.wait} accessibilityHint={moveT.boxHint} accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={tap} style={[styles.box, !ready && styles.boxOff]}>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.boxText}>
          {ready ? moveT.box(box + 1) : moveT.wait}
        </Text>
      </Pressable>
    </View>
  );
}

export function MoveResult({ r, sheet, onClose }: { r: MoveOutcome; sheet: boolean; onClose: () => void }) {
  return (
    <View style={styles.scrim} testID="move-result">
      <View style={styles.paper} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>
          {moveT.resultMeta}
        </Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docTitle} accessibilityRole="header">
          {moveT.resultTitle(r.level)}
        </Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docBody} testID="mr-stacked">
          {r.skipped ? moveT.skipped : moveT.resultStacked(r.stacked, r.total)}
        </Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docBody} testID="mr-lost">
          {r.stacked >= r.total ? moveT.perfect : moveT.resultLost(Math.round(r.lost))}
        </Text>
        {sheet ? (
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docBody} testID="mr-sheet">
            {moveT.sheet}
          </Text>
        ) : null}
        <Button testID="mr-close" label={moveT.close} onPress={onClose} />
      </View>
    </View>
  );
}

function finish(store: ConveyorStore, stacked: number, skipped: boolean): MoveOutcome {
  const g = store.getState();
  const level = g.state.level;
  const lost = g.moveFinish(stacked, skipped);
  return { level, stacked: skipped ? 0 : stacked, total: g.cfg.params.moveBoxes, lost, skipped };
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  wrap: { backgroundColor: color.bg, borderRadius: radius[12], padding: space[16], gap: space[12] },
  paper: { backgroundColor: color.paper, borderRadius: radius[8], padding: space[16], gap: space[8] },
  h2: { ...type('h2'), color: color.text },
  body: { ...type('body'), color: color.text },
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bgDeep, padding: space[16], gap: space[16], justifyContent: 'center' },
  title: { ...type('h1'), color: color.text, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  num: { ...type('numL'), color: color.text },
  box: { minHeight: size.ctaHeight * 3, borderRadius: radius[8], backgroundColor: color.paper, borderWidth: 2, borderColor: color.paperRule, alignItems: 'center', justifyContent: 'center', padding: space[16] },
  boxOff: { backgroundColor: color.surface, borderColor: color.border },
  boxText: { ...type('docTitle'), color: color.ink },
  meta: { ...type('docMeta'), color: color.ink2 },
  docTitle: { ...type('docTitle'), color: color.ink },
  docBody: { ...type('docBody'), color: color.ink },
});
