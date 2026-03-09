import { YStack, Text, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { waslaColors } from '../../src/theme/colors';

export default function AuthChoiceScreen() {
  const router = useRouter();

  return (
    <YStack flex={1} bg={waslaColors.background} items="center" justify="center" p="$6" gap="$6">
      {/* Header */}
      <YStack items="center" gap="$3">
        <Text fontSize={60}>🚌</Text>
        <Text fontSize="$9" fontWeight="800" color={waslaColors.textPrimary} text="center">
          Welcome to Wasla
        </Text>
        <Text fontSize="$4" color={waslaColors.textSecondary} text="center" lineHeight={22}>
          Choose how you want to sign in or create an account.
        </Text>
      </YStack>

      {/* Buttons */}
      <YStack gap="$3" width="100%" mt="$4">
        {/* Email Login */}
        <Button
          size="$5"
          bg={waslaColors.primary500}
          rounded="$4"
          pressStyle={{ bg: waslaColors.primary700 }}
          onPress={() => router.push('/login')}
        >
          <Text color="white" fontWeight="700" fontSize="$5">
            Sign in with Email
          </Text>
        </Button>

        {/* Email Register */}
        <Button
          size="$5"
          bg={waslaColors.secondary500}
          rounded="$4"
          pressStyle={{ bg: waslaColors.secondary700 }}
          onPress={() => router.push('/register')}
        >
          <Text color="white" fontWeight="700" fontSize="$5">
            Create Account
          </Text>
        </Button>

        {/* Phone Login */}
        <Button
          size="$5"
          bg={waslaColors.accent500}
          rounded="$4"
          pressStyle={{ bg: waslaColors.accent700 }}
          onPress={() => router.push('/phone')}
        >
          <Text color={waslaColors.textPrimary} fontWeight="700" fontSize="$5">
            Sign in with Phone
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
}
