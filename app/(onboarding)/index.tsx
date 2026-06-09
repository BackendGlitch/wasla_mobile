import { useRef, useState } from 'react';
import { FlatList, Dimensions } from 'react-native';
import type { ViewToken } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../src/store';
import AuthBackdrop from '../../src/components/auth/AuthBackdrop';
import { BrandLogo } from '../../src/components/BrandLogo';
import { authColors } from '../../src/theme/authTheme';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  chip: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Book in Seconds',
    subtitle: 'Live schedules, seat picks, and instant e-tickets across Tunisia.',
    chip: 'Realtime routes',
  },
  {
    id: '2',
    title: 'Smart Route Discovery',
    subtitle: 'Find the fastest route with clear pricing and station insights.',
    chip: 'Optimized trips',
  },
  {
    id: '3',
    title: 'Tap, Scan, Ride',
    subtitle: 'Your ticket lives in the app with secure QR validation.',
    chip: 'Secure boarding',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { setHasOnboarded } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const completeOnboarding = async () => {
    setHasOnboarded(true);
    try {
      await SecureStore.setItemAsync('has_onboarded', 'true');
    } catch {
      // web fallback
    }
    router.replace('/(auth)');
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <YStack width={width} flex={1} px="$6" pb="$4">
      <YStack flex={1} items="center" justify="center" gap="$6">
        <YStack
          width={140}
          height={140}
          rounded={40}
          items="center"
          justify="center"
          borderWidth={1}
          borderColor={authColors.borderStrong}
          bg={authColors.card}
          shadowColor={authColors.accent}
          shadowOpacity={0.2}
          shadowRadius={24}
        >
          <BrandLogo size={112} />
        </YStack>

        <XStack
          px="$4"
          py="$2"
          rounded="$10"
          bg={authColors.accentSoft}
          borderWidth={1}
          borderColor={authColors.borderStrong}
        >
          <Text fontSize="$2" fontWeight="700" color={authColors.accent} letterSpacing={1.2}>
            {item.chip.toUpperCase()}
          </Text>
        </XStack>

        <YStack gap="$3" items="center">
          <Text
            fontSize="$9"
            fontWeight="800"
            color={authColors.textPrimary}
            text="center"
          >
            {item.title}
          </Text>
          <Text
            fontSize="$4"
            color={authColors.textSecondary}
            text="center"
            lineHeight={22}
            px="$4"
          >
            {item.subtitle}
          </Text>
        </YStack>
      </YStack>
    </YStack>
  );

  const isLast = currentIndex === slides.length - 1;

  return (
    <AuthBackdrop>
      <StatusBar style="light" />

      <YStack flex={1} pt="$8" pb="$6">
        <XStack px="$5" items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <BrandLogo size={36} borderRadius={8} />
            <Text fontSize="$5" fontWeight="700" color={authColors.textPrimary} letterSpacing={1}>
              WASLA
            </Text>
          </XStack>
          {!isLast && (
            <Button chromeless onPress={completeOnboarding} style={{color: authColors.textSecondary}} testID="onboarding-skip">
              Skip
            </Button>
          )}
        </XStack>

        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
        />

        <YStack px="$6" gap="$5">
          <XStack gap="$2" justify="center">
            {slides.map((_, i) => (
              <YStack
                key={i}
                width={i === currentIndex ? 28 : 10}
                height={8}
                rounded="$6"
                bg={i === currentIndex ? authColors.accent : authColors.border}
                opacity={i === currentIndex ? 1 : 0.6}
              />
            ))}
          </XStack>

          <Button
            size="$5"
            width="100%"
            bg={authColors.accent}
            borderWidth={1}
            borderColor={authColors.borderStrong}
            rounded="$6"
            pressStyle={{ bg: authColors.accentDark || '#8B6914' }}
            onPress={handleNext}
          >
            <Text color={authColors.bg} fontWeight="800" fontSize="$5" letterSpacing={0.6}>
              {isLast ? 'Start Your Journey' : 'Continue'}
            </Text>
          </Button>
        </YStack>
      </YStack>
    </AuthBackdrop>
  );
}
