import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { YStack, XStack, Text, Button, Spinner, Input } from 'tamagui';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { waslaColors } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store';

// ─── Validation Schema ──────────────────────────────────────
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
      // Mock API call - replace with real API
      await new Promise((r) => setTimeout(r, 1000));

      // Mock successful login
      const mockToken = 'mock-jwt-token-email-' + Date.now();
      const mockUser = {
        id: 'usr_' + Date.now(),
        name: data.email.split('@')[0],
        phone: '+216 XX XXX XXX',
        email: data.email,
      };

      await SecureStore.setItemAsync('auth_token', mockToken);
      setToken(mockToken);
      setUser(mockUser);
      reset();
      router.replace('/(app)');
    } catch (e: any) {
      setApiError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: waslaColors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <YStack flex={1} justify="center" p="$6">
        {/* Header */}
        <YStack gap="$3" mb="$8">
          <Text fontSize="$9" fontWeight="800" color={waslaColors.textPrimary}>
            Welcome Back
          </Text>
          <Text fontSize="$4" color={waslaColors.textSecondary} lineHeight={22}>
            Sign in with your email and password to continue.
          </Text>
        </YStack>

        {/* API Error */}
        {apiError ? (
          <YStack
            bg={waslaColors.error}
            p="$4"
            rounded="$3"
            mb="$4"
            opacity={0.1}
          >
            <Text fontSize="$3" color={waslaColors.error} fontWeight="600">
              {apiError}
            </Text>
          </YStack>
        ) : null}

        {/* Email Field */}
        <YStack gap="$4">
          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color={waslaColors.textSecondary}>
              Email Address
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <YStack gap="$2">
                  <XStack
                    borderWidth={1.5}
                    borderColor={
                      errors.email ? waslaColors.error : waslaColors.border
                    }
                    rounded="$4"
                    items="center"
                    bg={waslaColors.surface}
                  >
                    <Text pl="$3" fontSize="$5" color={waslaColors.textMuted}>
                      @
                    </Text>
                    <Input
                      flex={1}
                      size="$5"
                      placeholder="your@email.com"
                      keyboardType="email-address"
                      value={value}
                      onChangeText={onChange}
                      borderWidth={0}
                      bg="transparent"
                      fontSize="$5"
                      autoCapitalize="none"
                    />
                  </XStack>
                  {errors.email ? (
                    <Text fontSize="$2" color={waslaColors.error}>
                      {errors.email.message}
                    </Text>
                  ) : null}
                </YStack>
              )}
            />
          </YStack>

          {/* Password Field */}
          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color={waslaColors.textSecondary}>
              Password
            </Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <YStack gap="$2">
                  <XStack
                    borderWidth={1.5}
                    borderColor={
                      errors.password ? waslaColors.error : waslaColors.border
                    }
                    rounded="$4"
                    items="center"
                    bg={waslaColors.surface}
                  >
                    <Text pl="$3" fontSize="$5" color={waslaColors.textMuted}>
                      🔒
                    </Text>
                    <Input
                      flex={1}
                      size="$5"
                      placeholder="••••••••"
                      secureTextEntry
                      value={value}
                      onChangeText={onChange}
                      borderWidth={0}
                      bg="transparent"
                      fontSize="$5"
                    />
                  </XStack>
                  {errors.password ? (
                    <Text fontSize="$2" color={waslaColors.error}>
                      {errors.password.message}
                    </Text>
                  ) : null}
                </YStack>
              )}
            />
          </YStack>

          {/* Sign In Button */}
          <Button
            size="$5"
            bg={waslaColors.primary500}
            rounded="$4"
            mt="$6"
            pressStyle={{ bg: waslaColors.primary700 }}
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || loading}
            opacity={!isValid || loading ? 0.6 : 1}
          >
            {loading ? (
              <Spinner color="white" />
            ) : (
              <Text color="white" fontWeight="700" fontSize="$5">
                Sign In
              </Text>
            )}
          </Button>
        </YStack>

        {/* Divider */}
        <XStack items="center" gap="$3" my="$6">
          <YStack flex={1} height={1} bg={waslaColors.border} />
          <Text fontSize="$3" color={waslaColors.textMuted}>
            OR
          </Text>
          <YStack flex={1} height={1} bg={waslaColors.border} />
        </XStack>

        {/* Navigation */}
        <YStack items="center" gap="$2">
          <Text fontSize="$3" color={waslaColors.textSecondary}>
            Don't have an account?{' '}
            <Text
              color={waslaColors.primary500}
              fontWeight="700"
              onPress={() => router.push('/register')}
            >
              Create one
            </Text>
          </Text>
          <Text
            fontSize="$3"
            color={waslaColors.primary500}
            fontWeight="600"
            onPress={() => router.push('/(auth)')}
            mt="$4"
          >
            Back to sing in options
          </Text>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
