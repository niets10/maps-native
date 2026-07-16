import worldMap from '@svg-maps/world';
import { useMemo } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { COUNTRIES_BY_CODE } from '@/constants/countries';
import { useTheme } from '@/hooks/use-theme';
import { getBoundingBoxCenter, getLargestSubpathBoundingBox } from '@/lib/svg-path';

type WorldMapProps = {
  visited: Set<string>;
  onToggle?: (countryCode: string) => void;
  interactive?: boolean;
  /** Renders the whole map as a flat, low-opacity watermark (used on the auth screen). */
  watermark?: boolean;
  /** Reports the map's rendered pixel size, e.g. so a parent ScrollView can scroll to a country. */
  onLayout?: (event: LayoutChangeEvent) => void;
};

type Location = { id: string; name: string; path: string };

const locations = (worldMap as { locations: Location[] }).locations;
const viewBox = (worldMap as { viewBox: string }).viewBox;
const [, , VIEWBOX_WIDTH, VIEWBOX_HEIGHT] = viewBox.split(' ').map(Number);

const locationsById = new Map(locations.map((location) => [location.id, location]));

/**
 * Fraction (0-1 on each axis) of the map's viewBox where a country's largest
 * landmass sits. Used to scroll the map so that country starts centered.
 */
export function getCountryFocusFraction(countryCode: string): { x: number; y: number } | null {
  const location = locationsById.get(countryCode);
  if (!location) return null;
  const box = getLargestSubpathBoundingBox(location.path);
  if (!box) return null;
  const center = getBoundingBoxCenter(box);
  return { x: center.x / VIEWBOX_WIDTH, y: center.y / VIEWBOX_HEIGHT };
}

export function WorldMap({
  visited,
  onToggle,
  interactive = true,
  watermark = false,
  onLayout,
}: WorldMapProps) {
  const theme = useTheme();

  const fills = useMemo(() => {
    const map = new Map<string, { fill: string; isCountry: boolean }>();
    for (const location of locations) {
      const isCountry = Boolean(COUNTRIES_BY_CODE[location.id]);
      const isVisited = isCountry && visited.has(location.id);
      const fill = watermark
        ? theme.text
        : isVisited
          ? theme.mapVisited
          : isCountry
            ? theme.mapLand
            : theme.mapTerritory;
      map.set(location.id, { fill, isCountry });
    }
    return map;
  }, [visited, theme, watermark]);

  return (
    <View style={watermark ? styles.watermarkContainer : styles.container} onLayout={onLayout}>
      <Svg viewBox={viewBox} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        {locations.map((location) => {
          const info = fills.get(location.id)!;
          const canPress = interactive && !watermark && info.isCountry && onToggle;
          const handlePress = canPress ? () => onToggle!(location.id) : undefined;
          // react-native-svg's onPress mixes in a legacy Touchable responder handler that
          // react-native-web forwards straight to the DOM <path>, logging "Unknown event
          // handler property" warnings. onClick avoids that mixin entirely on web.
          const pressProps = Platform.OS === 'web' ? { onClick: handlePress } : { onPress: handlePress };
          return (
            <Path
              key={location.id}
              d={location.path}
              fill={info.fill}
              stroke={watermark ? 'none' : theme.mapBorder}
              strokeWidth={watermark ? 0 : 0.6}
              opacity={watermark ? 0.05 : 1}
              {...pressProps}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1010 / 666,
  },
  watermarkContainer: {
    ...StyleSheet.absoluteFillObject,
  },
});
