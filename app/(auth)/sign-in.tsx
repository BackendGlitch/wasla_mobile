import { useState } from 'react';
import { Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { YStack, XStack, Text, Input, Spinner, ScrollView } from 'tamagui';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthBackdrop from '../../src/components/auth/AuthBackdrop';
import { authColors } from '../../src/theme/authTheme';
import { useAuthStore } from '../../src/store';
import {
  authApi,
  finishAuthAndNavigate,
  getCentralApiErrorMessage,
} from '../../src/lib';

type SignInMode = 'phone' | 'email';

const emailLoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type EmailLoginData = z.infer<typeof emailLoginSchema>;

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setToken, setUser } = useAuthStore();
  const [mode, setMode] = useState<SignInMode>('phone');
  const [phone, setPhone] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<EmailLoginData>({
    resolver: zodResolver(emailLoginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)');
  };

  const [phonePassword, setPhonePassword] = useState('');

  const onPhoneLogin = async () => {
    const raw = phone.trim().replace(/\s+/g, '');
    if (raw.length < 8) {
      setPhoneError('Enter a valid mobile number');
      return;
    }
    if (!phonePassword) {
      setPhoneError('Password is required');
      return;
    }
    setPhoneError('');
    setPhoneLoading(true);
    try {
      const phoneE164 = raw.startsWith('+') ? raw : `+216${raw.replace(/[^\d]/g, '')}`;
      const result = await authApi.loginWithPhone({
        phone: phoneE164,
        password: phonePassword,
      });
      await finishAuthAndNavigate(result, router, setToken, setUser);
    } catch (e: unknown) {
      setPhoneError(getCentralApiErrorMessage(e));
    } finally {
      setPhoneLoading(false);
    }
  };

  const onEmailLogin = async (data: EmailLoginData) => {
    setEmailError('');
    setEmailLoading(true);
    try {
      const result = await authApi.loginWithEmail({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      reset();
      await finishAuthAndNavigate(result, router, setToken, setUser);
    } catch (e: unknown) {
      setEmailError(getCentralApiErrorMessage(e));
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <AuthBackdrop>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          flex={1}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: Math.max(insets.top, 12) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={goBack} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12 }}>
            <XStack items="center" gap="$2">
              <MaterialCommunityIcons name="chevron-left" size={22} color={authColors.textSecondary} />
              <Text color={authColors.textSecondary} fontWeight="600">
                Back
              </Text>
            </XStack>
          </Pressable>

          <Text fontSize="$9" fontWeight="900" color={authColors.textPrimary} mt="$3">
            Sign in
          </Text>
          <Text fontSize="$4" color={authColors.textSecondary} lineHeight={22} mt="$2" mb="$5">
            Choose how you want to access your account.
          </Text>

          <XStack
            bg={authColors.cardStrong}
            borderWidth={1}
            borderColor={authColors.borderStrong}
            rounded="$5"
            p="$1"
            gap="$1"
            mb="$5"
          >
            <Pressable
              onPress={() => {
                setMode('phone');
                setPhoneError('');
                setEmailError('');
              }}
              testID="signin-mode-phone"
              style={{ flex: 1 }}
            >
              <YStack
                py="$3"
                rounded="$4"
                bg={mode === 'phone' ? authColors.card : 'transparent'}
                borderWidth={mode === 'phone' ? 1 : 0}
                borderColor={mode === 'phone' ? authColors.borderStrong : 'transparent'}
                items="center"
              >
                <Text fontWeight="800" fontSize="$3" color={authColors.textPrimary}>
                  Phone
                </Text>
                <Text fontSize="$2" color={authColors.textMuted} mt="$1">
                  + password
                </Text>
              </YStack>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode('email');
                setPhoneError('');
                setEmailError('');
              }}
              testID="signin-mode-email"
              style={{ flex: 1 }}
            >
              <YStack
                py="$3"
                rounded="$4"
                bg={mode === 'email' ? authColors.card : 'transparent'}
                borderWidth={mode === 'email' ? 1 : 0}
                borderColor={mode === 'email' ? authColors.borderStrong : 'transparent'}
                items="center"
              >
                <Text fontWeight="800" fontSize="$3" color={authColors.textPrimary}>
                  Email
                </Text>
                <Text fontSize="$2" color={authColors.textMuted} mt="$1">
                  + password
                </Text>
              </YStack>
            </Pressable>
          </XStack>

          <YStack
            bg={authColors.card}
            borderWidth={1}
            borderColor={authColors.border}
            rounded="$7"
            p="$5"
            gap="$4"
          >
            {mode === 'phone' ? (
              <>
                <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                  Tunisian mobile number
                </Text>
                <XStack
                  items="center"
                  gap="$2"
                  bg={authColors.cardStrong}
                  borderWidth={1}
                  borderColor={phoneError ? authColors.error : authColors.borderStrong}
                  rounded="$5"
                  px="$3"
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
                    value={phone}
                    onChangeText={setPhone}
                    borderWidth={0}
                    bg="transparent"
                    color={authColors.textPrimary}
                    fontSize="$4"
                  />
                </XStack>

                <YStack gap="$2">
                  <Text fontSize="$3" fontWeight="700" color={authColors.textSecondary}>
                    Password
                  </Text>
                  <XStack
                    borderWidth={1}
                    borderColor={authColors.borderStrong}
                    rounded="$5"
                    items="center"
                    bg={authColors.cardStrong}
                    px="$3"
                  >
                    <MaterialCommunityIcons name="lock-outline" size={18} color={authColors.textMuted} />
                    <Input
                      flex={1}
                      size="$4"
                      placeholder="Your password"
                      placeholderTextColor="$textMuted"
                      secureTextEntry
                      value={phonePassword}
                      onChangeText={setPhonePassword}
                      borderWidth={0}
                      bg="transparent"
                      fontSize="$4"
                      color={authColors.textPrimary}
                    />
                  </XStack>
                </YStack>

                {phoneError ? (
                  <Text fontSize="$2" color={authColors.error}>
                    {phoneError}
                  </Text>
                ) : null}
                <Pressable
                  onPress={onPhoneLogin}
                  disabled={phoneLoading}
                  style={({ pressed }) => ({
                    paddingVertical: 16,
                    borderRadius: 14,
                    backgroundColor: pressed ? '#8B6914' : authColors.accent,
                    opacity: phoneLoading ? 0.7 : 1,
                    alignItems: 'center',
                  })}
                >
                  {phoneLoading ? (
                    <Spinner color={authColors.bg} />
                  ) : (
                    <Text color={authColors.bg} fontWeight="800" fontSize="$5">
                      Sign in
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                {emailError ? (
                  <YStack
                    bg="rgba(239, 68, 68, 0.10)"
                    borderWidth={1}
                    borderColor="rgba(239, 68, 68, 0.30)"
                    p="$3"
                    rounded="$4"
                  >
                    <Text fontSize="$3" color={authColors.error} fontWeight="600">
                      {emailError}
                    </Text>
                  </YStack>
                ) : null}

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
                        items="center"
                        bg={authColors.cardStrong}
                        px="$3"
                      >
                        <MaterialCommunityIcons name="email-outline" size={18} color={authColors.textMuted} />
                        <Input
                          flex={1}
                          testID="signin-email"
                          size="$4"
                          placeholder="you@email.com"
                          placeholderTextColor="$textMuted"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={value}
                          onChangeText={onChange}
                          borderWidth={0}
                          bg="transparent"
                          fontSize="$4"
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
                        items="center"
                        bg={authColors.cardStrong}
                        px="$3"
                      >
                        <MaterialCommunityIcons name="lock-outline" size={18} color={authColors.textMuted} />
                        <Input
                          flex={1}
                          testID="signin-password"
                          size="$4"
                          placeholder="Your password"
                          placeholderTextColor="$textMuted"
                          secureTextEntry
                          value={value}
                          onChangeText={onChange}
                          borderWidth={0}
                          bg="transparent"
                          fontSize="$4"
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


                <Pressable
                  onPress={handleSubmit(onEmailLogin)}
                  disabled={!isValid || emailLoading}
                  testID="signin-submit"
                  style={({ pressed }) => ({
                    paddingVertical: 16,
                    borderRadius: 14,
                    backgroundColor: pressed ? '#8B6914' : authColors.accent,
                    opacity: !isValid || emailLoading ? 0.55 : 1,
                    alignItems: 'center',
                  })}
                >
                  {emailLoading ? (
                    <Spinner color={authColors.bg} />
                  ) : (
                    <Text color={authColors.bg} fontWeight="800" fontSize="$5">
                      Sign in
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </YStack>

          <Text fontSize="$3" color={authColors.textSecondary} text="center" mt="$5">
            New to Wasla?{' '}
            <Text fontWeight="700" color={authColors.accent} onPress={() => router.push('/(auth)/sign-up')}>
              Create account
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}
