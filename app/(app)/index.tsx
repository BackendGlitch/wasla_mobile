import { YStack, Text, Button } from 'tamagui';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store';
import { waslaColors } from '../../src/theme/colors';

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
    } catch {
      //  fallback
    }
    logout();
    router.replace('/(auth)');
  };

  return (
    <YStack flex={1} bg={waslaColors.background} items="center" justify="center" p="$6">
      <Text fontSize={64} mb="$4">
        🚌
      </Text>
      <Text fontSize="$9" fontWeight="800" color={waslaColors.textPrimary} mb="$2">
        Welcome to Wasla
      </Text>
      {user?.name ? (
        <Text fontSize="$5" color={waslaColors.textSecondary} mb="$6">
          Hello, {user.name}!
        </Text>
      ) : null}
      <Text fontSize="$4" color={waslaColors.textMuted} text="center" lineHeight={22}>
        This is the main screen placeholder.{'\n'}Start building your features here!
      </Text>

      <Button
        size="$4"
        bg={waslaColors.error}
        rounded="$4"
        mt="$8"
        pressStyle={{ bg: '#c0392b' }}
        onPress={handleLogout}
      >
        <Text color="white" fontWeight="700" fontSize="$4">
          Sign Out
        </Text>
      </Button>
    </YStack>
  );
}
