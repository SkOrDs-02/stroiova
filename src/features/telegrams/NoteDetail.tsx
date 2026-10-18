// note-detail (003 FR-27): записка без вибору; після відкриття прочитана. Етап 1 — «підсумок дзвінка» (002); вісточки — 05.
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { t as onb } from '@/features/onboarding/texts';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { t } from './texts';

export const NOTE_CALL = 'note_call';

/** Заголовок і зміст записки за id (артборд NoteDetail). */
export function noteView(id: string): { title: string; who: string; lines: string[] } {
  if (id === NOTE_CALL) return { title: t.noteCall, who: onb.b9Arch, lines: [onb.b9A1, onb.b9A2] };
  return { title: t.noteFallback, who: '', lines: [] };
}

export function NoteDetail({ store, uid, onClose }: { store: ConveyorStore; uid: string; onClose: () => void }) {
  const item = useStore(store, (s) => s.telegrams.inbox.find((x) => x.uid === uid));
  if (!item) return null;
  const v = noteView(item.id);
  return (
    <View style={styles.scrim} testID="note-detail">
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{v.title}</Text>
        {v.who ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.who}>{v.who}</Text> : null}
        {v.lines.map((l) => (
          <Text key={l} maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{l}</Text>
        ))}
        <Button testID="note-ok" label={t.noteOk} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bgDeep, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.text },
  who: { ...type('h4'), color: color.accent },
  line: { ...type('bodyL'), color: color.text },
});
