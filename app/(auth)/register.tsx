import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { YStack, XStack, Text, Button, Spinner, Input } from 'tamagui';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { waslaColors } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store';

// ─── Validation Schema ──────────────────────────────────────
const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError('');
    setLoading(true);
    try {
      // Mock API call - replace with real API
      await new Promise((r) => setTimeout(r, 1200));

      // Mock successful registration
      const mockToken = 'mock-jwt-token-email-' + Date.now();
      const mockUser = {
        id: 'usr_' + Date.now(),
        name: data.name,
        phone: '+216 XX XXX XXX',
        email: data.email,
      };

      await SecureStore.setItemAsync('auth_token', mockToken);
      setToken(mockToken);
      setUser(mockUser);
      reset();
      router.replace('/(app)');
    } catch (e: any) {
      setApiError(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: waslaColors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack flex={1} justify="center" p="$6">
          {/* Header */}
          <YStack gap="$3" mb="$6">
            <Text fontSize="$9" fontWeight="800" color={waslaColors.textPrimary}>
              Create Account
            </Text>
            <Text fontSize="$4" color={waslaColors.textSecondary} lineHeight={22}>
              Join Wasla and start booking your trips today.
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

          {/* Form Fields */}
          <YStack gap="$4">
            {/* Name Field */}
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="600" color={waslaColors.textSecondary}>
                Full Name
              </Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <YStack gap="$2">
                    <XStack
                      borderWidth={1.5}
                      borderColor={
                        errors.name ? waslaColors.error : waslaColors.border
                      }
                      rounded="$4"
                      items="center"
                      bg={waslaColors.surface}
                    >
                      <Text
                        pl="$3"
                        fontSize="$5"
                        color={waslaColors.textMuted}
                      >
                        👤
                      </Text>
                      <Input
                        flex={1}
                        size="$5"
                        placeholder="Ahmed Ben Ali"
                        value={value}
                        onChangeText={onChange}
                        borderWidth={0}
                        bg="transparent"
                        fontSize="$5"
                      />
                    </XStack>
                    {errors.name ? (
                      <Text fontSize="$2" color={waslaColors.error}>
                        {errors.name.message}
                      </Text>
                    ) : null}
                  </YStack>
                )}
              />
            </YStack>

            {/* Email Field */}
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
                      <Text
                        pl="$3"
                        fontSize="$5"
                        color={waslaColors.textMuted}
                      >
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
                        errors.password
                          ? waslaColors.error
                          : waslaColors.border
                      }
                      rounded="$4"
                      items="center"
                      bg={waslaColors.surface}
                    >
                      <Text
                        pl="$3"
                        fontSize="$5"
                        color={waslaColors.textMuted}
                      >
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

            {/* Confirm Password Field */}
            <YStack gap="$2">
              <Text fontSize="$3" fontWeight="600" color={waslaColors.textSecondary}>
                Confirm Password
              </Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <YStack gap="$2">
                    <XStack
                      borderWidth={1.5}
                      borderColor={
                        errors.confirmPassword
                          ? waslaColors.error
                          : waslaColors.border
                      }
                      rounded="$4"
                      items="center"
                      bg={waslaColors.surface}
                    >
                      <Text
                        pl="$3"
                        fontSize="$5"
                        color={waslaColors.textMuted}
                      >
                        ✓
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
                    {errors.confirmPassword ? (
                      <Text fontSize="$2" color={waslaColors.error}>
                        {errors.confirmPassword.message}
                      </Text>
                    ) : null}
                  </YStack>
                )}
              />
            </YStack>

            {/* Register Button */}
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
                  Create Account
                </Text>
              )}
            </Button>
          </YStack>

          {/* Navigation */}
          <YStack items="center" gap="$2" mt="$6">
            <Text fontSize="$3" color={waslaColors.textSecondary}>
              Already have an account?{' '}
              <Text
                color={waslaColors.primary500}
                fontWeight="700"
                onPress={() => router.push('/login')}
              >
                Sign in
              </Text>
            </Text>
          </YStack>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
