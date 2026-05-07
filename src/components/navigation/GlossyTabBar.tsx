import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { XStack, Text } from 'tamagui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

type TabConfig = {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

const tabs: TabConfig[] = [
  { key: 'index', label: 'Main', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
  { key: 'history', label: 'History', icon: 'clipboard-text-clock-outline', activeIcon: 'clipboard-text-clock' },
  { key: 'settings', label: 'Settings', icon: 'tune-variant', activeIcon: 'tune-variant' },
];

function isTabBarStyleHidden(style: StyleProp<ViewStyle> | undefined): boolean {
  const flat = style != null ? StyleSheet.flatten(style) : undefined;
  if (!flat) return false;
  if ((flat.opacity as number) === 0) return true;
  if (flat.display === 'none') return true;
  if (typeof flat.height === 'number' && flat.height === 0) return true;
  return false;
}

const c = {
  frame: '#0C0B0A',
  frameInset: '#161210',
  brass: '#C97B3F',
  brassDim: 'rgba(201, 123, 63, 0.35)',
  amberLine: 'rgba(232, 168, 108, 0.55)',
  textIdle: '#8E7760',
  textIdleMuted: '#5C5044',
  ink: '#140E0B',
  activeFill: '#D87A38',
  activeBorder: '#EEB47A',
  rivet: 'rgba(232, 180, 122, 0.45)',
};

export default function GlossyTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(10, insets.bottom + 6);
  const activeRouteName = state.routes[state.index]?.name;
  const shouldShowBar = tabs.some((tab) => tab.key === activeRouteName);
  const focusedRoute = state.routes[state.index];
  const focusedTabBarStyle = focusedRoute ? descriptors[focusedRoute.key]?.options.tabBarStyle : undefined;

  if (!shouldShowBar) return null;
  if (isTabBarStyleHidden(focusedTabBarStyle as StyleProp<ViewStyle>)) return null;

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View style={styles.outerChrome}>
        <View style={styles.rivetTL} pointerEvents="none" />
        <View style={styles.rivetTR} pointerEvents="none" />
        <View style={styles.chromeTopRule} pointerEvents="none" />

        <View style={styles.headerStrip}>
          <Text style={styles.headerLabel}>MENU</Text>
          <Text style={styles.headerSub}>WASLA</Text>
        </View>

        <View style={styles.innerWell}>
          <XStack style={styles.segmentRow}>
            {tabs.map((tab, index) => {
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
                <View key={tab.key} style={styles.cellWrap}>
                  {index > 0 ? <View style={styles.verticalRule} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isFocused }}
                    accessibilityLabel={tab.label}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    style={({ pressed }) => [
                      styles.cell,
                      isFocused ? styles.cellActive : null,
                      pressed ? styles.cellPressed : null,
                    ]}
                  >
                    {isFocused ? <View style={styles.activeGlowLine} pointerEvents="none" /> : null}
                    <MaterialCommunityIcons
                      name={isFocused && tab.activeIcon ? tab.activeIcon : tab.icon}
                      size={20}
                      color={isFocused ? c.ink : c.textIdle}
                    />
                    <Text
                      fontSize="$1"
                      fontWeight="800"
                      letterSpacing={1.4}
                      style={{ color: isFocused ? c.ink : c.textIdleMuted }}
                    >
                      {tab.label.toUpperCase()}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </XStack>
        </View>

        <View style={styles.chromeBottomRule} pointerEvents="none" />
        <View style={styles.rivetBL} pointerEvents="none" />
        <View style={styles.rivetBR} pointerEvents="none" />
      </View>
    </View>
  );
}

const rivetCommon = {
  position: 'absolute' as const,
  width: 5,
  height: 5,
  borderRadius: 1,
  backgroundColor: c.rivet,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: c.brassDim,
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'stretch',
    paddingHorizontal: 16,
  },
  outerChrome: {
    position: 'relative',
    borderRadius: 8,
    backgroundColor: c.frame,
    borderWidth: 2,
    borderColor: c.brassDim,
    paddingTop: 2,
    paddingBottom: 4,
    paddingHorizontal: 3,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
    overflow: 'visible',
  },
  rivetTL: { ...rivetCommon, top: -2, left: 10 },
  rivetTR: { ...rivetCommon, top: -2, right: 10 },
  rivetBL: { ...rivetCommon, bottom: -2, left: 10 },
  rivetBR: { ...rivetCommon, bottom: -2, right: 10 },
  chromeTopRule: {
    position: 'absolute',
    top: 6,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: c.amberLine,
    opacity: 0.85,
  },
  chromeBottomRule: {
    position: 'absolute',
    bottom: 8,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: c.amberLine,
    opacity: 0.35,
  },
  headerStrip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerLabel: {
    color: c.brass,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  headerSub: {
    color: c.textIdleMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  innerWell: {
    marginHorizontal: 6,
    borderRadius: 4,
    backgroundColor: c.frameInset,
    borderWidth: 1,
    borderColor: 'rgba(40, 32, 26, 0.95)',
    overflow: 'hidden',
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 58,
  },
  cellWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  verticalRule: {
    width: StyleSheet.hairlineWidth + 1,
    backgroundColor: c.brassDim,
    opacity: 0.9,
    marginVertical: 8,
    alignSelf: 'stretch',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 2,
    marginVertical: 4,
    marginHorizontal: 2,
  },
  cellActive: {
    backgroundColor: c.activeFill,
    borderWidth: 1,
    borderColor: c.activeBorder,
    shadowColor: c.activeFill,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  cellPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  activeGlowLine: {
    position: 'absolute',
    top: 5,
    left: '14%',
    right: '14%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 234, 210, 0.55)',
  },
});
