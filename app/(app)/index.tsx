import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { ActivityIndicator, Dimensions, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
const MAX_DISTANCE_KM = 999;

const MAIN_TAB_BAR_STYLE = { position: 'absolute' as const, backgroundColor: 'transparent', borderTopWidth: 0 };
const SHEET_HIDDEN_TAB_BAR_STYLE = { ...MAIN_TAB_BAR_STYLE, height: 0, opacity: 0, overflow: 'hidden' as const };

function hasStationCoordinates(s: Station) { return s.lat != null && s.lng != null; }

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKmAway(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

// ─── Countdown Timer Component ───────────────────────────────────
function CountdownTimer({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = dayjs(targetIso);
  const diff = target.diff(dayjs(now), 'second');
  if (diff <= 0) return <Text color="#EF4444" fontSize={13} fontWeight="700">Departed</Text>;

  const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
  return (
    <XStack gap={4} items="center">
      <MaterialCommunityIcons name="clock-outline" size={13} color={diff < 600 ? '#F59E0B' : appColors.accent} />
      <Text color={diff < 600 ? '#F59E0B' : appColors.accent} fontSize={13} fontWeight="700">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </Text>
    </XStack>
  );
}

// ─── Active Ticket Card ──────────────────────────────────────────
function ActiveTicketCard({ ticket, onPress }: { ticket: any; onPress: () => void }) {
  const from = ticket.departureName || ticket.stationName || 'Departure';
  const to = ticket.destinationName || ticket.routeName || 'Destination';
  const plate = ticket.vehiclePlate || 'TBA';
  const seats = ticket.seatCount || 1;
  const etdIso = ticket.etdIso || new Date().toISOString();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ticketCard, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      <View style={styles.ticketGlow} pointerEvents="none" />
      <YStack gap="$4">
        <XStack items="center" justify="space-between">
          <XStack gap="$2" items="center">
            <View style={styles.ticketBadge}>
              <MaterialCommunityIcons name="ticket-confirmation" size={14} color="#F0F4FF" />
            </View>
            <Text color="#8899B4" fontSize={11} fontWeight="600" letterSpacing={1.2}>ACTIVE TICKET</Text>
          </XStack>
          <CountdownTimer targetIso={etdIso} />
        </XStack>

        <XStack items="center" justify="space-between" px="$2">
          <YStack gap="$1" flex={1}>
            <Text color="#556580" fontSize={10} fontWeight="600" letterSpacing={1}>FROM</Text>
            <Text color="#F0F4FF" fontSize={17} fontWeight="700" numberOfLines={1}>{from}</Text>
          </YStack>
          <View style={styles.routeLine}>
            <View style={styles.routeDot} />
            <View style={styles.routeDash} />
            <MaterialCommunityIcons name="bus" size={16} color={appColors.accent} style={{ marginHorizontal: 4 }} />
            <View style={styles.routeDash} />
            <View style={[styles.routeDot, { backgroundColor: appColors.accent }]} />
          </View>
          <YStack gap="$1" flex={1} items="flex-end">
            <Text color="#556580" fontSize={10} fontWeight="600" letterSpacing={1}>TO</Text>
            <Text color="#F0F4FF" fontSize={17} fontWeight="700" text="right" numberOfLines={1}>{to}</Text>
          </YStack>
        </XStack>

        <XStack items="center" justify="space-between" bg="rgba(255,255,255,0.03)" borderRadius={10} px="$3" py="$3" {...{} as any}>
          <XStack gap="$3">
            <YStack gap="$1" items="center">
              <Text color="#556580" fontSize={9} fontWeight="600" letterSpacing={1}>PLATE</Text>
              <Text color={appColors.accent} fontSize={14} fontWeight="700">{plate}</Text>
            </YStack>
            <View style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <YStack gap="$1" items="center">
              <Text color="#556580" fontSize={9} fontWeight="600" letterSpacing={1}>SEATS</Text>
              <Text color="#F0F4FF" fontSize={14} fontWeight="700">{seats}</Text>
            </YStack>
            <View style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <YStack gap="$1" items="center">
              <Text color="#556580" fontSize={9} fontWeight="600" letterSpacing={1}>ETD</Text>
              <Text color="#F0F4FF" fontSize={14} fontWeight="700">{dayjs(etdIso).format('HH:mm')}</Text>
            </YStack>
          </XStack>
          <MaterialCommunityIcons name="qrcode-scan" size={24} color={appColors.accent} />
        </XStack>
      </YStack>
    </Pressable>
  );
}

// ─── Book Ride Card ──────────────────────────────────────────────
function BookRideCard({ stationsCount, onPress }: { stationsCount: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.bookCard, pressed && { opacity: 0.9 }]}>
      <View style={styles.bookGlow} pointerEvents="none" />
      <YStack gap="$4" items="center" py="$4">
        <View style={styles.bookIcon}>
          <MaterialCommunityIcons name="bus-marker" size={28} color="#F0F4FF" />
        </View>
        <YStack gap="$1" items="center">
          <Text color="#F0F4FF" fontSize={18} fontWeight="700">Book your next journey</Text>
          <Text color="#8899B4" fontSize={13} text="center" lineHeight={18}>
            {stationsCount > 0
              ? `${stationsCount} station${stationsCount > 1 ? 's' : ''} nearby · Select your route`
              : 'Browse stations and book your ride'}
          </Text>
        </YStack>
        <XStack bg={appColors.accent} borderRadius={12} {...{} as any} px="$5" py="$3" gap="$2" items="center">
          <Text color="#0A0F19" fontSize={14} fontWeight="700">Find a ride</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#0A0F19" />
        </XStack>
      </YStack>
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────
export default function MainScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const stationSheetRef = useRef<BottomSheetModal>(null);
  const [stationSnapIndex, setStationSnapIndex] = useState(-1);
  const stationSnapPoints = useMemo(() => ['68%', '93%'], []);
  const [bookingStep, setBookingStep] = useState<'station' | 'routes'>('station');
  const [fetchedRoutes, setFetchedRoutes] = useState<RouteData[] | null>(null);
  const [routesFetchLoading, setRoutesFetchLoading] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [draftStation, setDraftStation] = useState<StationWithDistance | null>(null);
  const routesAbortRef = useRef<AbortController | null>(null);
  const tabBarSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stores
  const tickets = useBookingStore((s) => s.tickets);
  const activeTicket = tickets.length > 0 ? tickets[0] : null;
  const { stations, nearbyStations, selectedStation, setStations, setNearbyStations, setSelectedStation } = useStationStore();
  const { clearLiveMetricsForStation } = useBookingRoutesLiveStore();
  const { isOffline, bumpReconnectEpoch } = useConnectivityStore();
  const realtimeStatus = useRealtimeStore((s) => s.status);

  // Location
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(true);

  const resolveLocation = useCallback(async () => {
    setIsResolvingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted' ? 'granted' : 'denied');
      if (status !== 'granted') return;
      let pos = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
      if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (pos) setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch { /* ignore */ }
    finally { setIsResolvingLocation(false); }
  }, []);

  useEffect(() => { void resolveLocation(); }, [resolveLocation]);

  // Stations query
  const stationsQuery = useQuery({
    queryKey: ['central-stations', 'discovery-list-v1'],
    queryFn: async () => {
      const list = await getStations();
      setStations(list);
      return list;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 2,
    enabled: !isOffline,
  });

  // Sort nearby
  useEffect(() => {
    if (stations.length === 0) { setNearbyStations([]); return; }
    const withDist = stations
      .filter((s) => s.status === 'online')
      .map((s) => {
        let km = MAX_DISTANCE_KM;
        if (userCoords && hasStationCoordinates(s)) km = haversineKm(userCoords.lat, userCoords.lng, Number(s.lat), Number(s.lng));
        return { ...s, distanceKm: km };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name));
    setNearbyStations(withDist);
  }, [stations, userCoords]);

  // Tab bar sync with sheet
  const syncTabBar = useCallback((hidden: boolean) => {
    if (tabBarSyncRef.current) clearTimeout(tabBarSyncRef.current);
    tabBarSyncRef.current = setTimeout(() => {
      navigation.setOptions({ tabBarStyle: hidden ? SHEET_HIDDEN_TAB_BAR_STYLE : MAIN_TAB_BAR_STYLE });
    }, hidden ? 0 : 80);
  }, [navigation]);

  const openStationPicker = useCallback(() => {
    setBookingStep('station');
    setFetchedRoutes(null);
    setSelectedRouteId('');
    stationSheetRef.current?.present();
  }, []);

  const handleSheetChange = useCallback((index: number) => {
    setStationSnapIndex(index);
    syncTabBar(index >= 0);
    if (index < 0) {
      clearLiveMetricsForStation(draftStation?.id ?? '');
      setDraftStation(null);
      setFetchedRoutes(null);
      setSelectedRouteId('');
    }
  }, [syncTabBar, clearLiveMetricsForStation, draftStation]);

  const fetchRoutes = useCallback(async (station: StationWithDistance) => {
    setRoutesFetchLoading(true);
    setBookingStep('routes');
    setDraftStation(station);
    routesAbortRef.current?.abort();
    const ac = new AbortController();
    routesAbortRef.current = ac;
    try {
      const routes = await getStationRoutes(station.id, { signal: ac.signal });
      if (!ac.signal.aborted) { setFetchedRoutes(routes); setSelectedRouteId(''); }
    } catch {
      if (!ac.signal.aborted) setFetchedRoutes([]);
    } finally {
      if (!ac.signal.aborted) setRoutesFetchLoading(false);
    }
  }, []);

  const handleContinueToBooking = useCallback(() => {
    if (!selectedRouteId || !draftStation || !fetchedRoutes) return;
    const route = fetchedRoutes.find((r) => String(r.id) === selectedRouteId);
    if (!route) return;

    const meta = buildBookingRouteMeta(route, draftStation.name);
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
        totalPrice: String(meta.pricePerSeat),
        etdIso: meta.etdIso,
        etdLabel: meta.etdLabel,
      },
    });
    stationSheetRef.current?.close();
  }, [selectedRouteId, draftStation, fetchedRoutes, router]);

  const contentPadTop = Math.max(insets.top + 12, 56);
  const contentPadBottom = Math.max(insets.bottom, 16) + 100;
  const stationCount = nearbyStations.length;

  // Pull to refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await resolveLocation();
    await stationsQuery.refetch();
    bumpReconnectEpoch();
    setRefreshing(false);
  }, [resolveLocation, stationsQuery, bumpReconnectEpoch]);

  return (
    <BottomSheetModalProvider>
      <YStack flex={1} bg={appColors.bg}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingTop: contentPadTop, paddingBottom: contentPadBottom, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={appColors.accent} />}
        >
          {/* Header */}
          <XStack items="center" justify="space-between" mb="$5">
            <YStack gap="$1">
              <Text color="#556580" fontSize={11} fontWeight="600" letterSpacing={1.2}>WASLA</Text>
              <Text color="#F0F4FF" fontSize={24} fontWeight="700" letterSpacing={-0.5}>
                {activeTicket ? 'Your Trip' : 'Where to?'}
              </Text>
            </YStack>
            <XStack gap="$3" items="center">
              {isResolvingLocation && <ActivityIndicator size="small" color={appColors.accent} />}
              {realtimeStatus === 'connected' && (
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' }} />
              )}
              <Pressable onPress={() => router.push('/(app)/settings')}>
                <BrandLogo size={36} borderRadius={10} />
              </Pressable>
            </XStack>
          </XStack>

          {/* Active Ticket or Book Ride CTA */}
          {activeTicket ? (
            <ActiveTicketCard
              ticket={activeTicket}
              onPress={() => router.push({ pathname: '/(app)/ticket', params: { ticketId: activeTicket.id } })}
            />
          ) : (
            <BookRideCard stationsCount={stationCount} onPress={openStationPicker} />
          )}

          {/* Quick station list */}
          <YStack mt="$6" gap="$3">
            <XStack items="center" justify="space-between">
              <Text color="#8899B4" fontSize={12} fontWeight="600" letterSpacing={1}>NEARBY STATIONS</Text>
              {stationCount > 3 && (
                <Pressable onPress={openStationPicker}>
                  <Text color={appColors.accent} fontSize={12} fontWeight="600">View all</Text>
                </Pressable>
              )}
            </XStack>

            {stationsQuery.isLoading ? (
              <YStack gap="$3">
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.skeletonCard}>
                    <View style={{ width: '60%', height: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
                    <View style={{ width: '30%', height: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4, marginTop: 6 }} />
                  </View>
                ))}
              </YStack>
            ) : stationCount === 0 ? (
              <YStack items="center" py="$6" gap="$3">
                <MaterialCommunityIcons name="map-marker-off" size={28} color="#556580" />
                <Text color="#556580" fontSize={13}>No stations nearby</Text>
                <Pressable onPress={onRefresh} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Text color={appColors.accent} fontSize={12} fontWeight="600">Refresh</Text>
                </Pressable>
              </YStack>
            ) : (
              nearbyStations.slice(0, 3).map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => { setDraftStation(s); fetchRoutes(s); stationSheetRef.current?.present(); }}
                  style={({ pressed }) => [styles.stationRow, pressed && { opacity: 0.7 }]}
                >
                  <View style={styles.stationIcon}>
                    <MaterialCommunityIcons name="bus-stop" size={18} color="#8899B4" />
                  </View>
                  <YStack flex={1}>
                    <Text color="#F0F4FF" fontSize={14} fontWeight="600">{s.name}</Text>
                    <Text color="#556580" fontSize={11}>
                      {formatKmAway((s as StationWithDistance).distanceKm)}{' · '}{s.status === 'online' ? 'Online' : 'Offline'}
                    </Text>
                  </YStack>
                  <View style={[styles.statusDot, { backgroundColor: s.status === 'online' ? '#22C55E' : '#EF4444' }]} />
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#3A4A60" />
                </Pressable>
              ))
            )}
          </YStack>
        </ScrollView>

        {/* Booking Bottom Sheet */}
        <BottomSheetModal
          ref={stationSheetRef}
          index={1}
          snapPoints={stationSnapPoints}
          onChange={handleSheetChange}
          enablePanDownToClose
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
          )}
          backgroundStyle={{ backgroundColor: '#0D1525', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
          handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.15)', width: 40 }}
        >
          <YStack flex={1} px="$4" pt="$2">
            {bookingStep === 'station' ? (
              <>
                <Text color="#F0F4FF" fontSize={16} fontWeight="700" mb="$3">Choose your departure station</Text>
                <BottomSheetFlatList
                  data={nearbyStations}
                  keyExtractor={(item: StationWithDistance) => item.id}
                  renderItem={({ item }: { item: StationWithDistance }) => (
                    <Pressable
                      onPress={() => { fetchRoutes(item); }}
                      style={({ pressed }) => [styles.sheetStation, pressed && { opacity: 0.7 }]}
                    >
                      <YStack flex={1} gap="$1">
                        <Text color="#F0F4FF" fontSize={15} fontWeight="600">{item.name}</Text>
                        <Text color="#556580" fontSize={12}>{formatKmAway(item.distanceKm)}</Text>
                      </YStack>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#3A4A60" />
                    </Pressable>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              </>
            ) : (
              <>
                <XStack items="center" mb="$3" gap="$2">
                  <Pressable onPress={() => { setBookingStep('station'); setFetchedRoutes(null); }}>
                    <MaterialCommunityIcons name="chevron-left" size={24} color="#8899B4" />
                  </Pressable>
                  <Text color="#F0F4FF" fontSize={16} fontWeight="700">Choose destination</Text>
                </XStack>
                {routesFetchLoading ? (
                  <ActivityIndicator size="large" color={appColors.accent} style={{ marginTop: 40 }} />
                ) : (
                  <BottomSheetFlatList
                    data={fetchedRoutes || []}
                    keyExtractor={(item: RouteData) => String(item.id)}
                    renderItem={({ item }: { item: RouteData }) => (
                      <DestinationQueueRow
                        item={item}
                        stationId={draftStation?.id ?? ''}
                        stationName={draftStation?.name ?? ''}
                        selectedRouteId={selectedRouteId || null}
                        onSelectRouteId={(id: string) => setSelectedRouteId(id)}
                      />
                    )}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text color="#556580" text="center" mt="$6">No routes available</Text>}
                  />
                )}
                {selectedRouteId ? (
                  <Pressable onPress={handleContinueToBooking} style={styles.continueBtn}>
                    <Text color="#0A0F19" fontSize={16} fontWeight="700">Continue</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </YStack>
        </BottomSheetModal>
      </YStack>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  ticketCard: {
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,168,83,0.15)',
    backgroundColor: '#0D1525', padding: 20, overflow: 'hidden', position: 'relative',
  },
  ticketGlow: {
    position: 'absolute', top: -40, right: -20, width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(212,168,83,0.06)',
  },
  ticketBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(212,168,83,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  routeLine: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3A4A60' },
  routeDash: { width: 20, height: 2, backgroundColor: '#1E2D45' },
  bookCard: {
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,168,83,0.10)',
    backgroundColor: '#0D1525', padding: 24, overflow: 'hidden', position: 'relative',
  },
  bookGlow: {
    position: 'absolute', top: -60, left: '30%', width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(212,168,83,0.04)',
  },
  bookIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(212,168,83,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  stationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: '#0D1525', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  stationIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  skeletonCard: { padding: 16, borderRadius: 14, backgroundColor: '#0D1525' },
  sheetStation: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, backgroundColor: '#0D1525', marginBottom: 8,
  },
  continueBtn: {
    marginTop: 12, marginBottom: 24, backgroundColor: appColors.accent,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
});
