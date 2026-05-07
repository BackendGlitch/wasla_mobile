import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { XStack, Text } from 'tamagui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useRealtimeStore } from '../../store';

type TabConfig = {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

const tabs: TabConfig[] = [
  { key: 'index', label: 'Main', icon: 'home-variant-outline', activeIcon: 'home-variant' },
  { key: 'history', label: 'History', icon: 'history' },
  { key: 'settings', label: 'Settings', icon: 'cog-outline', activeIcon: 'cog' },
];

/** Custom tab bars don’t receive a wrapper View with `tabBarStyle`; mirror RN’s semantics so `setOptions({ tabBarStyle })` hides the bar. */
function isTabBarStyleHidden(style: StyleProp<ViewStyle> | undefined): boolean {
  const flat = style != null ? StyleSheet.flatten(style) : undefined;
  if (!flat) return false;
  if ((flat.opacity as number) === 0) return true;
  if (flat.display === 'none') return true;
  if (typeof flat.height === 'number' && flat.height === 0) return true;
  return false;
}

const colors = {
  bar: 'rgba(14, 16, 22, 0.5)',
  barBorder: 'rgba(255,255,255,0.08)',
  inactive: '#A5AFBF',
  activeText: '#0E1118',
  activePill: 'rgba(255,255,255,0.92)',
  activePillBorder: 'rgba(255,255,255,0.7)',
  activePillInner: 'rgba(255,255,255,0.4)',
  activePillSheen: 'rgba(255,255,255,0.85)',
  shadow: 'rgba(0,0,0,0.5)',
};

export default function GlossyTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(18, insets.bottom + 8);
  const activeRouteName = state.routes[state.index]?.name;
  const shouldShowBar = tabs.some((tab) => tab.key === activeRouteName);
  const focusedRoute = state.routes[state.index];
  const focusedTabBarStyle = focusedRoute
    ? descriptors[focusedRoute.key]?.options.tabBarStyle
    : undefined;
  const realtimeStatus = useRealtimeStore((s) => s.status);

  const liveLabel =
    realtimeStatus === 'connected'
      ? 'Live'
      : realtimeStatus === 'connecting'
        ? 'Connecting'
        : 'Disconnected';
  const liveDot =
    realtimeStatus === 'connected'
      ? '#2EE59D'
      : realtimeStatus === 'connecting'
        ? 'rgba(255, 204, 102, 0.95)'
        : 'rgba(255, 111, 111, 0.95)';

  if (!shouldShowBar) return null;

  if (isTabBarStyleHidden(focusedTabBarStyle as StyleProp<ViewStyle>)) return null;

  return (
    <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View style={styles.barShell}>
        <BlurView intensity={32} tint="dark" style={styles.blurLayer} pointerEvents="none" />
        <View style={styles.bottomShade} pointerEvents="none" />
        <XStack style={styles.row}>
          {tabs.map((tab) => {
            const routeIndex = state.routes.findIndex((r) => r.name === tab.key);
            const route = state.routes[routeIndex];
            if (!route) return null;

            const isFocused = state.index === routeIndex;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            return (
              <Pressable key={tab.key} onPress={onPress} onLongPress={onLongPress} style={styles.pressable}>
                <View style={[styles.item, !isFocused && styles.itemInactive, isFocused && styles.itemActive]}>
                  {isFocused ? <View style={styles.activeSheen} pointerEvents="none" /> : null}
                  {isFocused ? <View style={styles.activeInnerStroke} pointerEvents="none" /> : null}
                  <MaterialCommunityIcons
                    name={isFocused && tab.activeIcon ? tab.activeIcon : tab.icon}
                    size={18}
                    color={isFocused ? colors.activeText : colors.inactive}
                  />
                  {isFocused ? (
                    <Text fontSize="$2" fontWeight="700" style={{ color: colors.activeText }}>
                      {tab.label}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </XStack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  barShell: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.bar,
    borderWidth: 1,
    borderColor: colors.barBorder,
    shadowColor: colors.shadow,
    shadowOpacity: 0.7,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 24,
    overflow: 'hidden',
  },
  liveWrap: {
    position: 'absolute',
    top: 8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  liveText: {
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.3,
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  bottomShade: {
    position: 'absolute',
    bottom: 2,
    left: 12,
    right: 12,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 6,
  },
  pressable: {
    borderRadius: 999,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  itemInactive: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    opacity: 0.8,
    minWidth: 44,
    justifyContent: 'center',
  },
  itemActive: {
    backgroundColor: colors.activePill,
    borderWidth: 1,
    borderColor: colors.activePillBorder,
    overflow: 'hidden',
    shadowColor: 'rgba(255,255,255,0.28)',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 10,
    minWidth: 96,
    justifyContent: 'center',
  },
  activeSheen: {
    position: 'absolute',
    top: 4,
    left: 12,
    right: 12,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.activePillSheen,
  },
  activeInnerStroke: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    bottom: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.activePillInner,
  },
});
