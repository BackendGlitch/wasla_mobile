import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { DestinationQueueRow } from '../../src/components/booking/DestinationQueueRow';
import { BrandLogo } from '../../src/components/BrandLogo';
import { buildBookingRouteMeta, formatCurrency, formatIssuedAt } from '../../src/lib/bookingFlow';
import { resolveCentralServerUrl } from '../../src/lib/serverConfig';
import { toNetworkErrorInfo, toUserFacingErrorCopy } from '../../src/lib/networkErrors';
import { appColors } from '../../src/theme/appTheme';
import {
  useBookingRoutesLiveStore,
  useBookingStore,
  useConnectivityStore,
  useRealtimeStore,
  useStationStore,
  type StationWithDistance,
} from '../../src/store';

const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
const MAX_DISTANCE_KM = 999;

/** Match `(app)/_layout.tsx` — restored when booking sheets dismiss */
const MAIN_TAB_BAR_STYLE = {
  position: 'absolute' as const,
  backgroundColor: 'transparent',
  borderTopWidth: 0,
};
const SHEET_HIDDEN_TAB_BAR_STYLE = {
  ...MAIN_TAB_BAR_STYLE,
  height: 0,
  opacity: 0,
  overflow: 'hidden' as const,
};

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

/** Human-readable km/m from user → station when both have coordinates; otherwise null */
function formatKmAway(distanceKm: number | null): string | null {
  if (distanceKm === null) return null;
  const clampedDistance = Math.min(MAX_DISTANCE_KM, Math.max(0, distanceKm));
  if (clampedDistance < 1) return `${Math.round(clampedDistance * 1000)} m away`;
  if (clampedDistance >= MAX_DISTANCE_KM) return `${MAX_DISTANCE_KM}+ km away`;
  return `${clampedDistance.toFixed(1)} km away`;
}

function formatStatusWord(status: Station['status']) {
  return status === 'online' ? 'Online' : 'Offline';
}

/** One line under the station title on the main card */
function stationCardSubtitle(station: StationWithDistance): string {
  const away = formatKmAway(station.distanceKm);
  const statusWord = formatStatusWord(station.status);
  return away ? `${away} · ${statusWord}` : statusWord;
}

function getStatusColors(status: Station['status'], isSelected: boolean) {
  if (status === 'online') {
    return {
      bg: isSelected ? 'rgba(34, 197, 94, 0.16)' : 'rgba(34, 197, 94, 0.08)',
      border: 'rgba(34, 197, 94, 0.22)',
      text: '#BBF7D0',
    };
  }

  return {
    bg: isSelected ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.22)',
    text: '#FECACA',
  };
}

