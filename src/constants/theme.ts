/**
 * "Field Atlas" theme — a warm, editorial cartography aesthetic.
 * Parchment/ink palette with a terracotta accent for visited countries,
 * paired with a characterful serif display font and a clean grotesque body font.
 */

import { Platform } from 'react-native';

import '@/global.css';

export const Colors = {
  light: {
    text: '#22303C',
    background: '#F6EFE1',
    backgroundElement: '#EDE2CB',
    backgroundSelected: '#E3D2AC',
    textSecondary: '#5B6B74',
    accent: '#C1502E',
    accentSoft: '#EAD2C4',
    onAccent: '#FBF3E4',
    border: '#D9CBAA',
    danger: '#A83232',
    mapLand: '#DCCBA0',
    mapVisited: '#C1502E',
    mapTerritory: '#EDE2CB',
    mapBorder: '#C3B182',
  },
  dark: {
    text: '#F3EAD8',
    background: '#141B22',
    backgroundElement: '#1E2830',
    backgroundSelected: '#28343E',
    textSecondary: '#8FA0A9',
    accent: '#E08A5B',
    accentSoft: '#3A2A20',
    onAccent: '#211308',
    border: '#2C3944',
    danger: '#E27272',
    mapLand: '#2A3742',
    mapVisited: '#E08A5B',
    mapTerritory: '#1E2830',
    mapBorder: '#3C4A55',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Font family names as registered via `useFonts` in the root layout
 * (see `@expo-google-fonts/fraunces`, `@expo-google-fonts/work-sans`,
 * and `@expo-google-fonts/ibm-plex-mono`).
 */
export const Fonts = {
  display: 'Fraunces_600SemiBold',
  displayBlack: 'Fraunces_900Black',
  displayItalic: 'Fraunces_500Medium_Italic',
  body: 'WorkSans_400Regular',
  bodyMedium: 'WorkSans_500Medium',
  bodySemiBold: 'WorkSans_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/** Extra top clearance on web, where the floating tab bar overlays the content instead of docking. */
export const TopBarInset = Platform.select({ web: 64 }) ?? 0;
export const MaxContentWidth = 800;
