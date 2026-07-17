import {
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold } from '@expo-google-fonts/work-sans';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthGate } from '@/components/auth-gate';
import { AuthProvider } from '@/lib/auth-context';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/theme-preference';
import { VisitedCountriesProvider } from '@/lib/use-visited-countries';

SplashScreen.preventAutoHideAsync();

export default function RootLayout () {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_900Black,
    Fraunces_500Medium_Italic,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    IBMPlexMono_500Medium,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemePreferenceProvider>
      <RootNavigator />
    </ThemePreferenceProvider>
  );
}

function RootNavigator () {
  const { colorScheme } = useThemePreference();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <AuthProvider>
        <AuthGate>
          <VisitedCountriesProvider>
            <AppTabs />
          </VisitedCountriesProvider>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
}
