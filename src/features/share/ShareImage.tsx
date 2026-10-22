// Картинка для поширення (007 FR-27, FR-28): документ 4:5 на папері зі штампом, назвою гри й рядком sh.tagline.
// Макет - 375 × 468,75 dp (ширина артбордів), картинка - той самий макет × `scale`: для PNG 1080 px це 1080 / 375 / PixelRatio.
// Масштаб шрифту системи не діє: картинка однакова на всіх телефонах.
import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { color, radius, space, typeScale } from '@/theme';
import { SHARE_H, SHARE_W } from '@/share/size';
import { fitText } from '@/share/fit';
import { type } from '@/ui/type';

import type { CardModel } from './cards';
import { shT } from './texts';

/** Ширина макета, dp: картинка 1080 px = макет × 2,88 */
export const BASE_W = 375;
export const BASE_H = (BASE_W * SHARE_H) / SHARE_W;
/** dp макета -> px картинки */
const PX = SHARE_W / BASE_W;

const PAD = space[24];
const META_LINE = typeScale.docMeta.lineHeight;
const TITLE_LINE = typeScale.h2.lineHeight;
const ROW_LINE = typeScale.docTable.lineHeight + space[4];
/** Підвал: підпис і штамп, смуга з назвою гри */
const FOOT = space[28] * 2 + typeScale.stampL.lineHeight + typeScale.h4.lineHeight + typeScale.caption.lineHeight;

/** Поле основного тексту в px картинки (для `fitText`) */
export function bodyBox(card: Pick<CardModel, 'meta' | 'rows'>): { width: number; height: number } {
  const h = BASE_H - PAD * 2 - card.meta.length * META_LINE - TITLE_LINE * 2 - space[12] * 3 - card.rows.length * ROW_LINE - FOOT;
  return { width: (BASE_W - PAD * 2) * PX, height: Math.max(0, h) * PX };
}

export function ShareImage({ card, scale, ref, testID }: { card: CardModel; scale: number; ref?: Ref<View>; testID?: string }) {
  const z = (n: number) => n * scale;
  const fit = fitText(card.body, bodyBox(card));
  // кегль тексту - у px картинки; макет у dp, тож ділимо на PX
  const fs = (fit.fontSize / PX) * scale;
  const t = (k: keyof typeof typeScale) => {
    const s = type(k);
    return { ...s, fontSize: z(s.fontSize ?? 0), ...(s.lineHeight ? { lineHeight: z(s.lineHeight) } : {}), ...(s.letterSpacing != null ? { letterSpacing: z(s.letterSpacing) } : {}) };
  };
  const centered = card.variant === 'award';
  return (
    <View ref={ref} collapsable={false} testID={testID} style={[styles.paper, { width: z(BASE_W), height: z(BASE_H), padding: z(PAD), gap: z(space[12]) }]}>
      <View>
        {card.meta.map((m, i) => (
          <Text key={i} allowFontScaling={false} numberOfLines={1} style={[t('docMeta'), styles.ink2, centered && styles.center]}>
            {m}
          </Text>
        ))}
      </View>
      <Text allowFontScaling={false} numberOfLines={2} style={[t('h2'), styles.ink, centered && styles.center]} testID="share-title">
        {card.title}
      </Text>
      <View style={[styles.rule, { height: z(1) }]} />
      <Text allowFontScaling={false} style={[t('docBody'), styles.ink, { fontSize: fs, lineHeight: fs * 1.35 }, styles.grow, centered && styles.center]} testID="share-body">
        {fit.text}
      </Text>
      {card.rows.map(([k, v], i) => (
        <View key={i} style={[styles.row, { paddingVertical: z(space[2]), borderBottomWidth: z(1) }]}>
          <Text allowFontScaling={false} style={[t('docTable'), styles.ink]}>{k}</Text>
          <Text allowFontScaling={false} style={[t('docTable'), styles.ink]}>{v}</Text>
        </View>
      ))}
      <View style={[styles.foot, { gap: z(space[8]) }]}>
        <View style={styles.grow}>
          {card.signer ? (
            <Text allowFontScaling={false} style={[t('docMeta'), styles.ink2]}>{card.signer}</Text>
          ) : null}
          <Text allowFontScaling={false} style={[t('docMeta'), styles.ink2]}>{card.date}</Text>
        </View>
        <Text
          allowFontScaling={false}
          testID="share-stamp"
          style={[t('stampL'), styles.stamp, { borderWidth: z(3), borderRadius: z(radius[4]), paddingHorizontal: z(space[8]), paddingVertical: z(space[2]) }]}
        >
          {card.stamp}
        </Text>
      </View>
      <View style={[styles.brand, { paddingTop: z(space[8]), borderTopWidth: z(1) }]}>
        <Text allowFontScaling={false} style={[t('h4'), styles.ink]}>{shT.gameName}</Text>
        <Text allowFontScaling={false} style={[t('caption'), styles.ink2]}>{shT.tagline}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { backgroundColor: color.paper, overflow: 'hidden' },
  ink: { color: color.ink },
  ink2: { color: color.ink2 },
  center: { textAlign: 'center' },
  grow: { flex: 1 },
  rule: { backgroundColor: color.paperRule },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderBottomColor: color.paperLine },
  foot: { flexDirection: 'row', alignItems: 'flex-end' },
  // штамп #4A3D9E (принцип IV), трохи навскіс, як печатка на папері
  stamp: { color: color.stamp, borderColor: color.stamp, textTransform: 'uppercase', transform: [{ rotate: '-6deg' }] },
  brand: { borderTopColor: color.paperRule },
});
