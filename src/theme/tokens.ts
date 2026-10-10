// Згенеровано tools/gen_theme.py з design/system/tokens.json. Руками не правити.
// Дизайн-система «Стройова», версія 1.

/** Кольори. Тема одна, темна. */
export const color = {
  bg: "#262b1e",
  bgDeep: "#1e2218",
  surface: "#343a29",
  surface2: "#2c3123",
  border: "#4a513b",
  borderStrong: "#858b6e",
  text: "#ece8d9",
  muted: "#b5b39f",
  accent: "#e9b824",
  accentInk: "#262b1e",
  stamp: "#4a3d9e",
  stampOnDark: "#c2baf8",
  pen: "#233d8c",
  pencil: "#62666b",
  alert: "#c23b2e",
  onAlert: "#ffffff",
  alertBg: "#45261f",
  alertLine: "#8c3b2e",
  alertText: "#f6cfc4",
  alertPaper: "#a8231c",
  fail: "#f08a78",
  scrim: "#11130db8",
  paper: "#eee8d5",
  paper2: "#dcd5be",
  paper3: "#d6ceb5",
  paper4: "#c9c1a7",
  paperLine: "#cfc7ae",
  paperRule: "#9c957f",
  ink: "#1f2328",
  ink2: "#5c5a50",
  rarityCommon: "{muted}",
  rarityRare: "#9db4e8",
  rarityLegend: "{accent}",
  coverOlive: "#3d5236",
  coverBrown: "#5a4632",
  coverNavy: "#2b3a5e",
  coverBlack: "#17191c",
  coverEarth: "#3a3024",
  sceneL1Earth: "#3a3024",
  sceneL1Wood: "#5a4632",
  sceneL1Olive: "#6f7a5b",
  sceneL1Metal: "#8a8676",
  sceneL2Shadow: "#2a3133",
  sceneL2Panel: "#36403f",
  sceneL2Cabinet: "#7e8c84",
  sceneL2Whitewash: "#c9cfc4",
} as const;

/** Відступи, px. space[8] = 8. */
export const space = {
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  18: 18,
  20: 20,
  24: 24,
  28: 28,
} as const;

/** Радіуси, px. */
export const radius = {
  2: 2,
  3: 3,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  pill: 999,
} as const;

/** Розміри, px. */
export const size = {
  touchMin: 44,
  ctaHeight: 56,
  ctaHeightM: 48,
  tabHeight: 56,
  rowCheck: 58,
  iconPlate: 36,
  avatarS: 40,
  avatarM: 48,
  sealTap: 132,
  trackS: 4,
  trackL: 8,
  docWidth: 350,
  coverHeight: 110,
} as const;

/** Тривалості анімацій, мс. */
export const duration = {
  stamp: 220,
  stampBig: 320,
  stampHold: 150,
  ink: 120,
  shake: 140,
  paper: 280,
  paperGap: 60,
  number: 650,
  pop: 160,
  progress: 200,
  screen: 220,
  sheet: 300,
  typing: 22,
  toast: 4000,
} as const;

/** Криві (CSS-запис). */
export const easing = {
  stampIn: "cubic-bezier(0.55, 0, 1, 0.45)",
  out: "cubic-bezier(0.33, 1, 0.68, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  linear: "linear",
} as const;

/** Прозорість. */
export const opacity = {
  fiber: 0.05,
  ink: 0.92,
} as const;

/** Шари. */
export const zIndex = {
  scene: 0,
  content: 10,
  tabbar: 20,
  sheet: 30,
  modal: 40,
  fx: 50,
  toast: 60,
  coach: 70,
} as const;

/** Сімейства (CSS-стек із дизайн-системи). */
export const fontFamily = {
  display: "Unbounded, \"IBM Plex Sans\", sans-serif",
  sans: "\"IBM Plex Sans\", system-ui, sans-serif",
  mono: "\"IBM Plex Mono\", ui-monospace, monospace",
  typewriter: "\"TT2020 Style E\", \"IBM Plex Mono\", monospace",
  hand: "Caveat, \"Bad Script\", cursive",
} as const;

/** Типографічна шкала; lineHeight у px. */
export const typeScale = {
  displayXl: {"family": "display", "fontSize": 40, "lineHeight": 48.0, "fontWeight": "700", "letterSpacing": 1},
  displayL: {"family": "display", "fontSize": 38, "lineHeight": 41.8, "fontWeight": "500"},
  displayM: {"family": "display", "fontSize": 30, "lineHeight": 34.5, "fontWeight": "500"},
  h1: {"family": "display", "fontSize": 22, "lineHeight": 28.6, "fontWeight": "700"},
  h2: {"family": "display", "fontSize": 18, "lineHeight": 23.4, "fontWeight": "500"},
  h3: {"family": "display", "fontSize": 17, "lineHeight": 22.1, "fontWeight": "500"},
  h4: {"family": "display", "fontSize": 14, "lineHeight": 18.2, "fontWeight": "500"},
  cta: {"family": "sans", "fontSize": 16, "lineHeight": 20.0, "fontWeight": "600"},
  bodyL: {"family": "sans", "fontSize": 15, "lineHeight": 21.75, "fontWeight": "400"},
  body: {"family": "sans", "fontSize": 14, "lineHeight": 20.3, "fontWeight": "400"},
  bodyS: {"family": "sans", "fontSize": 13, "lineHeight": 19.5, "fontWeight": "400"},
  caption: {"family": "sans", "fontSize": 12, "lineHeight": 16.8, "fontWeight": "400"},
  label: {"family": "sans", "fontSize": 11, "lineHeight": 14.85, "fontWeight": "500"},
  numL: {"family": "mono", "fontSize": 16, "lineHeight": 20.0, "fontWeight": "600"},
  num: {"family": "mono", "fontSize": 13, "lineHeight": 16.9, "fontWeight": "500"},
  numS: {"family": "mono", "fontSize": 12, "lineHeight": 16.2, "fontWeight": "500"},
  docMeta: {"family": "mono", "fontSize": 12, "lineHeight": 17.4, "fontWeight": "400"},
  docTable: {"family": "mono", "fontSize": 13, "lineHeight": 20.15, "fontWeight": "400"},
  stampL: {"family": "mono", "fontSize": 16, "lineHeight": 19.2, "fontWeight": "600", "letterSpacing": 2},
  stampM: {"family": "mono", "fontSize": 13, "lineHeight": 16.25, "fontWeight": "600", "letterSpacing": 2},
  stampS: {"family": "mono", "fontSize": 11, "lineHeight": 14.3, "fontWeight": "600", "letterSpacing": 1},
  docTitle: {"family": "typewriter", "fontSize": 16, "lineHeight": 20.8, "fontWeight": "400", "letterSpacing": 1},
  docBody: {"family": "typewriter", "fontSize": 14, "lineHeight": 21.7, "fontWeight": "400"},
  resolution: {"family": "hand", "fontSize": 20, "lineHeight": 24.0, "fontWeight": "600"},
} as const;

export type ColorToken = keyof typeof color;
export type TypeStyle = keyof typeof typeScale;
