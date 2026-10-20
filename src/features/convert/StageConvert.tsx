// stage-convert (013 FR-6, FR-7): «було / стало», ціна в підписах (тримається, поки шторка відкрита, ВП-1), «Оцифрувати ланку».
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { capAt } from '@/economy/core';
import { formatBig, formatRate } from '@/economy/format';
import { convertInfo, convertPrice } from '@/economy/game/convert';
import { unitMult } from '@/economy/game/income';
import { itemsFor } from '@/economy/game/state';
import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { cvT } from './texts';

export function StageConvert({ store, onClose }: { store: ConveyorStore; onClose: () => void }) {
  const s = useStore(store);
  const levelCount = s.digit.counts[String(s.state.level)] ?? 0;
  const info = convertInfo(s.state, s.cfg, levelCount);
  // ціна фіксується на мить відкриття шторки (ВП-1)
  const [price] = useState(() => convertPrice(s.state, s.cfg));
  if (!info.next) {
    return (
      <View style={styles.scrim} testID="stage-convert">
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{cvT.status.done}</Text>
          <Button testID="convert-close" variant="secondary" label={cvT.back} onPress={onClose} />
        </View>
      </View>
    );
  }
  const stages = itemsFor(s.state, s.cfg).stages;
  const j = stages.findIndex((u) => u.id === info.next!.stageId);
  const stage = stages[j];
  const rateBefore = stage ? capAt(stage, s.state.stageLevels[j] ?? 0, s.cfg.params) * unitMult(s.state, stage.id) : 0;
  const mult = s.cfg.params.convert.mult;
  const lack = s.state.signatures < price;
  const can = info.status === 'available' && !lack;
  return (
    <View style={styles.scrim} testID="stage-convert">
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{cvT.title}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="convert-index">{cvT.index(info.next.index, info.total)}</Text>
        <View style={styles.pair}>
          <View style={styles.card} testID="convert-was">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{cvT.was}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.name}>{stage?.name ?? info.next.stageId}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rate}>{formatRate(rateBefore)}</Text>
          </View>
          <View style={[styles.card, styles.cardNow]} testID="convert-now">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.k}>{cvT.now}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.name}>{cvT.names[info.next.stageId] ?? info.next.stageId}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.rate}>{formatRate(rateBefore * mult)}</Text>
          </View>
        </View>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{cvT.immune}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.price} testID="convert-price">{`${cvT.price}: ${formatBig(price, 'price')}`}</Text>
        {info.status !== 'available' ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="convert-status">{cvT.status[info.status]}</Text> : null}
        {info.status === 'available' && lack ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.lack} testID="convert-lack">{cvT.lack(formatBig(price - s.state.signatures, 'price'))}</Text> : null}
        <Button
          testID="convert-ok"
          label={cvT.cta}
          disabled={!can}
          onPress={() => {
            const r = s.convertStage(price);
            if (!('error' in r)) onClose();
          }}
        />
        <Button testID="convert-close" variant="secondary" label={cvT.back} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bgDeep, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.text },
  muted: { ...type('bodyS'), color: color.muted },
  pair: { flexDirection: 'row', gap: space[8] },
  card: { flex: 1, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12], gap: space[2] },
  cardNow: { borderWidth: 1, borderColor: color.accent },
  k: { ...type('label'), color: color.muted },
  name: { ...type('cta'), color: color.text },
  rate: { ...type('num'), color: color.accent },
  price: { ...type('num'), color: color.text },
  lack: { ...type('caption'), color: color.fail },
});
