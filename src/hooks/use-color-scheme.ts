import { useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { ThemePreferenceContext } from '@/lib/theme-preference';

export function useColorScheme () {
  const preference = useContext(ThemePreferenceContext);
  const systemScheme = useRNColorScheme();

  if (preference?.preference) {
    return preference.preference;
  }

  return preference?.colorScheme ?? systemScheme;
}
