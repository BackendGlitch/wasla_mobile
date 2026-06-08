import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { XStack, Text } from 'tamagui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { appColors } from '../../theme/appTheme';

type TabConfig = {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const tabs: TabConfig[] = [
  { key: 'index', label: 'Home', icon: 'home-outline' },
  { key: 'history', label: 'History', icon: 'text-box-outline' },
  { key: 'settings', label: 'Settings', icon: 'dots-horizontal' },
];

function isTabBarStyleHidden(style: StyleProp<ViewStyle> | undefined): boolean {
  const flat = style != null ? StyleSheet.flatten(style) : undefined;
  if (!flat) return false;
  if ((flat.opacity as number) === 0) return true;
  if (flat.display === 'none') return true;
  if (typeof flat.height === 'number' && flat.height === 0) return true;
  return false;
}

export default function GlossyTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(8, insets.bottom + 6);
  const activeRouteName = state.routes[state.index]?.name;
  const shouldShowBar = tabs.some((tab) => tab.key === activeRouteName);
  const focusedRoute = state.routes[state.index];
  const focusedTabBarStyle = focusedRoute ? descriptors[focusedRoute.key]?.options.tabBarStyle : undefined;

  if (!shouldShowBar) return null;
  if (isTabBarStyleHidden(focusedTabBarStyle as StyleProp<ViewStyle>)) return null;

  return (
    <View style={[styles.container, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View style={styles.bar}>
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

            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={tab.label}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.tab,
                  pressed && styles.tabPressed,
                ]}
              >
                <MaterialCommunityIcons
                  name={isFocused ? tab.icon.replace('-outline', '') as any : tab.icon}
                  size={22}
                  color={isFocused ? appColors.accent : appColors.iconInactive}
                />
                <Text
                  fontSize={11}
                  fontWeight={isFocused ? '700' : '500'}
                  letterSpacing={0.3}
                  color={isFocused ? appColors.accent : appColors.iconInactive}
                >
                  {tab.label}
                </Text>
                {isFocused && <View style={styles.indicator} />}
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
    bottom: 0,
    alignItems: 'stretch',
    paddingHorizontal: 20,
  },
  bar: {
    borderRadius: 20,
    backgroundColor: 'rgba(11, 20, 36, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.10)',
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 52,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: 16,
    position: 'relative',
  },
  tabPressed: {
    opacity: 0.7,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: appColors.accent,
  },
});
