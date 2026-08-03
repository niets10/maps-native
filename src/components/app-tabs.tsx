import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors, GlassColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AppTabs() {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];
    const glass = GlassColors[scheme];

    return (
        <NativeTabs
            backgroundColor={glass.background}
            indicatorColor={colors.backgroundSelected}
            tintColor={colors.accent}
            labelStyle={{ selected: { color: colors.text } }}
        >
            <NativeTabs.Trigger name="index">
                <Label>Map</Label>
                <Icon sf={{ default: 'map', selected: 'map.fill' }} />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="explore">
                <Label>Countries</Label>
                <Icon sf={{ default: 'list.bullet', selected: 'list.bullet' }} />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="profile">
                <Label>Profile</Label>
                <Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
