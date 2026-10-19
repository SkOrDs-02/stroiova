// kombat-sheet (003 FR-28): «Резолюції комбата» ×0,25; «Чекати» безкоштовно або посильний за підписи; «знайшли».
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatBig, formatDuration, formatMult } from '@/economy/format';
import type { ConveyorStore } from '@/features/conveyor/store';
import { runnerCost } from '@/telegrams/events';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { lineAt } from './lines';
import { t } from './texts';

export function KombatSheet({ store, onClose, kind = 'kombat' }: { store: ConveyorStore; onClose: () => void; kind?: 'kombat' | 'meeting' }) {
  const s = useStore(store);
  const meeting = kind === 'meeting';
  const a = meeting ? s.telegrams.meeting.active : s.telegrams.kombat.active;
  const now = s.lastMs;
  const found = !a || a.endMs <= now;
  const left = a ? formatDuration(Math.max(0, (a.endMs - now) / 1000)) : '';
  const cost = runnerCost(s.state, s.cfg);
  const sent = a?.runnerAtMs != null;
  const granit = a ? s.sessionLines.byUid[`${meeting ? 'meeting' : 'kombat'}:${a.startMs}`] : undefined;
  const mult = meeting ? s.cfg.params.naradaMult : s.cfg.params.kombatMult;
  const id = meeting ? 'meeting' : 'kombat';
  return (
    <View style={styles.scrim} testID={found ? `${id}-found` : `${id}-sheet`}>
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{meeting ? (found ? t.mtFound : t.mtTitle) : found ? t.kbFound : t.kbTitle}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.unit}>{`${meeting ? t.mtUnit : t.kbUnit}, ${formatMult(mult)}${found ? '' : ` · ${t.left(left)}`}`}</Text>
        {found ? (
          <>
            {granit ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line} testID={`${id}-granit`}>{granit}</Text> : null}
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{meeting ? t.mtFoundLine : t.kbFoundLine}</Text>
            <Button testID={`${id}-ok`} label={t.kbOk} onPress={onClose} />
          </>
        ) : (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{lineAt(meeting ? 'kava.narada_wait' : 'kb.wait', s.telegrams.deliveries)}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{meeting ? t.mtWaitText(left) : t.kbWaitText(left)}</Text>
            <Button testID={`${id}-wait`} variant="secondary" label={t.kbWait(left)} onPress={onClose} />
            {sent ? (
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID={`${id}-running`}>{meeting ? t.mtRunning(left) : t.kbRunning(left)}</Text>
            ) : (
              <>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{meeting ? t.mtNoteText(formatDuration(s.cfg.params.kombatRunnerMin * 60)) : t.kbRunnerText(formatDuration(s.cfg.params.kombatRunnerMin * 60))}</Text>
                <Button testID={meeting ? 'meeting-note' : 'kombat-runner'} label={`${meeting ? t.mtNote : t.kbRunner} · ${formatBig(cost, 'price')}`} disabled={s.state.signatures < cost} onPress={() => (meeting ? s.sendNote() : s.sendRunner())} />
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bgDeep, borderTopLeftRadius: radius[12], borderTopRightRadius: radius[12], padding: space[16], gap: space[8] },
  title: { ...type('h2'), color: color.text },
  unit: { ...type('num'), color: color.accent },
  line: { ...type('bodyL'), color: color.text },
  muted: { ...type('bodyS'), color: color.muted },
});
