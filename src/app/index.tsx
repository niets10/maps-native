import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountryInfoModal } from '@/components/country-info-modal';
import { GlassSurface } from '@/components/glass-surface';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebPageTitle } from '@/components/web-page-title';
import { ZoomableMap } from '@/components/zoomable-map';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isPhonePwa } from '@/lib/is-phone-pwa';
import { computeTravelStats } from '@/lib/stats';
import { useVisitedCountries } from '@/lib/use-visited-countries';

const MAP_INITIAL_SCALE = Platform.OS === 'web' && isPhonePwa() ? 4 : 1;

export default function MapScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { visited, notesByCountry, yearByCountry, isLoading, saveCountry } =
        useVisitedCountries();
    const stats = computeTravelStats(visited);
    const [selectedCode, setSelectedCode] = useState<string | null>(null);

    return (
        <>
            <WebPageTitle />
            <View style={[styles.root, { backgroundColor: theme.background }]}>
                {isLoading ? (
                    <View style={styles.loading}>
                        <ActivityIndicator />
                    </View>
                ) : (
                    <ZoomableMap
                        visited={visited}
                        onCountryPress={setSelectedCode}
                        initialScale={MAP_INITIAL_SCALE}
                    />
                )}

                <GlassSurface
                    style={[
                        styles.statsOverlay,
                        {
                            left: Spacing.three + insets.left,
                            bottom: BottomTabInset + Spacing.three + insets.bottom,
                        },
                    ]}
                >
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
                </GlassSurface>

                <CountryInfoModal
                    countryCode={selectedCode}
                    isVisited={selectedCode ? visited.has(selectedCode) : false}
                    initialNotes={selectedCode ? (notesByCountry.get(selectedCode) ?? '') : ''}
                    initialVisitedYear={
                        selectedCode ? (yearByCountry.get(selectedCode) ?? null) : null
                    }
                    onClose={() => setSelectedCode(null)}
                    onSave={(options) =>
                        selectedCode ? saveCountry(selectedCode, options) : Promise.resolve()
                    }
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsOverlay: {
        position: 'absolute',
        borderRadius: Spacing.four,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.three,
        maxWidth: 320,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: Spacing.three,
        backgroundColor: 'transparent',
    },
    statCaption: {
        gap: Spacing.half,
        paddingBottom: Spacing.two,
        backgroundColor: 'transparent',
    },
});
