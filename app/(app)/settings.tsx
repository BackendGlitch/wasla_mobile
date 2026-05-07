import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store';
import { forceLogout } from '../../src/lib';
import { appColors } from '../../src/theme/appTheme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const navigateBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)');
  };

  const bottomPad = Math.max(24, insets.bottom + 96);

  const handleLogout = async () => {
    await forceLogout('user_initiated');
  };

  const displayName = user?.name?.trim() || 'Account';
  const email = user?.email?.trim() || '—';
  const phone = user?.phone?.trim() || '—';
  const userId = user?.id ?? '—';

  return (
    <YStack flex={1} bg={appColors.bg}>
      <ScrollView
        flex={1}
        contentContainerStyle={
          {
            paddingTop: insets.top + 20,
            paddingHorizontal: 20,
            paddingBottom: bottomPad,
          } as never
        }
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={navigateBack} style={[styles.backButton, { marginBottom: 14 }]}>
          <XStack items="center" gap="$2">
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.textPrimary} />
            <Text fontSize="$4" fontWeight="700" color={appColors.textPrimary}>
              Back
            </Text>
          </XStack>
        </Pressable>
        <Text fontSize="$8" fontWeight="800" color={appColors.textPrimary} mb="$2">
          Settings
        </Text>
        <Text fontSize="$4" color={appColors.textSecondary} mb="$5">
          Account
        </Text>

        <YStack
          bg={appColors.surfaceStrong}
          borderWidth={1}
          borderColor={appColors.borderStrong}
          rounded="$6"
          p="$4"
          gap="$4"
        >
          <XStack items="center" gap="$3">
            <YStack
              width={52}
              height={52}
              rounded="$5"
              bg={appColors.accentSoft}
              borderWidth={1}
              borderColor={appColors.accentGlowSoft}
              items="center"
              justify="center"
            >
              <MaterialCommunityIcons name="account-circle" size={28} color={appColors.accent} />
            </YStack>
            <YStack flex={1} gap="$1">
              <Text fontSize="$6" fontWeight="800" color={appColors.textPrimary}>
                {displayName}
              </Text>
              <Text fontSize="$2" color={appColors.textMuted}>
                Signed in
              </Text>
            </YStack>
          </XStack>

          <YStack height={1} bg={appColors.border} mx={-4} />

          <YStack gap="$3">
            <XStack justify="space-between" gap="$3">
              <Text fontSize="$3" color={appColors.textMuted} fontWeight="600">
                Email
              </Text>
              <Text
                fontSize="$3"
                color={appColors.textPrimary}
                fontWeight="600"
                flex={1}
                text="right"
              >
                {email}
              </Text>
            </XStack>
            <XStack justify="space-between" gap="$3">
              <Text fontSize="$3" color={appColors.textMuted} fontWeight="600">
                Phone
              </Text>
              <Text
                fontSize="$3"
                color={appColors.textPrimary}
                fontWeight="600"
                flex={1}
                text="right"
              >
                {phone}
              </Text>
            </XStack>
            <XStack justify="space-between" gap="$3">
              <Text fontSize="$3" color={appColors.textMuted} fontWeight="600">
                User ID
              </Text>
              <Text
                fontSize="$3"
                color={appColors.textSecondary}
                fontWeight="500"
                flex={1}
                text="right"
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {userId}
              </Text>
            </XStack>
          </YStack>
        </YStack>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => ({
            marginTop: 20,
            paddingVertical: 16,
            paddingHorizontal: 18,
            borderRadius: 14,
            backgroundColor: pressed ? 'rgba(255, 92, 122, 0.18)' : 'rgba(255, 92, 122, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255, 92, 122, 0.45)',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <XStack items="center" gap="$2">
            <MaterialCommunityIcons name="logout" size={20} color="#FF5C7A" />
            <Text fontSize="$4" fontWeight="800" color="#FF5C7A">
              Log out
            </Text>
          </XStack>
        </Pressable>
      </ScrollView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
  },
});
