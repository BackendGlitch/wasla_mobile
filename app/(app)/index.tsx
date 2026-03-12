import { YStack, Text } from 'tamagui';
import { appColors } from '../../src/theme/appTheme';

export default function MainScreen() {
  return (
    <YStack flex={1} bg={appColors.bg} items="center" justify="center">
      <Text fontSize="$8" fontWeight="800" color={appColors.textPrimary}>
        Main
      </Text>
    </YStack>
  );
}
