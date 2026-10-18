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

export function KombatSheet({ store, onClose }: { store: ConveyorStore; onClose: () => void }) {
  const s = useStore(store);
  const a = s.telegrams.kombat.active;
  const now = s.lastMs;
  const found = !a || a.endMs <= now;
  const left = a ? formatDuration(Math.max(0, (a.endMs - now) / 1000)) : '';
  const cost = runnerCost(s.state, s.cfg);
  const sent = a?.runnerAtMs != null;
  return (
    <View style={styles.scrim} testID={found ? 'kombat-found' : 'kombat-sheet'}>
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{found ? t.kbFound : t.kbTitle}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.unit}>{`${t.kbUnit}, ${formatMult(s.cfg.params.kombatMult)}${found ? '' : ` · ${t.left(left)}`}`}</Text>
        {found ? (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{lineAt('granit.success', s.telegrams.deliveries)}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{t.kbFoundLine}</Text>
            <Button testID="kombat-ok" label={t.kbOk} onPress={onClose} />
          </>
        ) : (
          <>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line}>{lineAt('kb.wait', s.telegrams.deliveries)}</Text>
            <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{t.kbWaitText(left)}</Text>
            <Button testID="kombat-wait" variant="secondary" label={t.kbWait(left)} onPress={onClose} />
            {sent ? (
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted} testID="kombat-running">{t.kbRunning(left)}</Text>
            ) : (
              <>
                <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{t.kbRunnerText(formatDuration(s.cfg.params.kombatRunnerMin * 60))}</Text>
                <Button testID="kombat-runner" label={`${t.kbRunner} · ${formatBig(cost, 'price')}`} disabled={s.state.signatures < cost} onPress={() => s.sendRunner()} />
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
