import { useState } from 'react';
import {
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView as RNScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { YStack, XStack, Text, Input, Spinner } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthBackdrop from '../../src/components/auth/AuthBackdrop';
import { authColors } from '../../src/theme/authTheme';
import {
  authApi,
  encodeAuthRouteParam,
  getCentralApiErrorMessage,
} from '../../src/lib';

const strongPassword = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'One uppercase letter')
  .regex(/[a-z]/, 'One lowercase letter')
  .regex(/\d/, 'One number')
  .regex(/[^A-Za-z0-9]/, 'One symbol (e.g. !@#)');

const signUpSchema = z
  .object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().min(6, 'Enter your mobile number'),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignUpData = z.infer<typeof signUpSchema>;

const STEPS = ['About you', 'Contact', 'Security'] as const;

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const goBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      setFormError('');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)');
  };

  const stepFields: (keyof SignUpData)[][] = [
    ['firstName', 'lastName'],
    ['email', 'phone'],
    ['password', 'confirmPassword'],
  ];

  const next = async () => {
    setFormError('');
    const fields = stepFields[step];
    const ok = await trigger(fields);
    if (!ok) return;

    if (step === 1) {
      const raw = getValues('phone').trim().replace(/\s+/g, '');
      const phoneE164 = raw.startsWith('+') ? raw : `+216${raw.replace(/[^\d]/g, '')}`;
      try {
        const avail = await authApi.checkAvailability({
          email: getValues('email').trim().toLowerCase(),
          phone: phoneE164,
        });
        if (avail.emailAvailable === false) {
          setFormError(
            'This email is already in use. Sign in instead, or use a different email.',
          );
          return;
        }
        if (avail.phoneAvailable === false) {
          setFormError(
            'This number is already registered. Sign in with SMS, or use a different number.',
          );
          return;
        }
      } catch (e: unknown) {
        setFormError(getCentralApiErrorMessage(e));
        return;
      }
    }

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleSubmit(onCreate)();
    }
  };

  const onCreate = async (data: SignUpData) => {
    setFormError('');
    setSubmitting(true);
    try {
      const raw = data.phone.trim().replace(/\s+/g, '');
      const phoneE164 = raw.startsWith('+') ? raw : `+216${raw.replace(/[^\d]/g, '')}`;
      await authApi.register({
        email: data.email.trim().toLowerCase(),
        phone: phoneE164,
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });
      // Send email OTP and go to verify-email
      await authApi.requestOtp({ email: data.email.trim().toLowerCase() });
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: encodeAuthRouteParam(data.email.trim().toLowerCase()), skipInitialOtp: '1' },
      });
    } catch (e: unknown) {
      setFormError(getCentralApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthBackdrop>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <RNScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: Math.max(insets.top, 12) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={goBack} style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
            <XStack items="center" gap="$2">
              <MaterialCommunityIcons name="chevron-left" size={22} color={authColors.textSecondary} />
              <Text color={authColors.textSecondary} fontWeight="600">
                {step > 0 ? 'Previous' : 'Back'}
              </Text>
            </XStack>
          </Pressable>

          <Text fontSize="$9" fontWeight="900" color={authColors.textPrimary} mt="$2">
            Create account
          </Text>
          <Text fontSize="$4" color={authColors.textSecondary} mt="$2" mb="$4">
            {STEPS[step]} · Step {step + 1} of {STEPS.length}
          </Text>

          <XStack gap="$2" mb="$5">
            {STEPS.map((_, i) => (
              <YStack
                key={i}
                flex={1}
                height={4}
                rounded="$10"
                bg={i <= step ? authColors.warning : authColors.border}
                opacity={i <= step ? 1 : 0.5}
              />
            ))}
          </XStack>

          <YStack
            bg={authColors.card}
            borderWidth={1}
            borderColor={authColors.border}
            rounded="$7"
            p="$5"
            gap="$4"
          >
            {formError ? (
              <YStack
                bg="rgba(255, 92, 122, 0.12)"
                borderWidth={1}
                borderColor="rgba(255, 92, 122, 0.35)"
                p="$3"
                rounded="$4"
              >
                <Text fontSize="$3" color={authColors.error} fontWeight="600">
                  {formError}
                </Text>
              </YStack>
            ) : null}

            {step === 0 && (
              <>
                <YStack gap="$2">
                  <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                    First name
                  </Text>
                  <Controller
                    control={control}
                    name="firstName"
                    render={({ field: { onChange, value } }) => (
                      <XStack
                        borderWidth={1}
                        borderColor={errors.firstName ? authColors.error : authColors.borderStrong}
                        rounded="$5"
                        bg={authColors.cardStrong}
                        px="$3"
                        items="center"
                      >
                        <Input
                          flex={1}
                          size="$4"
                          placeholder="Ahmed"
                          placeholderTextColor="$textMuted"
                          value={value}
                          onChangeText={onChange}
                          borderWidth={0}
                          bg="transparent"
                          color={authColors.textPrimary}
                        />
                      </XStack>
                    )}
                  />
                  {errors.firstName ? (
                    <Text fontSize="$2" color={authColors.error}>
                      {errors.firstName.message}
                    </Text>
                  ) : null}
                </YStack>
                <YStack gap="$2">
                  <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                    Last name
                  </Text>
                  <Controller
                    control={control}
                    name="lastName"
                    render={({ field: { onChange, value } }) => (
                      <XStack
                        borderWidth={1}
                        borderColor={errors.lastName ? authColors.error : authColors.borderStrong}
                        rounded="$5"
                        bg={authColors.cardStrong}
                        px="$3"
                        items="center"
                      >
                        <Input
                          flex={1}
                          size="$4"
                          placeholder="Ben Ali"
                          placeholderTextColor="$textMuted"
                          value={value}
                          onChangeText={onChange}
                          borderWidth={0}
                          bg="transparent"
                          color={authColors.textPrimary}
                        />
                      </XStack>
                    )}
                  />
                  {errors.lastName ? (
                    <Text fontSize="$2" color={authColors.error}>
                      {errors.lastName.message}
                    </Text>
                  ) : null}
                </YStack>
              </>
            )}

            {step === 1 && (
              <>
                <Text fontSize="$2" color={authColors.textMuted} lineHeight={18}>
                  We use these to secure your account and send booking updates. You&apos;ll verify both after sign-up.
                </Text>
                <YStack gap="$2">
                  <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                    Email
                  </Text>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, value } }) => (
                      <XStack
                        borderWidth={1}
                        borderColor={errors.email ? authColors.error : authColors.borderStrong}
                        rounded="$5"
                        bg={authColors.cardStrong}
                        px="$3"
                        items="center"
                      >
                        <Input
                          flex={1}
                          size="$4"
                          placeholder="you@email.com"
                          placeholderTextColor="$textMuted"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={value}
                          onChangeText={onChange}
                          borderWidth={0}
                          bg="transparent"
                          color={authColors.textPrimary}
                        />
                      </XStack>
                    )}
                  />
                  {errors.email ? (
                    <Text fontSize="$2" color={authColors.error}>
                      {errors.email.message}
                    </Text>
                  ) : null}
                </YStack>
                <YStack gap="$2">
                  <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                    Mobile (Tunisia)
                  </Text>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field: { onChange, value } }) => (
                      <XStack
                        borderWidth={1}
                        borderColor={errors.phone ? authColors.error : authColors.borderStrong}
                        rounded="$5"
                        bg={authColors.cardStrong}
                        px="$3"
                        items="center"
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
                          value={value}
                          onChangeText={onChange}
                          borderWidth={0}
                          bg="transparent"
                          color={authColors.textPrimary}
                        />
                      </XStack>
                    )}
                  />
                  {errors.phone ? (
                    <Text fontSize="$2" color={authColors.error}>
                      {errors.phone.message}
                    </Text>
                  ) : null}
                </YStack>
              </>
            )}

            {step === 2 && (
              <>
                <YStack gap="$2" mb="$1">
                  <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                    Strong password
                  </Text>
                  <Text fontSize="$2" color={authColors.textMuted} lineHeight={18}>
                    8+ characters, uppercase, lowercase, number, and a symbol — good for keeping your tickets and
                    payments safe.
                  </Text>
                </YStack>
                <YStack gap="$2">
                  <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                    Password
                  </Text>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, value } }) => (
                      <XStack
                        borderWidth={1}
                        borderColor={errors.password ? authColors.error : authColors.borderStrong}
                        rounded="$5"
                        bg={authColors.cardStrong}
                        px="$3"
                        items="center"
                      >
                        <MaterialCommunityIcons name="lock-outline" size={18} color={authColors.textMuted} />
                        <Input
                          flex={1}
                          size="$4"
                          placeholder="Create a password"
                          placeholderTextColor="$textMuted"
                          secureTextEntry
                          value={value}
                          onChangeText={onChange}
                          borderWidth={0}
                          bg="transparent"
                          color={authColors.textPrimary}
                        />
                      </XStack>
                    )}
                  />
                  {errors.password ? (
                    <Text fontSize="$2" color={authColors.error}>
                      {errors.password.message}
                    </Text>
                  ) : null}
                </YStack>
                <YStack gap="$2">
                  <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                    Confirm password
                  </Text>
                  <Controller
                    control={control}
                    name="confirmPassword"
                    render={({ field: { onChange, value } }) => (
                      <XStack
                        borderWidth={1}
                        borderColor={errors.confirmPassword ? authColors.error : authColors.borderStrong}
                        rounded="$5"
                        bg={authColors.cardStrong}
                        px="$3"
                        items="center"
                      >
                        <MaterialCommunityIcons
                          name="check-circle-outline"
                          size={18}
                          color={authColors.textMuted}
                        />
                        <Input
                          flex={1}
                          size="$4"
                          placeholder="Repeat password"
                          placeholderTextColor="$textMuted"
                          secureTextEntry
                          value={value}
                          onChangeText={onChange}
                          borderWidth={0}
                          bg="transparent"
                          color={authColors.textPrimary}
                        />
                      </XStack>
                    )}
                  />
                  {errors.confirmPassword ? (
                    <Text fontSize="$2" color={authColors.error}>
                      {errors.confirmPassword.message}
                    </Text>
                  ) : null}
                </YStack>
              </>
            )}

            <Pressable
              onPress={next}
              disabled={submitting}
              style={({ pressed }) => ({
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: pressed ? '#D97706' : authColors.warning,
                opacity: submitting ? 0.65 : 1,
                alignItems: 'center',
              })}
            >
              {submitting ? (
                <Spinner color={authColors.bg} />
              ) : (
                <Text color={authColors.bg} fontWeight="800" fontSize="$5">
                  {step < STEPS.length - 1 ? 'Continue' : 'Create account'}
                </Text>
              )}
            </Pressable>
          </YStack>

          <Text fontSize="$3" color={authColors.textSecondary} text="center" mt="$5">
            Already have an account?{' '}
            <Text fontWeight="700" color={authColors.accent} onPress={() => router.replace('/(auth)/sign-in')}>
              Sign in
            </Text>
          </Text>
        </RNScrollView>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}
