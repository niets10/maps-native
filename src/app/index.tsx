import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorldMap } from '@/components/world-map';
import { BottomTabInset, MaxContentWidth, Spacing, TopBarInset } from '@/constants/theme';
import { useVisitedCountries } from '@/lib/use-visited-countries';
import { computeTravelStats } from '@/lib/stats';

export default function MapScreen() {
  const { visited, isLoading, toggle } = useVisitedCountries();
  const stats = computeTravelStats(visited);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.five }]}
        showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <ThemedText type="label" themeColor="accent">
            Field Atlas
          </ThemedText>
          <ThemedView style={styles.statRow}>
            <ThemedText type="stat" themeColor="accent">
              {stats.percent}%
            </ThemedText>
            <ThemedView style={styles.statCaption}>
              <ThemedText type="smallBold">of the world explored</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {stats.visitedCount} of {stats.totalCount} countries
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {isLoading ? (
          <ThemedView style={styles.loading}>
            <ActivityIndicator />
          </ThemedView>
        ) : (
          <ThemedView type="backgroundElement" style={styles.mapCard}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.mapHint}>
              Tap a country to mark it as visited.
            </ThemedText>
            <ScrollView
              horizontal
              minimumZoomScale={1}
              maximumZoomScale={4}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mapScrollContent}>
              <WorldMap visited={visited} onToggle={toggle} />
            </ScrollView>
          </ThemedView>
        )}
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
    gap: Spacing.four,
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  statCaption: {
    gap: Spacing.half,
    paddingBottom: Spacing.two,
  },
  loading: {
    paddingVertical: Spacing.six,
  },
  mapCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  mapHint: {
    textAlign: 'center',
  },
  mapScrollContent: {
    width: '100%',
    minWidth: 600,
  },
});
