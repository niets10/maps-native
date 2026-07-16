import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WorldMap, type CountryHover } from '@/components/world-map';
import { COUNTRIES_BY_CODE } from '@/constants/countries';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { flagEmoji } from '@/lib/utils';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
/** Multiplicative zoom-per-pixel-of-wheel-delta, tuned to feel similar to Google Maps. */
const WHEEL_ZOOM_SENSITIVITY = 0.01;
/** Single-pointer movement (px) before a drag claims the gesture over a tap. */
const DRAG_THRESHOLD = 4;
/** Offset (px) between the cursor and the tooltip so it doesn't sit under the pointer. */
const TOOLTIP_OFFSET = 16;
/** Rough tooltip footprint, used to keep it from drifting past the viewport edge. */
const TOOLTIP_WIDTH_ESTIMATE = 200;
const TOOLTIP_HEIGHT_ESTIMATE = 44;

type Point = { x: number; y: number };
type Transform = { scale: number; x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type ZoomableMapProps = {
  visited: Set<string>;
  onToggle?: (countryCode: string) => void;
  /** Fraction (0-1 on each axis) of the map to center on when it first mounts. */
  initialFocus?: Point | null;
  /** Zoom level to start at when centering on `initialFocus`. */
  initialScale?: number;
};

export function ZoomableMap({ visited, onToggle, initialFocus, initialScale = 1 }: ZoomableMapProps) {
  const theme = useTheme();

  const containerRef = useRef<View>(null);
  const contentRef = useRef<View>(null);
  const containerSize = useRef({ width: 0, height: 0 });
  // Web layout can settle over a couple of passes (fonts, safe-area insets, etc.), so we
  // keep re-centering on `initialFocus` across layout events until the user actually
  // performs a gesture -- otherwise an early, smaller measurement can lock in an
  // off-center transform that a later, correct measurement never fixes.
  const userInteractedRef = useRef(false);

  // The transform is mutated directly on the content node's DOM style for every
  // pointer/wheel tick (see `applyTransform`), so dragging and pinching stay smooth
  // without round-tripping through React state on every frame. `scaleForUi` is the
  // only piece we mirror into React state, since the zoom buttons need to re-render.
  const transform = useRef<Transform>({ scale: initialScale, x: 0, y: 0 });
  const [scaleForUi, setScaleForUi] = useState(initialScale);

  const gestureStartRef = useRef<{ transform: Transform; pinchDistance: number | null } | null>(null);

  // Mirrors the `transform` pattern above: the tooltip follows the cursor by mutating its
  // DOM node's style directly on every `mousemove`, so it can track the pointer at 60fps
  // without a React re-render per pixel. `hoveredCode` (what's shown) changes far less
  // often, so it's the only piece kept in state.
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const tooltipRef = useRef<View>(null);

  const positionTooltip = useCallback((clientX: number, clientY: number) => {
    const tooltipNode = tooltipRef.current as unknown as HTMLElement | null;
    const containerNode = containerRef.current as unknown as HTMLElement | null;
    if (!tooltipNode || !containerNode) return;
    const rect = containerNode.getBoundingClientRect();
    const { width, height } = containerSize.current;
    const x = clamp(clientX - rect.left + TOOLTIP_OFFSET, 0, Math.max(0, width - TOOLTIP_WIDTH_ESTIMATE));
    const y = clamp(clientY - rect.top + TOOLTIP_OFFSET, 0, Math.max(0, height - TOOLTIP_HEIGHT_ESTIMATE));
    tooltipNode.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const handleHoverChange = useCallback(
    (hover: CountryHover) => {
      setHoveredCode(hover?.code ?? null);
      if (hover) positionTooltip(hover.clientX, hover.clientY);
    },
    [positionTooltip]
  );

  // Reassigned every render (like `handleWheelRef` below) so the native listener -- added
  // once in `setContainerRef` -- always sees the latest `hoveredCode` without having to
  // detach/reattach itself on every hover change.
  const handlePointerMoveRef = useRef<(event: MouseEvent) => void>(() => {});
  handlePointerMoveRef.current = (event: MouseEvent) => {
    if (!hoveredCode) return;
    positionTooltip(event.clientX, event.clientY);
  };

  const clampTransform = useCallback(({ scale, x, y }: Transform): Transform => {
    const { width, height } = containerSize.current;
    const nextScale = clamp(scale, MIN_SCALE, MAX_SCALE);
    const minX = width * (1 - nextScale);
    const minY = height * (1 - nextScale);
    return { scale: nextScale, x: clamp(x, minX, 0), y: clamp(y, minY, 0) };
  }, []);

  const applyTransform = useCallback(() => {
    const node = contentRef.current as unknown as HTMLElement | null;
    if (!node) return;
    const { scale, x, y } = transform.current;
    // All the pan/zoom math below (clampTransform, zoomAroundPoint, centerOn) assumes
    // `screen = translate + scale * content`, i.e. scaling pivots around the content's
    // own top-left corner. CSS defaults transform-origin to the element's center, so it
    // must be pinned to "0 0" or every formula below is off.
    node.style.transformOrigin = '0 0';
    node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  }, []);

  const setTransform = useCallback(
    (next: Transform, options?: { syncUi?: boolean }) => {
      const clamped = clampTransform(next);
      transform.current = clamped;
      applyTransform();
      if (options?.syncUi) setScaleForUi(clamped.scale);
    },
    [applyTransform, clampTransform]
  );

  const zoomAroundPoint = useCallback(
    (focal: Point, nextScaleRaw: number, from: Transform = transform.current) => {
      const nextScale = clamp(nextScaleRaw, MIN_SCALE, MAX_SCALE);
      const contentX = (focal.x - from.x) / from.scale;
      const contentY = (focal.y - from.y) / from.scale;
      setTransform(
        { scale: nextScale, x: focal.x - contentX * nextScale, y: focal.y - contentY * nextScale },
        { syncUi: true }
      );
    },
    [setTransform]
  );

  const centerOn = useCallback(
    (focusFraction: Point, scale: number) => {
      const { width, height } = containerSize.current;
      if (width === 0 || height === 0) return;
      const nextScale = clamp(scale, MIN_SCALE, MAX_SCALE);
      setTransform(
        {
          scale: nextScale,
          x: width / 2 - focusFraction.x * width * nextScale,
          y: height / 2 - focusFraction.y * height * nextScale,
        },
        { syncUi: true }
      );
    },
    [setTransform]
  );

  const handleContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      containerSize.current = { width, height };
      if (!userInteractedRef.current && initialFocus) {
        centerOn(initialFocus, initialScale);
        return;
      }
      // Re-clamp and re-apply in case a resize (e.g. orientation change) shrank the
      // viewport enough that the current pan/zoom is no longer in bounds.
      setTransform(transform.current);
    },
    [centerOn, initialFocus, initialScale, setTransform]
  );

  const zoomByStep = useCallback(
    (factor: number) => {
      userInteractedRef.current = true;
      const { width, height } = containerSize.current;
      zoomAroundPoint({ x: width / 2, y: height / 2 }, transform.current.scale * factor);
    },
    [zoomAroundPoint]
  );
  const zoomIn = useCallback(() => zoomByStep(1.6), [zoomByStep]);
  const zoomOut = useCallback(() => zoomByStep(1 / 1.6), [zoomByStep]);

  // Trackpad pinch-to-zoom and ctrl+scroll both fire as `wheel` events with
  // `ctrlKey: true` in browsers -- there's no native multi-touch event for trackpad
  // gestures. A plain two-finger scroll (no ctrl) pans instead, like Google Maps.
  const handleWheelRef = useRef<(event: WheelEvent) => void>(() => {});
  handleWheelRef.current = (event: WheelEvent) => {
    event.preventDefault();
    userInteractedRef.current = true;
    const rect = (containerRef.current as unknown as HTMLElement).getBoundingClientRect();
    const focal = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    if (event.ctrlKey) {
      const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
      zoomAroundPoint(focal, transform.current.scale * factor);
      return;
    }

    setTransform({
      scale: transform.current.scale,
      x: transform.current.x - event.deltaX,
      y: transform.current.y - event.deltaY,
    });
  };

  const wheelListenerCleanupRef = useRef<(() => void) | null>(null);
  const setContainerRef = useCallback((node: View | null) => {
    containerRef.current = node;
    wheelListenerCleanupRef.current?.();
    wheelListenerCleanupRef.current = null;
    if (Platform.OS !== 'web' || !node) return;

    const domNode = node as unknown as HTMLElement;
    const wheelListener = (event: WheelEvent) => handleWheelRef.current(event);
    const moveListener = (event: MouseEvent) => handlePointerMoveRef.current(event);
    const leaveListener = () => setHoveredCode(null);
    domNode.addEventListener('wheel', wheelListener, { passive: false });
    domNode.addEventListener('mousemove', moveListener);
    domNode.addEventListener('mouseleave', leaveListener);
    wheelListenerCleanupRef.current = () => {
      domNode.removeEventListener('wheel', wheelListener);
      domNode.removeEventListener('mousemove', moveListener);
      domNode.removeEventListener('mouseleave', leaveListener);
    };
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (
          event: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          if (event.nativeEvent.touches.length >= 2) return true;
          if (transform.current.scale <= MIN_SCALE) return false;
          return Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD;
        },
        onPanResponderGrant: (event: GestureResponderEvent) => {
          userInteractedRef.current = true;
          const touches = event.nativeEvent.touches;
          const pinchDistance =
            touches.length >= 2
              ? Math.hypot(
                  touches[0].locationX - touches[1].locationX,
                  touches[0].locationY - touches[1].locationY
                )
              : null;
          gestureStartRef.current = { transform: transform.current, pinchDistance };
        },
        onPanResponderMove: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const start = gestureStartRef.current;
          if (!start) return;
          const touches = event.nativeEvent.touches;

          if (touches.length >= 2 && start.pinchDistance) {
            const distance = Math.hypot(
              touches[0].locationX - touches[1].locationX,
              touches[0].locationY - touches[1].locationY
            );
            const midpoint = {
              x: (touches[0].locationX + touches[1].locationX) / 2,
              y: (touches[0].locationY + touches[1].locationY) / 2,
            };
            zoomAroundPoint(
              midpoint,
              start.transform.scale * (distance / start.pinchDistance),
              start.transform
            );
            return;
          }

          setTransform({
            scale: start.transform.scale,
            x: start.transform.x + gestureState.dx,
            y: start.transform.y + gestureState.dy,
          });
        },
        onPanResponderRelease: () => {
          gestureStartRef.current = null;
        },
        onPanResponderTerminate: () => {
          gestureStartRef.current = null;
        },
      }),
    [setTransform, zoomAroundPoint]
  );

  return (
    <View style={styles.wrapper}>
      <View
        ref={setContainerRef}
        style={[styles.viewport, Platform.OS === 'web' && webCursorStyle(scaleForUi > MIN_SCALE)]}
        onLayout={handleContainerLayout}
        {...panResponder.panHandlers}>
        <View ref={contentRef} style={styles.content}>
          <WorldMap
            visited={visited}
            onToggle={onToggle}
            onHoverChange={Platform.OS === 'web' ? handleHoverChange : undefined}
          />
        </View>

        <View
          ref={tooltipRef}
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              display: hoveredCode ? 'flex' : 'none',
            },
          ]}>
          {hoveredCode ? (
            <>
              <ThemedText style={styles.tooltipFlag}>{flagEmoji(hoveredCode)}</ThemedText>
              <ThemedText type="smallBold">{COUNTRIES_BY_CODE[hoveredCode]?.name}</ThemedText>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.zoomControls}>
        <Pressable
          onPress={zoomOut}
          disabled={scaleForUi <= MIN_SCALE}
          style={({ pressed }) => [
            styles.zoomButton,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            pressed && styles.zoomButtonPressed,
            scaleForUi <= MIN_SCALE && styles.zoomButtonDisabled,
          ]}>
          <ThemedText type="smallBold">−</ThemedText>
        </Pressable>
        <Pressable
          onPress={zoomIn}
          disabled={scaleForUi >= MAX_SCALE}
          style={({ pressed }) => [
            styles.zoomButton,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            pressed && styles.zoomButtonPressed,
            scaleForUi >= MAX_SCALE && styles.zoomButtonDisabled,
          ]}>
          <ThemedText type="smallBold">+</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

// `cursor` isn't part of RN's ViewStyle typings, but react-native-web passes it straight
// through to the underlying `<div>`, so it's a harmless no-op on native.
function webCursorStyle(canPan: boolean) {
  return { cursor: canPan ? 'grab' : 'default' } as unknown as Record<string, unknown>;
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  viewport: {
    width: '100%',
    aspectRatio: 1010 / 666,
    overflow: 'hidden',
    borderRadius: Spacing.two,
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  tooltipFlag: {
    fontSize: 20,
  },
  zoomControls: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    gap: Spacing.two,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
});
