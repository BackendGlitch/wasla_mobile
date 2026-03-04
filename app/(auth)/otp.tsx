import { useState, useRef, useEffect } from 'react';
import { TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, Button, Spinner } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { waslaColors } from '../../src/theme/colors';
import { mockApi } from '../../src/lib/api';
import { useAuthStore } from '../../src/store';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste
      const chars = text.split('').slice(0, OTP_LENGTH);
      const newOtp = [...otp];
      chars.forEach((c, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = c;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(index + chars.length, OTP_LENGTH - 1);
      inputs.current[nextIdx]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await mockApi.verifyOtp(phone || '', code);
      setToken(result.token);
      setUser(result.user);
      router.replace('/(app)');
    } catch (e: any) {
      setError(e.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setOtp(Array(OTP_LENGTH).fill(''));
    await mockApi.sendOtp(phone || '');
    inputs.current[0]?.focus();
  };

  // Auto-verify when all digits entered
  useEffect(() => {
    if (otp.join('').length === OTP_LENGTH) {
      handleVerify();
    }
  }, [otp]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: waslaColors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <YStack flex={1} justify="center" p="$6">
        {/* Header */}
        <YStack gap="$3" mb="$8">
          <Text fontSize={40} lineHeight={48}>
            🔐
          </Text>
          <Text fontSize="$8" fontWeight="800" color={waslaColors.textPrimary}>
            Verify Your Number
          </Text>
          <Text fontSize="$4" color={waslaColors.textSecondary} lineHeight={22}>
            Enter the 6-digit code sent to{' '}
            <Text fontWeight="600" color={waslaColors.textPrimary}>
              +216 {phone}
            </Text>
          </Text>
        </YStack>

        {/* OTP Boxes */}
        <XStack gap="$2" justify="center" mb="$4">
          {otp.map((digit, i) => (
            <YStack
              key={i}
              width={48}
              height={56}
              borderWidth={2}
              borderColor={
                digit
                  ? waslaColors.primary500
                  : error
                    ? waslaColors.error
                    : waslaColors.border
              }
              rounded="$3"
              items="center"
              justify="center"
              bg={waslaColors.surface}
            >
              <TextInput
                ref={(ref) => {
                  inputs.current[i] = ref;
                }}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                style={{
                  fontSize: 22,
                  fontWeight: '700',
                  textAlign: 'center',
                  width: '100%',
                  height: '100%',
                  color: waslaColors.textPrimary,
                }}
                selectTextOnFocus
              />
            </YStack>
          ))}
        </XStack>

        {error ? (
          <Text fontSize="$3" color={waslaColors.error} text="center" mb="$4">
            {error}
          </Text>
        ) : null}

        {/* Verify */}
        <Button
          size="$5"
          bg={waslaColors.primary500}
          rounded="$4"
          mt="$2"
          pressStyle={{ bg: waslaColors.primary700 }}
          onPress={handleVerify}
          disabled={loading}
          opacity={loading ? 0.7 : 1}
        >
          {loading ? (
            <Spinner color="white" />
          ) : (
            <Text color="white" fontWeight="700" fontSize="$5">
              Verify
            </Text>
          )}
        </Button>

        {/* Resend */}
        <XStack justify="center" mt="$5" gap="$2">
          <Text fontSize="$3" color={waslaColors.textMuted}>
            Didn't receive the code?
          </Text>
          <Text
            fontSize="$3"
            fontWeight="600"
            color={waslaColors.primary500}
            pressStyle={{ opacity: 0.7 }}
            onPress={handleResend}
          >
            Resend
          </Text>
        </XStack>

        {/* Dev hint */}
        <YStack mt="$6" items="center">
          <Text fontSize="$2" color={waslaColors.textMuted} text="center">
            Mock mode — use OTP: 123456
          </Text>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
