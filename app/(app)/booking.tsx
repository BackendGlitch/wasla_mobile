import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { singleRouteParam } from '../../src/lib/postAuthFlow';
import { useStationStore } from '../../src/store';
import { appColors } from '../../src/theme/appTheme';

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    routeId?: string | string[];
    routeName?: string | string[];
    availableSeats?: string | string[];
    stationId?: string | string[];
  }>();
  const stations = useStationStore((state) => state.stations);
  const selectedStation = useStationStore((state) => state.selectedStation);

  const routeId = singleRouteParam(params.routeId) ?? '';
  const routeName = singleRouteParam(params.routeName) ?? 'Selected route';
  const stationId = singleRouteParam(params.stationId) ?? selectedStation?.id ?? '';
  const availableSeatsParam = singleRouteParam(params.availableSeats);
  const parsedSeats = Number(availableSeatsParam);
  const availableSeats = Number.isFinite(parsedSeats) ? parsedSeats : 0;
  const stationName =
    stations.find((station) => station.id === stationId)?.name ??
    selectedStation?.name ??
    'Selected station';
  const isFull = availableSeats <= 0;

  return (
    <YStack flex={1} bg={appColors.bg}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <XStack items="center" gap="$2">
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.textPrimary} />
            <Text color={appColors.textPrimary} fontSize="$4" fontWeight="700">
              Back to routes
            </Text>
          </XStack>
        </Pressable>

        <YStack gap="$5">
          <YStack gap="$2">
            <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.4}>
              BOOKING
            </Text>
            <Text color={appColors.textPrimary} fontSize="$10" fontWeight="800">
              {routeName}
            </Text>
            <Text color={appColors.textSecondary} fontSize="$4">
              Route selection is ready for the booking flow.
            </Text>
          </YStack>

          <View style={styles.card}>
            <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.4}>
              DEPARTURE STATION
            </Text>
            <Text mt="$2" color={appColors.textPrimary} fontSize="$6" fontWeight="700">
              {stationName}
            </Text>

            <XStack mt="$4" gap="$3" flexWrap="wrap">
              <View style={[styles.badge, isFull ? styles.badgeDanger : styles.badgeAccent]}>
                <Text color={isFull ? '#FFD7D7' : appColors.textPrimary} fontSize="$3" fontWeight="700">
                  {isFull ? 'Full' : `${availableSeats} seats left`}
                </Text>
              </View>
              <View style={styles.badge}>
                <Text color={appColors.textSecondary} fontSize="$3" fontWeight="700">
                  Route ID: {routeId || 'Unknown'}
                </Text>
              </View>
            </XStack>
          </View>

          <View style={styles.noteCard}>
            <Text color={appColors.textPrimary} fontSize="$4" fontWeight="700">
              Route data received successfully
            </Text>
            <Text mt="$2" color={appColors.textSecondary} fontSize="$4">
              This screen confirms the selected route, station, and live seat count coming from the routes list.
            </Text>
          </View>
        </YStack>
      </ScrollView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 48,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 28,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceStrong,
    padding: 20,
  },
  noteCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.accentGlowSoft,
    backgroundColor: appColors.surface,
    padding: 20,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeAccent: {
    borderColor: appColors.accentGlow,
    backgroundColor: appColors.accentSoft,
  },
  badgeDanger: {
    borderColor: 'rgba(255, 111, 111, 0.4)',
    backgroundColor: 'rgba(120, 25, 25, 0.35)',
  },
});
