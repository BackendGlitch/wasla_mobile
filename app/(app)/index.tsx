import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable } from 'react-native';
import * as Location from 'expo-location';
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { XStack, YStack, Text } from 'tamagui';
import { getStations, type Station } from '../../src/lib/stationsApi';
import { appColors } from '../../src/theme/appTheme';
import { useStationStore, type StationWithDistance } from '../../src/store';

import { RoutesList } from '../../src/components/RoutesList';
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
const MAX_DISTANCE_KM = 999;

function hasStationCoordinates(
  station: Station,
): station is Station & { lat: number; lng: number } {
  return typeof station.lat === 'number' && Number.isFinite(station.lat) &&
    typeof station.lng === 'number' && Number.isFinite(station.lng);
}

function sortStations(a: StationWithDistance, b: StationWithDistance): number {
  if (a.status !== b.status) return a.status === 'online' ? -1 : 1;
  if (a.distanceKm === null && b.distanceKm !== null) return 1;
  if (a.distanceKm !== null && b.distanceKm === null) return -1;
  if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
    return a.distanceKm - b.distanceKm;
  }
  return a.name.localeCompare(b.name);
}

function pickDefaultStation(stations: StationWithDistance[]): StationWithDistance | null {
  return stations.find((station) => station.status === 'online') ?? stations[0] ?? null;
}

function normalizeCoordinate(value: number, maxAbs: number): number | null {
  if (!Number.isFinite(value)) return null;
  let normalized = value;
  while (Math.abs(normalized) > maxAbs && Math.abs(normalized) > 1) {
    normalized /= 10;
  }
  if (Math.abs(normalized) > maxAbs) return null;
  return normalized;
}

function sanitizeCoords(latitude: number, longitude: number) {
  const safeLat = normalizeCoordinate(latitude, 90);
  const safeLng = normalizeCoordinate(longitude, 180);
  if (safeLat === null || safeLng === null) return null;
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

function toNearbyStations(
  stations: Station[],
  coords?: { latitude: number; longitude: number } | null,
): StationWithDistance[] {
  return stations
    .map((station) => ({
      ...station,
      distanceKm: coords && hasStationCoordinates(station)
        ? Math.min(
            MAX_DISTANCE_KM,
            haversineDistance(
              coords.latitude,
              coords.longitude,
              station.lat,
              station.lng,
            ),
          )
        : null,
    }))
    .sort(sortStations);
}

function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null) return 'Coordinates unavailable';
  const clampedDistance = Math.min(MAX_DISTANCE_KM, Math.max(0, distanceKm));
  if (clampedDistance < 1) return `${Math.round(clampedDistance * 1000)} m away`;
  if (clampedDistance >= MAX_DISTANCE_KM) return `${MAX_DISTANCE_KM} km away`;
  return `${clampedDistance.toFixed(1)} km away`;
}

function getStatusColors(status: Station['status'], isSelected: boolean) {
  if (status === 'online') {
    return {
      bg: isSelected ? 'rgba(11, 43, 22, 0.9)' : 'rgba(38, 87, 55, 0.35)',
      border: 'rgba(120, 230, 150, 0.28)',
      text: '#C8FFD6',
    };
  }

  return {
    bg: isSelected ? 'rgba(74, 21, 21, 0.92)' : 'rgba(110, 36, 36, 0.36)',
    border: 'rgba(255, 130, 130, 0.22)',
    text: '#FFD4D4',
  };
}

