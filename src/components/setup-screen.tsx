import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const steps = [
  'Create a project at supabase.com',
  'Run the SQL in supabase/schema.sql inside the Supabase SQL editor',
  'Copy your Project URL and anon public key from Project Settings -> API',
  'Copy .env.example to .env and paste those values in',
  'Restart the dev server (npx expo start)',
];

export function SetupScreen() {
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="label" themeColor="accent">
            Setup required
          </ThemedText>
          <ThemedText type="display" style={styles.headline}>
            Connect your{'\n'}Supabase project
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subhead}>
            Field Atlas needs a Supabase project for authentication and storing visited countries.
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            {steps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <ThemedView type="accentSoft" style={styles.stepNumber}>
                  <ThemedText type="smallBold" themeColor="accent">
                    {index + 1}
                  </ThemedText>
                </ThemedView>
                <ThemedText style={styles.stepText}>{step}</ThemedText>
              </View>
            ))}
          </ThemedView>

          <ThemedText type="code" themeColor="textSecondary">
            EXPO_PUBLIC_SUPABASE_URL{'\n'}EXPO_PUBLIC_SUPABASE_ANON_KEY
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
    gap: Spacing.three,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  headline: {
    marginTop: Spacing.one,
  },
  subhead: {
    marginBottom: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
    marginVertical: Spacing.three,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
  },
});
