import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store';
import { authApi, decodeAuthRouteParam, finishAuthAndNavigate, getCentralApiErrorMessage, singleRouteParam } from '../../src/lib';

const C = { bg: '#060B14', surface: '#0D1525', border: 'rgba(255,255,255,0.06)', text: '#F0F4FF', muted: '#8899B4', dim: '#556580', accent: '#D4A853', error: '#EF4444', success: '#22C55E' };
const OTP_LEN = 6;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setToken, setUser } = useAuthStore();
  const rawParams = useLocalSearchParams<{ email?: string | string[]; skipInitialOtp?: string | string[] }>();
  const email = decodeAuthRouteParam(singleRouteParam(rawParams.email)) || '';
  const skip = singleRouteParam(rawParams.skipInitialOtp) === '1';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(skip);
  const refs = useRef<(TextInput | null)[]>([]);

  const send = useCallback(async () => {
    if (!email) return; setError(''); setLoading(true);
    try { await authApi.requestOtp({ email: email.trim().toLowerCase() }); setSent(true); }
    catch (e: unknown) { setError(getCentralApiErrorMessage(e)); }
    finally { setLoading(false); }
  }, [email]);

  useEffect(() => { if (!email) router.replace('/(auth)'); else if (!skip) void send(); }, [email, skip, send, router]);

  const handlePaste = (t: string) => { const d = t.replace(/\D/g, '').slice(0, OTP_LEN).split(''); const n = Array(OTP_LEN).fill(''); d.forEach((c, i) => { n[i] = c; }); setOtp(n); };

  const verify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LEN || !email) return;
    setError(''); setLoading(true);
    try {
      const result = await authApi.verifyOtp({ email: email.trim().toLowerCase(), otp: code });
      setOtp(Array(OTP_LEN).fill(''));
      await finishAuthAndNavigate(result, router, setToken, setUser);
    } catch (e: unknown) { setError(getCentralApiErrorMessage(e)); setOtp(Array(OTP_LEN).fill('')); refs.current[0]?.focus(); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (otp.join('').length === OTP_LEN) void verify(); }, [otp]);

  return (
    <YStack flex={1} bg={C.bg}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView flex={1} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 20) + 32 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={{ alignSelf: 'flex-start', padding: 6 }}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={C.muted} />
          </Pressable>
          <Text fontSize={28} fontWeight="700" color={C.text} mt={16} letterSpacing={-0.5}>Verify email</Text>
          <Text fontSize={14} color={C.muted} mt={4} mb={6}>We sent a 6-digit code to{' '}<Text fontWeight="700" color={C.text}>{email}</Text></Text>

          <YStack bg={C.surface} borderRadius={16} p={20} gap={16} borderWidth={1} borderColor={C.border} mt={16}>
            {error ? <YStack bg="rgba(239,68,68,0.08)" p={12} borderRadius={10} borderWidth={1} borderColor="rgba(239,68,68,0.2)"><Text color={C.error} fontSize={13} fontWeight="600">{error}</Text></YStack> : null}
            {sent ? <YStack bg="rgba(34,197,94,0.08)" p={10} borderRadius={10} borderWidth={1} borderColor="rgba(34,197,94,0.15)" items="center"><Text color={C.success} fontSize={12} fontWeight="600">Code sent</Text></YStack> : null}

            <XStack justify="center" gap={10}>
              {otp.map((d, i) => (
                <TextInput key={i} ref={(r) => { refs.current[i] = r; }} style={{ width: 46, height: 54, borderRadius: 12, borderWidth: 1.5, borderColor: error ? C.error : d ? C.accent : C.border, backgroundColor: C.bg, textAlign: 'center', fontSize: 20, fontWeight: '700', color: C.text }} keyboardType="number-pad" maxLength={1} value={d} onChangeText={(c) => { if (c.length > 1) handlePaste(c); else { const n = [...otp]; n[i] = c.replace(/\D/g, ''); setOtp(n); if (c && i < OTP_LEN - 1) refs.current[i + 1]?.focus(); } }} onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus(); }} />
              ))}
            </XStack>

            {loading && <Spinner color={C.accent} size="large" />}

            <Pressable onPress={send} disabled={loading} style={{ alignSelf: 'center', paddingVertical: 6 }}>
              <Text color={C.accent} fontWeight="700" fontSize={12}>Resend code</Text>
            </Pressable>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </YStack>
  );
}
