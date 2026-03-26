import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, Button, Input, Spinner, Circle } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthBackdrop from '../../src/components/auth/AuthBackdrop';
import { authColors } from '../../src/theme/authTheme';
import { authApi, toE164TNPhone } from '../../src/lib';

export default function AuthEntryScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (phone.trim().length < 6) {
      setError('Enter a valid phone number');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const phoneE164 = toE164TNPhone(phone);
      await authApi.requestOtp({ phone: phoneE164 });
      router.push({ pathname: '/(auth)/otp', params: { phone: phoneE164 } });
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackdrop variant="teal">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <YStack flex={1} px="$5" pt="$8" pb="$6" justify="space-between">
          <YStack gap="$4">
            <XStack items="center" gap="$3">
              <Circle size={42} bg={authColors.accentSoft} borderWidth={1} borderColor={authColors.borderStrong}>
                <MaterialCommunityIcons name="bus" size={20} color={authColors.accent} />
              </Circle>
              <Text fontSize="$6" fontWeight="800" color={authColors.textPrimary} letterSpacing={1.2}>
                WASLA
              </Text>
            </XStack>

            <YStack gap="$2">
              <Text fontSize="$9" fontWeight="900" color={authColors.textPrimary}>
                Welcome back
              </Text>
              <Text fontSize="$4" color={authColors.textSecondary} lineHeight={22}>
                Sign in fast with your phone number. We will text you a secure code.
              </Text>
            </YStack>
          </YStack>

          <YStack
            bg={authColors.card}
            borderWidth={1}
            borderColor={authColors.border}
            rounded="$7"
            p="$5"
            gap="$4"
          >
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                Phone number
              </Text>
              <XStack
                items="center"
                gap="$2"
                bg={authColors.cardStrong}
                borderWidth={1}
                borderColor={error ? authColors.error : authColors.borderStrong}
                rounded="$5"
                px="$3"
              >
                <Text fontSize="$4" fontWeight="700" color={authColors.textPrimary}>
                  +216
                </Text>
                <Input
                  flex={1}
                  size="$4"
                  placeholder="XX XXX XXX"
                  placeholderTextColor="$textMuted"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  borderWidth={0}
                  bg="transparent"
                  color={authColors.textPrimary}
                  fontSize="$4"
                />
              </XStack>
              {error ? (
                <Text fontSize="$2" color={authColors.error}>
                  {error}
                </Text>
              ) : null}
            </YStack>

            <Button
              size="$5"
              bg={authColors.accent}
              borderWidth={1}
              borderColor="rgba(56, 246, 177, 0.4)"
              rounded="$6"
              pressStyle={{ bg: '#2ED79B' }}
              onPress={handleSendOtp}
              disabled={loading}
              opacity={loading ? 0.7 : 1}
            >
              {loading ? (
                <Spinner color={authColors.bg} />
              ) : (
                <Text color={authColors.bg} fontWeight="800" fontSize="$5" letterSpacing={0.6}>
                  Continue
                </Text>
              )}
            </Button>

            <XStack items="center" gap="$3">
              <YStack flex={1} height={1} bg={authColors.border} />
              <Text fontSize="$2" color={authColors.textMuted}>
                OR
              </Text>
              <YStack flex={1} height={1} bg={authColors.border} />
            </XStack>

            <Button
              size="$4"
              bg="transparent"
              borderWidth={1}
              borderColor={authColors.borderStrong}
              rounded="$6"
              pressStyle={{ opacity: 0.7 }}
              onPress={() => router.push('/login')}
            >
              <Text color={authColors.textPrimary} fontWeight="700">
                Use email & password instead
              </Text>
            </Button>

            <Text fontSize="$3" color={authColors.textSecondary} text="center">
              Don&apos;t have an account?{' '}
              <Text
                color={authColors.accent}
                fontWeight="700"
                onPress={() => router.push('/register')}
              >
                Create one
              </Text>
            </Text>
          </YStack>

          <Text fontSize="$2" color={authColors.textMuted} text="center">
            By continuing you agree to Wasla&apos;s Terms and Privacy Policy.
          </Text>
        </YStack>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}
