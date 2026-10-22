// level-up (006 FR-25, 011 FR-9): «Наказ № 2 про переведення до штабу бригади» і «Наказ № 3 ... до штабу командування» і «Наказ № 4 ... до зали доповідей»; бали переходять.
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { dupT } from '@/features/dub/texts';

import { digitT } from './texts';

export function LevelUp({ store }: { store: ConveyorStore }) {
  const s = useStore(store);
  // церемонія ще йде, а стан уже на новому рівні: який наказ, каже рівень, з якого перейшли
  const from = s.digit.ceremony?.level ?? 1;
  const to3 = from === 2;
  const to4 = from === 3;
  const to5 = from >= 4;
  const dubN = s.dub.n;
  // 013 FR-28: у Дублі наказ про переведення короткий - заголовок і бали, без розповіді й реплік
  const docTitle = to5 ? digitT.l5DocTitle : to4 ? digitT.l4DocTitle : to3 ? digitT.l3DocTitle : digitT.l2DocTitle;
  const points = (to5 ? digitT.l5Points : to4 ? digitT.l4Points : to3 ? digitT.l3Points : digitT.l2Points)(s.state.prestigePoints);
  return (
    <View style={styles.scrim} testID="level-up">
      <View style={styles.wrap} accessibilityViewIsModal>
        {dubN >= 1 ? (
          <View style={styles.paper} testID="level-up-dub">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{dupT.levelUpShort(dubN)}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{docTitle}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc} testID="level-points">{points}</Text>
          </View>
        ) : to5 ? (
          <View style={styles.paper} testID="level-up-r5">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{digitT.l5DocNo}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{digitT.l5DocTitle}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l5l1}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l5Place}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l5l3}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc} testID="level-points">{digitT.l5Points(s.state.prestigePoints)}</Text>
          </View>
        ) : to4 ? (
          <View style={styles.paper} testID="level-up-r4">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{digitT.l4DocNo}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{digitT.l4DocTitle}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l4l1}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l4Place}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l4l3}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc} testID="level-points">{digitT.l4Points(s.state.prestigePoints)}</Text>
          </View>
        ) : to3 ? (
          <View style={styles.paper} testID="level-up-r3">
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{digitT.l3DocNo}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{digitT.l3DocTitle}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l3l1}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l3Place}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l3l3}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc} testID="level-points">{digitT.l3Points(s.state.prestigePoints)}</Text>
          </View>
        ) : (
          <>
            <View style={styles.paper}>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.meta}>{digitT.l2DocNo}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{digitT.l2DocTitle}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l2l1}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l2l2}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l2l3}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc}>{digitT.l2Commission}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.doc} testID="level-points">{digitT.l2Points(s.state.prestigePoints)}</Text>
            </View>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{digitT.l2Kava2}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.quote}>{digitT.l2Kava}</Text>
          </>
        )}
        <Button testID="level-up-ok" label={to5 ? digitT.l5Cta : to4 ? digitT.l4Cta : to3 ? digitT.l3Cta : digitT.l2Cta} onPress={s.closeDigitStep} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  wrap: { gap: space[8] },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[6] },
  meta: { ...type('docMeta'), color: color.ink2 },
  title: { ...type('docTitle'), color: color.ink },
  doc: { ...type('docBody'), color: color.ink },
  muted: { ...type('caption'), color: color.muted },
  quote: { ...type('body'), color: color.text, backgroundColor: color.surface, borderRadius: radius[8], padding: space[12] },
});
