import { useState, useRef } from 'react';
import { FlatList, Dimensions } from 'react-native';
import type { ViewToken } from 'react-native';
import { YStack, XStack, Text, Button, Circle } from 'tamagui';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../src/store';
import { waslaColors } from '../../src/theme/colors';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: '🚌',
    title: 'Welcome to Wasla',
    subtitle:
      'Your seamless intercity travel companion. Book bus tickets across Tunisia in seconds.',
  },
  {
    id: '2',
    icon: '🗺️',
    title: 'Find Your Route',
    subtitle:
      'Browse stations, compare times and prices, and pick the perfect trip for you.',
  },
  {
    id: '3',
    icon: '🎫',
    title: 'Book & Go',
    subtitle:
      'Choose your seat, pay securely, and get your e-ticket with QR code — no paper needed.',
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

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => completeOnboarding();

  const completeOnboarding = async () => {
    setHasOnboarded(true);
    try {
      await SecureStore.setItemAsync('has_onboarded', 'true');
    } catch {
      // web fallback
    }
    router.replace('/(auth)');
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <YStack width={width} flex={1} items="center" justify="center" px="$6" gap="$5">
      <Text fontSize={80} lineHeight={100}>
        {item.icon}
      </Text>
      <Text
        fontSize="$9"
        fontWeight="800"
        color={waslaColors.textPrimary}
        text="center"
      >
        {item.title}
      </Text>
      <Text
        fontSize="$5"
        color={waslaColors.textSecondary}
        text="center"
        lineHeight={24}
        px="$4"
      >
        {item.subtitle}
      </Text>
    </YStack>
  );

  const isLast = currentIndex === slides.length - 1;

  return (
    <YStack flex={1} bg={waslaColors.background}>
      {/* Skip */}
      <XStack justify="flex-end" p="$4" pt="$8">
        {!isLast && (
          <Button size="$3" chromeless onPress={handleSkip}>
            Skip
          </Button>
        )}
      </XStack>

      {/* Slides */}
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

      {/* Dots + Button */}
      <YStack p="$6" pb="$8" gap="$5" items="center">
        <XStack gap="$2">
          {slides.map((_, i) => (
            <Circle
              key={i}
              size={i === currentIndex ? 10 : 8}
              bg={
                i === currentIndex ? waslaColors.primary500 : waslaColors.gray300
              }
              opacity={i === currentIndex ? 1 : 0.5}
            />
          ))}
        </XStack>

        <Button
          size="$5"
          width="100%"
          bg={waslaColors.primary500}
          rounded="$4"
          pressStyle={{ bg: waslaColors.primary700 }}
          onPress={handleNext}
        >
          <Text color="white" fontWeight="700" fontSize="$5">
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
}
