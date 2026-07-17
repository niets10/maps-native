import { useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { ThemePreferenceContext } from '@/lib/theme-preference';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme () {
  const preference = useContext(ThemePreferenceContext);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const systemScheme = useRNColorScheme();

  if (preference?.preference) {
    return preference.preference;
  }

  if (hasHydrated) {
    return preference?.colorScheme ?? systemScheme;
  }

  return 'light';
}
