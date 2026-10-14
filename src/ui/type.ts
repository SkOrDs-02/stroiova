// Стиль тексту з типографічної шкали дизайн-системи (принцип VI): розмір, висота рядка, насиченість, трекінг.
import type { TextStyle } from 'react-native';

import { typeScale } from '@/theme';

type Key = keyof typeof typeScale;

export function type(k: Key): TextStyle {
  const s = typeScale[k] as { fontSize: number; lineHeight?: number; fontWeight?: string; letterSpacing?: number };
  return {
    fontSize: s.fontSize,
    ...(s.lineHeight ? { lineHeight: s.lineHeight } : {}),
    ...(s.fontWeight ? { fontWeight: s.fontWeight as TextStyle['fontWeight'] } : {}),
    ...(s.letterSpacing != null ? { letterSpacing: s.letterSpacing } : {}),
  };
}
