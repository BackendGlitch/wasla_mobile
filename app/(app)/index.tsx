import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import * as Location from 'expo-location';
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { XStack, YStack, Text } from 'tamagui';
import { mockApi } from '../../src/lib';
import type { Station } from '../../src/lib/mockData';
import { appColors } from '../../src/theme/appTheme';
import { useStationStore, type StationWithDistance } from '../../src/store';

const DEFAULT_USER_COORDS = {
  latitude: 36.8065,
  longitude: 10.1815,
};
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
const MAX_DISTANCE_KM = 999;

function normalizeCoordinate(value: number, maxAbs: number): number | null {
  if (!Number.isFinite(value)) return null;

  let normalized = value;

  // Some providers can occasionally return scaled coordinates; normalize to degree-like values.
  while (Math.abs(normalized) > maxAbs && Math.abs(normalized) > 1) {
    normalized /= 10;
  }

  if (Math.abs(normalized) > maxAbs) return null;

  return normalized;
}

function sanitizeCoords(latitude: number, longitude: number) {
  const safeLat = normalizeCoordinate(latitude, 90);
  const safeLng = normalizeCoordinate(longitude, 180);

  if (safeLat === null || safeLng === null) {
    return DEFAULT_USER_COORDS;
  }

  return {
    latitude: safeLat,
    longitude: safeLng,
  };
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toNearbyStations(stations: Station[], latitude: number, longitude: number): StationWithDistance[] {
  const safeUserCoords = sanitizeCoords(latitude, longitude);

  return stations
    .map((station) => ({
      ...station,
      rawDistanceKm: haversineDistance(
        safeUserCoords.latitude,
        safeUserCoords.longitude,
        station.lat,
        station.lng,
      ),
    }))
    .sort((a, b) => a.rawDistanceKm - b.rawDistanceKm)
    .map(({ rawDistanceKm, ...station }) => ({
      ...station,
      distanceKm: Math.min(MAX_DISTANCE_KM, rawDistanceKm),
    }))
}

function formatDistance(distanceKm: number): string {
  const clampedDistance = Math.min(MAX_DISTANCE_KM, Math.max(0, distanceKm));

  if (clampedDistance < 1) return `${Math.round(clampedDistance * 1000)} m away`;
  if (clampedDistance >= MAX_DISTANCE_KM) return `${MAX_DISTANCE_KM} km away`;
  return `${clampedDistance.toFixed(1)} km away`;
}

export default function MainScreen() {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['55%', '80%', '96%'], []);
  const coordsDebugRef = useRef<string>('No location yet');
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const stationsRef = useRef<Station[]>([]);
  const lastGpsUpdateAtRef = useRef<number>(0);

  const {
    selectedStation,
    nearbyStations,
    isResolvingLocation,
    locationPermission,
    setStations,
    setNearbyStations,
    setSelectedStation,
    setIsResolvingLocation,
    setLocationPermission,
  } = useStationStore();

  const handleOpenSheet = useCallback(() => {
    sheetRef.current?.present();
  }, []);

  const handleSelectStation = useCallback(
    (station: StationWithDistance) => {
      setSelectedStation(station);
      sheetRef.current?.dismiss();
    },
    [setSelectedStation],
  );

  const updateFromGpsCoords = useCallback(
    (latitude: number, longitude: number) => {
      // Simple throttle to prevent excessive re-renders.
      const now = Date.now();
      if (now - lastGpsUpdateAtRef.current < 2000) return;
      lastGpsUpdateAtRef.current = now;

      const safeCoords = sanitizeCoords(latitude, longitude);
      coordsDebugRef.current = `Live GPS: ${safeCoords.latitude.toFixed(6)}, ${safeCoords.longitude.toFixed(6)}`;

      const stations = stationsRef.current;
      if (!stations.length) return;

      const rankedStations = toNearbyStations(stations, safeCoords.latitude, safeCoords.longitude);
      setNearbyStations(rankedStations);

      // Real-time destination: always override to the nearest station.
      setSelectedStation(rankedStations[0] ?? null);
    },
    [setNearbyStations, setSelectedStation],
  );

  useEffect(() => {
    let mounted = true;

    const resolveLiveCoords = async () => {
      try {
        const livePosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
          mayShowUserSettingsDialog: true,
        });

        return sanitizeCoords(livePosition.coords.latitude, livePosition.coords.longitude);
      } catch {
        // Retry once to avoid transient GPS failures.
        const retryPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        });

        return sanitizeCoords(retryPosition.coords.latitude, retryPosition.coords.longitude);
      }
    };

    const initializeStationSelection = async () => {
      setIsResolvingLocation(true);
      let fetchedStations: Station[] = [];

      try {
        const stations = await mockApi.getStations();
        if (!mounted) return;
        fetchedStations = stations;

        setStations(stations);
        stationsRef.current = stations;

        // Stop any previous watch subscription before starting a new one.
        watchSubscriptionRef.current?.remove();
        watchSubscriptionRef.current = null;

        const permission = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;

        let userCoords = DEFAULT_USER_COORDS;

        if (permission.status === 'granted') {
          setLocationPermission('granted');

          try {
            const coords = await resolveLiveCoords();
            if (!mounted) return;

            userCoords = coords;
            coordsDebugRef.current = `Live GPS: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
          } catch {
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (!mounted) return;

            if (
              lastKnown &&
              Date.now() - lastKnown.timestamp <= LAST_KNOWN_MAX_AGE_MS
            ) {
              const lastKnownCoords = sanitizeCoords(lastKnown.coords.latitude, lastKnown.coords.longitude);

              userCoords = lastKnownCoords;
              coordsDebugRef.current = `Last known: ${lastKnownCoords.latitude.toFixed(6)}, ${lastKnownCoords.longitude.toFixed(6)}`;
            } else {
              coordsDebugRef.current = 'Fallback default coords';
            }
          }
        } else {
          setLocationPermission('denied');

          const lastKnown = await Location.getLastKnownPositionAsync();
          if (!mounted) return;

          if (lastKnown) {
            const lastKnownCoords = sanitizeCoords(lastKnown.coords.latitude, lastKnown.coords.longitude);

            userCoords = lastKnownCoords;
            coordsDebugRef.current = `Permission denied, last known: ${lastKnownCoords.latitude.toFixed(6)}, ${lastKnownCoords.longitude.toFixed(6)}`;
          } else {
            coordsDebugRef.current = 'Permission denied, fallback default coords';
          }
        }

        const rankedStations = toNearbyStations(
          stations,
          userCoords.latitude,
          userCoords.longitude,
        );

        setNearbyStations(rankedStations);
        setSelectedStation(rankedStations[0] ?? null);

        // Start real-time updates only when we have permission.
        if (permission.status === 'granted') {
          try {
            watchSubscriptionRef.current = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 5000,
                distanceInterval: 25,
              },
              (position) => {
                updateFromGpsCoords(position.coords.latitude, position.coords.longitude);
              },
            );
          } catch {
            // Watching can fail on some devices; initial nearest station is still shown.
          }
        } else {
          // When permission is denied, show station picker immediately.
          sheetRef.current?.present();
        }
      } catch {
        if (!mounted) return;

        const fallbackStations = toNearbyStations(
          fetchedStations,
          DEFAULT_USER_COORDS.latitude,
          DEFAULT_USER_COORDS.longitude,
        );
        setLocationPermission('denied');
        setNearbyStations(fallbackStations);
        setSelectedStation(fallbackStations[0] ?? null);
        sheetRef.current?.present();
      } finally {
        if (mounted) {
          setIsResolvingLocation(false);
        }
      }
    };

    void initializeStationSelection();

    return () => {
      mounted = false;
      watchSubscriptionRef.current?.remove();
      watchSubscriptionRef.current = null;
    };
  }, [
    setIsResolvingLocation,
    setLocationPermission,
    setNearbyStations,
    setSelectedStation,
    setStations,
    updateFromGpsCoords,
  ]);

  const renderStationItem = useCallback(
    ({ item }: { item: StationWithDistance }) => {
      const isSelected = selectedStation?.id === item.id;

      return (
        <Pressable onPress={() => handleSelectStation(item)}>
          <YStack
            p="$4"
            mb="$2"
            borderWidth={1}
            borderColor={isSelected ? appColors.accent : appColors.border}
            bg={isSelected ? appColors.accentSoft : appColors.surface}
            rounded="$4"
          >
            <Text color={appColors.textPrimary} fontSize="$5" fontWeight="700">
              {item.name}
            </Text>
            <Text mt="$1" color={appColors.textSecondary} fontSize="$4">
              {item.city}
            </Text>
            <Text mt="$2" color={isSelected ? appColors.accent : appColors.textMuted} fontSize="$3">
              {formatDistance(item.distanceKm)}
            </Text>
          </YStack>
        </Pressable>
      );
    },
    [handleSelectStation, selectedStation?.id],
  );

  return (
    <BottomSheetModalProvider>
      <YStack flex={1} bg={appColors.bg} px="$5" pt="$7" pb="$5" gap="$5">
        <Pressable
          onPress={handleOpenSheet}
          disabled={isResolvingLocation || nearbyStations.length === 0}
          style={{ opacity: isResolvingLocation ? 1 : 0.98 }}
        >
          <XStack
            items="center"
            justify="space-between"
            px="$4"
            py="$3"
            rounded="$5"
            borderWidth={1}
            borderColor={appColors.borderStrong}
            bg={appColors.surfaceStrong}
          >
            {isResolvingLocation ? (
              <XStack items="center" gap="$3">
                <ActivityIndicator color={appColors.accent} />
                <Text color={appColors.textPrimary} fontWeight="700" fontSize="$4">
                  Detecting nearest station...
                </Text>
              </XStack>
            ) : (
              <YStack flex={1}>
                <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.4}>
                  ASSIGNED STATION
                </Text>
                <Text mt="$1" color={appColors.textPrimary} fontSize="$5" fontWeight="700">
                  {selectedStation?.name ?? 'No station assigned'}
                </Text>
                <Text mt="$1" color={appColors.accent} fontSize="$3" fontWeight="600">
                  {selectedStation
                    ? `${formatDistance(selectedStation.distanceKm)} • Tap to change`
                    : 'Tap to pick a station'}
                </Text>
              </YStack>
            )}
          </XStack>
        </Pressable>

        <YStack flex={1} justify="center" items="center" gap="$3">
          <Text color={appColors.textPrimary} fontSize="$9" fontWeight="800">
            Main
          </Text>
          <Text color={appColors.textSecondary} fontSize="$4" style={{ textAlign: 'center', maxWidth: 280 }}>
            {locationPermission === 'denied'
              ? 'Location is disabled. Choose your departure station manually from the station list.'
              : 'Your nearest station is ready. Tap the station bar at the top to switch anytime.'}
          </Text>
        </YStack>

        <BottomSheetModal
          ref={sheetRef}
          index={1}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          backgroundStyle={{ backgroundColor: appColors.surfaceStrong }}
          handleIndicatorStyle={{ backgroundColor: appColors.borderStrong }}
          backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
        >
          <YStack flex={1} px="$4" pt="$2" pb="$4">
            <Text color={appColors.textPrimary} fontSize="$7" fontWeight="800">
              Nearby Stations
            </Text>
            <Text mt="$1" mb="$4" color={appColors.textSecondary} fontSize="$4">
              Select the station you want to use as your departure point.
            </Text>
            <Text mb="$3" color={appColors.textMuted} fontSize="$2">
              {coordsDebugRef.current}
            </Text>

            <BottomSheetFlatList<StationWithDistance>
              data={nearbyStations}
              keyExtractor={(item: StationWithDistance) => item.id}
              renderItem={renderStationItem}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 96 }}
              scrollEnabled
              nestedScrollEnabled
              decelerationRate="fast"
              showsVerticalScrollIndicator
            />
          </YStack>
        </BottomSheetModal>
      </YStack>
    </BottomSheetModalProvider>
  );
}
