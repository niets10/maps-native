import worldMap from '@svg-maps/world';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { COUNTRIES_BY_CODE } from '@/constants/countries';
import { useTheme } from '@/hooks/use-theme';

type WorldMapProps = {
  visited: Set<string>;
  onToggle?: (countryCode: string) => void;
  interactive?: boolean;
  /** Renders the whole map as a flat, low-opacity watermark (used on the auth screen). */
  watermark?: boolean;
};

type Location = { id: string; name: string; path: string };

export function WorldMap({ visited, onToggle, interactive = true, watermark = false }: WorldMapProps) {
  const theme = useTheme();
  const locations = (worldMap as { locations: Location[] }).locations;
  const viewBox = (worldMap as { viewBox: string }).viewBox;

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
  }, [locations, visited, theme, watermark]);

  return (
    <View style={watermark ? styles.watermarkContainer : styles.container}>
      <Svg viewBox={viewBox} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        {locations.map((location) => {
          const info = fills.get(location.id)!;
          const canPress = interactive && !watermark && info.isCountry && onToggle;
          return (
            <Path
              key={location.id}
              d={location.path}
              fill={info.fill}
              stroke={watermark ? 'none' : theme.mapBorder}
              strokeWidth={watermark ? 0 : 0.6}
              opacity={watermark ? 0.05 : 1}
              onPress={canPress ? () => onToggle!(location.id) : undefined}
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
    ...StyleSheet.absoluteFill,
  },
});
