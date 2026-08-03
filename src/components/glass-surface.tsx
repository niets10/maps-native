import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { GlassColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const canUseNativeGlass =
    Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export type GlassSurfaceProps = ViewProps & {
    interactive?: boolean;
};

export function GlassSurface({
    style,
    children,
    interactive = false,
    ...otherProps
}: GlassSurfaceProps) {
    const scheme = useColorScheme() ?? 'light';
    const glass = GlassColors[scheme];

    if (canUseNativeGlass) {
        return (
            <GlassView
                glassEffectStyle="regular"
                isInteractive={interactive}
                style={[styles.base, style]}
                {...otherProps}
            >
                {children}
            </GlassView>
        );
    }

    const fallbackStyle =
        Platform.OS === 'web'
            ? ({
                  backgroundColor: glass.background,
                  borderColor: glass.border,
                  backdropFilter: 'blur(16px) saturate(1.4)',
                  WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
              } as ViewProps['style'])
            : {
                  backgroundColor: glass.background,
                  borderColor: glass.border,
              };

    return (
        <View style={[styles.base, fallbackStyle, style]} {...otherProps}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderWidth: 1,
        overflow: 'hidden',
    },
});
