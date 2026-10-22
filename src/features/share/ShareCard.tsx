// share-card (007 FR-26…FR-29): кнопка «Поділитися» і прев'ю картинки; «Поділитися» на прев'ю відкриває системне меню (share-system).
// Прев'ю - та сама картинка в меншому масштабі; PNG знімається з окремої копії розміром 1080 px, схованої за краєм екрана.
import { useRef, useState } from 'react';
import { Modal, PixelRatio, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useStore } from 'zustand';

import type { ConveyorStore } from '@/features/conveyor/store';
import { SHARE_W } from '@/share/size';
import type { ShareEntry } from '@/share/types';
import { color, size, space } from '@/theme';
import { Button, MAX_FONT_SCALE } from '@/ui/Button';
import { type } from '@/ui/type';

import { cardOf } from './cards';
import { BASE_W, ShareImage } from './ShareImage';
import { shT } from './texts';

/** Кнопка «Поділитися» з прев'ю; нічого не рендерить, якщо ділитися нічим */
export function ShareAction({ store, entry, testID = 'share-open' }: { store: ConveyorStore; entry: ShareEntry; testID?: string }) {
  const [open, setOpen] = useState(false);
  const s = useStore(store);
  if (!cardOf(s, entry)) return null;
  return (
    <>
      <Button testID={testID} variant="secondary" label={shT.open} onPress={() => setOpen(true)} />
      {open ? <ShareCard store={store} entry={entry} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function ShareCard({ store, entry, onClose }: { store: ConveyorStore; entry: ShareEntry; onClose: () => void }) {
  const s = useStore(store);
  const win = useWindowDimensions();
  const shot = useRef<View>(null);
  // подвійний тап: друге натискання, доки меню відкривається, ігнорується
  const going = useRef(false);
  const card = cardOf(s, entry);
  if (!card) return null;
  const busy = s.busy === 'share';
  const previewW = Math.min(win.width - space[16] * 2, (win.height - size.ctaHeight * 3 - space[28] * 4) * 0.8);
  const go = async () => {
    if (going.current) return;
    going.current = true;
    try {
      const r = await store.getState().share(card.analytics, shot);
      // після поширення й після збою рендеру (тост sh.err) прев'ю закривається; закрите без поширення меню лишає прев'ю
      if (r !== 'busy' && r.kind !== 'dismissed') onClose();
    } finally {
      going.current = false;
    }
  };
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim} testID="share-card">
        <View style={styles.offscreen} pointerEvents="none">
          <ShareImage ref={shot} card={card} scale={SHARE_W / BASE_W / PixelRatio.get()} />
        </View>
        <View style={styles.wrap} accessibilityViewIsModal>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.h2} accessibilityRole="header">{shT.title}</Text>
          <View style={styles.preview}>
            <ShareImage card={card} scale={previewW / BASE_W} testID="share-preview" />
          </View>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.muted}>{shT.note}</Text>
          <Button testID="share-go" label={busy ? shT.preparing : shT.cta} disabled={busy} onPress={() => void go()} />
          <Button testID="share-back" variant="ghost" label={shT.back} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: color.scrim, justifyContent: 'center', padding: space[16] },
  // копія для знімка: поза екраном, але намальована (collapsable={false} у ShareImage)
  offscreen: { position: 'absolute', left: -SHARE_W * 4, top: 0 },
  wrap: { gap: space[12], alignItems: 'stretch' },
  preview: { alignItems: 'center' },
  h2: { ...type('h2'), color: color.text },
  muted: { ...type('caption'), color: color.muted },
});
