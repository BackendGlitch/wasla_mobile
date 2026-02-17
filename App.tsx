import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider, Text, YStack } from 'tamagui';
import tamaguiConfig from './tamagui.config';

export default function App() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <YStack flex={1} items="center" justify="center" gap="$4">
        <Text fontSize="$7" fontWeight="700">
          Wasla Mobile
        </Text>
        <StatusBar style="auto" />
      </YStack>
    </TamaguiProvider>
  );
}
