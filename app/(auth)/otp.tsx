import { useState, useRef, useEffect } from 'react';
import { TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, Button, Spinner, Circle } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthBackdrop from '../../src/components/auth/AuthBackdrop';
import { authColors } from '../../src/theme/authTheme';
import { useAuthStore } from '../../src/store';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../../src/lib';

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
      setError('Enter the full 6-digit code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await authApi.verifyOtp({ phone: phone || undefined, otp: code });
      await SecureStore.setItemAsync('auth_token', result.access_token);
      setToken(result.access_token);
      const fullName = `${result.user.firstName ?? ''} ${result.user.lastName ?? ''}`.trim();
      setUser({
        id: result.user.id,
        name: fullName || (result.user.email ? result.user.email.split('@')[0] : 'User'),
        phone: result.user.phone ?? (phone || ''),
        email: result.user.email ?? '',
      });
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
    await authApi.requestOtp({ phone: phone || undefined });
    inputs.current[0]?.focus();
  };

  useEffect(() => {
    if (otp.join('').length === OTP_LENGTH) {
      handleVerify();
    }
  }, [otp]);

  return (
    <AuthBackdrop variant="violet">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <YStack flex={1} px="$5" pt="$8" pb="$6" justify="space-between">
          <YStack gap="$3">
            <XStack items="center" gap="$3">
              <Circle size={42} bg={authColors.accentSoft} borderWidth={1} borderColor={authColors.borderStrong}>
                <MaterialCommunityIcons name="shield-key" size={20} color={authColors.accentViolet} />
              </Circle>
              <Text fontSize="$7" fontWeight="800" color={authColors.textPrimary}>
                Verify your number
              </Text>
            </XStack>
            <Text fontSize="$4" color={authColors.textSecondary} lineHeight={22}>
              Enter the 6-digit code sent to{' '}
              <Text fontWeight="700" color={authColors.textPrimary}>
                {phone}
              </Text>
            </Text>
          </YStack>

          <YStack
            bg={authColors.card}
            borderWidth={1}
            borderColor={authColors.border}
            rounded="$7"
            p="$5"
            gap="$4"
          >
            <XStack gap="$2" justify="center">
              {otp.map((digit, i) => (
                <YStack
                  key={i}
                  width={48}
                  height={56}
                  borderWidth={1}
                  borderColor={
                    digit
                      ? authColors.accentViolet
                      : error
                        ? authColors.error
                        : authColors.borderStrong
                  }
                  rounded="$4"
                  items="center"
                  justify="center"
                  bg={authColors.cardStrong}
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
                      fontSize: 20,
                      fontWeight: '700',
                      textAlign: 'center',
                      width: '100%',
                      height: '100%',
                      color: authColors.textPrimary,
                    }}
                    selectTextOnFocus
                  />
                </YStack>
              ))}
            </XStack>

            {error ? (
              <Text fontSize="$3" color={authColors.error} text="center">
                {error}
              </Text>
            ) : null}

            <Button
              size="$5"
              bg={authColors.accentViolet}
              borderWidth={1}
              borderColor="rgba(139, 109, 255, 0.5)"
              rounded="$6"
              pressStyle={{ bg: '#7357E8' }}
              onPress={handleVerify}
              disabled={loading}
              opacity={loading ? 0.7 : 1}
            >
              {loading ? (
                <Spinner color={authColors.bg} />
              ) : (
                <Text color={authColors.bg} fontWeight="800" fontSize="$5" letterSpacing={0.6}>
                  Verify
                </Text>
              )}
            </Button>

            <XStack justify="center" gap="$2">
              <Text fontSize="$3" color={authColors.textMuted}>
                Didn&apos;t receive the code?
              </Text>
              <Text
                fontSize="$3"
                fontWeight="700"
                color={authColors.accent}
                onPress={handleResend}
              >
                Resend
              </Text>
            </XStack>
          </YStack>

          <Text fontSize="$2" color={authColors.textMuted} text="center">
            Enter the code you received (expires in 5 minutes).
          </Text>
        </YStack>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}
