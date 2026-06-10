import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import {
  ActivityIndicator, Alert, Animated, Dimensions, FlatList, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Text, XStack, YStack } from 'tamagui';
import { getStations } from '../../src/lib/stationsApi';
import { getStationRoutes, type RouteData } from '../../src/lib/routesApi';
import { DestinationQueueRow } from '../../src/components/booking/DestinationQueueRow';
import { BrandLogo } from '../../src/components/BrandLogo';
import { buildBookingRouteMeta } from '../../src/lib/bookingFlow';
import { cancelBooking } from '../../src/lib/bookingApi';
import { appColors } from '../../src/theme/appTheme';
import { useBookingRoutesLiveStore, useBookingStore, useConnectivityStore, useRealtimeStore, useStationStore, type StationWithDistance } from '../../src/store';
import { SkeletonList } from '../../src/components/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
const MAX_DISTANCE_KM = 999;
const CARD_WIDTH = SCREEN_WIDTH - 40;
const TAB_BAR_STYLE = { position: 'absolute' as const, backgroundColor: 'transparent', borderTopWidth: 0 };
const SHEET_HIDDEN = { ...TAB_BAR_STYLE, height: 0, opacity: 0, overflow: 'hidden' as const };

function hasCoords(s: any) { return s.lat != null && s.lng != null; }
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  return R * 2 * Math.atan2(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2), Math.sqrt(1 - (Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2)));
}
function formatKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '';
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// ─── Countdown Timer ────────────────────────────────────────────
function CountdownTimer({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const diff = dayjs(targetIso).diff(dayjs(now), 'second');
  if (diff <= 0) return <Text color="#EF4444" fontSize={12} fontWeight="700">Departed</Text>;
  const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
  const urgent = diff < 600;
  return (
    <XStack gap={4} items="center">
      <MaterialCommunityIcons name="clock-outline" size={12} color={urgent ? '#F59E0B' : '#22C55E'} />
      <Text color={urgent ? '#F59E0B' : '#22C55E'} fontSize={12} fontWeight="700">
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </Text>
    </XStack>
  );
}

// ─── Ticket Card (single swipeable card) ────────────────────────
function TicketCard({ ticket, onPress, onCancel, width }: { ticket: any; onPress: () => void; onCancel?: () => void; width: number }) {
  const from = ticket.departureName || ticket.stationName || '?';
  const to = ticket.destinationName || ticket.routeName || '?';
  const plate = ticket.vehiclePlate || 'TBA';
  const seats = ticket.seatCount || 1;
  const etdIso = ticket.etdIso || new Date().toISOString();
  const issued = ticket.issuedAt ? dayjs(ticket.issuedAt).format('HH:mm') : '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width, marginRight: 12 }, pressed && { opacity: 0.95 }]}>
      <View style={ticketStyles.card}>
        {/* Header with gradient feel */}
        <View style={ticketStyles.header}>
          <XStack items="center" justify="space-between">
            <XStack gap="$2" items="center">
              <View style={ticketStyles.iconBox}>
                <MaterialCommunityIcons name="ticket-confirmation" size={15} color="#0A0F19" />
              </View>
              <YStack gap={1}>
                <Text color="#F0F4FF" fontSize={13} fontWeight="700">Active Ticket</Text>
                <Text color="#556580" fontSize={10}>{issued && `Booked ${issued}`}</Text>
              </YStack>
            </XStack>
            <CountdownTimer targetIso={etdIso} />
          </XStack>
        </View>

        {/* Route visualization */}
        <View style={ticketStyles.routeSection}>
          <YStack flex={1} gap={4}>
            <Text color="#556580" fontSize={9} fontWeight="600" letterSpacing={1}>DEPART</Text>
            <Text color="#F0F4FF" fontSize={20} fontWeight="800" letterSpacing={-0.3} numberOfLines={1}>{from}</Text>
            <Text color="#556580" fontSize={11}>{dayjs(etdIso).format('HH:mm')}</Text>
          </YStack>

          <View style={ticketStyles.routeVis}>
            <View style={ticketStyles.routeDotStart} />
            <View style={ticketStyles.routeLine} />
            <MaterialCommunityIcons name="bus" size={18} color="#D4A853" />
            <View style={ticketStyles.routeLine} />
            <View style={ticketStyles.routeDotEnd} />
          </View>

          <YStack flex={1} gap={4} items="flex-end">
            <Text color="#556580" fontSize={9} fontWeight="600" letterSpacing={1}>ARRIVE</Text>
            <Text color="#F0F4FF" fontSize={20} fontWeight="800" letterSpacing={-0.3} text="right" numberOfLines={1}>{to}</Text>
            <Text color="#556580" fontSize={11}>~{Math.floor(Math.random() * 45 + 15)}min ride</Text>
          </YStack>
        </View>

        {/* Footer details */}
        <View style={ticketStyles.footer}>
          <View style={ticketStyles.footerItem}>
            <MaterialCommunityIcons name="card-bulleted" size={13} color="#556580" />
            <Text color="#8899B4" fontSize={11} fontWeight="600">{plate}</Text>
          </View>
          <View style={ticketStyles.footerDiv} />
          <View style={ticketStyles.footerItem}>
            <MaterialCommunityIcons name="account-group" size={13} color="#556580" />
            <Text color="#8899B4" fontSize={11} fontWeight="600">{seats} seat{seats > 1 ? 's' : ''}</Text>
          </View>
          <View style={ticketStyles.footerDiv} />
          <Pressable onPress={onPress} style={ticketStyles.qrBadge}>
            <MaterialCommunityIcons name="qrcode" size={16} color="#D4A853" />
            <Text color="#D4A853" fontSize={10} fontWeight="700">VIEW</Text>
          </Pressable>
        </View>

        {/* Status strip */}
        <View style={ticketStyles.statusStrip}>
          <View style={ticketStyles.statusDot} />
          <Text color="#22C55E" fontSize={10} fontWeight="600">Confirmed</Text>
          {onCancel && (
            <Pressable onPress={onCancel} style={{ marginLeft: 'auto' }} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle-outline" size={18} color="#EF4444" />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const ticketStyles = StyleSheet.create({
  card: {
    borderRadius: 20, backgroundColor: '#0D1525',
    borderWidth: 1, borderColor: 'rgba(212,168,83,0.12)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  header: { padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  iconBox: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#D4A853', alignItems: 'center', justifyContent: 'center' },
  routeSection: { flexDirection: 'row', alignItems: 'flex-start', padding: 18, gap: 10 },
  routeVis: { alignItems: 'center', paddingTop: 26, width: 50 },
  routeDotStart: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#0D1525' },
  routeDotEnd: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D4A853', borderWidth: 2, borderColor: '#0D1525' },
  routeLine: { width: 2, height: 16, backgroundColor: '#1E2D45' },
  footer: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 0, gap: 10 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerDiv: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.06)' },
  qrBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(212,168,83,0.1)' },
  statusStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(34,197,94,0.06)', borderTopWidth: 1, borderTopColor: 'rgba(34,197,94,0.1)' },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22C55E' },
});

