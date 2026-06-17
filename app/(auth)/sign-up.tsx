import { useState } from 'react';
import { Pressable, KeyboardAvoidingView, Platform, ScrollView as RNScrollView, TextInput } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi, encodeAuthRouteParam, getCentralApiErrorMessage } from '../../src/lib';

const C = { bg: '#060B14', surface: '#0D1525', border: 'rgba(255,255,255,0.06)', text: '#F0F4FF', muted: '#8899B4', dim: '#556580', accent: '#D4A853', error: '#EF4444', warning: '#F59E0B' };

const pw = z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'One uppercase').regex(/[a-z]/, 'One lowercase').regex(/\d/, 'One number').regex(/[^A-Za-z0-9]/, 'One symbol');
const schema = z.object({
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(6, 'Enter your mobile number'),
  password: pw,
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords must match', path: ['confirmPassword'] });
type Data = z.infer<typeof schema>;
const STEPS = ['About you', 'Contact', 'Security'] as const;

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { control, handleSubmit, trigger, getValues, formState: { errors } } = useForm<Data>({ resolver: zodResolver(schema), mode: 'onChange', defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' } });

  const stepFields: (keyof Data)[][] = [['firstName', 'lastName'], ['email', 'phone'], ['password', 'confirmPassword']];

  const next = async () => {
    setFormError('');
    const ok = await trigger(stepFields[step]);
    if (!ok) return;
    if (step === 1) {
      const raw = getValues('phone').trim().replace(/\s+/g, '');
      const p = raw.startsWith('+') ? raw : '+216' + raw.replace(/[^\d]/g, '').replace(/^0/, '');
      try {
        const avail = await authApi.checkAvailability({ email: getValues('email').trim().toLowerCase(), phone: p });
        if (avail.emailAvailable === false) { setFormError('This email is already in use.'); return; }
        if (avail.phoneAvailable === false) { setFormError('This number is already registered.'); return; }
      } catch (e) { setFormError(getCentralApiErrorMessage(e)); return; }
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit(onCreate)();
  };

  const onCreate = async (data: Data) => {
    setFormError(''); setSubmitting(true);
    try {
      const raw = data.phone.trim().replace(/\s+/g, '');
      const phoneE164 = raw.startsWith('+') ? raw : '+216' + raw.replace(/[^\d]/g, '').replace(/^0/, '');
      await authApi.register({ email: data.email.trim().toLowerCase(), phone: phoneE164, password: data.password, firstName: data.firstName.trim(), lastName: data.lastName.trim() });
      await authApi.requestOtp({ email: data.email.trim().toLowerCase() });
      router.replace({ pathname: '/(auth)/verify-email', params: { email: encodeAuthRouteParam(data.email.trim().toLowerCase()), skipInitialOtp: '1' } });
    } catch (e) { setFormError(getCentralApiErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  return (
    <YStack flex={1} bg={C.bg}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <RNScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 20) + 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => { if (step > 0) setStep(s => s - 1); else router.back(); }} style={{ alignSelf: 'flex-start', padding: 6 }}>
            <XStack items="center" gap={6}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={C.muted} />
              <Text color={C.muted} fontSize={14} fontWeight="600">{step > 0 ? 'Back' : 'Cancel'}</Text>
            </XStack>
          </Pressable>

          <Text fontSize={28} fontWeight="700" color={C.text} mt={16} letterSpacing={-0.5}>Create account</Text>
          <Text fontSize={14} color={C.muted} mt={4} mb={6}>{STEPS[step]} · Step {step + 1} of {STEPS.length}</Text>

          {/* Progress */}
          <XStack gap={6} mb={20}>
            {STEPS.map((_, i) => <YStack key={i} flex={1} height={3} borderRadius={2} bg={i <= step ? C.accent : 'rgba(255,255,255,0.06)'} />)}
          </XStack>

          <YStack bg={C.surface} borderRadius={16} p={20} gap={16} borderWidth={1} borderColor={C.border}>
            {formError ? <YStack bg="rgba(239,68,68,0.08)" p={12} borderRadius={10} borderWidth={1} borderColor="rgba(239,68,68,0.2)"><Text color={C.error} fontSize={13} fontWeight="600">{formError}</Text></YStack> : null}

            {step === 0 && (
              <>
                {(['firstName', 'lastName'] as const).map((f, i) => (
                  <YStack key={f} gap={6}>
                    <Text color={C.muted} fontSize={12} fontWeight="600">{i === 0 ? 'First name' : 'Last name'}</Text>
                    <Controller control={control} name={f} render={({ field: { onChange, value } }) => (
                      <XStack bg={C.bg} borderRadius={12} px={14} borderWidth={1} borderColor={errors[f] ? C.error : C.border} items="center">
                        <TextInput style={{ flex: 1, color: C.text, paddingVertical: 14, fontSize: 15 }} placeholder={i === 0 ? 'Ahmed' : 'Ben Ali'} placeholderTextColor={C.dim} value={value} onChangeText={onChange} />
                      </XStack>
                    )} />
                    {errors[f] && <Text color={C.error} fontSize={11}>{errors[f].message}</Text>}
                  </YStack>
                ))}
              </>
            )}

            {step === 1 && (
              <>
                <YStack gap={6}>
                  <Text color={C.muted} fontSize={12} fontWeight="600">Email</Text>
                  <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
                    <XStack bg={C.bg} borderRadius={12} px={14} borderWidth={1} borderColor={errors.email ? C.error : C.border} items="center">
                      <MaterialCommunityIcons name="email-outline" size={16} color={C.dim} />
                      <TextInput style={{ flex: 1, color: C.text, paddingVertical: 14, paddingHorizontal: 8, fontSize: 15 }} placeholder="you@email.com" placeholderTextColor={C.dim} keyboardType="email-address" autoCapitalize="none" value={value} onChangeText={onChange} />
                    </XStack>
                  )} />
                  {errors.email && <Text color={C.error} fontSize={11}>{errors.email.message}</Text>}
                </YStack>
                <YStack gap={6}>
                  <Text color={C.muted} fontSize={12} fontWeight="600">Mobile (Tunisia)</Text>
                  <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
                    <XStack bg={C.bg} borderRadius={12} px={14} borderWidth={1} borderColor={errors.phone ? C.error : C.border} items="center">
                      <Text color={C.dim} fontWeight="700" fontSize={14}>+216</Text>
                      <TextInput style={{ flex: 1, color: C.text, paddingVertical: 14, paddingHorizontal: 8, fontSize: 15 }} placeholder="XX XXX XXX" placeholderTextColor={C.dim} keyboardType="phone-pad" value={value} onChangeText={onChange} />
                    </XStack>
                  )} />
                  {errors.phone && <Text color={C.error} fontSize={11}>{errors.phone.message}</Text>}
                </YStack>
              </>
            )}

            {step === 2 && (
              <>
                {(['password', 'confirmPassword'] as const).map((f, i) => (
                  <YStack key={f} gap={6}>
                    <Text color={C.muted} fontSize={12} fontWeight="600">{i === 0 ? 'Password' : 'Confirm password'}</Text>
                    <Controller control={control} name={f} render={({ field: { onChange, value } }) => (
                      <XStack bg={C.bg} borderRadius={12} px={14} borderWidth={1} borderColor={errors[f] ? C.error : C.border} items="center">
                        <MaterialCommunityIcons name="lock-outline" size={16} color={C.dim} />
                        <TextInput style={{ flex: 1, color: C.text, paddingVertical: 14, paddingHorizontal: 8, fontSize: 15 }} placeholder={i === 0 ? 'Strong password' : 'Repeat password'} placeholderTextColor={C.dim} secureTextEntry value={value} onChangeText={onChange} />
                      </XStack>
                    )} />
                    {errors[f] && <Text color={C.error} fontSize={11}>{errors[f].message}</Text>}
                  </YStack>
                ))}
              </>
            )}

            <Pressable onPress={next} disabled={submitting} style={({ pressed }) => ({ backgroundColor: C.accent, paddingVertical: 15, borderRadius: 12, alignItems: 'center', opacity: submitting ? 0.6 : pressed ? 0.9 : 1 })}>
              {submitting ? <Spinner color={C.bg} /> : <Text color={C.bg} fontWeight="800" fontSize={15}>{step < STEPS.length - 1 ? 'Continue' : 'Create account'}</Text>}
            </Pressable>
          </YStack>

          <Text color={C.muted} fontSize={13} text="center" mt={24}>
            Already have an account? <Text fontWeight="700" color={C.accent} onPress={() => router.replace('/(auth)/sign-in')}>Sign in</Text>
          </Text>
        </RNScrollView>
      </KeyboardAvoidingView>
    </YStack>
  );
}
