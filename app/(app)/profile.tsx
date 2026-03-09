import { YStack, XStack, Text, Button, Separator } from 'tamagui';
import { ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store';
import { waslaColors } from '../../src/theme/colors';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('has_onboarded');
    } catch {
      // fallback
    }
    logout();
    router.replace('/(auth)');
  };

  return (
    <YStack flex={1} bg={waslaColors.background}>
      {/* Header */}
      <YStack bg={waslaColors.primary500} p="$6" pt="$8" pb="$6" gap="$4">
        <Text fontSize="$8" fontWeight="800" color="white">
          My Profile
        </Text>
      </YStack>

      {/* Profile Section - Scrollable */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack p="$6" gap="$4" pb="$8">
        {/* Avatar & Name */}
        <YStack items="center" gap="$3" pb="$4">
          <YStack
            width={80}
            height={80}
            rounded="$8"
            bg={waslaColors.primary500}
            items="center"
            justify="center"
          >
            <Text fontSize={40}>👤</Text>
          </YStack>
          <YStack items="center" gap="$1">
            <Text fontSize="$7" fontWeight="800" color={waslaColors.textPrimary}>
              {user?.name || 'Guest User'}
            </Text>
            <Text fontSize="$3" color={waslaColors.textSecondary}>
              Wasla Member
            </Text>
          </YStack>
        </YStack>

        {/* Info Card */}
        <YStack bg={waslaColors.surface} rounded="$4" p="$4" gap="$3">
          <ProfileField icon="📧" label="Email" value={user?.email || 'Not set'} />
          <Separator />
          <ProfileField
            icon="📱"
            label="Phone"
            value={user?.phone || 'Not set'}
          />
          <Separator />
          <ProfileField icon="🆔" label="User ID" value={user?.id || 'N/A'} />
        </YStack>

        {/* Stats */}
        <XStack gap="$3">
          <YStack
            flex={1}
            bg={waslaColors.primaryLight}
            rounded="$4"
            p="$4"
            items="center"
            gap="$2"
          >
            <Text fontSize={24}>🎫</Text>
            <Text fontSize="$3" fontWeight="700" color={waslaColors.textPrimary}>
              3
            </Text>
            <Text fontSize="$2" color={waslaColors.textSecondary} text="center">
              Total Trips
            </Text>
          </YStack>
          <YStack
            flex={1}
            bg={waslaColors.secondaryLight}
            rounded="$4"
            p="$4"
            items="center"
            gap="$2"
          >
            <Text fontSize={24}>✅</Text>
            <Text fontSize="$3" fontWeight="700" color={waslaColors.textPrimary}>
              2
            </Text>
            <Text fontSize="$2" color={waslaColors.textSecondary} text="center">
              Completed
            </Text>
          </YStack>
        </XStack>

        {/* Account Section */}
        <YStack gap="$3" mt="$4">
          <Text fontSize="$4" fontWeight="700" color={waslaColors.textPrimary}>
            Account Settings
          </Text>

          <Button
            size="$4"
            bg={waslaColors.surface}
            borderWidth={1}
            borderColor={waslaColors.border}
            rounded="$3"
            pressStyle={{ bg: waslaColors.gray100 }}
          >
            <Text color={waslaColors.textPrimary} fontWeight="600">
              ⚙️ Edit Profile
            </Text>
          </Button>

          <Button
            size="$4"
            bg={waslaColors.surface}
            borderWidth={1}
            borderColor={waslaColors.border}
            rounded="$3"
            pressStyle={{ bg: waslaColors.gray100 }}
          >
            <Text color={waslaColors.textPrimary} fontWeight="600">
              🔒 Change Password
            </Text>
          </Button>

          <Button
            size="$4"
            bg={waslaColors.surface}
            borderWidth={1}
            borderColor={waslaColors.border}
            rounded="$3"
            pressStyle={{ bg: waslaColors.gray100 }}
          >
            <Text color={waslaColors.textPrimary} fontWeight="600">
              📧 Notifications Settings
            </Text>
          </Button>
        </YStack>

        {/* Danger Zone */}
        <YStack gap="$2" mt="$6">
          <Button
            size="$4"
            bg={waslaColors.error}
            rounded="$3"
            pressStyle={{ bg: '#c0392b' }}
            onPress={handleLogout}
          >
            <Text color="white" fontWeight="700" fontSize="$4">
              🚪 Sign Out
            </Text>
          </Button>
        </YStack>

        {/* Footer */}
        <YStack items="center" gap="$2" mt="$6" pt="$4" borderTopWidth={1} borderTopColor={waslaColors.border}>
          <Text fontSize="$2" color={waslaColors.textMuted}>
            Wasla v1.0.0
          </Text>
          <XStack gap="$4">
            <Text fontSize="$2" color={waslaColors.primary500} fontWeight="600">
              Privacy Policy
            </Text>
            <Text fontSize="$2" color={waslaColors.primary500} fontWeight="600">
              Terms of Service
            </Text>
          </XStack>
        </YStack>
      </YStack>
      </ScrollView>
    </YStack>
  );
}

// Helper component
const ProfileField = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <XStack justify="space-between" items="center" gap="$3">
    <XStack items="center" gap="$3" flex={1}>
      <Text fontSize={20}>{icon}</Text>
      <YStack flex={1}>
        <Text fontSize="$2" color={waslaColors.textMuted}>
          {label}
        </Text>
        <Text fontSize="$4" fontWeight="600" color={waslaColors.textPrimary}>
          {value}
        </Text>
      </YStack>
    </XStack>
    <Text fontSize="$4" color={waslaColors.textMuted}>
      →
    </Text>
  </XStack>
);