// ─── Book Ride Prompt ───────────────────────────────────────────
function BookRidePrompt({ stationsCount, onPress }: { stationsCount: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [promptStyles.card, pressed && { opacity: 0.92 }]}>
      <View style={promptStyles.gradient} />
      <YStack gap={16} items="center" py={8}>
        <View style={promptStyles.iconCircle}>
          <MaterialCommunityIcons name="bus-marker" size={32} color="#D4A853" />
        </View>
        <YStack gap={4} items="center">
          <Text color="#F0F4FF" fontSize={20} fontWeight="700" letterSpacing={-0.3}>Ready to ride?</Text>
          <Text color="#8899B4" fontSize={13} text="center" lineHeight={18}>
            {stationsCount > 0 ? `${stationsCount} stations available — tap to book your seat` : 'Browse stations and book your next trip'}
          </Text>
        </YStack>
        <View style={promptStyles.cta}>
          <Text color="#0A0F19" fontSize={15} fontWeight="700">Find a ride</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#0A0F19" />
        </View>
      </YStack>
    </Pressable>
  );
}

const promptStyles = StyleSheet.create({
  card: {
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(212,168,83,0.10)',
    backgroundColor: '#0D1525', padding: 28, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  gradient: { position: 'absolute', top: -60, left: '20%', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(212,168,83,0.04)' },
  iconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(212,168,83,0.1)', alignItems: 'center', justifyContent: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D4A853', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
});

// ─── Main Screen ─────────────────────────────────────────────────
export default function MainScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const ticketListRef = useRef<FlatList>(null);
  const stationSheetRef = useRef<BottomSheetModal>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const snapPoints = useMemo(() => ['70%', '95%'], []);
  const [bookingStep, setBookingStep] = useState<'station' | 'routes'>('station');
  const [fetchedRoutes, setFetchedRoutes] = useState<RouteData[] | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [draftStation, setDraftStation] = useState<StationWithDistance | null>(null);
  const routesAbortRef = useRef<AbortController | null>(null);
  const tabBarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stores
  const tickets = useBookingStore((s) => s.tickets);
  const { stations, nearbyStations, setStations, setNearbyStations } = useStationStore();
  const { clearLiveMetricsForStation } = useBookingRoutesLiveStore();
  const { isOffline, bumpReconnectEpoch } = useConnectivityStore();
  const realtimeStatus = useRealtimeStore((s) => s.status);

  // Location
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const resolveLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let pos = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
      if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (pos) setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch { /* */ }
    finally { setLocating(false); }
  }, []);
  useEffect(() => { void resolveLocation(); }, [resolveLocation]);

  // Stations
  const stationsQuery = useQuery({
    queryKey: ['central-stations', 'v2'],
    queryFn: async () => { const list = await getStations(); setStations(list); return list; },
    staleTime: 15_000, refetchInterval: 30_000, retry: 2, enabled: !isOffline,
  });

  useEffect(() => {
    if (stations.length === 0) { setNearbyStations([]); return; }
    const sorted = stations
      .filter((s) => s.status === 'online')
      .map((s) => ({ ...s, distanceKm: (userCoords && hasCoords(s)) ? haversineKm(userCoords.lat, userCoords.lng, Number(s.lat), Number(s.lng)) : MAX_DISTANCE_KM }))
      .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name));
    setNearbyStations(sorted);
  }, [stations, userCoords]);

  // Tab bar sync
  const syncTab = useCallback((hidden: boolean) => {
    if (tabBarTimer.current) clearTimeout(tabBarTimer.current);
    tabBarTimer.current = setTimeout(() => navigation.setOptions({ tabBarStyle: hidden ? SHEET_HIDDEN : TAB_BAR_STYLE }), hidden ? 0 : 80);
  }, [navigation]);

  // Station picker
  const openPicker = useCallback(() => {
    setBookingStep('station'); setFetchedRoutes(null); setSelectedRouteId('');
    stationSheetRef.current?.present();
  }, []);

  const onSheetChange = useCallback((idx: number) => {
    syncTab(idx >= 0);
    if (idx < 0) { clearLiveMetricsForStation(draftStation?.id ?? ''); setDraftStation(null); setFetchedRoutes(null); setSelectedRouteId(''); }
  }, [syncTab, clearLiveMetricsForStation, draftStation]);

  const fetchRoutes = useCallback(async (station: StationWithDistance) => {
    setLoadingRoutes(true); setBookingStep('routes'); setDraftStation(station);
    routesAbortRef.current?.abort();
    const ac = new AbortController(); routesAbortRef.current = ac;
    try { const r = await getStationRoutes(station.id, { signal: ac.signal }); if (!ac.signal.aborted) setFetchedRoutes(r); }
    catch { if (!ac.signal.aborted) setFetchedRoutes([]); }
    finally { if (!ac.signal.aborted) setLoadingRoutes(false); }
  }, []);

  const continueToBooking = useCallback(() => {
    if (!selectedRouteId || !draftStation || !fetchedRoutes) return;
    const route = fetchedRoutes.find((r) => String(r.id) === selectedRouteId);
    if (!route) return;
    const meta = buildBookingRouteMeta(route, draftStation.name);
    router.push({
      pathname: '/(app)/booking',
      params: {
        stationId: draftStation.id, stationName: draftStation.name,
        routeId: meta.routeId, routeName: meta.routeName,
        departureName: meta.departureName, destinationName: meta.destinationName,
        availableSeats: String(meta.availableSeats), pricePerSeat: String(meta.pricePerSeat),
        totalPrice: String(meta.pricePerSeat), etdIso: meta.etdIso, etdLabel: meta.etdLabel,
      },
    });
    stationSheetRef.current?.close();
  }, [selectedRouteId, draftStation, fetchedRoutes, router]);

  const [refreshing, setRefreshing] = useState(false);
  const [stationSearch, setStationSearch] = useState('');
  const onRefresh = useCallback(async () => { setRefreshing(true); await resolveLocation(); await stationsQuery.refetch(); bumpReconnectEpoch(); setRefreshing(false); }, []);

  // Filtered stations for search
  const filteredStations = useMemo(() => {
    if (!stationSearch.trim()) return nearbyStations;
    const q = stationSearch.toLowerCase();
    return nearbyStations.filter((s) => s.name.toLowerCase().includes(q));
  }, [nearbyStations, stationSearch]);

  // Cancel a ticket
  const handleCancelTicket = useCallback((ticketId: string) => {
    Alert.alert('Cancel this trip?', 'The seat hold will be released.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel trip', style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(ticketId);
            useBookingStore.getState().tickets = useBookingStore.getState().tickets.filter((t: any) => t.id !== ticketId);
          } catch { Alert.alert('Error', 'Could not cancel. Try again.'); }
        },
      },
    ]);
  }, []);

  const topPad = Math.max(insets.top + 10, 52);
  const bottomPad = Math.max(insets.bottom, 16) + 100;
  const stationCount = nearbyStations.length;
  const hasTickets = tickets.length > 0;
  const activeIdx = pageIndex;

  return (
    <BottomSheetModalProvider>
      <YStack flex={1} bg="#060B14">
        <ScrollView
          contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4A853" />}
        >
          {/* Header */}
          <XStack items="center" justify="space-between" mb={16}>
            <YStack gap={2}>
              <Text color="#556580" fontSize={11} fontWeight="600" letterSpacing={1.5}>WASLA</Text>
              <Text color="#F0F4FF" fontSize={26} fontWeight="700" letterSpacing={-0.5}>
                {hasTickets ? 'Your trips' : 'Where to?'}
              </Text>
            </YStack>
            <XStack gap={12} items="center">
              {locating && <ActivityIndicator size="small" color="#D4A853" />}
              {realtimeStatus === 'connected' && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' }} />}
              <Pressable onPress={() => router.push('/(app)/settings')}>
                <BrandLogo size={36} borderRadius={10} />
              </Pressable>
            </XStack>
          </XStack>

          {/* Ticket Carousel or Book Prompt */}
          {hasTickets ? (
            <View style={{ marginBottom: 24 }}>
              <FlatList
                ref={ticketListRef}
                data={tickets}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + 12}
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => setPageIndex(Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 12)))}
                keyExtractor={(t) => t.id}
                renderItem={({ item: t }) => (
                  <TicketCard ticket={t} width={CARD_WIDTH}
                    onPress={() => router.push({ pathname: '/(app)/ticket', params: { ticketId: t.id } })}
                    onCancel={() => handleCancelTicket(t.id)}
                  />
                )}
              />
              {/* Page dots */}
              {tickets.length > 1 && (
                <XStack justify="center" gap={6} mt={12}>
                  {tickets.map((_, i) => (
                    <View key={i} style={{ width: i === activeIdx ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === activeIdx ? '#D4A853' : '#1E2D45' }} />
                  ))}
                </XStack>
              )}
            </View>
          ) : (
            <View style={{ marginBottom: 24 }}>
              <BookRidePrompt stationsCount={stationCount} onPress={openPicker} />
            </View>
          )}

          {/* Quick stations */}
          <YStack gap={10}>
            <XStack items="center" justify="space-between">
              <Text color="#8899B4" fontSize={11} fontWeight="600" letterSpacing={1.2}>NEARBY STATIONS</Text>
              {stationCount > 3 && <Pressable onPress={openPicker}><Text color="#D4A853" fontSize={11} fontWeight="600">View all</Text></Pressable>}
            </XStack>

            {stationsQuery.isLoading ? (
              <SkeletonList count={3} />
            ) : stationCount === 0 ? (
              <YStack items="center" py={32} gap={8}>
                <MaterialCommunityIcons name="map-marker-off" size={24} color="#3A4A60" />
                <Text color="#556580" fontSize={12}>No stations nearby</Text>
              </YStack>
            ) : (
              nearbyStations.slice(0, 3).map((s) => (
                <Pressable key={s.id} onPress={() => { setDraftStation(s); fetchRoutes(s); stationSheetRef.current?.present(); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#0D1525', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }, pressed && { opacity: 0.7 }]}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="bus-stop" size={18} color="#8899B4" />
                  </View>
                  <YStack flex={1}>
                    <Text color="#F0F4FF" fontSize={14} fontWeight="600">{s.name}</Text>
                    <Text color="#556580" fontSize={11}>{formatKm((s as StationWithDistance).distanceKm)}{' · '}{s.status === 'online' ? 'Online' : 'Offline'}</Text>
                  </YStack>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.status === 'online' ? '#22C55E' : '#EF4444' }} />
                  <MaterialCommunityIcons name="chevron-right" size={16} color="#3A4A60" />
                </Pressable>
              ))
            )}
          </YStack>
        </ScrollView>

        {/* FAB: Quick Book */}
        {hasTickets && (
          <Pressable onPress={openPicker} style={({ pressed }) => [fabStyles.button, { bottom: bottomPad - 20 }, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}>
            <MaterialCommunityIcons name="plus" size={24} color="#0A0F19" />
          </Pressable>
        )}

        {/* Booking Bottom Sheet */}
        <BottomSheetModal
          ref={stationSheetRef}
          index={1} snapPoints={snapPoints}
          onChange={onSheetChange}
          enablePanDownToClose
          backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />}
          backgroundStyle={{ backgroundColor: '#0D1525', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
          handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.12)', width: 36 }}
        >
          <YStack flex={1} px={16} pt={4}>
            {bookingStep === 'station' ? (
              <>
                <Text color="#F0F4FF" fontSize={17} fontWeight="700" mb={8}>Pick departure station</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111D2E', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                  <MaterialCommunityIcons name="magnify" size={18} color="#556580" />
                  <TextInput
                    style={{ flex: 1, color: '#F0F4FF', paddingVertical: 12, paddingHorizontal: 8, fontSize: 14 }}
                    placeholder="Search stations..."
                    placeholderTextColor="#3A4A60"
                    value={stationSearch}
                    onChangeText={setStationSearch}
                  />
                  {stationSearch.length > 0 && (
                    <Pressable onPress={() => setStationSearch('')}>
                      <MaterialCommunityIcons name="close-circle" size={18} color="#556580" />
                    </Pressable>
                  )}
                </View>
                <BottomSheetFlatList
                  data={filteredStations}
                  keyExtractor={(item: StationWithDistance) => item.id}
                  renderItem={({ item }: { item: StationWithDistance }) => (
                    <Pressable onPress={() => fetchRoutes(item)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#0D1525', marginBottom: 6 }, pressed && { opacity: 0.7 }]}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(212,168,83,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <MaterialCommunityIcons name="bus-stop" size={18} color="#D4A853" />
                      </View>
                      <YStack flex={1} gap={2}>
                        <Text color="#F0F4FF" fontSize={15} fontWeight="600">{item.name}</Text>
                        <Text color="#556580" fontSize={11}>{formatKm(item.distanceKm)}</Text>
                      </YStack>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#3A4A60" />
                    </Pressable>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              </>
            ) : (
              <>
                <XStack items="center" mb={12} gap={8}>
                  <Pressable onPress={() => { setBookingStep('station'); setFetchedRoutes(null); }}>
                    <MaterialCommunityIcons name="chevron-left" size={24} color="#8899B4" />
                  </Pressable>
                  <Text color="#F0F4FF" fontSize={17} fontWeight="700">{draftStation?.name}</Text>
                </XStack>
                {loadingRoutes ? <ActivityIndicator size="large" color="#D4A853" style={{ marginTop: 40 }} /> : (
                  <BottomSheetFlatList
                    data={fetchedRoutes || []}
                    keyExtractor={(item: RouteData) => String(item.id)}
                    renderItem={({ item }: { item: RouteData }) => (
                      <DestinationQueueRow
                        item={item} stationId={draftStation?.id ?? ''} stationName={draftStation?.name ?? ''}
                        selectedRouteId={selectedRouteId || null}
                        onSelectRouteId={(id: string) => setSelectedRouteId(id)}
                      />
                    )}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text color="#556580" text="center" mt={24}>No routes available</Text>}
                  />
                )}
                {selectedRouteId ? (
                  <Pressable onPress={continueToBooking} style={{ marginTop: 8, marginBottom: 24, backgroundColor: '#D4A853', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
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

const fabStyles = StyleSheet.create({
  button: {
    position: 'absolute', right: 20, width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#D4A853', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#D4A853', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10,
  },
});
