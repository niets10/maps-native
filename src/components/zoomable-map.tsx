import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import {
  MAP_ASPECT_RATIO,
  MAP_VIEWBOX,
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_WIDTH,
  WorldMap,
  type CountryHover,
} from '@/components/world-map';
import { COUNTRIES_BY_CODE } from '@/constants/countries';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { flagEmoji } from '@/lib/utils';

/** Absolute floor: never zoom out further than the map's own (unscaled) resolution. */
const MIN_SCALE_FLOOR = 1;
/** How far beyond "cover" (the scale at which the map's shorter dimension exactly fills
 * the viewport, eliminating letterboxing) the user can still zoom in. */
const MAX_ZOOM_MULTIPLIER = 4;
/** Tolerance for comparing the live scale against the (screen-size-dependent) min/max
 * bounds when deciding whether to disable the zoom buttons. */
const SCALE_EPSILON = 0.01;
/** Multiplicative zoom-per-pixel-of-wheel-delta, tuned to feel similar to Google Maps. */
const WHEEL_ZOOM_SENSITIVITY = 0.01;
/** Single-pointer movement (px) before a drag claims the gesture over a tap. */
const DRAG_THRESHOLD = 4;
/** Offset (px) between the cursor and the tooltip so it doesn't sit under the pointer. */
const TOOLTIP_OFFSET = 16;
/** Rough tooltip footprint, used to keep it from drifting past the viewport edge. */
const TOOLTIP_WIDTH_ESTIMATE = 200;
const TOOLTIP_HEIGHT_ESTIMATE = 44;

const IDENTITY_TRANSFORM = {
  transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
  transformOrigin: [0, 0, 0],
};

