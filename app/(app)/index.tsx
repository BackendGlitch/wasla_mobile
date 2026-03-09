import { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { YStack, XStack, Text, Button, Input } from 'tamagui';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { waslaColors } from '../../src/theme/colors';
import { MOCK_ROUTES, MOCK_STATIONS } from '../../src/lib/mockData';
import { useAuthStore } from '../../src/store';

export default function RoutesScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [selectedFrom, setSelectedFrom] = useState<string | null>(null);
  const [selectedTo, setSelectedTo] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('has_onboarded');
    } catch {
      // fallback
    }
    logout();
    router.replace('/(auth)');
  };

  // Get unique cities from stations
  const cities = useMemo(
    () => Array.from(new Set(MOCK_STATIONS.map((s) => s.city))),
    []
  );

  // Filter routes based on selection
  const filteredRoutes = useMemo(() => {
    return MOCK_ROUTES.filter((route) => {
      if (selectedFrom && route.from !== selectedFrom) return false;
      if (selectedTo && route.to !== selectedTo) return false;
      return true;
    });
  }, [selectedFrom, selectedTo]);

  const routesToShow = filteredRoutes.length > 0 ? filteredRoutes : MOCK_ROUTES;

  const renderRoute = ({ item }) => (
    <YStack
      bg={waslaColors.surface}
      p="$4"
      rounded="$3"
      mb="$3"
      borderWidth={1}
      borderColor={waslaColors.border}
    >
      {/* Route Header */}
      <XStack justify="space-between" items="center" mb="$3">
        <YStack flex={1}>
          <Text fontSize="$3" color={waslaColors.textMuted}>
            {item.from} → {item.to}
          </Text>
          <Text fontSize="$5" fontWeight="700" color={waslaColors.textPrimary}>
            {item.departureTime} - {item.arrivalTime}
          </Text>
        </YStack>
        <YStack items="center">
          <Text fontSize="$6" fontWeight="800" color={waslaColors.primary500}>
            {item.price}
          </Text>
          <Text fontSize="$2" color={waslaColors.textMuted}>
            {item.currency}
          </Text>
        </YStack>
      </XStack>

      {/* Availability */}
      <XStack justify="space-between" items="center" mb="$4">
        <Text fontSize="$3" color={waslaColors.textSecondary}>
          Seats available:{' '}
          <Text fontWeight="700" color={waslaColors.success}>
            {item.seatsAvailable}
          </Text>
          /{item.totalSeats}
        </Text>
      </XStack>

      {/* Book Button */}
      <Button
        size="$4"
        bg={waslaColors.primary500}
        rounded="$3"
        pressStyle={{ bg: waslaColors.primary700 }}
        onPress={() =>
          router.push({
            pathname: '/booking/[routeId]',
            params: { routeId: item.id },
          })
        }
      >
        <Text color="white" fontWeight="700" fontSize="$4">
          Book Now
        </Text>
      </Button>
    </YStack>
  );

  return (
    <YStack flex={1} bg={waslaColors.background}>
      {/* Header */}
      <YStack bg={waslaColors.primary500} p="$6" pt="$8" pb="$4" gap="$4">
        <XStack justify="space-between" items="center" mb="$2">
          <YStack flex={1}>
            <Text fontSize="$8" fontWeight="800" color="white">
              Find Your Route
            </Text>
          </YStack>
          <Button
            size="$3"
            bg="rgba(255,255,255,0.2)"
            rounded="$2"
            pressStyle={{ bg: 'rgba(255,255,255,0.3)' }}
            onPress={handleLogout}
            ml="$2"
          >
            <Text color="white" fontWeight="700" fontSize="$3">
              🚪
            </Text>
          </Button>
        </XStack>
        <Text fontSize="$3" color="rgba(255,255,255,0.9)">
          Search and book your next trip
        </Text>
      </YStack>

      {/* Filters */}
      <YStack p="$4" bg={waslaColors.surface} borderBottomWidth={1} borderBottomColor={waslaColors.border}>
        <XStack gap="$3" mb="$3">
          <YStack flex={1}>
            <Text fontSize="$2" fontWeight="600" color={waslaColors.textSecondary} mb="$2">
              From
            </Text>
            <YStack
              borderWidth={1}
              borderColor={waslaColors.border}
              rounded="$3"
              p="$3"
              bg={waslaColors.background}
            >
              <FlatList
                data={cities}
                horizontal
                scrollEnabled
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Button
                    size="$2"
                    bg={selectedFrom === item ? waslaColors.primary500 : waslaColors.gray200}
                    rounded="$2"
                    mr="$2"
                    onPress={() => setSelectedFrom(selectedFrom === item ? null : item)}
                  >
                    <Text
                      fontSize="$2"
                      fontWeight="600"
                      color={selectedFrom === item ? 'white' : waslaColors.textPrimary}
                    >
                      {item}
                    </Text>
                  </Button>
                )}
                keyExtractor={(item) => item}
              />
            </YStack>
          </YStack>
        </XStack>

        <XStack gap="$3">
          <YStack flex={1}>
            <Text fontSize="$2" fontWeight="600" color={waslaColors.textSecondary} mb="$2">
              To
            </Text>
            <YStack
              borderWidth={1}
              borderColor={waslaColors.border}
              rounded="$3"
              p="$3"
              bg={waslaColors.background}
            >
              <FlatList
                data={cities}
                horizontal
                scrollEnabled
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Button
                    size="$2"
                    bg={selectedTo === item ? waslaColors.primary500 : waslaColors.gray200}
                    rounded="$2"
                    mr="$2"
                    onPress={() => setSelectedTo(selectedTo === item ? null : item)}
                  >
                    <Text
                      fontSize="$2"
                      fontWeight="600"
                      color={selectedTo === item ? 'white' : waslaColors.textPrimary}
                    >
                      {item}
                    </Text>
                  </Button>
                )}
                keyExtractor={(item) => item}
              />
            </YStack>
          </YStack>
        </XStack>
      </YStack>

      {/* Routes List */}
      <FlatList
        data={routesToShow}
        renderItem={renderRoute}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 12 }}
        scrollEnabled
        ListEmptyComponent={
          <YStack items="center" justify="center" py="$8">
            <Text fontSize="$6" mb="$3">
              🚌
            </Text>
            <Text fontSize="$4" fontWeight="600" color={waslaColors.textSecondary}>
              No routes found
            </Text>
          </YStack>
        }
      />
    </YStack>
  );
}