export default function MainScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const stationSheetRef = useRef<BottomSheetModal>(null);
  /** Gorhom modal snap index -1 closed; synced to hide glossy tab bar so Next isn’t overlapped */
  const stationSnapIndexRef = useRef(-1);
  const tabBarSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routesAbortRef = useRef<AbortController | null>(null);
  const stationSnapPoints = useMemo(() => ['68%', '93%'], []);
  type BookingSheetStep = 'station' | 'routes';
  const [bookingSheetStep, setBookingSheetStep] = useState<BookingSheetStep>('station');
  const [fetchedRoutes, setFetchedRoutes] = useState<RouteData[] | null>(null);
  const [routesFetchLoading, setRoutesFetchLoading] = useState(false);
  const [routesFetchError, setRoutesFetchError] = useState<string | null>(null);
  const centralServer = useMemo(() => resolveCentralServerUrl(), []);
  const serverUrl = centralServer.url;
  const isHttpServer = typeof serverUrl === 'string' && serverUrl.startsWith('http://');
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const stationsRef = useRef<Station[]>([]);
  const lastGpsUpdateAtRef = useRef<number>(0);
  const [draftStation, setDraftStation] = useState<StationWithDistance | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [stationLoadError, setStationLoadError] = useState<string | null>(null);
  const [stationPageSize, setStationPageSize] = useState(25);
  const [routePageSize, setRoutePageSize] = useState(20);
  /** Location / station-list context under the depart-station step — must be state so the sheet re-renders */
  const [stationLocationNote, setStationLocationNote] = useState('');

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
  const realtimeStatus = useRealtimeStore((s) => s.status);

  const sheetStickyFooterBottom = 14 + Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 10);
  /** Clear the absolute footer + one route card tail; avoids overlap while scrolling */
  const sheetFlatListPaddingBottom = 128 + sheetStickyFooterBottom;

  const syncTabBarToBookingSheets = useCallback(() => {
    if (tabBarSyncTimerRef.current) clearTimeout(tabBarSyncTimerRef.current);
    tabBarSyncTimerRef.current = setTimeout(() => {
      tabBarSyncTimerRef.current = null;
      const anyOpen = stationSnapIndexRef.current >= 0;
      navigation.setOptions({
        tabBarStyle: anyOpen ? SHEET_HIDDEN_TAB_BAR_STYLE : MAIN_TAB_BAR_STYLE,
      });
    }, 52);
  }, [navigation]);

  const resetBookingModalInternals = useCallback(() => {
    routesAbortRef.current?.abort();
    routesAbortRef.current = null;
    setBookingSheetStep('station');
    setFetchedRoutes(null);
    setRoutesFetchLoading(false);
    setRoutesFetchError(null);
    setSelectedRouteId(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (tabBarSyncTimerRef.current) {
          clearTimeout(tabBarSyncTimerRef.current);
          tabBarSyncTimerRef.current = null;
        }
        resetBookingModalInternals();
        stationSnapIndexRef.current = -1;
        stationSheetRef.current?.dismiss();
        navigation.setOptions({
          tabBarStyle: MAIN_TAB_BAR_STYLE,
        });
      };
    }, [navigation, resetBookingModalInternals]),
  );

  const {
    data: stationsFromApi,
    isLoading: isStationsQueryLoading,
    isError: isStationsQueryError,
    error: stationsQueryError,
    refetch: refetchStations,
  } = useQuery({
    queryKey: ['central-stations', 'discovery-list-v1'],
    queryFn: ({ signal }) => getStations({ signal }),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(8_000, 500 * 2 ** attemptIndex),
  });

  const visibleNearbyStations = useMemo(
    () => nearbyStations.slice(0, stationPageSize),
    [nearbyStations, stationPageSize],
  );

  const canLoadMoreStations = nearbyStations.length > visibleNearbyStations.length;

  const routeListBaseline = fetchedRoutes ?? [];

  const visibleRoutes = useMemo(
    () => routeListBaseline.slice(0, routePageSize),
    [routeListBaseline, routePageSize],
  );

  const canLoadMoreRoutes = routeListBaseline.length > visibleRoutes.length;

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
        onPress={() => setRoutePageSize((value) => Math.min(routeListBaseline.length, value + 20))}
        style={({ pressed }) => [styles.loadMoreButton, pressed ? styles.buttonPressed : null]}
      >
        <Text color={appColors.textPrimary} fontSize="$3" fontWeight="800">
          Load more routes
        </Text>
      </Pressable>
    );
  }, [canLoadMoreRoutes, routeListBaseline.length]);

  const baselineSelectedRoute = useMemo(
    () => routeListBaseline.find((route) => String(route.id) === selectedRouteId) ?? null,
    [routeListBaseline, selectedRouteId],
  );

  const selectedRouteLiveSlice = useBookingRoutesLiveStore(
    useCallback(
      (s) =>
        draftStation?.id && selectedRouteId
          ? s.metricsByStation[draftStation.id]?.[selectedRouteId]
          : undefined,
      [draftStation?.id, selectedRouteId],
    ),
  );

  const selectedRoute = useMemo(() => {
    if (!baselineSelectedRoute) return null;
    if (!selectedRouteLiveSlice) return baselineSelectedRoute;
    return {
      ...baselineSelectedRoute,
      available_seats: selectedRouteLiveSlice.available_seats,
      vehicles_count: selectedRouteLiveSlice.vehicles_count,
    };
  }, [baselineSelectedRoute, selectedRouteLiveSlice]);

  const fetchQueuesForDepartStation = useCallback(
    async (station: StationWithDistance) => {
      routesAbortRef.current?.abort();
      const ac = new AbortController();
      routesAbortRef.current = ac;
      useBookingRoutesLiveStore.getState().clearLiveMetricsForStation(station.id);
      setRoutesFetchLoading(true);
      setRoutesFetchError(null);
      setFetchedRoutes(null);
      try {
        const rows = await getStationRoutes(station.id, { signal: ac.signal });
        if (!ac.signal.aborted) {
          setFetchedRoutes(rows);
        }
      } catch (error: unknown) {
        if (ac.signal.aborted || (isAxiosError(error) && error.code === 'ERR_CANCELED')) {
          return;
        }
        const friendly = toUserFacingErrorCopy(
          error,
          'Could not load destinations from this station.',
        );
        const detailSuffix = friendly.detail ? ` ${friendly.detail}` : '';
        if (!ac.signal.aborted) {
          setRoutesFetchError(`${friendly.title}${detailSuffix}`.trim());
        }
      } finally {
        if (!ac.signal.aborted) setRoutesFetchLoading(false);
      }
    },
    [],
  );

  const openBookingFlow = useCallback(() => {
    resetBookingModalInternals();
    setDraftStation(selectedStation);
    setStationPageSize(25);
    stationSnapIndexRef.current = 0;
    syncTabBarToBookingSheets();
    stationSheetRef.current?.present();
  }, [resetBookingModalInternals, selectedStation, syncTabBarToBookingSheets]);

  const openStationPicker = useCallback(() => {
    resetBookingModalInternals();
    const fallback = pickDefaultStation(nearbyStations);
    setDraftStation(selectedStation ?? fallback);
    setStationPageSize(25);
    stationSnapIndexRef.current = 0;
    syncTabBarToBookingSheets();
    stationSheetRef.current?.present();
  }, [nearbyStations, resetBookingModalInternals, selectedStation, syncTabBarToBookingSheets]);

  const handleSelectStation = useCallback((station: StationWithDistance) => {
    setDraftStation(station);
    setSelectedRouteId(null);
  }, []);

  const handleBackToStationStep = useCallback(() => {
    routesAbortRef.current?.abort();
    routesAbortRef.current = null;
    setBookingSheetStep('station');
    setRoutesFetchLoading(false);
    setRoutesFetchError(null);
    const sid = draftStation?.id?.trim();
    if (sid) useBookingRoutesLiveStore.getState().clearLiveMetricsForStation(sid);
    setFetchedRoutes(null);
    setSelectedRouteId(null);
    setRoutePageSize(20);
  }, [draftStation?.id]);

  const handleStationNext = useCallback(() => {
    if (!draftStation || draftStation.status !== 'online') return;
    setSelectedStation(draftStation);
    setBookingSheetStep('routes');
    setSelectedRouteId(null);
    setRoutePageSize(20);
    void fetchQueuesForDepartStation(draftStation);
  }, [draftStation, fetchQueuesForDepartStation, setSelectedStation]);

  const handleRouteNext = useCallback(() => {
    if (!draftStation || !selectedRoute || draftStation.status !== 'online') return;
    const meta = buildBookingRouteMeta(selectedRoute, draftStation.name);

    stationSheetRef.current?.dismiss();
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
      setStationLocationNote('Sorted by distance from you.');

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
    [setNearbyStations, setSelectedStation, setStationLocationNote],
  );

  useEffect(() => {
    if (!isStationsQueryError || stationsQueryError == null) return;
    if (toNetworkErrorInfo(stationsQueryError).kind === 'cancelled') return;

    setIsResolvingLocation(false);
    setStationLocationNote('Could not load the station list from the server.');

    const baseMessage = serverUrl
      ? `Could not load stations from ${serverUrl}.`
      : (centralServer.error ?? 'Central server URL is not configured.');
    const friendly = toUserFacingErrorCopy(stationsQueryError, baseMessage);

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
  }, [
    centralServer.error,
    isHttpServer,
    isStationsQueryError,
    serverUrl,
    stationsQueryError,
    setIsResolvingLocation,
    setLocationPermission,
    setNearbyStations,
    setSelectedStation,
    setStationLocationNote,
  ]);

  useEffect(() => {
    let mounted = true;

    if (isStationsQueryError) {
      return;
    }

    if (isStationsQueryLoading || stationsFromApi === undefined) {
      setIsResolvingLocation(true);
      setStationLocationNote('Loading stations from the server…');
      return;
    }

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
        const stations = stationsFromApi;
        if (!mounted) return;

        setStations(stations);
        stationsRef.current = stations;

        watchSubscriptionRef.current?.remove();
        watchSubscriptionRef.current = null;

        if (!stations.length) {
          setStationLocationNote('The server returned no stations to show here.');
          setStationLoadError('The server responded, but it returned no stations.');
          setNearbyStations([]);
          setSelectedStation(null);
          setLocationPermission('undetermined');
          return;
        }

        const hasGeolocatableStations = stations.some(hasStationCoordinates);
        if (!hasGeolocatableStations) {
          const rankedStations = toNearbyStations(stations);
          setStationLocationNote('Online outlets first. Turn on Location to sort by distance when positions are available.');
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
            setStationLocationNote('Sorted by distance from you.');
          } catch {
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (!mounted) return;
            if (lastKnown && Date.now() - lastKnown.timestamp <= LAST_KNOWN_MAX_AGE_MS) {
              const lastKnownCoords = sanitizeCoords(lastKnown.coords.latitude, lastKnown.coords.longitude);
              if (lastKnownCoords) {
                userCoords = lastKnownCoords;
                setStationLocationNote('Sorted by last known location.');
              } else {
                setStationLocationNote('Pick a station from the list.');
              }
            } else {
              setStationLocationNote('Pick a station from the list.');
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
              setStationLocationNote('Sorted by last known location (location permission off).');
            } else {
              setStationLocationNote('Pick a station from the list (location permission off).');
            }
          } else {
            setStationLocationNote('Pick a station from the list (location permission off).');
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
  }, [
    isStationsQueryError,
    isStationsQueryLoading,
    reconnectEpoch,
    setIsResolvingLocation,
    setLocationPermission,
    setNearbyStations,
    setSelectedStation,
    setStations,
    setStationLocationNote,
    stationsFromApi,
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
      const awayLabel = formatKmAway(item.distanceKm);

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
              {awayLabel ? (
                <Text color={isSelected ? appColors.accent : appColors.textMuted} fontSize="$3">
                  {awayLabel}
                </Text>
              ) : null}
            </XStack>
          </YStack>
        </Pressable>
      );
    },
    [draftStation?.id, handleSelectStation],
  );

  const renderRouteItem = useCallback(
    ({ item }: { item: RouteData }) => {
      if (!draftStation) return null;
      return (
        <DestinationQueueRow
          stationId={draftStation.id}
          stationName={draftStation.name}
          item={item}
          selectedRouteId={selectedRouteId}
          onSelectRouteId={setSelectedRouteId}
        />
      );
    },
    [draftStation, selectedRouteId],
  );

  const latestTickets = tickets.slice(0, 3);
  const canOpenBooking = !isResolvingLocation && nearbyStations.length > 0;
  const canContinueStation = !!draftStation && draftStation.status === 'online';
  const canContinueRoute =
    bookingSheetStep === 'routes' && !!selectedRoute && draftStation?.status === 'online' && !routesFetchLoading;

  return (
    <BottomSheetModalProvider>
      <ScrollView
        style={{ flex: 1, backgroundColor: appColors.bg }}
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
      <YStack flex={1} bg={appColors.bg} px="$5" pt="$7" pb="$6" gap="$4">
        <View style={styles.screenGlowTop} pointerEvents="none" />
        <View style={styles.screenGlowBottom} pointerEvents="none" />
        <YStack gap="$2">
          <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.8}>
            BOOKING
          </Text>
          <Text color={appColors.textPrimary} fontSize="$10" fontWeight="800">
            Book your ride
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
                  DEPARTURE STATION
                </Text>
                <Text color={appColors.textPrimary} fontSize="$7" fontWeight="800">
                  {selectedStation?.name ?? 'Choose station'}
                </Text>
                <Text color={appColors.textSecondary} fontSize="$3">
                  {selectedStation
                    ? stationCardSubtitle(selectedStation)
                    : isResolvingLocation
                      ? 'Resolving your closest station...'
                      : 'Select a station to start booking.'}
                </Text>
              </YStack>
              <View style={styles.heroIconWrap}>
                {isResolvingLocation ? (
                  <ActivityIndicator color={appColors.accent} />
                ) : (
                  <BrandLogo size={48} borderRadius={10} />
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
              onPress={() => {
                setStationLoadError(null);
                void refetchStations();
              }}
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
              Issued this session
            </Text>
          </View>
        </XStack>

        <View style={styles.historyCard}>
          <XStack
            width="100%"
            items="flex-start"
            justify="space-between"
            gap="$3"
            flexWrap="wrap"
          >
            <YStack gap="$1" style={styles.historyHeaderTextCol}>
              <Text color={appColors.textPrimary} fontSize="$6" fontWeight="800">
                Recent trips
              </Text>
              <Text color={appColors.textSecondary} fontSize="$3">
                Your latest paid tickets appear here for quick access.
              </Text>
            </YStack>
            <Pressable
              onPress={() => router.push('/(app)/history')}
              accessibilityRole="button"
              accessibilityLabel="Open full booking history"
              style={[styles.historyLink, styles.historyLinkPill]}
            >
              <Text color={appColors.textPrimary} fontSize="$3" fontWeight="700">
                View all
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
          enablePanDownToClose
          topInset={insets.top}
          backgroundStyle={{ backgroundColor: appColors.surfaceStrong }}
          handleIndicatorStyle={{ backgroundColor: appColors.borderStrong }}
          backdropComponent={(props) => (
            <BottomSheetBackdrop
              {...props}
              appearsOnIndex={0}
              disappearsOnIndex={-1}
              pressBehavior="close"
              opacity={0.55}
            />
          )}
          onDismiss={resetBookingModalInternals}
          onChange={(index) => {
            stationSnapIndexRef.current = index;
            syncTabBarToBookingSheets();
          }}
        >
          <YStack flex={1} px="$4" pt="$2" pb={sheetStickyFooterBottom + 8}>
            <XStack mb="$2" width="100%" justify="space-between" items="center">
              {bookingSheetStep === 'routes' ? (
                <Pressable
                  onPress={handleBackToStationStep}
                  accessibilityRole="button"
                  accessibilityLabel="Back to departure station selection"
                  hitSlop={12}
                  style={styles.sheetNavPill}
                >
                  <XStack items="center" gap="$1.5">
                    <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.textPrimary} />
                    <Text color={appColors.textPrimary} fontSize="$3" fontWeight="700">
                      Back
                    </Text>
                  </XStack>
                </Pressable>
              ) : (
                <View style={styles.sheetHeaderSpacer} />
              )}
              <Pressable
                onPress={() => stationSheetRef.current?.dismiss()}
                accessibilityRole="button"
                accessibilityLabel="Close booking sheet"
                hitSlop={12}
                style={styles.sheetCloseButton}
              >
                <MaterialCommunityIcons name="close" size={26} color={appColors.textPrimary} />
              </Pressable>
            </XStack>

            {bookingSheetStep === 'station' ? (
              <>
                <Text color={appColors.textPrimary} fontSize="$7" fontWeight="800">
                  Confirm depart station
                </Text>
                <Text mt="$1" color={appColors.textSecondary} fontSize="$4">
                  Start from your assigned station, or switch it before loading live destinations.
                </Text>
                {stationLocationNote ? (
                  <Text mt="$2" mb="$3" color={appColors.textMuted} fontSize="$2">
                    {stationLocationNote}
                  </Text>
                ) : (
                  <View style={{ marginBottom: 12 }} />
                )}

                <BottomSheetFlatList<StationWithDistance>
                  style={{ flex: 1 }}
                  data={visibleNearbyStations}
                  keyExtractor={(item: StationWithDistance) => item.id}
                  renderItem={renderStationItem}
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: sheetFlatListPaddingBottom }}
                  showsVerticalScrollIndicator={false}
                  ListFooterComponent={renderStationListFooter}
                  ListEmptyComponent={
                    isResolvingLocation ? (
                      <View style={[styles.centerState, { paddingTop: 28, paddingBottom: 72 }]}>
                        <ActivityIndicator color={appColors.accent} />
                        <Text color={appColors.textSecondary} fontSize="$4" style={styles.centeredText}>
                          Loading stations…
                        </Text>
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
                  pointerEvents={!canContinueStation ? 'none' : 'auto'}
                  onPress={handleStationNext}
                  testID="station-next"
                  style={({ pressed }) => [
                    styles.sheetButton,
                    { bottom: sheetStickyFooterBottom },
                    !canContinueStation ? styles.buttonDisabled : null,
                    pressed && canContinueStation ? styles.buttonPressed : null,
                  ]}
                >
                  <Text color={appColors.bg} fontSize="$4" fontWeight="800">
                    Continue
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text color={appColors.textPrimary} fontSize="$7" fontWeight="800">
                  Choose destination
                </Text>
                <Text mt="$1" color={appColors.textSecondary} fontSize="$4">
                  Routes from{' '}
                  <Text fontWeight="800" color={appColors.textPrimary}>
                    {draftStation?.name ?? 'your station'}
                  </Text>
                  {' '}
                  with live seat counts when available.
                </Text>
                <Text mt="$2" color={appColors.textMuted} fontSize="$2">
                  {realtimeStatus === 'connected'
                    ? 'Seat counts update automatically while this screen is open.'
                    : 'Connect to the internet for live updates when routes change.'}
                </Text>

                {routesFetchLoading ? (
                  <View style={[styles.centerState, styles.sheetRoutesBody]}>
                    <ActivityIndicator size="large" color={appColors.accent} />
                    <Text mt="$4" color={appColors.textSecondary} fontSize="$4" style={styles.centeredText}>
                      Loading routes from this station…
                    </Text>
                  </View>
                ) : routesFetchError ? (
                  <View style={[styles.centerState, styles.sheetRoutesBody]}>
                    <Text color={appColors.textPrimary} fontSize="$4" style={styles.centeredText}>
                      {routesFetchError}
                    </Text>
                    <Pressable
                      onPress={() => draftStation && void fetchQueuesForDepartStation(draftStation)}
                      style={styles.historyLink}
                    >
                      <Text color={appColors.textPrimary} fontSize="$3" fontWeight="700">
                        Retry
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <BottomSheetFlatList<RouteData>
                    style={{ flex: 1 }}
                    data={visibleRoutes}
                    keyExtractor={(item: RouteData) => String(item.id)}
                    renderItem={renderRouteItem}
                    contentContainerStyle={{
                      flexGrow: 1,
                      paddingTop: 16,
                      paddingBottom: sheetFlatListPaddingBottom,
                      gap: 12,
                    }}
                    ListEmptyComponent={
                      <View style={styles.centerState}>
                        <Text color={appColors.textSecondary} fontSize="$4" style={styles.centeredText}>
                          No queued destinations available right now. Try again in a moment or pick another depart
                          station.
                        </Text>
                      </View>
                    }
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={renderRoutesListFooter}
                  />
                )}

                <Pressable
                  disabled={!canContinueRoute}
                  pointerEvents={!canContinueRoute ? 'none' : 'auto'}
                  onPress={handleRouteNext}
                  testID="route-next"
                  style={({ pressed }) => [
                    styles.sheetButton,
                    { bottom: sheetStickyFooterBottom },
                    !canContinueRoute ? styles.buttonDisabled : null,
                    pressed && canContinueRoute ? styles.buttonPressed : null,
                  ]}
                >
                  <Text color={appColors.bg} fontSize="$4" fontWeight="800">
                    Next
                  </Text>
                </Pressable>
              </>
            )}
          </YStack>
        </BottomSheetModal>
      </YStack>
      </ScrollView>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  screenGlowTop: {
    position: 'absolute',
    top: -100,
    right: -36,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: appColors.accentGlowSoft,
    opacity: 0.28,
  },
  screenGlowBottom: {
    position: 'absolute',
    bottom: 180,
    left: -48,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: appColors.accentSoft,
    opacity: 0.22,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surface,
    padding: 22,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
    overflow: 'hidden',
  },
  screenContent: {
    paddingBottom: 130,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: appColors.accent,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.22)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 18,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surface,
    padding: 18,
  },
  historyCard: {
    overflow: 'hidden',
    alignSelf: 'stretch',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surface,
    padding: 20,
  },
  historyLink: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  /** Keep “Open” fully visible — never shrink the pill beside wrapping title copy */
  historyLinkPill: {
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  historyHeaderTextCol: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  emptyHistory: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
    padding: 20,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 10,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  sheetNavPill: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
  },
  sheetHeaderSpacer: {
    width: 88,
  },
  sheetRoutesBody: {
    flex: 1,
    minHeight: 240,
  },
  sheetCloseButton: {
    padding: 6,
    borderRadius: 8,
    marginRight: -2,
  },
  sheetButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    borderRadius: 12,
    backgroundColor: appColors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.borderStrong,
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
});
