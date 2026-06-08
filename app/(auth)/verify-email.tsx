import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setToken, setUser } = useAuthStore();
  const params = useLocalSearchParams<{ email?: string | string[]; skipInitialOtp?: string | string[] }>();
  const email = decodeAuthRouteParam(singleRouteParam(params.email));
  const skipInitialOtp = singleRouteParam(params.skipInitialOtp) === '1';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(skipInitialOtp);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const sendCode = useCallback(async () => {
    if (!email) return;
    setError('');
    setLoading(true);
    try {
      await authApi.requestOtp({ email: email.trim().toLowerCase() });
      setSent(true);
    } catch (e: unknown) {
      setError(getCentralApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (!email) {
      router.replace('/(auth)');
      return;
    }
    if (!skipInitialOtp) {
      void sendCode();
    }
  }, [email, skipInitialOtp, sendCode, router]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)');
  };

  const handlePaste = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    const newOtp = Array(OTP_LENGTH).fill('');
    digits.forEach((d, i) => { newOtp[i] = d; });
    setOtp(newOtp);
    const next = Math.min(digits.length, OTP_LENGTH - 1);
    inputRefs.current[next]?.focus();
  };

  const handleChange = (index: number, char: string) => {
    if (char.length > 1) { handlePaste(char); return; }
    if (!/^\d?$/.test(char)) return;
    const next = [...otp];
    next[index] = char;
    setOtp(next);
    if (char && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const code = otp.join('');
  const canSubmit = code.length === OTP_LENGTH && !loading;

  const verify = async () => {
    if (!canSubmit || !email) return;
    setError('');
    setLoading(true);
    try {
      const result = await authApi.verifyOtp({ email: email.trim().toLowerCase(), otp: code });
      setOtp(Array(OTP_LENGTH).fill(''));
      await finishAuthAndNavigate(result, router, setToken, setUser);
    } catch (e: unknown) {
      setError(getCentralApiErrorMessage(e));
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code.length === OTP_LENGTH) void verify();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthBackdrop variant="green">
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView flex={1} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 20) + 32 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={goBack} style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
            <XStack items="center" gap="$2">
              <MaterialCommunityIcons name="chevron-left" size={22} color={authColors.textSecondary} />
              <Text color={authColors.textSecondary} fontWeight="600">Back</Text>
            </XStack>
          </Pressable>

          <Text fontSize="$9" fontWeight="900" color={authColors.textPrimary} mt="$3">Verify email</Text>
          <Text fontSize="$4" color={authColors.textSecondary} mt="$2" mb="$5">
            We sent a 6-digit code to{'\n'}<Text fontWeight="700" color={authColors.textPrimary}>{email}</Text>
          </Text>

          <YStack bg={authColors.card} borderWidth={1} borderColor={authColors.border} rounded="$7" p="$5" gap="$4">
            {error ? (
              <YStack bg="rgba(239,68,68,0.10)" borderWidth={1} borderColor="rgba(239,68,68,0.30)" p="$3" rounded="$4">
                <Text fontSize="$3" color={authColors.error} fontWeight="600">{error}</Text>
              </YStack>
            ) : null}

            <XStack justify="center" gap="$3">
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { inputRefs.current[i] = r; }}
                  style={{ width: 48, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: error ? authColors.error : authColors.borderStrong, backgroundColor: authColors.cardStrong, textAlign: 'center', fontSize: 22, fontWeight: '700', color: authColors.textPrimary }}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(c) => handleChange(i, c)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                />
              ))}
            </XStack>

            {loading && <Spinner color={authColors.accent} size="large" />}

            <Pressable onPress={sendCode} disabled={loading} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text color={authColors.accent} fontWeight="700">Resend code</Text>
            </Pressable>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}
