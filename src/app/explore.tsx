import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONTINENTS, COUNTRIES, type Country } from '@/constants/countries';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing, TopBarInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVisitedCountries } from '@/lib/use-visited-countries';
import { flagEmoji } from '@/lib/utils';

type Section = { title: string; data: Country[]; visitedCount: number; totalCount: number };

export default function CountriesScreen() {
  const theme = useTheme();
  const { visited, toggle } = useVisitedCountries();
  const [query, setQuery] = useState('');

  const sections = useMemo<Section[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return CONTINENTS.map((continent) => {
      const countriesInContinent = COUNTRIES.filter((c) => c.continent === continent);
      const data = normalizedQuery
        ? countriesInContinent.filter((c) => c.name.toLowerCase().includes(normalizedQuery))
        : countriesInContinent;
      return {
        title: continent,
        data,
        visitedCount: countriesInContinent.filter((c) => visited.has(c.code)).length,
        totalCount: countriesInContinent.length,
      };
    }).filter((section) => section.data.length > 0);
  }, [query, visited]);

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
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.code}
          contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.five }}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <ThemedView type="backgroundElement" style={styles.sectionHeader}>
              <ThemedText type="label" themeColor="textSecondary">
                {section.title}
              </ThemedText>
              <ThemedView type="accentSoft" style={styles.sectionCount}>
                <ThemedText type="smallBold" themeColor="accent">
                  {section.visitedCount}/{section.totalCount}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          )}
          renderItem={({ item }) => {
            const isVisited = visited.has(item.code);
            return (
              <Pressable
                onPress={() => toggle(item.code)}
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
  searchInput: {
    fontSize: 16,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.five,
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
