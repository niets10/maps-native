import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'display'
    | 'stat'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'label'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'display' && styles.display,
        type === 'stat' && styles.stat,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'label' && styles.label,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.accent }],
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 38,
  },
  display: {
    fontFamily: Fonts.displayItalic,
    fontSize: 42,
    lineHeight: 46,
  },
  stat: {
    fontFamily: Fonts.displayBlack,
    fontSize: 56,
    lineHeight: 58,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 30,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: Fonts.bodyMedium,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Fonts.bodySemiBold,
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
