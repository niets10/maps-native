import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';

import { GlassSurface } from './glass-surface';
import { ThemeToggle } from './theme-toggle';
import { ThemedText } from './themed-text';

import { GlassColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

const COMPACT_NAV_WIDTH = 520;

export default function AppTabs () {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="map-outline" iconFocused="map" accessibilityLabel="Map">
              Map
            </TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon="list-outline" iconFocused="list" accessibilityLabel="Countries">
              Countries
            </TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="person-circle-outline" iconFocused="person-circle" accessibilityLabel="Profile">
              Profile
            </TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
};

export function TabButton ({
  children,
  isFocused,
  icon,
  iconFocused,
  accessibilityLabel,
  ...props
}: TabButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const theme = useTheme();
  const glass = GlassColors[scheme];
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_NAV_WIDTH;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.tabButtonView,
          isCompact && styles.tabButtonViewCompact,
          { backgroundColor: isFocused ? glass.tabActive : glass.tabInactive },
        ]}>
        {isCompact ? (
          <Ionicons
            name={isFocused ? iconFocused : icon}
            size={18}
            color={isFocused ? theme.text : theme.textSecondary}
          />
        ) : (
          <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
            {children}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

export function CustomTabList (props: TabListProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_NAV_WIDTH;

  return (
    <View {...props} style={styles.tabListContainer} pointerEvents="box-none">
      <GlassSurface
        style={[
          styles.innerContainer,
          isCompact && styles.innerContainerCompact,
        ]}>
        {!isCompact ? (
          <ThemedText type="smallBold" themeColor="accent" style={styles.brandText}>
            Field Atlas
          </ThemedText>
        ) : null}

        {props.children}

        <ThemeToggle size={isCompact ? 16 : 18} />
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 10,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  innerContainerCompact: {
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  tabButtonViewCompact: {
    paddingHorizontal: Spacing.two,
  },
});
