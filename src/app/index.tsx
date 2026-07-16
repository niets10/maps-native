import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getCountryFocusFraction, WorldMap } from '@/components/world-map';
import { BottomTabInset, MaxContentWidth, Spacing, TopBarInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVisitedCountries } from '@/lib/use-visited-countries';
import { computeTravelStats } from '@/lib/stats';

const FOCUS_COUNTRY_CODE = 'es';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

function clampScale(value: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

export default function MapScreen() {
  const theme = useTheme();
  const { visited, isLoading, toggle } = useVisitedCountries();
  const stats = computeTravelStats(visited);

  const mapScrollRef = useRef<ScrollView>(null);
  const wheelZoomTargetRef = useRef<View>(null);
  const hasCenteredRef = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [mapWidth, setMapWidth] = useState(0);
  const [scale, setScale] = useState(1);

  const focusFraction = useMemo(() => getCountryFocusFraction(FOCUS_COUNTRY_CODE), []);

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width);
  }, []);

  const handleMapLayout = useCallback((event: LayoutChangeEvent) => {
    setMapWidth(event.nativeEvent.layout.width);
  }, []);

  const zoomIn = useCallback(() => setScale((current) => clampScale(current + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setScale((current) => clampScale(current - ZOOM_STEP)), []);

  useEffect(() => {
    if (hasCenteredRef.current || !focusFraction || viewportWidth === 0 || mapWidth === 0) return;

    const maxScrollX = Math.max(mapWidth - viewportWidth, 0);
    const targetX = focusFraction.x * mapWidth - viewportWidth / 2;
    mapScrollRef.current?.scrollTo({ x: Math.min(Math.max(targetX, 0), maxScrollX), animated: false });
    hasCenteredRef.current = true;
  }, [focusFraction, viewportWidth, mapWidth]);

  // RN's ScrollView doesn't support pinch-to-zoom outside of iOS (minimumZoomScale /
  // maximumZoomScale are silently ignored on Android and web), so on web we grow the map's
  // rendered width via `scale` state instead and let the horizontal ScrollView above pan
  // around the larger content. Trackpad pinch-to-zoom and ctrl+scroll both fire as `wheel`
  // events with `ctrlKey: true` in browsers, which is what we listen for here.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = wheelZoomTargetRef.current as unknown as HTMLElement | null;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setScale((current) => clampScale(current - event.deltaY * 0.01));
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}>
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
            <ThemedView style={styles.mapHintRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.mapHint}>
                Tap a country to mark it as visited.
              </ThemedText>
              <ThemedView style={styles.zoomControls}>
                <Pressable
                  onPress={zoomOut}
                  disabled={scale <= MIN_SCALE}
                  style={({ pressed }) => [
                    styles.zoomButton,
                    { borderColor: theme.border },
                    pressed && styles.zoomButtonPressed,
                    scale <= MIN_SCALE && styles.zoomButtonDisabled,
                  ]}>
                  <ThemedText type="smallBold">−</ThemedText>
                </Pressable>
                <Pressable
                  onPress={zoomIn}
                  disabled={scale >= MAX_SCALE}
                  style={({ pressed }) => [
                    styles.zoomButton,
                    { borderColor: theme.border },
                    pressed && styles.zoomButtonPressed,
                    scale >= MAX_SCALE && styles.zoomButtonDisabled,
                  ]}>
                  <ThemedText type="smallBold">+</ThemedText>
                </Pressable>
              </ThemedView>
            </ThemedView>
            <View ref={wheelZoomTargetRef}>
              <ScrollView
                ref={mapScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onLayout={handleViewportLayout}
                contentContainerStyle={[
                  styles.mapScrollContent,
                  viewportWidth > 0 && { width: viewportWidth * scale },
                ]}>
                <WorldMap visited={visited} onToggle={toggle} onLayout={handleMapLayout} />
              </ScrollView>
            </View>
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
  mapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHint: {
    flex: 1,
    textAlign: 'center',
  },
  zoomControls: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  zoomButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonPressed: {
    opacity: 0.6,
  },
  zoomButtonDisabled: {
    opacity: 0.35,
  },
  mapScrollContent: {
    width: '100%',
    minWidth: 600,
  },
});
