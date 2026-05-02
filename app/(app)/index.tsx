import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { Text, XStack, YStack } from 'tamagui';
import { getStations, type Station } from '../../src/lib/stationsApi';
import { getStationRoutes, type RouteData } from '../../src/lib/routesApi';
import { buildBookingRouteMeta, formatCurrency, formatIssuedAt } from '../../src/lib/bookingFlow';
import { resolveCentralServerUrl } from '../../src/lib/serverConfig';
import { toNetworkErrorInfo, toUserFacingErrorCopy } from '../../src/lib/networkErrors';
import { appColors } from '../../src/theme/appTheme';
import {
  useBookingStore,
  useConnectivityStore,
  useStationStore,
  type StationWithDistance,
} from '../../src/store';

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
  const router = useRouter();
  const stationSheetRef = useRef<BottomSheetModal>(null);
  const routeSheetRef = useRef<BottomSheetModal>(null);
  const stationSnapPoints = useMemo(() => ['65%', '92%'], []);
  const routeSnapPoints = useMemo(() => ['62%', '88%'], []);
  const centralServer = useMemo(() => resolveCentralServerUrl(), []);
  const serverUrl = centralServer.url;
  const isHttpServer = typeof serverUrl === 'string' && serverUrl.startsWith('http://');
  const coordsDebugRef = useRef<string>('No location yet');
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const stationsRef = useRef<Station[]>([]);
  const lastGpsUpdateAtRef = useRef<number>(0);
  const [draftStation, setDraftStation] = useState<StationWithDistance | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [stationLoadError, setStationLoadError] = useState<string | null>(null);
  const [stationRefreshTick, setStationRefreshTick] = useState(0);
  const [stationPageSize, setStationPageSize] = useState(25);
  const [routePageSize, setRoutePageSize] = useState(20);

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
  const tickets = useBookingStore((state) => state.tickets);
  const reconnectEpoch = useConnectivityStore((s) => s.reconnectEpoch);

  const { data: routeOptions, isLoading: isLoadingRoutes, isError: isRouteError, refetch: refetchRoutes } = useQuery({
    queryKey: ['booking-routes', draftStation?.id],
    queryFn: ({ signal }) => getStationRoutes(draftStation?.id ?? '', { signal }),
    enabled: !!draftStation?.id && draftStation.status === 'online',
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(8_000, 500 * 2 ** attemptIndex),
  });

  const visibleNearbyStations = useMemo(
    () => nearbyStations.slice(0, stationPageSize),
    [nearbyStations, stationPageSize],
  );

  const canLoadMoreStations = nearbyStations.length > visibleNearbyStations.length;

  const visibleRoutes = useMemo(
    () => (routeOptions ?? []).slice(0, routePageSize),
    [routeOptions, routePageSize],
  );

  const canLoadMoreRoutes = (routeOptions?.length ?? 0) > visibleRoutes.length;

  const renderStationListFooter = useCallback(() => {
    if (!canLoadMoreStations) return <View style={{ height: 18 }} />;
    return (
      <Pressable
        onPress={() => setStationPageSize((value) => Math.min(nearbyStations.length, value + 25))}
        style={({ pressed }) => [styles.loadMoreButton, pressed ? styles.buttonPressed : null]}
      >
        <Text color={appColors.textPrimary} fontSize="$3" fontWeight="800">
          Load more stations
        </Text>
      </Pressable>
    );
  }, [canLoadMoreStations, nearbyStations.length]);

  const renderRoutesListFooter = useCallback(() => {
    if (!canLoadMoreRoutes) return <View style={{ height: 18 }} />;
    return (
      <Pressable
        onPress={() => setRoutePageSize((value) => Math.min(routeOptions?.length ?? value, value + 20))}
        style={({ pressed }) => [styles.loadMoreButton, pressed ? styles.buttonPressed : null]}
      >
        <Text color={appColors.textPrimary} fontSize="$3" fontWeight="800">
          Load more routes
        </Text>
      </Pressable>
    );
  }, [canLoadMoreRoutes, routeOptions?.length]);

  useEffect(() => {
    setRoutePageSize(20);
  }, [draftStation?.id]);

  const selectedRoute = useMemo(
    () => routeOptions?.find((route) => String(route.id) === selectedRouteId) ?? null,
    [routeOptions, selectedRouteId],
  );

  const openBookingFlow = useCallback(() => {
    setDraftStation(selectedStation);
    setSelectedRouteId(null);
    setStationPageSize(25);
    stationSheetRef.current?.present();
  }, [selectedStation]);

  const openStationPicker = useCallback(() => {
    const fallback = pickDefaultStation(nearbyStations);
    setDraftStation(selectedStation ?? fallback);
    setSelectedRouteId(null);
    setStationPageSize(25);
    stationSheetRef.current?.present();
  }, [nearbyStations, selectedStation]);

  const handleSelectStation = useCallback((station: StationWithDistance) => {
    setDraftStation(station);
    setSelectedRouteId(null);
  }, []);

  const handleStationNext = useCallback(() => {
    if (!draftStation) return;
    setSelectedStation(draftStation);
    stationSheetRef.current?.dismiss();
    setRoutePageSize(20);
    setTimeout(() => routeSheetRef.current?.present(), 220);
  }, [draftStation, setSelectedStation]);

  const handleRouteNext = useCallback(() => {
    if (!draftStation || !selectedRoute || draftStation.status !== 'online') return;
    const meta = buildBookingRouteMeta(selectedRoute, draftStation.name);

    routeSheetRef.current?.dismiss();
    router.push({
      pathname: '/(app)/booking',
      params: {
        stationId: draftStation.id,
        stationName: draftStation.name,
        routeId: meta.routeId,
        routeName: meta.routeName,
        departureName: meta.departureName,
        destinationName: meta.destinationName,
        availableSeats: String(meta.availableSeats),
        pricePerSeat: String(meta.pricePerSeat),
        etdIso: meta.etdIso,
        etdLabel: meta.etdLabel,
        vehiclePlate: meta.vehiclePlate,
      },
    });
  }, [draftStation, router, selectedRoute]);

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
    const stationsAbort = new AbortController();

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
      setStationLoadError(null);

      try {
        const stations = await getStations({ signal: stationsAbort.signal });
        if (!mounted) return;

        setStations(stations);
        stationsRef.current = stations;

        watchSubscriptionRef.current?.remove();
        watchSubscriptionRef.current = null;

        if (!stations.length) {
          coordsDebugRef.current = 'No stations returned by the server';
          setStationLoadError('The server responded, but it returned no stations.');
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
              (position) => updateFromGpsCoords(position.coords.latitude, position.coords.longitude),
            );
          } catch {}
        }
      } catch (error) {
        if (!mounted) return;
        if (toNetworkErrorInfo(error).kind === 'cancelled') return;
        coordsDebugRef.current = 'Could not load stations from the server';

        const baseMessage = serverUrl
          ? `Could not load stations from ${serverUrl}.`
          : (centralServer.error ?? 'Central server URL is not configured.');
        const friendly = toUserFacingErrorCopy(error, baseMessage);

        const hints: string[] = [];
        if (Platform.OS === 'ios' && isHttpServer) {
          hints.push(
            'iOS may block plain HTTP (ATS). If this is a dev build, allow insecure loads in iOS Info.plist or switch your backend to HTTPS.',
          );
        }

        const detailSuffix = friendly.detail ? ` ${friendly.detail}` : '';
        setStationLoadError([friendly.title + detailSuffix, ...hints].filter(Boolean).join('\n'));
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
      stationsAbort.abort();
      watchSubscriptionRef.current?.remove();
      watchSubscriptionRef.current = null;
    };
  }, [
    setIsResolvingLocation,
    setLocationPermission,
    setNearbyStations,
    setSelectedStation,
    setStations,
    serverUrl,
    stationRefreshTick,
    reconnectEpoch,
    updateFromGpsCoords,
  ]);

  useEffect(() => {
    if (!draftStation && selectedStation) {
      setDraftStation(selectedStation);
    }
  }, [draftStation, selectedStation]);

  const renderStationItem = useCallback(
    ({ item }: { item: StationWithDistance }) => {
      const isSelected = draftStation?.id === item.id;
      const statusColors = getStatusColors(item.status, isSelected);

      return (
        <Pressable
          onPress={() => handleSelectStation(item)}
          testID={`station-option-${item.id}`}
          accessibilityLabel={`Station option ${item.name}`}
        >
          <YStack
            p="$4"
            mb="$2"
            borderWidth={1}
            borderColor={isSelected ? appColors.accent : appColors.border}
            bg={isSelected ? appColors.accentSoft : appColors.surface}
            rounded="$5"
          >
            <Text color={appColors.textPrimary} fontSize="$5" fontWeight="700">
              {item.name}
            </Text>
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
    [draftStation?.id, handleSelectStation],
  );

  const renderRouteItem = useCallback(
    ({ item }: { item: RouteData }) => {
      const meta = buildBookingRouteMeta(item, draftStation?.name ?? 'Depart station');
      const isSelected = selectedRouteId === String(item.id);
      const isFull = item.available_seats <= 0;

      return (
        <Pressable
          onPress={() => !isFull && setSelectedRouteId(String(item.id))}
          testID={`route-option-${String(item.id)}`}
          accessibilityLabel={`Route option ${meta.destinationName}`}
          disabled={isFull}
          style={({ pressed }) => [
            styles.routeCard,
            isSelected ? styles.routeCardSelected : null,
            isFull ? styles.routeCardDisabled : null,
            pressed && !isFull ? styles.routeCardPressed : null,
          ]}
        >
          <XStack items="center" justify="space-between" gap="$3">
            <YStack flex={1} gap="$1.5">
              <Text color={appColors.textPrimary} fontSize="$5" fontWeight="700">
                {meta.destinationName}
              </Text>
              <Text color={appColors.textSecondary} fontSize="$3">
                {meta.departureName} to {meta.destinationName}
              </Text>
            </YStack>
            <MaterialCommunityIcons
              name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
              size={22}
              color={isSelected ? appColors.accent : appColors.textMuted}
            />
          </XStack>

          <XStack mt="$3" gap="$2" flexWrap="wrap">
            <View style={[styles.badge, styles.badgeAccent]}>
              <Text color={appColors.textPrimary} fontSize="$3" fontWeight="700">
                {formatCurrency(meta.pricePerSeat)} / seat
              </Text>
            </View>
            <View style={styles.badge}>
              <Text color={appColors.textSecondary} fontSize="$3" fontWeight="700">
                ETD {meta.etdLabel}
              </Text>
            </View>
            <View style={[styles.badge, isFull ? styles.badgeDanger : null]}>
              <Text color={isFull ? '#FFD7D7' : appColors.textSecondary} fontSize="$3" fontWeight="700">
                {isFull ? 'Full' : `${item.available_seats} seats left`}
              </Text>
            </View>
          </XStack>
        </Pressable>
      );
    },
    [draftStation?.name, selectedRouteId],
  );

  const latestTickets = tickets.slice(0, 3);
  const canOpenBooking = !isResolvingLocation && nearbyStations.length > 0;
  const canContinueStation = !!draftStation;
  const canContinueRoute = !!selectedRoute && draftStation?.status === 'online';

  return (
    <BottomSheetModalProvider>
      <ScrollView
        style={{ flex: 1, backgroundColor: appColors.bg }}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
      <YStack flex={1} bg={appColors.bg} px="$5" pt="$7" pb="$6" gap="$4">
        <YStack gap="$2">
          <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.8}>
            WASLA BOOKING
          </Text>
          <Text color={appColors.textPrimary} fontSize="$10" fontWeight="800">
            Book your next ride
          </Text>
          <Text color={appColors.textSecondary} fontSize="$4">
            Pick a depart station, choose one of its available routes, then continue to seats and payment.
          </Text>
        </YStack>

        <View style={styles.heroCard}>
          <YStack gap="$4">
            <XStack items="center" justify="space-between" gap="$3">
              <YStack flex={1} gap="$1.5">
                <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.7}>
                  CURRENT DEPART STATION
                </Text>
                <Text color={appColors.textPrimary} fontSize="$7" fontWeight="800">
                  {selectedStation?.name ?? 'Choose station'}
                </Text>
                <Text color={appColors.textSecondary} fontSize="$3">
                  {selectedStation
                    ? `${formatDistance(selectedStation.distanceKm)} | ${selectedStation.status}`
                    : isResolvingLocation
                      ? 'Resolving your closest station...'
                      : 'Select a station to start booking.'}
                </Text>
              </YStack>
              <View style={styles.heroIconWrap}>
                {isResolvingLocation ? (
                  <ActivityIndicator color={appColors.accent} />
                ) : (
                  <MaterialCommunityIcons name="bus-clock" size={28} color={appColors.accent} />
                )}
              </View>
            </XStack>

            <Pressable
              disabled={!canOpenBooking}
              onPress={openBookingFlow}
              testID="start-booking"
              style={({ pressed }) => [
                styles.primaryButton,
                !canOpenBooking ? styles.buttonDisabled : null,
                pressed && canOpenBooking ? styles.buttonPressed : null,
              ]}
            >
              <XStack items="center" justify="center" gap="$2">
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color={appColors.bg} />
                <Text color={appColors.bg} fontSize="$4" fontWeight="800">
                  Start booking
                </Text>
              </XStack>
            </Pressable>

            {locationPermission !== 'granted' && nearbyStations.length > 0 && !isResolvingLocation ? (
              <Pressable
                onPress={openStationPicker}
                testID="choose-station-manual"
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <XStack items="center" justify="center" gap="$2">
                  <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={appColors.textPrimary} />
                  <Text color={appColors.textPrimary} fontSize="$4" fontWeight="800">
                    Choose station manually
                  </Text>
                </XStack>
              </Pressable>
            ) : null}

            {!canOpenBooking ? (
              <Text color={appColors.textMuted} fontSize="$3">
                {isResolvingLocation
                  ? 'Loading stations...'
                  : stationLoadError
                    ? 'Station loading failed. Check the message below and retry.'
                    : 'Booking stays disabled until at least one station is available.'}
              </Text>
            ) : null}
          </YStack>
        </View>

        {stationLoadError ? (
          <View style={styles.errorCard}>
            <Text color={appColors.textPrimary} fontSize="$4" fontWeight="700">
              Stations could not be loaded
            </Text>
            <Text mt="$2" color={appColors.textSecondary} fontSize="$3">
              {stationLoadError}
            </Text>
            {serverUrl?.includes('10.0.2.2') ? (
              <Text mt="$2" color={appColors.textMuted} fontSize="$3">
                 `10.0.2.2` works from the Android emulator only. For iOS Simulator, use `http://localhost:PORT`. For a real phone, use your computer’s local network IP.
              </Text>
            ) : null}
            {Platform.OS === 'ios' && isHttpServer ? (
              <Text mt="$2" color={appColors.textMuted} fontSize="$3">
                If you’re using a dev build, ensure iOS allows HTTP (ATS). In Expo this is configured via `ios.infoPlist.NSAppTransportSecurity` and requires rebuilding the iOS app.
              </Text>
            ) : null}
            <Pressable
              onPress={() => setStationRefreshTick((value) => value + 1)}
              style={({ pressed }) => [styles.retryButton, pressed ? styles.buttonPressed : null]}
            >
              <Text color={appColors.textPrimary} fontSize="$3" fontWeight="700">
                Retry loading stations
              </Text>
            </Pressable>
          </View>
        ) : null}

        <XStack gap="$3">
          <View style={[styles.infoCard, { flex: 1 }]}>
            <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.6}>
              STATIONS
            </Text>
            <Text mt="$2" color={appColors.textPrimary} fontSize="$7" fontWeight="800">
              {nearbyStations.length}
            </Text>
            <Text color={appColors.textSecondary} fontSize="$3">
              Available for selection
            </Text>
          </View>

          <View style={[styles.infoCard, { flex: 1 }]}>
            <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.6}>
              RECENT TICKETS
            </Text>
            <Text mt="$2" color={appColors.textPrimary} fontSize="$7" fontWeight="800">
              {tickets.length}
            </Text>
            <Text color={appColors.textSecondary} fontSize="$3">
              Created in this session
            </Text>
          </View>
        </XStack>

        <View style={styles.historyCard}>
          <XStack items="center" justify="space-between" gap="$3">
            <YStack gap="$1">
              <Text color={appColors.textPrimary} fontSize="$6" fontWeight="800">
                Booking history
              </Text>
              <Text color={appColors.textSecondary} fontSize="$3">
                Your latest paid tickets appear here for quick access.
              </Text>
            </YStack>
            <Pressable onPress={() => router.push('/(app)/history')} style={styles.historyLink}>
              <Text color={appColors.textPrimary} fontSize="$3" fontWeight="700">
                Open
              </Text>
            </Pressable>
          </XStack>

          <YStack mt="$4" gap="$3">
            {latestTickets.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text color={appColors.textSecondary} fontSize="$4" style={{ textAlign: 'center' }}>
                  No tickets yet. Complete a booking and your ticket will show here.
                </Text>
              </View>
            ) : latestTickets.map((ticket) => (
              <Pressable
                key={ticket.id}
                onPress={() => router.push({ pathname: '/(app)/ticket', params: { ticketId: ticket.id } })}
                style={({ pressed }) => [styles.historyRow, pressed ? styles.buttonPressed : null]}
              >
                <YStack flex={1} gap="$1">
                  <Text color={appColors.textPrimary} fontSize="$4" fontWeight="700">
                    {ticket.departureName} to {ticket.destinationName}
                  </Text>
                  <Text color={appColors.textSecondary} fontSize="$3">
                    {ticket.seatCount} seat{ticket.seatCount > 1 ? 's' : ''} | {formatCurrency(ticket.totalPrice)}
                  </Text>
                </YStack>
                <Text color={appColors.textMuted} fontSize="$2">
                  {formatIssuedAt(ticket.issuedAt)}
                </Text>
              </Pressable>
            ))}
          </YStack>
        </View>

        <BottomSheetModal
          ref={stationSheetRef}
          index={0}
          snapPoints={stationSnapPoints}
          enableDynamicSizing={false}
          backgroundStyle={{ backgroundColor: appColors.surfaceStrong }}
          handleIndicatorStyle={{ backgroundColor: appColors.borderStrong }}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
          )}
        >
          <YStack flex={1} px="$4" pt="$2" pb="$5">
            <Text color={appColors.textPrimary} fontSize="$7" fontWeight="800">
              Confirm depart station
            </Text>
            <Text mt="$1" color={appColors.textSecondary} fontSize="$4">
              Start from your assigned station, or switch it before choosing the route.
            </Text>
            <Text mt="$2" mb="$3" color={appColors.textMuted} fontSize="$2">
              {coordsDebugRef.current}
            </Text>

            <BottomSheetFlatList<StationWithDistance>
              data={visibleNearbyStations}
              keyExtractor={(item: StationWithDistance) => item.id}
              renderItem={renderStationItem}
              contentContainerStyle={{ paddingBottom: 112 }}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={renderStationListFooter}
              ListEmptyComponent={
                isResolvingLocation ? (
                  <View style={{ paddingTop: 12, paddingBottom: 80, gap: 12 }}>
                    {[0, 1, 2, 3].map((index) => (
                      <View key={index} style={styles.skeletonCard} />
                    ))}
                  </View>
                ) : (
                  <View style={styles.centerState}>
                    <Text color={appColors.textSecondary} fontSize="$4" style={styles.centeredText}>
                      No stations available yet.
                    </Text>
                  </View>
                )
              }
            />

            <Pressable
              disabled={!canContinueStation}
              onPress={handleStationNext}
              testID="station-next"
              style={({ pressed }) => [
                styles.sheetButton,
                !canContinueStation ? styles.buttonDisabled : null,
                pressed && canContinueStation ? styles.buttonPressed : null,
              ]}
            >
              <Text color={appColors.bg} fontSize="$4" fontWeight="800">
                Next
              </Text>
            </Pressable>
          </YStack>
        </BottomSheetModal>

        <BottomSheetModal
          ref={routeSheetRef}
          index={0}
          snapPoints={routeSnapPoints}
          enableDynamicSizing={false}
          backgroundStyle={{ backgroundColor: appColors.surfaceStrong }}
          handleIndicatorStyle={{ backgroundColor: appColors.borderStrong }}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
          )}
        >
          <YStack flex={1} px="$4" pt="$2" pb="$5">
            <Text color={appColors.textPrimary} fontSize="$7" fontWeight="800">
              Select your destination
            </Text>
            <Text mt="$1" color={appColors.textSecondary} fontSize="$4">
              Showing available routes from {draftStation?.name ?? 'the selected station'}.
            </Text>

            {draftStation?.status === 'offline' ? (
              <View style={styles.centerState}>
                <Text color={appColors.textPrimary} fontSize="$5" fontWeight="700" style={styles.centeredText}>
                  This station is offline right now.
                </Text>
                <Text color={appColors.textSecondary} fontSize="$4" style={styles.centeredText}>
                  Go back and pick an online station to continue.
                </Text>
              </View>
            ) : isLoadingRoutes ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={appColors.accent} />
                <Text color={appColors.textSecondary} fontSize="$4">
                  Loading available routes...
                </Text>
              </View>
            ) : isRouteError ? (
              <View style={styles.centerState}>
                <Text color={appColors.textPrimary} fontSize="$4" style={styles.centeredText}>
                  Could not load routes for this station.
                </Text>
                <Pressable onPress={() => void refetchRoutes()} style={styles.historyLink}>
                  <Text color={appColors.textPrimary} fontSize="$3" fontWeight="700">
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : (
              <BottomSheetFlatList<RouteData>
                data={visibleRoutes}
                keyExtractor={(item: RouteData) => String(item.id)}
                renderItem={renderRouteItem}
                contentContainerStyle={{ paddingVertical: 16, paddingBottom: 112, gap: 12 }}
                ListEmptyComponent={
                  <View style={styles.centerState}>
                    <Text color={appColors.textSecondary} fontSize="$4" style={styles.centeredText}>
                      No routes are available right now for this depart station.
                    </Text>
                  </View>
                }
                showsVerticalScrollIndicator={false}
                ListFooterComponent={renderRoutesListFooter}
              />
            )}

            <Pressable
              disabled={!canContinueRoute}
              onPress={handleRouteNext}
              testID="route-next"
              style={({ pressed }) => [
                styles.sheetButton,
                !canContinueRoute ? styles.buttonDisabled : null,
                pressed && canContinueRoute ? styles.buttonPressed : null,
              ]}
            >
              <Text color={appColors.bg} fontSize="$4" fontWeight="800">
                Next
              </Text>
            </Pressable>
          </YStack>
        </BottomSheetModal>
      </YStack>
      </ScrollView>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: appColors.accentGlowSoft,
    backgroundColor: appColors.surfaceStrong,
    padding: 22,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.accentGlow,
    backgroundColor: appColors.accentSoft,
  },
  screenContent: {
    paddingBottom: 130,
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: appColors.accent,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  secondaryButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  errorCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 111, 111, 0.28)',
    backgroundColor: 'rgba(86, 24, 24, 0.38)',
    padding: 18,
  },
  infoCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surface,
    padding: 18,
  },
  historyCard: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceStrong,
    padding: 20,
  },
  historyLink: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyHistory: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surface,
    padding: 20,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surface,
    padding: 18,
  },
  routeCardSelected: {
    borderColor: appColors.accentGlow,
    backgroundColor: appColors.accentSoft,
  },
  routeCardDisabled: {
    opacity: 0.55,
  },
  routeCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
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
  retryButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loadMoreButton: {
    marginTop: 14,
    marginBottom: 16,
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sheetButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    borderRadius: 18,
    backgroundColor: appColors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  centeredText: {
    textAlign: 'center',
  },
  skeletonCard: {
    height: 86,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surface,
    opacity: 0.65,
  },
});