export default function MainScreen() {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['55%', '80%', '96%'], []);
  const coordsDebugRef = useRef<string>('No location yet');
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const stationsRef = useRef<Station[]>([]);
  const lastGpsUpdateAtRef = useRef<number>(0);
  const [stationDetailsVisible, setStationDetailsVisible] = useState(false);

  const {
    selectedStation,
    nearbyStations,
    isResolvingLocation,
    setStations,
    setNearbyStations,
    setSelectedStation,
    setIsResolvingLocation,
    setLocationPermission,
  } = useStationStore();

  const handleOpenSheet = useCallback(() => {
    setStationDetailsVisible(false);
    sheetRef.current?.present();
  }, []);

  const handleSelectStation = useCallback(
    (station: StationWithDistance) => {
      setSelectedStation(station);
      setStationDetailsVisible(false);
      sheetRef.current?.dismiss();
    },
    [setSelectedStation],
  );

  const handleStationPress = useCallback(() => {
    if (isResolvingLocation || nearbyStations.length === 0) return;
    if (!selectedStation) {
      handleOpenSheet();
      return;
    }
    if (!stationDetailsVisible) {
      setStationDetailsVisible(true);
      return;
    }
    handleOpenSheet();
  }, [
    handleOpenSheet,
    isResolvingLocation,
    nearbyStations.length,
    selectedStation,
    stationDetailsVisible,
  ]);

  const updateFromGpsCoords = useCallback(
    (latitude: number, longitude: number) => {
      const now = Date.now();
      if (now - lastGpsUpdateAtRef.current < 2000) return;
      lastGpsUpdateAtRef.current = now;

      const safeCoords = sanitizeCoords(latitude, longitude);
      if (!safeCoords) return;
      coordsDebugRef.current = `Live GPS: ${safeCoords.latitude.toFixed(6)}, ${safeCoords.longitude.toFixed(6)}`;

      const stations = stationsRef.current;
      if (!stations.length) return;

      const rankedStations = toNearbyStations(stations, safeCoords);
      const nextStation =
        rankedStations.find((station) => station.status === 'online' && station.distanceKm !== null) ??
        rankedStations.find((station) => station.distanceKm !== null) ??
        pickDefaultStation(rankedStations);

      setNearbyStations(rankedStations);
      setSelectedStation(nextStation);
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
        const safeCoords = sanitizeCoords(livePosition.coords.latitude, livePosition.coords.longitude);
        if (!safeCoords) throw new Error('Invalid coordinates');
        return safeCoords;
      } catch {
        const retryPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        });
        const safeCoords = sanitizeCoords(retryPosition.coords.latitude, retryPosition.coords.longitude);
        if (!safeCoords) throw new Error('Invalid coordinates');
        return safeCoords;
      }
    };

    const initializeStationSelection = async () => {
      setIsResolvingLocation(true);

      try {
        const stations = await getStations();
        if (!mounted) return;

        setStations(stations);
        stationsRef.current = stations;

        watchSubscriptionRef.current?.remove();
        watchSubscriptionRef.current = null;

        if (!stations.length) {
          coordsDebugRef.current = 'No stations returned by the server';
          setNearbyStations([]);
          setSelectedStation(null);
          setLocationPermission('undetermined');
          return;
        }

        const hasGeolocatableStations = stations.some(hasStationCoordinates);
        if (!hasGeolocatableStations) {
          const rankedStations = toNearbyStations(stations);
          coordsDebugRef.current = 'Server stations do not expose coordinates yet';
          setLocationPermission('undetermined');
          setNearbyStations(rankedStations);
          setSelectedStation(pickDefaultStation(rankedStations));
          if (stations.length > 1) sheetRef.current?.present();
          return;
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;

        let userCoords: { latitude: number; longitude: number } | null = null;

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
            if (lastKnown && Date.now() - lastKnown.timestamp <= LAST_KNOWN_MAX_AGE_MS) {
              const lastKnownCoords = sanitizeCoords(lastKnown.coords.latitude, lastKnown.coords.longitude);
              if (lastKnownCoords) {
                userCoords = lastKnownCoords;
                coordsDebugRef.current = `Last known: ${lastKnownCoords.latitude.toFixed(6)}, ${lastKnownCoords.longitude.toFixed(6)}`;
              } else {
                coordsDebugRef.current = 'No usable device coordinates available';
              }
            } else {
              coordsDebugRef.current = 'No usable device coordinates available';
            }
          }
        } else {
          setLocationPermission('denied');
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (!mounted) return;
          if (lastKnown) {
            const lastKnownCoords = sanitizeCoords(lastKnown.coords.latitude, lastKnown.coords.longitude);
            if (lastKnownCoords) {
              userCoords = lastKnownCoords;
              coordsDebugRef.current = `Permission denied, last known: ${lastKnownCoords.latitude.toFixed(6)}, ${lastKnownCoords.longitude.toFixed(6)}`;
            } else {
              coordsDebugRef.current = 'Permission denied, no last known location available';
            }
          } else {
            coordsDebugRef.current = 'Permission denied, no last known location available';
          }
        }

        const rankedStations = toNearbyStations(stations, userCoords);
        const nextStation =
          rankedStations.find((station) => station.status === 'online' && station.distanceKm !== null) ??
          rankedStations.find((station) => station.distanceKm !== null) ??
          pickDefaultStation(rankedStations);

        setNearbyStations(rankedStations);
        setSelectedStation(nextStation);

        if (permission.status === 'granted') {
          try {
            watchSubscriptionRef.current = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 25 },
              (position) => updateFromGpsCoords(position.coords.latitude, position.coords.longitude)
            );
          } catch {}
        } else {
          sheetRef.current?.present();
        }
      } catch {
        if (!mounted) return;
        coordsDebugRef.current = 'Could not load stations from the server';
        setLocationPermission('undetermined');
        setNearbyStations([]);
        setSelectedStation(null);
      } finally {
        if (mounted) setIsResolvingLocation(false);
      }
    };

    void initializeStationSelection();

    return () => {
      mounted = false;
      watchSubscriptionRef.current?.remove();
      watchSubscriptionRef.current = null;
    };
  }, [setIsResolvingLocation, setLocationPermission, setNearbyStations, setSelectedStation, setStations, updateFromGpsCoords]);

  useEffect(() => {
    setStationDetailsVisible(false);
  }, [selectedStation?.id]);

  const renderStationItem = useCallback(
    ({ item }: { item: StationWithDistance }) => {
      const isSelected = selectedStation?.id === item.id;
      const statusColors = getStatusColors(item.status, isSelected);
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
            <Text color={appColors.textPrimary} fontSize="$5" fontWeight="700">{item.name}</Text>
            <XStack mt="$3" gap="$2" items="center" flexWrap="wrap">
              <YStack
                px="$2.5"
                py="$1"
                rounded="$10"
                borderWidth={1}
                style={{ borderColor: statusColors.border, backgroundColor: statusColors.bg }}
              >
                <Text style={{ color: statusColors.text }} fontSize="$2" fontWeight="700">
                  {item.status === 'online' ? 'Online' : 'Offline'}
                </Text>
              </YStack>
              <Text color={isSelected ? appColors.accent : appColors.textMuted} fontSize="$3">
                {formatDistance(item.distanceKm)}
              </Text>
            </XStack>
          </YStack>
        </Pressable>
      );
    },
    [handleSelectStation, selectedStation?.id],
  );

  const selectedStatusColors = selectedStation
    ? getStatusColors(selectedStation.status, false)
    : null;

  return (
    <BottomSheetModalProvider>
      <YStack flex={1} bg={appColors.bg} px="$5" pt="$7" pb="$5" gap="$5">

        <YStack items="center" gap="$3">
          <Pressable
            onPress={handleStationPress}
            disabled={isResolvingLocation || nearbyStations.length === 0}
            style={({ pressed }) => ({
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
          >
            <XStack
              items="center"
              gap="$2.5"
              px="$4"
              py="$2.5"
              rounded="$10"
              borderWidth={1}
              borderColor={appColors.borderStrong}
              bg={appColors.surfaceGlass}
              shadowColor={appColors.tabShadow}
              shadowOpacity={0.35}
              shadowRadius={18}
              shadowOffset={{ width: 0, height: 10 }}
              elevation={8}
            >
              {isResolvingLocation ? (
                <>
                  <ActivityIndicator color={appColors.accent} />
                  <Text color={appColors.textPrimary} fontWeight="700" fontSize="$3">
                    Loading stations...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="map-marker-radius" size={18} color={appColors.accent} />
                  <Text color={appColors.textPrimary} fontWeight="700" fontSize="$3">
                    {selectedStation?.name ?? 'Choose station'}
                  </Text>
                  <MaterialCommunityIcons
                    name={stationDetailsVisible ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={appColors.textMuted}
                  />
                </>
              )}
            </XStack>
          </Pressable>

          {stationDetailsVisible && selectedStation ? (
            <YStack
              width="100%"
              bg={appColors.surfaceStrong}
              borderWidth={1}
              borderColor={appColors.border}
              rounded="$6"
              px="$4"
              py="$3"
              gap="$3"
            >
              <XStack items="center" justify="space-between" gap="$3" flexWrap="wrap">
                <YStack
                  px="$2.5"
                  py="$1"
                  rounded="$10"
                  borderWidth={1}
                  style={{
                    borderColor: selectedStatusColors?.border,
                    backgroundColor: selectedStatusColors?.bg,
                  }}
                >
                  <Text style={{ color: selectedStatusColors?.text }} fontSize="$2" fontWeight="700">
                    {selectedStation.status === 'online' ? 'Online' : 'Offline'}
                  </Text>
                </YStack>
                <Text color={appColors.textSecondary} fontSize="$3" fontWeight="600">
                  {formatDistance(selectedStation.distanceKm)}
                </Text>
              </XStack>

              <Text color={appColors.textSecondary} fontSize="$3">
                {selectedStation.status === 'online'
                  ? 'Tap the capsule again to switch stations.'
                  : 'This station is offline. Tap the capsule again to switch stations.'}
              </Text>
              <Text color={appColors.textMuted} fontSize="$2">
                {coordsDebugRef.current}
              </Text>
            </YStack>
          ) : null}
        </YStack>

        {/* 👇 2. YOUR ROUTES LIST COMPONENT GOES HERE */}
        <YStack flex={1}>
          {selectedStation?.status === 'offline' ? (
            <YStack flex={1} justify="center" items="center" gap="$3">
              <Text color={appColors.textPrimary} fontSize="$5" fontWeight="700" style={{ textAlign: 'center', maxWidth: 320 }}>
                {selectedStation.name} is offline right now
              </Text>
              <Text color={appColors.textSecondary} fontSize="$4" style={{ textAlign: 'center', maxWidth: 320 }}>
                Pick an online station to load routes.
              </Text>
            </YStack>
          ) : selectedStation ? (
            <RoutesList stationId={selectedStation.id} />
          ) : (
            <YStack flex={1} justify="center" items="center" gap="$3">
              <Text color={appColors.textSecondary} fontSize="$4" style={{ textAlign: 'center', maxWidth: 280 }}>
                {isResolvingLocation
                  ? 'Loading stations from the server...'
                  : nearbyStations.length === 0
                    ? 'No stations are available right now.'
                    : 'Please select a station to see available routes.'}
              </Text>
            </YStack>
          )}
        </YStack>

        {/* BOTTOM SHEET FOR CHANGING STATIONS */}
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
            <Text color={appColors.textPrimary} fontSize="$7" fontWeight="800">Stations</Text>
            <Text mt="$1" mb="$4" color={appColors.textSecondary} fontSize="$4">Select the station you want to use as your departure point.</Text>
            <Text mb="$3" color={appColors.textMuted} fontSize="$2">{coordsDebugRef.current}</Text>

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
