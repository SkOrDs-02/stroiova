// credits (013 FR-21): титри як наказ «Про особовий склад гри» з content/credits.json. Крок завершується закриттям; із `about` відкриваються повторно.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import creditsJson from '../../../content/credits.json';
import type { ConveyorStore } from '@/features/conveyor/store';
import { beatById } from '@/story/content';
import { storyText } from '@/story/text';
import { color, radius, space } from '@/theme';
import { ShareAction } from '@/features/share/ShareCard';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { finT } from './texts';

interface CreditLine {
  name?: string;
  post?: string;
  beat?: string;
  placeholder?: string;
}
interface Section {
  heading: string;
  lines: CreditLine[];
}
const CREDITS = creditsJson as unknown as { title: string; header: { text: string }[]; sections: Section[] };

/** Рядки титрів у порядку показу: placeholder-и автора в грі не показуються; `beat` дає рядок сюжету, якщо його вже запущено */
export function creditRows(story: { fired: Record<string, unknown>; delivered: Record<string, unknown> }, gender: 'm' | 'f' | null, callsign: string): { heading: string; lines: string[] }[] {
  return CREDITS.sections.map((s) => ({
    heading: storyText(s.heading, gender, callsign),
    lines: s.lines.flatMap((l) => {
      if (l.placeholder) return [];
      if (l.beat) {
        const started = story.fired[l.beat] != null || story.delivered[l.beat] != null;
        const line = (beatById(l.beat)?.payload as { line?: string } | undefined)?.line;
        return started && line ? [storyText(line, gender, callsign)] : [];
      }
      return [`${storyText(l.name ?? '', gender, callsign)} · ${storyText(l.post ?? '', gender, callsign)}`];
    }),
  })).filter((s) => s.lines.length > 0);
}

export function Credits({ store, onClose, final }: { store: ConveyorStore; onClose: () => void; /** Крок фіналу (інакше повторний показ з about) */ final: boolean }) {
  const insets = useSafeAreaInsets();
  const o = useStore(store, (s) => s.onboarding);
  const story = useStore(store, (s) => s.story);
  const me = o.callsign?.text ?? '';
  const rows = creditRows(story, o.gender, me);
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[16] }]} testID="credits">
      <ScrollView contentContainerStyle={styles.paper} testID="credits-scroll">
        {CREDITS.header.map((h) => (
          <Text key={h.text} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.head}>{storyText(h.text, o.gender, me)}</Text>
        ))}
        {rows.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h}>{s.heading}</Text>
            {s.lines.map((l) => (
              <Text key={l} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{l}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
      {/* FR-21: картка «Армію переведено на цифру» */}
      <ShareAction store={store} entry={{ kind: 'finale' }} />
      <Button
        testID="credits-close"
        label={finT.creditsClose}
        onPress={() => {
          if (final) store.getState().finaleComplete('credits');
          onClose();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: color.bgDeep, padding: space[16], gap: space[12] },
  paper: { backgroundColor: color.paper, borderRadius: radius[8], padding: space[16], gap: space[12] },
  head: { ...type('h4'), color: color.ink, textAlign: 'center' },
  section: { gap: space[4] },
  h: { ...type('label'), color: color.ink },
  line: { ...type('body'), color: color.ink },
});
