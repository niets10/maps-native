import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme as useSystemColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ColorScheme | null;
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
  isReady: boolean;
};

const STORAGE_KEY = 'theme:v1';

export const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(
  undefined
);

/** Native-only; react-native-web does not implement Appearance.setColorScheme. */
function applyNativeColorScheme (scheme: ColorScheme) {
  if (typeof Appearance.setColorScheme === 'function') {
    Appearance.setColorScheme(scheme);
  }
}

export function ThemePreferenceProvider ({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = useState<ColorScheme | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'light' || stored === 'dark') {
          setPreference(stored);
          applyNativeColorScheme(stored);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const colorScheme: ColorScheme = preference ?? systemScheme ?? 'light';

  function toggleColorScheme () {
    const next: ColorScheme = colorScheme === 'dark' ? 'light' : 'dark';
    setPreference(next);
    applyNativeColorScheme(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }

  return (
    <ThemePreferenceContext.Provider value={{ preference, colorScheme, toggleColorScheme, isReady }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference () {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return context;
}
