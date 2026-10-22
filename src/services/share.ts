// Поширення на пристрої (007 FR-27, FR-29): знімок вью у PNG 1080×1350, системне меню, видалення тимчасового файлу.
// iOS: меню RN `Share` (файл і `sh.message`, повертає результат і activityType). Android: `expo-sharing` (лише файл; результату
// система не повертає, тож закрите без помилки меню вважаємо «shared»).
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { PixelRatio, Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { SHARE_H, SHARE_W } from '@/share/size';
import type { ShareOutcome, ShareService } from '@/share/types';


/** Свої картинки тримаємо в окремій теці кешу: її можна прибрати на запуску, якщо гру вбили під час меню (007 «Крайові випадки») */
function shareDir(): Directory {
  return new Directory(Paths.cache, 'share');
}

/** Прибрати картинки, що лишились після вбивства гри під час системного меню; помилки ковтаємо - це лише кеш */
export function clearShareCache(): void {
  try {
    const d = shareDir();
    if (d.exists) d.delete();
  } catch {
    // кеш уже прибрала система
  }
}

export const deviceShare: ShareService = {
  async share(target, message): Promise<ShareOutcome> {
    let uri: string;
    try {
      const ratio = PixelRatio.get();
      uri = await captureRef(target as RefObject<View>, { format: 'png', quality: 1, result: 'tmpfile', width: SHARE_W / ratio, height: SHARE_H / ratio });
      const d = shareDir();
      d.create({ idempotent: true, intermediates: true });
      const f = new File(uri);
      f.move(d);
      uri = f.uri;
    } catch (e) {
      return { kind: 'error', code: e instanceof Error ? e.message.slice(0, 60) : 'render' };
    }
    try {
      if (Platform.OS === 'ios') {
        const r = await Share.share({ url: uri, message });
        return r.action === Share.sharedAction ? { kind: 'shared', ...(r.activityType ? { activityType: r.activityType } : {}) } : { kind: 'dismissed' };
      }
      if (!(await Sharing.isAvailableAsync())) return { kind: 'error', code: 'sharing_unavailable' };
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: message });
      return { kind: 'shared' };
    } catch (e) {
      return { kind: 'error', code: e instanceof Error ? e.message.slice(0, 60) : 'share' };
    } finally {
      // 007 FR-29: після закриття меню тимчасового файлу в кеші немає
      try {
        const f = new File(uri);
        if (f.exists) f.delete();
      } catch {
        // файл уже прибрала система
      }
    }
  },
};
