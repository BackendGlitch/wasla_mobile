import { KeyboardAvoidingView, Platform, Pressable, ScrollView as RNScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, YStack, XStack } from 'tamagui';
import AuthBackdrop from '../auth/AuthBackdrop';
import { authColors } from '../../theme/authTheme';

export type LegalSection = {
  heading: string;
  body: string[];
};

export type LegalDocumentScreenProps = {
  title: string;
  subtitle?: string;
  sections: LegalSection[];
};

export default function LegalDocumentScreen({ title, subtitle, sections }: LegalDocumentScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)');
  };

  const padTop = Math.max(insets.top, 12);
  const padBottom = Math.max(insets.bottom, 16) + 24;

  return (
    <AuthBackdrop variant="teal">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <RNScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingTop: padTop, paddingBottom: padBottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Pressable onPress={goBack} style={styles.backButton}>
            <XStack items="center" gap="$2">
              <MaterialCommunityIcons name="arrow-left" size={22} color={authColors.textPrimary} />
              <Text color={authColors.textPrimary} fontSize="$4" fontWeight="700">
                Back
              </Text>
            </XStack>
          </Pressable>

          <YStack px="$5" pt="$4" gap="$5">
            <Text fontSize="$9" fontWeight="800" color={authColors.textPrimary}>
              {title}
            </Text>
            {subtitle ? (
              <Text fontSize="$3" color={authColors.textMuted} lineHeight={20}>
                {subtitle}
              </Text>
            ) : null}

            <YStack gap="$5">
              {sections.map((section, index) => (
                <YStack key={`${section.heading}-${index}`} gap="$3">
                  <Text fontSize="$5" fontWeight="800" color={authColors.textPrimary}>
                    {section.heading}
                  </Text>
                  {section.body.map((para, pi) => (
                    <Text
                      key={pi}
                      fontSize="$4"
                      color={authColors.textSecondary}
                      lineHeight={22}
                      selectable={Platform.OS !== 'web'}
                    >
                      {para}
                    </Text>
                  ))}
                </YStack>
              ))}
            </YStack>
          </YStack>
        </RNScrollView>
      </KeyboardAvoidingView>
    </AuthBackdrop>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authColors.borderStrong,
    backgroundColor: authColors.card,
  },
});
