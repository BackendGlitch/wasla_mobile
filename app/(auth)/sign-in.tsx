import { useState } from 'react';
import { Pressable, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store';
import { authApi, finishAuthAndNavigate, getCentralApiErrorMessage } from '../../src/lib';

const COL = { bg: '#060B14', surface: '#0D1525', border: 'rgba(255,255,255,0.06)', text: '#F0F4FF', muted: '#8899B4', dim: '#556580', accent: '#D4A853', error: '#EF4444' };

type SignInMode = 'phone' | 'email';
const emailLoginSchema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Password is required') });
type EmailLoginData = z.infer<typeof emailLoginSchema>;

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setToken, setUser } = useAuthStore();
  const [mode, setMode] = useState<SignInMode>('phone');
  const [phone, setPhone] = useState('');
  const [phonePw, setPhonePw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { control, handleSubmit, formState: { errors, isValid }, reset } = useForm<EmailLoginData>({ resolver: zodResolver(emailLoginSchema), mode: 'onChange', defaultValues: { email: '', password: '' } });

  const onPhoneLogin = async () => {
    const raw = phone.trim().replace(/\s+/g, '');
    if (raw.length < 8) { setError('Enter a valid mobile number'); return; }
    if (!phonePw) { setError('Password is required'); return; }
    setError(''); setLoading(true);
    try {
      const e164 = raw.startsWith('+') ? raw : '+216' + raw.replace(/[^\d]/g, '').replace(/^0/, '');
      const result = await authApi.loginWithPhone({ phone: e164, password: phonePw });
      await finishAuthAndNavigate(result, router, setToken, setUser);
    } catch (e: unknown) { setError(getCentralApiErrorMessage(e)); }
    finally { setLoading(false); }
  };

  const onEmailLogin = async (data: EmailLoginData) => {
    setError(''); setLoading(true);
    try {
      const result = await authApi.loginWithEmail({ email: data.email.trim().toLowerCase(), password: data.password });
      reset();
      await finishAuthAndNavigate(result, router, setToken, setUser);
    } catch (e: unknown) { setError(getCentralApiErrorMessage(e)); }
    finally { setLoading(false); }
  };

  return (
    <YStack flex={1} bg={COL.bg}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView flex={1} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 20) + 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={{ alignSelf: 'flex-start', padding: 6 }}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={COL.muted} />
          </Pressable>

          <Text fontSize={28} fontWeight="700" color={COL.text} mt={16} letterSpacing={-0.5}>Sign in</Text>
          <Text fontSize={14} color={COL.muted} mt={4} mb={24}>Choose how to access your account</Text>

          {/* Mode tabs */}
          <XStack bg={COL.surface} borderRadius={12} p={4} mb={20} borderWidth={1} borderColor={COL.border}>
            {(['phone', 'email'] as SignInMode[]).map((m) => (
              <Pressable key={m} onPress={() => { setMode(m); setError(''); }} style={{ flex: 1 }}>
                <YStack py={10} borderRadius={10} bg={mode === m ? 'rgba(212,168,83,0.12)' : 'transparent'} items="center">
                  <Text fontWeight="700" fontSize={13} color={mode === m ? COL.accent : COL.dim}>{m === 'phone' ? 'Phone' : 'Email'}</Text>
                </YStack>
              </Pressable>
            ))}
          </XStack>

          {/* Form card */}
          <YStack bg={COL.surface} borderRadius={16} p={20} gap={16} borderWidth={1} borderColor={COL.border}>
            {error ? <YStack bg="rgba(239,68,68,0.08)" p={12} borderRadius={10} borderWidth={1} borderColor="rgba(239,68,68,0.2)"><Text color={COL.error} fontSize={13} fontWeight="600">{error}</Text></YStack> : null}

            {mode === 'phone' ? (
              <>
                <YStack gap={6}>
                  <Text color={COL.muted} fontSize={12} fontWeight="600">Phone number</Text>
                  <XStack bg={COL.bg} borderRadius={12} px={14} borderWidth={1} borderColor={COL.border} items="center">
                    <Text color={COL.dim} fontWeight="700" fontSize={14}>+216</Text>
                    <TextInput style={{ flex: 1, color: COL.text, paddingVertical: 14, paddingHorizontal: 8, fontSize: 15 }} placeholder="XX XXX XXX" placeholderTextColor={COL.dim} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                  </XStack>
                </YStack>
                <YStack gap={6}>
                  <Text color={COL.muted} fontSize={12} fontWeight="600">Password</Text>
                  <XStack bg={COL.bg} borderRadius={12} px={14} borderWidth={1} borderColor={COL.border} items="center">
                    <MaterialCommunityIcons name="lock-outline" size={16} color={COL.dim} />
                    <TextInput style={{ flex: 1, color: COL.text, paddingVertical: 14, paddingHorizontal: 8, fontSize: 15 }} placeholder="Your password" placeholderTextColor={COL.dim} secureTextEntry value={phonePw} onChangeText={setPhonePw} />
                  </XStack>
                </YStack>
                <Pressable onPress={onPhoneLogin} disabled={loading} style={({ pressed }) => ({ backgroundColor: COL.accent, paddingVertical: 15, borderRadius: 12, alignItems: 'center', opacity: loading ? 0.6 : pressed ? 0.9 : 1 })}>
                  {loading ? <Spinner color={COL.bg} /> : <Text color={COL.bg} fontWeight="800" fontSize={15}>Sign in</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <YStack gap={6}>
                  <Text color={COL.muted} fontSize={12} fontWeight="600">Email</Text>
                  <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
                    <XStack bg={COL.bg} borderRadius={12} px={14} borderWidth={1} borderColor={errors.email ? COL.error : COL.border} items="center">
                      <MaterialCommunityIcons name="email-outline" size={16} color={errors.email ? COL.error : COL.dim} />
                      <TextInput style={{ flex: 1, color: COL.text, paddingVertical: 14, paddingHorizontal: 8, fontSize: 15 }} placeholder="you@email.com" placeholderTextColor={COL.dim} keyboardType="email-address" autoCapitalize="none" value={value} onChangeText={onChange} />
                    </XStack>
                  )} />
                  {errors.email && <Text color={COL.error} fontSize={11}>{errors.email.message}</Text>}
                </YStack>
                <YStack gap={6}>
                  <Text color={COL.muted} fontSize={12} fontWeight="600">Password</Text>
                  <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
                    <XStack bg={COL.bg} borderRadius={12} px={14} borderWidth={1} borderColor={errors.password ? COL.error : COL.border} items="center">
                      <MaterialCommunityIcons name="lock-outline" size={16} color={errors.password ? COL.error : COL.dim} />
                      <TextInput style={{ flex: 1, color: COL.text, paddingVertical: 14, paddingHorizontal: 8, fontSize: 15 }} placeholder="Your password" placeholderTextColor={COL.dim} secureTextEntry value={value} onChangeText={onChange} />
                    </XStack>
                  )} />
                  {errors.password && <Text color={COL.error} fontSize={11}>{errors.password.message}</Text>}
                </YStack>
                <Pressable onPress={handleSubmit(onEmailLogin)} disabled={!isValid || loading} style={({ pressed }) => ({ backgroundColor: COL.accent, paddingVertical: 15, borderRadius: 12, alignItems: 'center', opacity: !isValid || loading ? 0.5 : pressed ? 0.9 : 1 })}>
                  {loading ? <Spinner color={COL.bg} /> : <Text color={COL.bg} fontWeight="800" fontSize={15}>Sign in</Text>}
                </Pressable>
              </>
            )}
          </YStack>

          <Text color={COL.muted} fontSize={13} text="center" mt={24}>
            New to Wasla? <Text fontWeight="700" color={COL.accent} onPress={() => router.push('/(auth)/sign-up')}>Create account</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </YStack>
  );
}
