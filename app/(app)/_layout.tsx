import { Tabs } from 'expo-router';
import { Text } from 'tamagui';
import { waslaColors } from '../../src/theme/colors';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: waslaColors.primary500,
        tabBarInactiveTintColor: waslaColors.textMuted,
        tabBarStyle: {
          backgroundColor: waslaColors.surface,
          borderTopColor: waslaColors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      {/* Routes Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Routes',
          tabBarIcon: ({ color }) => <Text fontSize={20}>🚌</Text>,
        }}
      />

      {/* History Tab */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Text fontSize={20}>📋</Text>,
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text fontSize={20}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
