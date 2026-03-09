import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, Button, Spinner, Input } from 'tamagui';
import { useRouter } from 'expo-router';
import { waslaColors } from '../../src/theme/colors';
import { mockApi } from '../../src/lib/api';

export default function PhoneInputScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (phone.length < 6) {
      setError('Please enter a valid phone number');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await mockApi.sendOtp(phone);
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: waslaColors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <YStack flex={1} justify="center" p="$6">
        {/* Header */}
        <YStack gap="$3" mb="$8">
          <Text fontSize="$9" fontWeight="800" color={waslaColors.textPrimary}>
            Sign in to Wasla
          </Text>
          <Text fontSize="$4" color={waslaColors.textSecondary} lineHeight={22}>
            Enter your phone number and we'll send you a verification code.
          </Text>
        </YStack>

        {/* Phone Input */}
        <YStack gap="$4">
          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color={waslaColors.textSecondary}>
              Phone Number
            </Text>
            <XStack
              borderWidth={1.5}
              borderColor={error ? waslaColors.error : waslaColors.border}
              rounded="$4"
              p="$1"
              items="center"
              bg={waslaColors.surface}
            >
              <Text pl="$3" fontSize="$5" color={waslaColors.textMuted}>
                +216
              </Text>
              <Input
                flex={1}
                size="$5"
                placeholder="XX XXX XXX"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                borderWidth={0}
                bg="transparent"
                fontSize="$5"
              />
            </XStack>
            {error ? (
              <Text fontSize="$2" color={waslaColors.error}>
                {error}
              </Text>
            ) : null}
          </YStack>

          <Button
            size="$5"
            bg={waslaColors.primary500}
            rounded="$4"
            mt="$4"
            pressStyle={{ bg: waslaColors.primary700 }}
            onPress={handleSendOtp}
            disabled={loading}
            opacity={loading ? 0.7 : 1}
          >
            {loading ? (
              <Spinner color="white" />
            ) : (
              <Text color="white" fontWeight="700" fontSize="$5">
                Send Verification Code
              </Text>
            )}
          </Button>
        </YStack>

        {/* Divider */}
        <XStack items="center" gap="$3" my="$6">
          <YStack flex={1} height={1} bg={waslaColors.border} />
          <Text fontSize="$3" color={waslaColors.textMuted}>
            OR
          </Text>
          <YStack flex={1} height={1} bg={waslaColors.border} />
        </XStack>

        {/* Navigation */}
        <YStack items="center">
          <Text
            fontSize="$3"
            color={waslaColors.primary500}
            fontWeight="600"
            onPress={() => router.push('/(auth)')}
          >
            Back to sign in options
          </Text>
        </YStack>

        {/* Footer hint */}
        <YStack mt="$6" items="center">
          <Text fontSize="$2" color={waslaColors.textMuted} text="center">
            Mock mode — any phone number works. OTP: 123456
          </Text>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
