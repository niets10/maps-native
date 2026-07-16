import {
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold } from '@expo-google-fonts/work-sans';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthGate } from '@/components/auth-gate';
import { AuthProvider } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
        <AuthGate>
          <AppTabs />
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
}
