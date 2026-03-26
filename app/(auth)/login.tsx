import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
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
import { useAuthStore } from '../../src/store';
import { authApi } from '../../src/lib';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError('');
    setLoading(true);
    try {
      const result = await authApi.loginWithEmail({
        email: data.email,
        password: data.password,
      });

      await SecureStore.setItemAsync('auth_token', result.access_token);
      setToken(result.access_token);
      const fullName = `${result.user.firstName ?? ''} ${result.user.lastName ?? ''}`.trim();
      setUser({
        id: result.user.id,
        name: fullName || data.email.split('@')[0],
        phone: result.user.phone ?? '',
        email: result.user.email ?? data.email,
      });
      reset();
      router.replace('/(app)');
    } catch (e: any) {
      setApiError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackdrop variant="violet">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <YStack flex={1} px="$5" pt="$8" pb="$6" justify="space-between">
          <YStack gap="$4">
            <Button
              chromeless
              onPress={() => router.push('/(auth)')}
              alignSelf="flex-start"
              color={authColors.textSecondary}
            >
              <XStack items="center" gap="$2">
                <MaterialCommunityIcons name="chevron-left" size={18} color={authColors.textSecondary} />
                <Text color={authColors.textSecondary}>Back</Text>
              </XStack>
            </Button>

            <YStack gap="$2">
              <XStack items="center" gap="$3">
                <Circle size={42} bg={authColors.accentSoft} borderWidth={1} borderColor={authColors.borderStrong}>
                  <MaterialCommunityIcons name="email-outline" size={20} color={authColors.accentBlue} />
                </Circle>
                <Text fontSize="$7" fontWeight="800" color={authColors.textPrimary}>
                  Sign in with email
                </Text>
              </XStack>
              <Text fontSize="$4" color={authColors.textSecondary} lineHeight={22}>
                Use your email and password to access your trips and tickets.
              </Text>
            </YStack>
          </YStack>

          <YStack
            bg={authColors.card}
            borderWidth={1}
            borderColor={authColors.border}
            rounded="$7"
            p="$5"
            gap="$4"
          >
            {apiError ? (
              <YStack
                bg="rgba(255, 92, 122, 0.12)"
                borderWidth={1}
                borderColor="rgba(255, 92, 122, 0.4)"
                p="$3"
                rounded="$4"
              >
                <Text fontSize="$3" color={authColors.error} fontWeight="600">
                  {apiError}
                </Text>
              </YStack>
            ) : null}

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

            <Button
              size="$5"
              bg={authColors.accentBlue}
              borderWidth={1}
              borderColor="rgba(76, 201, 255, 0.4)"
              rounded="$6"
              pressStyle={{ bg: '#38B7E8' }}
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || loading}
              opacity={!isValid || loading ? 0.6 : 1}
            >
              {loading ? (
                <Spinner color={authColors.bg} />
              ) : (
                <Text color={authColors.bg} fontWeight="800" fontSize="$5" letterSpacing={0.6}>
                  Sign In
                </Text>
              )}
            </Button>

            <Text fontSize="$3" color={authColors.textSecondary} text="center">
              Don&apos;t have an account?{' '}
              <Text color={authColors.accent} fontWeight="700" onPress={() => router.push('/register')}>
                Create one
              </Text>
            </Text>
          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}
