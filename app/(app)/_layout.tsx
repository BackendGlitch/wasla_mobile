import { Tabs } from 'expo-router';
import GlossyTabBar from '../../src/components/navigation/GlossyTabBar';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
        },
      }}
      tabBar={(props) => <GlossyTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Main' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen name="booking" options={{ href: null }} />
    </Tabs>
  );
}
