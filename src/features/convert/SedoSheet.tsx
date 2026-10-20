// kombat-sheet у стані «Збій СЕДО» (013 FR-12): «Чекати» або «Роздрукувати» за аркуші; документ «Паперова копія електронного документа».
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { formatDuration, formatMult } from '@/economy/format';
import type { ConveyorStore } from '@/features/conveyor/store';
import { lineAt } from '@/features/telegrams/lines';
import { t as tgT } from '@/features/telegrams/texts';
import { color, radius, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { cvT, sedoT } from './texts';

export function SedoSheet({ store, onClose, onPrinted }: { store: ConveyorStore; onClose: () => void; onPrinted: () => void }) {
  const s = useStore(store);
  const [printed, setPrinted] = useState(false);
  const a = s.telegrams.sedo.active;
  const now = s.lastMs;
  const paper = s.cfg.params.sedoPrintPaper;
  const have = Math.floor(s.state.paper);
  const left = a ? formatDuration(Math.max(0, (a.endMs - now) / 1000)) : '';
  if (printed || !a || a.endMs <= now) {
    return (
      <View style={styles.scrim} testID="sedo-sheet">
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title}>{sedoT.title}</Text>
          {printed ? (
            <View style={styles.paper} testID="sedo-doc">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.docTitle}>{sedoT.doc}</Text>
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.stamp}>{sedoT.docStamp}</Text>
            </View>
          ) : null}
          <Button testID="sedo-ok" label={sedoT.ok} onPress={onClose} />
        </View>
      </View>
    );
  }
  const name = cvT.names[a.stageId] ?? a.stageId;
  return (
    <View style={styles.scrim} testID="sedo-sheet">
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.title} accessibilityRole="header">{sedoT.title}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.unit}>{sedoT.unit(name, formatMult(s.cfg.params.sedoFailMult), left)}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.line} testID="sedo-line">{lineAt('sedo.line', s.telegrams.deliveries)}</Text>
        <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{sedoT.waitText(left)}</Text>
        <Button testID="sedo-wait" variant="secondary" label={sedoT.wait(left)} onPress={onClose} />
        <Button
          testID="sedo-print"
          label={sedoT.print(paper)}
          disabled={have < paper}
          onPress={() => {
            const r = s.printSedo();
            if (!('error' in r)) {
              setPrinted(true);
              onPrinted();
            }
          }}
        />
        {have < paper ? <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.lack} testID="sedo-lack">{tgT.noPaper(paper - have)}</Text> : <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{sedoT.printHint}</Text>}
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
  lack: { ...type('caption'), color: color.fail },
  paper: { backgroundColor: color.paper, borderRadius: radius[4], padding: space[16], gap: space[6] },
  docTitle: { ...type('docTitle'), color: color.ink },
  stamp: { ...type('stampM'), color: color.stamp, borderWidth: 2, borderColor: color.stamp, paddingHorizontal: space[6], alignSelf: 'flex-start', textTransform: 'uppercase' },
});
