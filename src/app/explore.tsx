import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountryInfoModal } from '@/components/country-info-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONTINENTS, COUNTRIES, type Country } from '@/constants/countries';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing, TopBarInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVisitedCountries } from '@/lib/use-visited-countries';
import { flagEmoji } from '@/lib/utils';

type Section = {
  title: string;
  data: Country[];
  visitedCount: number;
  totalCount: number;
  matchCount: number;
};

export default function CountriesScreen() {
  const theme = useTheme();
  const { visited, notesByCountry, saveCountry } = useVisitedCountries();
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [collapsedContinents, setCollapsedContinents] = useState<Set<string>>(() => new Set());

  const toggleContinent = useCallback((title: string) => {
    setCollapsedContinents((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }, []);

  const sections = useMemo<Section[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const isSearching = normalizedQuery.length > 0;
    return CONTINENTS.map((continent) => {
      const countriesInContinent = COUNTRIES.filter((c) => c.continent === continent);
      const matchingCountries = normalizedQuery
        ? countriesInContinent.filter((c) => c.name.toLowerCase().includes(normalizedQuery))
        : countriesInContinent;
      const isCollapsed = !isSearching && collapsedContinents.has(continent);
      return {
        title: continent,
        data: isCollapsed ? [] : matchingCountries,
        matchCount: matchingCountries.length,
        visitedCount: countriesInContinent.filter((c) => visited.has(c.code)).length,
        totalCount: countriesInContinent.length,
      };
    }).filter(
      (section) =>
        section.matchCount > 0 || (!isSearching && collapsedContinents.has(section.title))
    );
  }, [query, visited, collapsedContinents]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.centerColumn}>
        <View style={styles.headerBlock}>
          <ThemedText type="label" themeColor="accent">
            Countries
          </ThemedText>
          <ThemedText type="title">Where next?</ThemedText>
          <View style={styles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search countries..."
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              style={[
                styles.searchInput,
                { color: theme.text, borderColor: theme.border, fontFamily: Fonts.body },
              ]}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={Spacing.two}
                onPress={() => setQuery('')}
                style={({ pressed }) => [styles.clearButton, pressed && styles.clearButtonPressed]}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.code}
          contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.five }}
          stickySectionHeadersEnabled
          extraData={collapsedContinents}
          renderSectionHeader={({ section }) => {
            const isCollapsed = collapsedContinents.has(section.title);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${section.title}, ${section.visitedCount} of ${section.totalCount} visited`}
                accessibilityState={{ expanded: !isCollapsed }}
                onPress={() => toggleContinent(section.title)}
                style={({ pressed }) => [pressed && styles.sectionHeaderPressed]}>
                <ThemedView type="backgroundElement" style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeading}>
                    <Ionicons
                      name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                      size={16}
                      color={theme.textSecondary}
                    />
                    <ThemedText type="label" themeColor="textSecondary">
                      {section.title}
                    </ThemedText>
                  </View>
                  <ThemedView type="accentSoft" style={styles.sectionCount}>
                    <ThemedText type="smallBold" themeColor="accent">
                      {section.visitedCount}/{section.totalCount}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              </Pressable>
            );
          }}
          renderItem={({ item }) => {
            const isVisited = visited.has(item.code);
            return (
              <Pressable
                onPress={() => setSelectedCode(item.code)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                <ThemedView
                  type={isVisited ? 'accentSoft' : 'backgroundElement'}
                  style={styles.flagBadge}>
                  <ThemedText>{flagEmoji(item.code)}</ThemedText>
                </ThemedView>
                <ThemedText style={styles.rowLabel}>{item.name}</ThemedText>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: isVisited ? theme.accent : theme.border,
                      backgroundColor: isVisited ? theme.accent : 'transparent',
                    },
                  ]}>
                  {isVisited ? (
                    <ThemedText type="smallBold" themeColor="onAccent">
                      ✓
                    </ThemedText>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      </View>

      <CountryInfoModal
        countryCode={selectedCode}
        isVisited={selectedCode ? visited.has(selectedCode) : false}
        initialNotes={selectedCode ? notesByCountry.get(selectedCode) ?? '' : ''}
        onClose={() => setSelectedCode(null)}
        onSave={(options) => (selectedCode ? saveCountry(selectedCode, options) : Promise.resolve())}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerColumn: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  headerBlock: {
    gap: Spacing.three,
    paddingTop: Spacing.four + TopBarInset,
    paddingBottom: Spacing.three,
  },
  searchWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 16,
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.three + 24,
    borderWidth: 1,
    borderRadius: Spacing.five,
  },
  clearButton: {
    position: 'absolute',
    right: Spacing.three,
    padding: Spacing.half,
  },
  clearButtonPressed: {
    opacity: 0.6,
  },
  sectionHeaderPressed: {
    opacity: 0.7,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Spacing.three,
  },
  sectionHeaderLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionCount: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowPressed: {
    opacity: 0.6,
  },
  flagBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
