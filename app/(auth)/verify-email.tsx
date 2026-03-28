import { useState, useRef, useEffect } from 'react';
import { TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text, Button, Spinner, Circle } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthBackdrop from '../../src/components/auth/AuthBackdrop';
import { authColors } from '../../src/theme/authTheme';
import { useAuthStore } from '../../src/store';
import {
  authApi,
  decodeAuthRouteParam,
  finishAuthAndNavigate,
  getCentralApiErrorMessage,
  singleRouteParam,
} from '../../src/lib';

const OTP_LENGTH = 6;

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; skipInitialOtp?: string }>();
  const email = decodeAuthRouteParam(singleRouteParam(params.email));
  const skipInitialOtp = singleRouteParam(params.skipInitialOtp);
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!email?.trim()) return;
      if (skipInitialOtp === '1') {
        setSent(true);
        return;
      }
      try {
        await authApi.requestOtp({ email: email.trim().toLowerCase() });
        if (!cancelled) setSent(true);
      } catch (e: unknown) {
        if (!cancelled) setError(getCentralApiErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, skipInitialOtp]);

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
    if (!email?.trim()) {
      setError('Missing email');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await authApi.verifyOtp({
        email: email.trim().toLowerCase(),
        otp: code,
      });
      await finishAuthAndNavigate(result, router, setToken, setUser, {
        signupEmailDecoded: email.trim().toLowerCase(),
      });
    } catch (e: unknown) {
      setError(getCentralApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email?.trim()) return;
    setError('');
    setOtp(Array(OTP_LENGTH).fill(''));
    try {
      await authApi.requestOtp({ email: email.trim().toLowerCase() });
      inputs.current[0]?.focus();
    } catch (e: unknown) {
      setError(getCentralApiErrorMessage(e));
    }
  };

  useEffect(() => {
    if (otp.join('').length === OTP_LENGTH) {
      handleVerify();
    }
  }, [otp]);

  return (
    <AuthBackdrop variant="teal">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <YStack flex={1} px="$5" pt="$8" pb="$6" justify="space-between">
          <YStack gap="$3">
            <XStack items="center" gap="$3">
              <Circle
                size={42}
                bg={authColors.accentSoft}
                borderWidth={1}
                borderColor={authColors.borderStrong}
              >
                <MaterialCommunityIcons name="email-check" size={20} color={authColors.accent} />
              </Circle>
              <Text fontSize="$7" fontWeight="800" color={authColors.textPrimary}>
                Verify your email
              </Text>
            </XStack>
            <Text fontSize="$4" color={authColors.textSecondary} lineHeight={22}>
              Enter the 6-digit code we sent to{' '}
              <Text fontWeight="700" color={authColors.textPrimary}>
                {email}
              </Text>
            </Text>
            {sent ? (
              <Text fontSize="$2" color={authColors.textMuted}>
                Code expires in 5 minutes.
              </Text>
            ) : null}
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
                      ? authColors.accent
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
              <Text fontSize="$3" color={authColors.error} style={{ textAlign: 'center' }}>
                {error}
              </Text>
            ) : null}

            <Button
              size="$5"
              bg={authColors.accent}
              borderWidth={1}
              borderColor="rgba(56, 246, 177, 0.4)"
              rounded="$6"
              pressStyle={{ bg: '#2ED79B' }}
              onPress={handleVerify}
              disabled={loading}
              opacity={loading ? 0.7 : 1}
            >
              {loading ? (
                <Spinner color={authColors.bg} />
              ) : (
                <Text color={authColors.bg} fontWeight="800" fontSize="$5" letterSpacing={0.6}>
                  Verify email
                </Text>
              )}
            </Button>

            <XStack justify="center" gap="$2">
              <Text fontSize="$3" color={authColors.textMuted}>
                Didn&apos;t receive it?
              </Text>
              <Text fontSize="$3" fontWeight="700" color={authColors.accent} onPress={handleResend}>
                Resend
              </Text>
            </XStack>
          </YStack>

          <Text fontSize="$2" color={authColors.textMuted} style={{ textAlign: 'center' }}>
            You need a verified email to sign in with password.
          </Text>
        </YStack>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}
