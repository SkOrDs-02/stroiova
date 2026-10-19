// Тимчасова довідка повернення (001 FR-25…FR-28): сума, обрізка сховищем, «Стройова стояла»; рядки перевірки (004 FR-25). ×2 — 008, повний екран — 002.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatBig, formatDuration } from '@/economy/format';
import type { OfflineResult } from '@/economy/game/advance';
import { AdButton } from '@/features/monetization/AdButton';
import { adT } from '@/features/monetization/texts';
import { offlineView } from '@/monetization/monetization';
import { color, radius, size, space, typeScale, zIndex } from '@/theme';

import type { ConveyorStore } from './store';
import { localDate } from './store';

import { t } from './texts';

export function OfflineReturn({ res, inspRows = [], onClaim, store }: { res: OfflineResult; inspRows?: { k: string; v: string; bad: boolean }[]; onClaim: () => void; store?: ConveyorStore }) {
  const eco = store?.getState();
  return (
    <View style={styles.scrim} accessibilityViewIsModal>
        <View style={styles.sheet} testID="offline-return">
          <Text style={styles.title} accessibilityRole="header">{t.offTitle}</Text>
          {res.idle ? (
            <Text style={styles.body}>{t.offIdle}</Text>
          ) : (
            <>
              <Text style={styles.sum}>{`+${formatBig(res.earned, 'balance')}`}</Text>
              <Text style={styles.body}>
                {t.offCredited(formatDuration(res.creditedMs / 1000), formatDuration(res.awayMs / 1000))}
              </Text>
              {res.cappedMs > 0 ? <Text style={styles.body}>{t.offStorage(formatDuration(res.storageMs / 1000), formatDuration(res.cappedMs / 1000))}</Text> : null}
            </>
          )}
          {inspRows.map((r) => (
            <View key={r.k} style={styles.row} testID="offline-insp">
              <Text style={[styles.body, styles.k, r.bad && styles.bad]}>{r.k}</Text>
              <Text style={[styles.body, r.bad && styles.bad]}>{r.v}</Text>
            </View>
          ))}
          {store && eco && !res.idle ? (
            <AdButton
              store={store}
              placement="offline_double"
              view={offlineView(eco.state, eco.cfg, localDate(eco.offlineBackAt ?? eco.lastMs))}
              label={adT.off.x2(formatBig(res.earned * eco.cfg.params.offlineAdMult, 'balance'))}
              takeLabel={adT.off.x2(formatBig(res.earned * eco.cfg.params.offlineAdMult, 'balance'))}
              note={adT.note}
              takeNote={adT.takeNote}
              limitLabel={adT.off.limit}
              testID="offline-double"
            />
          ) : null}
          <Pressable testID="offline-claim" accessibilityRole="button" onPress={onClaim} style={styles.btn}>
            <Text style={styles.btnText}>{res.idle ? t.offBack : t.offTake(formatBig(res.earned, 'balance'))}</Text>
          </Pressable>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, zIndex: zIndex.modal, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  sheet: { backgroundColor: color.paper, borderRadius: radius[8], padding: space[20], gap: space[12] },
  title: { color: color.ink, fontSize: typeScale.h2.fontSize, lineHeight: typeScale.h2.lineHeight, fontWeight: typeScale.h2.fontWeight },
  sum: { color: color.ink, fontSize: typeScale.displayM.fontSize, lineHeight: typeScale.displayM.lineHeight, fontWeight: typeScale.displayM.fontWeight },
  body: { color: color.ink2, fontSize: typeScale.body.fontSize, lineHeight: typeScale.body.lineHeight },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space[8] },
  k: { flexShrink: 1 },
  bad: { color: color.alertPaper },
  btn: { minHeight: size.ctaHeight, borderRadius: radius[6], backgroundColor: color.accent, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: color.accentInk, fontSize: typeScale.cta.fontSize, fontWeight: typeScale.cta.fontWeight },
});
