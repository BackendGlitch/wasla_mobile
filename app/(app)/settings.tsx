import { YStack, Text } from 'tamagui';
import { appColors } from '../../src/theme/appTheme';

export default function SettingsScreen() {
  return (
    <YStack flex={1} bg={appColors.bg} items="center" justify="center">
      <Text fontSize="$8" fontWeight="800" color={appColors.textPrimary}>
        Settings
      </Text>
    </YStack>
  );
}
