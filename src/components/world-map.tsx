import worldMap from '@svg-maps/world';
import { memo, useMemo } from 'react';
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
  /**
   * Fill the parent instead of sizing to the map's intrinsic aspect ratio. Used on
   * native by ZoomableMap's sharp idle layer (viewBox crop).
   */
  fillParent?: boolean;
  /** Override the SVG viewBox (e.g. a cropped region for native idle zoom). */
  mapViewBox?: string;
  /** Reports the map's rendered pixel size, e.g. so a parent ScrollView can scroll to a country. */
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Web-only: reports the country under the pointer (with its cursor position), or null once it leaves. */
  onHoverChange?: (hover: CountryHover) => void;
};

export type CountryHover = { code: string; clientX: number; clientY: number } | null;

type Location = { id: string; name: string; path: string };

const locations = (worldMap as { locations: Location[] }).locations;
const defaultViewBox = (worldMap as { viewBox: string }).viewBox;
const [, , VIEWBOX_WIDTH, VIEWBOX_HEIGHT] = defaultViewBox.split(' ').map(Number);

export const MAP_VIEWBOX_WIDTH = VIEWBOX_WIDTH;
export const MAP_VIEWBOX_HEIGHT = VIEWBOX_HEIGHT;
export const MAP_VIEWBOX = defaultViewBox;

/** Width/height ratio of the map's own artwork, used by `ZoomableMap` to size its content layer. */
export const MAP_ASPECT_RATIO = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

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

/**
 * Memoized because it's rendered inside `ZoomableMap`, which mutates a pan/zoom
 * transform directly on its wrapping DOM node during drag/wheel/pinch gestures
 * (bypassing React state for smoothness). Without `memo`, every re-render of an
 * ancestor -- including ones with no props change for `WorldMap` -- would redo
 * the ~250-path `fills` computation and JSX for nothing.
 */
export const WorldMap = memo(function WorldMap({
  visited,
  onToggle,
  interactive = true,
  watermark = false,
  fillParent = false,
  mapViewBox = defaultViewBox,
  onLayout,
  onHoverChange,
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

  const containerStyle = watermark
    ? styles.watermarkContainer
    : fillParent
      ? styles.fillContainer
      : styles.container;

  return (
    <View style={containerStyle} onLayout={onLayout}>
      <Svg
        viewBox={mapViewBox}
        width="100%"
        height="100%"
        // `none` when ZoomableMap drives a viewport-aspect viewBox; `meet` otherwise.
        preserveAspectRatio={fillParent ? 'none' : 'xMidYMid meet'}>
        {locations.map((location) => {
          const info = fills.get(location.id)!;
          const canPress = interactive && !watermark && info.isCountry && onToggle;
          const handlePress = canPress ? () => onToggle!(location.id) : undefined;
          // react-native-svg's onPress mixes in a legacy Touchable responder handler that
          // react-native-web forwards straight to the DOM <path>, logging "Unknown event
          // handler property" warnings, so we use onClick directly on web instead. Its web
          // shape-prop preparer unconditionally runs `if (onPress !== null) clean.onClick =
          // props.onPress`, which clobbers a plain `onClick` back to `undefined` unless we
          // also pass `onPress: null` (not just omitted/undefined) to opt out of that.
          const pressProps: Record<string, unknown> =
            Platform.OS === 'web' ? { onClick: handlePress, onPress: null } : { onPress: handlePress };
          // Same rationale as `pressProps` above: react-native-svg's Path types don't cover
          // DOM mouse events, so these are passed as untyped web-only props.
          const hoverProps: Record<string, unknown> =
            Platform.OS === 'web' && !watermark && info.isCountry && onHoverChange
              ? {
                  onMouseEnter: (event: { clientX: number; clientY: number }) =>
                    onHoverChange({ code: location.id, clientX: event.clientX, clientY: event.clientY }),
                  onMouseLeave: () => onHoverChange(null),
                }
              : {};
          return (
            <Path
              key={location.id}
              d={location.path}
              fill={info.fill}
              stroke={watermark ? 'none' : theme.mapBorder}
              strokeWidth={watermark ? 0 : 0.6}
              opacity={watermark ? 0.05 : 1}
              {...pressProps}
              {...hoverProps}
            />
          );
        })}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: MAP_ASPECT_RATIO,
  },
  fillContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  watermarkContainer: {
    ...StyleSheet.absoluteFillObject,
  },
});
