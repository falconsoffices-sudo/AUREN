import type { TextStyle, ViewStyle } from 'react-native';

// ─── Colors ───────────────────────────────────────────────────────────────────

export const colors = {
  magenta:      '#A8235A',
  rosa:         '#C4356E',
  magentaDeep:  '#7A1840',
  dourado:      '#E8C4A0',
  creme:        '#F5EDE8',
  bege:         '#F0E6E0',
  bege2:        '#E6D8CF',
  dark:         '#1A0A14',
  dark2:        '#2D1020',
  fg:           '#1A0A14',
  fg2:          '#6B4A58',
  fg3:          '#9A7A88',
  success:      '#3B6D11',
  successBg:    '#E4EBD4',
  amber:        '#BA7517',
  amberBg:      '#F7E6CE',
  border:       '#E6D8CF',
  white:        '#FFFFFF',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
// CSS originals (reference only — RN does not support multi-layer or CSS syntax):
//   sm    "0 2px 6px rgba(26,10,20,.06), 0 1px 2px rgba(26,10,20,.04)"
//   md    "0 6px 16px rgba(26,10,20,.08), 0 2px 4px rgba(26,10,20,.04)"
//   lg    "0 16px 32px rgba(26,10,20,.14), 0 4px 8px rgba(26,10,20,.06)"
//   brand "0 10px 24px rgba(168,35,90,.32)"

type ShadowStyle = Pick<ViewStyle,
  | 'shadowColor'
  | 'shadowOffset'
  | 'shadowOpacity'
  | 'shadowRadius'
  | 'elevation'
>;

export const shadows: Record<'sm' | 'md' | 'lg' | 'brand', ShadowStyle> = {
  sm: {
    shadowColor:   '#1A0A14',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  6,
    elevation:     2,
  },
  md: {
    shadowColor:   '#1A0A14',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius:  16,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#1A0A14',
    shadowOffset:  { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius:  32,
    elevation:     8,
  },
  brand: {
    shadowColor:   '#A8235A',
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius:  24,
    elevation:     8,
  },
};

// ─── Font ─────────────────────────────────────────────────────────────────────
// Loaded via useFonts() in App.js with @expo-google-fonts/outfit.

export const font = {
  family: 'Outfit',
  weights: {
    regular:   '400' as TextStyle['fontWeight'],
    medium:    '500' as TextStyle['fontWeight'],
    semiBold:  '600' as TextStyle['fontWeight'],
    bold:      '700' as TextStyle['fontWeight'],
    extraBold: '800' as TextStyle['fontWeight'],
  },
} as const;

// Named font-family strings — use these instead of fontWeight with custom fonts.
export const F = {
  regular:   'Outfit_400Regular',
  medium:    'Outfit_500Medium',
  semiBold:  'Outfit_600SemiBold',
  bold:      'Outfit_700Bold',
  extraBold: 'Outfit_800ExtraBold',
} as const;

// ─── Theme ────────────────────────────────────────────────────────────────────

const theme = { colors, shadows, font } as const;

export type Theme   = typeof theme;
export type Colors  = typeof colors;
export type Shadows = typeof shadows;

export default theme;