type Point = { x: number; y: number };
type Transform = { scale: number; x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Convert the logical pan/zoom transform into an SVG viewBox. Used on native when idle
 * so the map stays sharp; during gestures we use a cheap View transform instead.
 */
function transformToViewBox(
  { scale, x, y }: Transform,
  viewportWidth: number,
  viewportHeight: number
): string {
  if (viewportWidth <= 0 || viewportHeight <= 0 || scale <= 0) return MAP_VIEWBOX;
  const contentWidth = viewportWidth;
  const contentHeight = contentWidth / MAP_ASPECT_RATIO;
  const vbX = ((0 - x) / scale / contentWidth) * MAP_VIEWBOX_WIDTH;
  const vbY = ((0 - y) / scale / contentHeight) * MAP_VIEWBOX_HEIGHT;
  const vbW = (viewportWidth / scale / contentWidth) * MAP_VIEWBOX_WIDTH;
  const vbH = (viewportHeight / scale / contentHeight) * MAP_VIEWBOX_HEIGHT;
  return `${vbX} ${vbY} ${vbW} ${vbH}`;
}

/** Pinch distance + midpoint in container-local coords, derived from screen-space touches. */
function getPinchFromPageTouches(
  touches: { pageX: number; pageY: number }[],
  pageOrigin: Point
): { distance: number; midpoint: Point } | null {
  if (touches.length < 2) return null;
  const [a, b] = touches;
  const distance = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
  if (distance < 1) return null;
  return {
    distance,
    midpoint: {
      x: (a.pageX + b.pageX) / 2 - pageOrigin.x,
      y: (a.pageY + b.pageY) / 2 - pageOrigin.y,
    },
  };
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
  const isNative = Platform.OS !== 'web';

  const containerRef = useRef<View>(null);
  const contentRef = useRef<View>(null);
  const containerSize = useRef({ width: 0, height: 0 });
  // Screen-space origin of the viewport, kept in sync via `measureInWindow` so pinch
  // math can convert `pageX`/`pageY` into container-local coordinates. Using
  // `locationX`/`locationY` for multi-touch is wrong here: each finger often lands on a
  // different SVG `<Path>`, so those values live in different local spaces and the
  // computed pinch distance/midpoint is garbage.
  const containerPageOrigin = useRef<Point>({ x: 0, y: 0 });
  // Web layout can settle over a couple of passes (fonts, safe-area insets, etc.), so we
  // keep re-centering on `initialFocus` across layout events until the user actually
  // performs a gesture -- otherwise an early, smaller measurement can lock in an
  // off-center transform that a later, correct measurement never fixes.
  const userInteractedRef = useRef(false);

  // The transform is mutated directly on the content node for every pointer/wheel tick
  // (see `applyTransform`), so dragging and pinching stay smooth without round-tripping
  // through React state on every frame. `scaleForUi` is the only piece we mirror into
  // React state, since the zoom buttons need to re-render.
  const transform = useRef<Transform>({ scale: initialScale, x: 0, y: 0 });
  const [scaleForUi, setScaleForUi] = useState(initialScale);

  // Native hybrid: idle = sharp viewBox crop; gesture = cheap View scale/pan (may soften
  // briefly), then bake back into viewBox on release. Updating viewBox every frame was
  // what froze the map.
  const isGesturingRef = useRef(false);
  const [isGesturing, setIsGesturing] = useState(false);
  const [idleViewBox, setIdleViewBox] = useState(MAP_VIEWBOX);

  const gestureStartRef = useRef<{
    transform: Transform;
    pinchDistance: number | null;
    pinchMidpoint: Point | null;
    /** Cumulative dx/dy from PanResponder grant at the moment this drag segment began. */
    dragOrigin: Point;
  } | null>(null);

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

  // The content layer is always exactly as wide as the viewport (see `content`'s style),
  // so its native (unscaled) height is derived purely from the map artwork's own aspect
  // ratio -- which, on a tall phone screen, is usually shorter than the viewport itself.
  // "Cover" (never zoom out past the scale where the map's height reaches the viewport's)
  // is therefore the effective minimum, so the map always fills the viewport with no
  // empty bands above/below, the same way a real map app behaves.
  const getScaleBounds = useCallback((): { min: number; max: number } => {
    const { width, height } = containerSize.current;
    if (width === 0 || height === 0) {
      return { min: MIN_SCALE_FLOOR, max: MIN_SCALE_FLOOR * MAX_ZOOM_MULTIPLIER };
    }
    const nativeContentHeight = width / MAP_ASPECT_RATIO;
    const coverScale = Math.max(MIN_SCALE_FLOOR, height / nativeContentHeight);
    return { min: coverScale, max: coverScale * MAX_ZOOM_MULTIPLIER };
  }, []);

  const clampTransform = useCallback(
    ({ scale, x, y }: Transform): Transform => {
      const { width, height } = containerSize.current;
      const { min, max } = getScaleBounds();
      const nextScale = clamp(scale, min, max);
      const nativeContentHeight = width / MAP_ASPECT_RATIO;
      const minX = width * (1 - nextScale);
      const minY = height - nativeContentHeight * nextScale;
      return { scale: nextScale, x: clamp(x, minX, 0), y: clamp(y, minY, 0) };
    },
    [getScaleBounds]
  );

  const commitIdleViewBox = useCallback(() => {
    if (!isNative) return;
    const { width, height } = containerSize.current;
    if (width === 0 || height === 0) return;
    setIdleViewBox(transformToViewBox(transform.current, width, height));
  }, [isNative]);

  const applyTransform = useCallback(() => {
    const { scale, x, y } = transform.current;
    // All the pan/zoom math below (clampTransform, zoomAroundPoint, centerOn) assumes
    // `screen = translate + scale * content`, i.e. scaling pivots around the content's
    // own top-left corner. Both platforms default the pivot to the element's center, so
    // it must be pinned to the top-left corner or every formula below is off.
    if (!isNative) {
      const node = contentRef.current as unknown as HTMLElement | null;
      if (!node) return;
      node.style.transformOrigin = '0 0';
      node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      return;
    }
    // Native idle: the sharp viewBox layer is showing; keep the gesture layer at identity.
    if (!isGesturingRef.current) {
      contentRef.current?.setNativeProps({ style: IDENTITY_TRANSFORM });
      return;
    }
    // Native gesture: GPU-scale the full map (responsive). Softness is OK mid-gesture;
    // we bake a sharp viewBox on release.
    contentRef.current?.setNativeProps({
      style: {
        transform: [{ translateX: x }, { translateY: y }, { scale }],
        transformOrigin: [0, 0, 0],
      },
    });
  }, [isNative]);

  const setTransform = useCallback(
    (next: Transform, options?: { syncUi?: boolean; commitViewBox?: boolean }) => {
      const clamped = clampTransform(next);
      transform.current = clamped;
      applyTransform();
      if (options?.syncUi) setScaleForUi(clamped.scale);
      if (options?.commitViewBox) commitIdleViewBox();
    },
    [applyTransform, clampTransform, commitIdleViewBox]
  );

  // When entering gesture mode, reveal the full-map layer and paint the absolute
  // transform. When leaving, hide it again (idle viewBox takes over).
  useLayoutEffect(() => {
    if (!isNative) return;
    isGesturingRef.current = isGesturing;
    applyTransform();
  }, [isGesturing, isNative, applyTransform]);

  const beginGesture = useCallback(() => {
    if (!isNative) return;
    setIsGesturing(true);
  }, [isNative]);

  const endGesture = useCallback(() => {
    gestureStartRef.current = null;
    if (!isNative) {
      setScaleForUi(transform.current.scale);
      return;
    }
    isGesturingRef.current = false;
    commitIdleViewBox();
    setIsGesturing(false);
    setScaleForUi(transform.current.scale);
  }, [commitIdleViewBox, isNative]);

  const zoomAroundPoint = useCallback(
    (focal: Point, nextScaleRaw: number, from: Transform = transform.current) => {
      const { min, max } = getScaleBounds();
      const nextScale = clamp(nextScaleRaw, min, max);
      const contentX = (focal.x - from.x) / from.scale;
      const contentY = (focal.y - from.y) / from.scale;
      setTransform(
        { scale: nextScale, x: focal.x - contentX * nextScale, y: focal.y - contentY * nextScale },
        { syncUi: true, commitViewBox: isNative && !isGesturingRef.current }
      );
    },
    [getScaleBounds, isNative, setTransform]
  );

  const centerOn = useCallback(
    (focusFraction: Point, scale: number) => {
      const { width, height } = containerSize.current;
      if (width === 0 || height === 0) return;
      const { min, max } = getScaleBounds();
      const nextScale = clamp(scale, min, max);
      // `focusFraction` is a fraction of the map artwork's own dimensions, not the
      // viewport's -- only the width happens to line up 1:1 (see `getScaleBounds` above).
      const nativeContentHeight = width / MAP_ASPECT_RATIO;
      setTransform(
        {
          scale: nextScale,
          x: width / 2 - focusFraction.x * width * nextScale,
          y: height / 2 - focusFraction.y * nativeContentHeight * nextScale,
        },
        { syncUi: true, commitViewBox: isNative }
      );
    },
    [getScaleBounds, isNative, setTransform]
  );

  const handleContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      containerSize.current = { width, height };
      containerRef.current?.measureInWindow((x, y) => {
        containerPageOrigin.current = { x, y };
      });
      if (!userInteractedRef.current && initialFocus) {
        centerOn(initialFocus, initialScale);
        return;
      }
      // Re-clamp and re-apply in case a resize (e.g. orientation change) shrank the
      // viewport enough that the current pan/zoom is no longer in bounds. `syncUi`
      // matters here too, since the cover-fit min/max scale is screen-size-dependent.
      setTransform(transform.current, { syncUi: true, commitViewBox: isNative });
    },
    [centerOn, initialFocus, initialScale, isNative, setTransform]
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
  // gestures. A plain two-finger scroll (no ctrl) zooms too: pushing both fingers
  // forward (away from you) zooms in, pulling them back zooms out. Panning is
  // reserved for click-and-drag, matching Google Maps' touchscreen behavior.
  const handleWheelRef = useRef<(event: WheelEvent) => void>(() => {});
  handleWheelRef.current = (event: WheelEvent) => {
    event.preventDefault();
    userInteractedRef.current = true;
    const rect = (containerRef.current as unknown as HTMLElement).getBoundingClientRect();
    const focal = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
    zoomAroundPoint(focal, transform.current.scale * factor);
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

  const canPanAtCurrentScale = useCallback(() => {
    const { width, height } = containerSize.current;
    if (width === 0 || height === 0) return false;
    const { scale } = transform.current;
    const contentHeight = width / MAP_ASPECT_RATIO;
    // Allow drag whenever the map overflows the viewport on either axis -- including
    // the cover-fit minimum on tall phones, where the map is wider than the screen.
    return width * scale > width + 0.5 || contentHeight * scale > height + 0.5;
  }, []);

  const captureGestureStart = useCallback((
    event: GestureResponderEvent,
    gestureState?: PanResponderGestureState
  ) => {
    const dragOrigin = { x: gestureState?.dx ?? 0, y: gestureState?.dy ?? 0 };
    const pinch = getPinchFromPageTouches(event.nativeEvent.touches, containerPageOrigin.current);
    if (pinch) {
      gestureStartRef.current = {
        transform: transform.current,
        pinchDistance: pinch.distance,
        pinchMidpoint: pinch.midpoint,
        dragOrigin,
      };
      return;
    }
    gestureStartRef.current = {
      transform: transform.current,
      pinchDistance: null,
      pinchMidpoint: null,
      dragOrigin,
    };
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        // Steal two-finger touches before SVG country paths claim them -- otherwise the
        // parent never becomes the responder and pinch never starts.
        onStartShouldSetPanResponderCapture: (event: GestureResponderEvent) =>
          event.nativeEvent.touches.length >= 2,
        // One-finger drags must capture too: the idle sharp layer's Path onPress handlers
        // otherwise own the touch and pan never starts.
        onMoveShouldSetPanResponderCapture: (
          event: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          if (event.nativeEvent.touches.length >= 2) return true;
          if (!canPanAtCurrentScale()) return false;
          return Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD;
        },
        onMoveShouldSetPanResponder: (
          event: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          if (event.nativeEvent.touches.length >= 2) return true;
          if (!canPanAtCurrentScale()) return false;
          return Math.abs(gestureState.dx) > DRAG_THRESHOLD || Math.abs(gestureState.dy) > DRAG_THRESHOLD;
        },
        onPanResponderGrant: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          userInteractedRef.current = true;
          beginGesture();
          captureGestureStart(event, gestureState);
        },
        onPanResponderMove: (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          // Native switches to the full-map layer on grant; wait until that paint lands
          // so we don't apply an absolute transform onto the cropped idle viewBox.
          if (isNative && !isGesturingRef.current) return;

          const touches = event.nativeEvent.touches;
          let start = gestureStartRef.current;

          // Second finger landed mid-drag -- restart as a pinch from the live transform.
          if (touches.length >= 2 && (!start?.pinchDistance || !start.pinchMidpoint)) {
            captureGestureStart(event, gestureState);
            start = gestureStartRef.current;
          }

          if (!start) return;

          if (touches.length >= 2 && start.pinchDistance && start.pinchMidpoint) {
            const pinch = getPinchFromPageTouches(touches, containerPageOrigin.current);
            if (!pinch) return;
            // Keep the content under the original pinch midpoint locked to the
            // moving midpoint (standard map pinch = zoom + pan together).
            const { min, max } = getScaleBounds();
            const nextScale = clamp(
              start.transform.scale * (pinch.distance / start.pinchDistance),
              min,
              max
            );
            const contentX = (start.pinchMidpoint.x - start.transform.x) / start.transform.scale;
            const contentY = (start.pinchMidpoint.y - start.transform.y) / start.transform.scale;
            setTransform({
              scale: nextScale,
              x: pinch.midpoint.x - contentX * nextScale,
              y: pinch.midpoint.y - contentY * nextScale,
            });
            return;
          }

          // Dropped back to one finger mid-pinch -- restart as a drag.
          if (start.pinchDistance) {
            captureGestureStart(event, gestureState);
            return;
          }

          setTransform({
            scale: start.transform.scale,
            x: start.transform.x + (gestureState.dx - start.dragOrigin.x),
            y: start.transform.y + (gestureState.dy - start.dragOrigin.y),
          });
        },
        onPanResponderRelease: () => {
          endGesture();
        },
        onPanResponderTerminate: () => {
          endGesture();
        },
      }),
    [
      beginGesture,
      canPanAtCurrentScale,
      captureGestureStart,
      endGesture,
      getScaleBounds,
      isNative,
      setTransform,
    ]
  );

  const { min: minScale, max: maxScale } = getScaleBounds();

  return (
    <View style={styles.wrapper}>
      <View
        ref={setContainerRef}
        style={[styles.viewport, Platform.OS === 'web' && webCursorStyle(scaleForUi > minScale + SCALE_EPSILON)]}
        onLayout={handleContainerLayout}
        {...panResponder.panHandlers}>
        {isNative ? (
          <>
            {/* Sharp idle layer: viewBox crop at viewport resolution. */}
            <View
              style={[styles.idleLayer, isGesturing && styles.invisible]}
              pointerEvents={isGesturing ? 'none' : 'auto'}>
              <WorldMap
                visited={visited}
                onToggle={onToggle}
                fillParent
                mapViewBox={idleViewBox}
              />
            </View>
            {/* Gesture layer: full map + View transform (always mounted so grant is instant). */}
            <View
              ref={contentRef}
              style={[styles.content, !isGesturing && styles.invisible]}
              pointerEvents="none">
              <WorldMap visited={visited} interactive={false} />
            </View>
          </>
        ) : (
          <View ref={contentRef} style={styles.content}>
            <WorldMap
              visited={visited}
              onToggle={onToggle}
              onHoverChange={handleHoverChange}
            />
          </View>
        )}

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
          disabled={scaleForUi <= minScale + SCALE_EPSILON}
          style={({ pressed }) => [
            styles.zoomButton,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            pressed && styles.zoomButtonPressed,
            scaleForUi <= minScale + SCALE_EPSILON && styles.zoomButtonDisabled,
          ]}>
          <ThemedText type="smallBold">−</ThemedText>
        </Pressable>
        <Pressable
          onPress={zoomIn}
          disabled={scaleForUi >= maxScale - SCALE_EPSILON}
          style={({ pressed }) => [
            styles.zoomButton,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
            pressed && styles.zoomButtonPressed,
            scaleForUi >= maxScale - SCALE_EPSILON && styles.zoomButtonDisabled,
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
    flex: 1,
    width: '100%',
  },
  viewport: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    borderRadius: Spacing.two,
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
  },
  idleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  invisible: {
    opacity: 0,
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
