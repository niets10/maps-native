import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference } from '@/lib/theme-preference';

type ThemeToggleProps = {
  size?: number;
};

export function ThemeToggle ({ size = 22 }: ThemeToggleProps) {
  const theme = useTheme();
  const { colorScheme, toggleColorScheme } = useThemePreference();
  const isDark = colorScheme === 'dark';
  const buttonSize = size + 18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onPress={toggleColorScheme}
      hitSlop={Spacing.two}
      style={({ pressed }) => [
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
        },
        pressed && styles.pressed,
      ]}>
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={size}
        color={theme.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
