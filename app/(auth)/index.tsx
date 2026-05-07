import { Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthBackdrop from '../../src/components/auth/AuthBackdrop';
import { BrandLogo } from '../../src/components/BrandLogo';
import { authColors } from '../../src/theme/authTheme';

export default function AuthWelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <AuthBackdrop variant="teal">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <YStack
          flex={1}
          px="$5"
          pt={Math.max(insets.top, 12) + 24}
          pb={Math.max(insets.bottom, 16) + 24}
          justify="space-between"
        >
          <YStack gap="$6" flex={1} justify="center">
            <YStack gap="$4" items="center">
              <BrandLogo size={88} />
              <Text fontSize="$10" fontWeight="900" color={authColors.textPrimary} letterSpacing={1.5}>
                WASLA
              </Text>
              <Text
                fontSize="$6"
                fontWeight="700"
                color={authColors.textPrimary}
                text="center"
                lineHeight={28}
              >
                Your trips, one secure account
              </Text>
              <Text fontSize="$4" color={authColors.textSecondary} text="center" lineHeight={22} style={{ maxWidth: 320 }}>
                Create an account with your email and phone, verify both, and sign in with SMS or password anytime.
              </Text>
            </YStack>

            <YStack gap="$3" width="100%" style={{ alignSelf: 'center', maxWidth: 320 }}>
              <Pressable
                onPress={() => router.push('/(auth)/sign-up')}
                style={({ pressed }) => ({
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  backgroundColor: pressed ? authColors.accentViolet : authColors.accent,
                  borderWidth: 1,
                  borderColor: authColors.borderStrong,
                })}
              >
                <XStack items="center" justify="center" gap="$2">
                  <MaterialCommunityIcons name="account-plus-outline" size={22} color={authColors.bg} />
                  <Text color={authColors.bg} fontWeight="800" fontSize="$5">
                    Create account
                  </Text>
                </XStack>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(auth)/sign-in')}
                testID="auth-welcome-signin"
                style={({ pressed }) => ({
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  backgroundColor: pressed ? 'rgba(211, 107, 43, 0.14)' : 'transparent',
                  borderWidth: 1,
                  borderColor: authColors.borderStrong,
                })}
              >
                <XStack items="center" justify="center" gap="$2">
                  <MaterialCommunityIcons name="login" size={22} color={authColors.textPrimary} />
                  <Text color={authColors.textPrimary} fontWeight="800" fontSize="$5">
                    Sign in
                  </Text>
                </XStack>
              </Pressable>
            </YStack>
          </YStack>

          <XStack flexWrap="wrap" justify="center" items="center" gap="$1" px="$3">
            <Text fontSize="$2" color={authColors.textMuted} lineHeight={18}>
              By continuing you agree to Wasla&apos;s{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/terms')}
              accessibilityRole="link"
              accessibilityHint="Opens Terms of Service"
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            >
              <Text
                fontSize="$2"
                fontWeight="700"
                color={authColors.accent}
                style={{ textDecorationLine: 'underline', textDecorationColor: authColors.accent }}
              >
                Terms
              </Text>
            </Pressable>
            <Text fontSize="$2" color={authColors.textMuted} lineHeight={18}>
              {' '}and{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/privacy')}
              accessibilityRole="link"
              accessibilityHint="Opens Privacy Policy"
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            >
              <Text
                fontSize="$2"
                fontWeight="700"
                color={authColors.accent}
                style={{ textDecorationLine: 'underline', textDecorationColor: authColors.accent }}
              >
                Privacy Policy
              </Text>
            </Pressable>
            <Text fontSize="$2" color={authColors.textMuted} lineHeight={18}>
              .
            </Text>
          </XStack>
        </YStack>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}
