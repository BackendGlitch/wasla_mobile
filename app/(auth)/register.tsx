import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { YStack, XStack, Text, Button, Spinner, Input, Circle } from 'tamagui';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuthBackdrop from '../../src/components/auth/AuthBackdrop';
import { authColors } from '../../src/theme/authTheme';
import { mockApi } from '../../src/lib/api';
import { useAuthStore } from '../../src/store';

const OTP_LENGTH = 6;

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: z.string().min(6, 'Enter a valid phone number'),
    otp: z.string().min(6, 'Enter the 6-digit code'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterStep {
  id: number;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const steps: RegisterStep[] = [
  {
    id: 0,
    title: 'Your name',
    subtitle: 'Tell us how you want to be addressed.',
    icon: 'account-outline',
  },
  {
    id: 1,
    title: 'Phone number',
    subtitle: 'We will send a one-time code for verification.',
    icon: 'phone-outline',
  },
  {
    id: 2,
    title: 'Verify phone',
    subtitle: 'Enter the 6-digit code we just sent you.',
    icon: 'shield-check-outline',
  },
  {
    id: 3,
    title: 'Email address',
    subtitle: 'We will use this for receipts and alerts.',
    icon: 'email-outline',
  },
  {
    id: 4,
    title: 'Secure your account',
    subtitle: 'Create a strong password to protect your trips.',
    icon: 'lock-outline',
  },
];

const stepFields: Array<Array<keyof RegisterFormData>> = [
  ['firstName', 'lastName'],
  ['phone'],
  ['otp'],
  ['email'],
  ['password', 'confirmPassword'],
];

export default function RegisterScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [stepError, setStepError] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const otpInputs = useRef<(TextInput | null)[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    trigger,
    setValue,
    getValues,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      otp: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    setValue('otp', otpDigits.join(''), { shouldValidate: step === 2 });
  }, [otpDigits, setValue, step]);

  const goBack = () => {
    if (step === 0) {
      router.push('/(auth)');
      return;
    }
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      const chars = text.split('').slice(0, OTP_LENGTH);
      const next = [...otpDigits];
      chars.forEach((c, i) => {
        if (index + i < OTP_LENGTH) next[index + i] = c;
      });
      setOtpDigits(next);
      const nextIdx = Math.min(index + chars.length, OTP_LENGTH - 1);
      otpInputs.current[nextIdx]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = text;
    setOtpDigits(next);

    if (text && index < OTP_LENGTH - 1) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKey = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
      const next = [...otpDigits];
      next[index - 1] = '';
      setOtpDigits(next);
    }
  };

  const handleResend = async () => {
    setStepError('');
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    await mockApi.sendOtp(getValues('phone'));
    otpInputs.current[0]?.focus();
  };

  const handleNext = async () => {
    setStepError('');

    if (step === 1) {
      const valid = await trigger(stepFields[step]);
      if (!valid) return;
      setActionLoading(true);
      try {
        await mockApi.sendOtp(getValues('phone'));
        setStep(2);
      } catch (e: any) {
        setStepError(e.message || 'Failed to send OTP');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (step === 2) {
      const code = otpDigits.join('');
      if (code.length !== OTP_LENGTH) {
        setStepError('Enter the full 6-digit code');
        return;
      }
      if (code !== '123456') {
        setStepError('Invalid code. Hint: use 123456');
        return;
      }
      setStep(3);
      return;
    }

    const valid = await trigger(stepFields[step]);
    if (!valid) return;

    if (step < steps.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: RegisterFormData) => {
    setActionLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const mockToken = 'mock-jwt-token-email-' + Date.now();
      const mockUser = {
        id: 'usr_' + Date.now(),
        name: `${data.firstName} ${data.lastName}`,
        phone: `+216 ${data.phone}`,
        email: data.email,
      };

      await SecureStore.setItemAsync('auth_token', mockToken);
      setToken(mockToken);
      setUser(mockUser);
      reset();
      router.replace('/(app)');
    } catch (e: any) {
      setStepError(e.message || 'Registration failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const current = steps[step];

  return (
    <AuthBackdrop variant="amber">
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <YStack flex={1} px="$5" pt="$8" pb="$6" gap="$6">
            <YStack gap="$4">
              <Button chromeless onPress={goBack} alignSelf="flex-start" color={authColors.textSecondary}>
                <XStack items="center" gap="$2">
                  <MaterialCommunityIcons name="chevron-left" size={18} color={authColors.textSecondary} />
                  <Text color={authColors.textSecondary}>Back</Text>
                </XStack>
              </Button>

              <XStack items="center" gap="$3">
                <Circle size={42} bg={authColors.accentSoft} borderWidth={1} borderColor={authColors.borderStrong}>
                  <MaterialCommunityIcons name={current.icon} size={20} color={authColors.warning} />
                </Circle>
                <YStack gap="$1">
                  <Text fontSize="$7" fontWeight="800" color={authColors.textPrimary}>
                    {current.title}
                  </Text>
                  <Text fontSize="$3" color={authColors.textSecondary}>
                    {current.subtitle}
                  </Text>
                </YStack>
              </XStack>

              <XStack items="center" gap="$2">
                {steps.map((_, index) => (
                  <YStack
                    key={index}
                    width={index === step ? 32 : 10}
                    height={6}
                    rounded="$6"
                    bg={index <= step ? authColors.warning : authColors.border}
                    opacity={index <= step ? 1 : 0.6}
                  />
                ))}
                <Text fontSize="$2" color={authColors.textMuted}>
                  Step {step + 1} of {steps.length}
                </Text>
              </XStack>
            </YStack>

            <YStack
              bg={authColors.card}
              borderWidth={1}
              borderColor={authColors.border}
              rounded="$7"
              p="$5"
              gap="$4"
              flex={1}
            >
              {step === 0 ? (
                <YStack gap="$4">
                  <YStack gap="$2">
                    <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                      First name
                    </Text>
                    <Controller
                      control={control}
                      name="firstName"
                      render={({ field: { onChange, value } }) => (
                        <YStack gap="$2">
                          <XStack
                            borderWidth={1}
                            borderColor={errors.firstName ? authColors.error : authColors.borderStrong}
                            rounded="$5"
                            items="center"
                            bg={authColors.cardStrong}
                            px="$3"
                          >
                            <MaterialCommunityIcons name="account-outline" size={18} color={authColors.textMuted} />
                            <Input
                              flex={1}
                              size="$4"
                              placeholder="Ahmed"
                              placeholderTextColor={authColors.textMuted}
                              value={value}
                              onChangeText={onChange}
                              borderWidth={0}
                              bg="transparent"
                              fontSize="$4"
                              color={authColors.textPrimary}
                            />
                          </XStack>
                          {errors.firstName ? (
                            <Text fontSize="$2" color={authColors.error}>
                              {errors.firstName.message}
                            </Text>
                          ) : null}
                        </YStack>
                      )}
                    />
                  </YStack>

                  <YStack gap="$2">
                    <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                      Last name
                    </Text>
                    <Controller
                      control={control}
                      name="lastName"
                      render={({ field: { onChange, value } }) => (
                        <YStack gap="$2">
                          <XStack
                            borderWidth={1}
                            borderColor={errors.lastName ? authColors.error : authColors.borderStrong}
                            rounded="$5"
                            items="center"
                            bg={authColors.cardStrong}
                            px="$3"
                          >
                            <MaterialCommunityIcons name="account-outline" size={18} color={authColors.textMuted} />
                            <Input
                              flex={1}
                              size="$4"
                              placeholder="Ben Ali"
                              placeholderTextColor={authColors.textMuted}
                              value={value}
                              onChangeText={onChange}
                              borderWidth={0}
                              bg="transparent"
                              fontSize="$4"
                              color={authColors.textPrimary}
                            />
                          </XStack>
                          {errors.lastName ? (
                            <Text fontSize="$2" color={authColors.error}>
                              {errors.lastName.message}
                            </Text>
                          ) : null}
                        </YStack>
                      )}
                    />
                  </YStack>
                </YStack>
              ) : null}

              {step === 1 ? (
                <YStack gap="$3">
                  <Text fontSize="$3" color={authColors.textSecondary}>
                    We will send a secure OTP to confirm your number.
                  </Text>
                  <YStack gap="$2">
                    <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                      Phone number
                    </Text>
                    <Controller
                      control={control}
                      name="phone"
                      render={({ field: { onChange, value } }) => (
                        <YStack gap="$2">
                          <XStack
                            borderWidth={1}
                            borderColor={errors.phone ? authColors.error : authColors.borderStrong}
                            rounded="$5"
                            items="center"
                            bg={authColors.cardStrong}
                            px="$3"
                          >
                            <Text fontSize="$4" fontWeight="700" color={authColors.textPrimary}>
                              +216
                            </Text>
                            <Input
                              flex={1}
                              size="$4"
                              placeholder="XX XXX XXX"
                              placeholderTextColor={authColors.textMuted}
                              value={value}
                              onChangeText={onChange}
                              keyboardType="phone-pad"
                              borderWidth={0}
                              bg="transparent"
                              fontSize="$4"
                              color={authColors.textPrimary}
                            />
                          </XStack>
                          {errors.phone ? (
                            <Text fontSize="$2" color={authColors.error}>
                              {errors.phone.message}
                            </Text>
                          ) : null}
                        </YStack>
                      )}
                    />
                  </YStack>
                </YStack>
              ) : null}

              {step === 2 ? (
                <YStack gap="$3">
                  <Text fontSize="$3" color={authColors.textSecondary}>
                    Enter the 6-digit code sent to +216 {getValues('phone') || 'XX XXX XXX'}.
                  </Text>
                  <XStack gap="$2" justify="center">
                    {otpDigits.map((digit, i) => (
                      <YStack
                        key={i}
                        width={46}
                        height={54}
                        borderWidth={1}
                        borderColor={
                          digit
                            ? authColors.warning
                            : stepError
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
                            otpInputs.current[i] = ref;
                          }}
                          value={digit}
                          onChangeText={(t) => handleOtpChange(t, i)}
                          onKeyPress={(e) => handleOtpKey(e, i)}
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
                  <XStack justify="center" gap="$2">
                    <Text fontSize="$3" color={authColors.textMuted}>
                      Didn&apos;t get it?
                    </Text>
                    <Text fontSize="$3" fontWeight="700" color={authColors.warning} onPress={handleResend}>
                      Resend
                    </Text>
                  </XStack>
                </YStack>
              ) : null}

              {step === 3 ? (
                <YStack gap="$3">
                  <Text fontSize="$3" color={authColors.textSecondary}>
                    Add an email for receipts and trip updates.
                  </Text>
                  <YStack gap="$2">
                    <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                      Email address
                    </Text>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, value } }) => (
                        <YStack gap="$2">
                          <XStack
                            borderWidth={1}
                            borderColor={errors.email ? authColors.error : authColors.borderStrong}
                            rounded="$5"
                            items="center"
                            bg={authColors.cardStrong}
                            px="$3"
                          >
                            <Text fontSize="$4" color={authColors.textMuted}>
                              @
                            </Text>
                            <Input
                              flex={1}
                              size="$4"
                              placeholder="you@email.com"
                              placeholderTextColor={authColors.textMuted}
                              keyboardType="email-address"
                              value={value}
                              onChangeText={onChange}
                              borderWidth={0}
                              bg="transparent"
                              fontSize="$4"
                              color={authColors.textPrimary}
                              autoCapitalize="none"
                            />
                          </XStack>
                          {errors.email ? (
                            <Text fontSize="$2" color={authColors.error}>
                              {errors.email.message}
                            </Text>
                          ) : null}
                        </YStack>
                      )}
                    />
                  </YStack>
                </YStack>
              ) : null}

              {step === 4 ? (
                <YStack gap="$4">
                  <YStack gap="$2">
                    <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                      Password
                    </Text>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, value } }) => (
                        <YStack gap="$2">
                          <XStack
                            borderWidth={1}
                            borderColor={errors.password ? authColors.error : authColors.borderStrong}
                            rounded="$5"
                            items="center"
                            bg={authColors.cardStrong}
                            px="$3"
                          >
                            <MaterialCommunityIcons name="lock-outline" size={18} color={authColors.textMuted} />
                            <Input
                              flex={1}
                              size="$4"
                              placeholder="••••••••"
                              placeholderTextColor={authColors.textMuted}
                              secureTextEntry
                              value={value}
                              onChangeText={onChange}
                              borderWidth={0}
                              bg="transparent"
                              fontSize="$4"
                              color={authColors.textPrimary}
                            />
                          </XStack>
                          {errors.password ? (
                            <Text fontSize="$2" color={authColors.error}>
                              {errors.password.message}
                            </Text>
                          ) : null}
                        </YStack>
                      )}
                    />
                  </YStack>

                  <YStack gap="$2">
                    <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                      Confirm password
                    </Text>
                    <Controller
                      control={control}
                      name="confirmPassword"
                      render={({ field: { onChange, value } }) => (
                        <YStack gap="$2">
                          <XStack
                            borderWidth={1}
                            borderColor={errors.confirmPassword ? authColors.error : authColors.borderStrong}
                            rounded="$5"
                            items="center"
                            bg={authColors.cardStrong}
                            px="$3"
                          >
                            <MaterialCommunityIcons name="check-circle-outline" size={18} color={authColors.textMuted} />
                            <Input
                              flex={1}
                              size="$4"
                              placeholder="••••••••"
                              placeholderTextColor={authColors.textMuted}
                              secureTextEntry
                              value={value}
                              onChangeText={onChange}
                              borderWidth={0}
                              bg="transparent"
                              fontSize="$4"
                              color={authColors.textPrimary}
                            />
                          </XStack>
                          {errors.confirmPassword ? (
                            <Text fontSize="$2" color={authColors.error}>
                              {errors.confirmPassword.message}
                            </Text>
                          ) : null}
                        </YStack>
                      )}
                    />
                  </YStack>
                </YStack>
              ) : null}

              {stepError ? (
                <Text fontSize="$3" color={authColors.error} text="center">
                  {stepError}
                </Text>
              ) : null}
            </YStack>

            <YStack gap="$3">
              <Button
                size="$5"
                bg={authColors.warning}
                borderWidth={1}
                borderColor="rgba(255, 179, 71, 0.5)"
                rounded="$6"
                pressStyle={{ bg: '#E9A13B' }}
                onPress={handleNext}
                disabled={actionLoading}
                opacity={actionLoading ? 0.7 : 1}
              >
                {actionLoading ? (
                  <Spinner color={authColors.bg} />
                ) : (
                  <Text color={authColors.bg} fontWeight="800" fontSize="$5" letterSpacing={0.6}>
                    {step === steps.length - 1 ? 'Create Account' : 'Continue'}
                  </Text>
                )}
              </Button>

              {step === 0 ? (
                <Text fontSize="$3" color={authColors.textSecondary} text="center">
                  Already have an account?{' '}
                  <Text color={authColors.accent} fontWeight="700" onPress={() => router.push('/login')}>
                    Sign in
                  </Text>
                </Text>
              ) : null}
            </YStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}
