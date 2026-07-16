import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopBarInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { computeTravelStats } from '@/lib/stats';
import { useVisitedCountries } from '@/lib/use-visited-countries';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const { visited } = useVisitedCountries();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const stats = computeTravelStats(visited);
  const email = session?.user.email ?? '';
  const displayName = email.split('@')[0] || 'Traveler';

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.five }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="label" themeColor="accent">
            Profile
          </ThemedText>
          <ThemedText type="title" style={{ textTransform: 'capitalize' }}>
            {displayName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {email}
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.summaryCard}>
          <ThemedText type="stat" themeColor="accent">
            {stats.visitedCount}
          </ThemedText>
          <ThemedText type="smallBold">
            countries visited · {stats.percent}% of the world
          </ThemedText>
        </ThemedView>

        <View style={styles.continentList}>
          {stats.byContinent.map((entry) => (
            <View key={entry.continent} style={styles.continentRow}>
              <View style={styles.continentLabelRow}>
                <ThemedText type="smallBold">{entry.continent}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {entry.visitedCount}/{entry.totalCount}
                </ThemedText>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${entry.percent}%`, backgroundColor: theme.accent },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={isSigningOut}
          style={({ pressed }) => [
            styles.signOutButton,
            { borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          {isSigningOut ? (
            <ActivityIndicator />
          ) : (
            <ThemedText type="smallBold" themeColor="danger">
              Sign out
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four + TopBarInset,
    gap: Spacing.five,
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.one,
  },
  summaryCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  continentList: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  continentRow: {
    gap: Spacing.one,
  },
  continentLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  signOutButton: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
