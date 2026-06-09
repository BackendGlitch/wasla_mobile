import { useCallback, useEffect, useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { isAxiosError } from 'axios';
import { createBooking } from '../../src/lib/bookingApi';
import { formatCurrency } from '../../src/lib/bookingFlow';
import { toUserFacingErrorCopy } from '../../src/lib/networkErrors';
import { singleRouteParam } from '../../src/lib/postAuthFlow';
import { useBookingRoutesLiveStore, useBookingStore, useStationStore } from '../../src/store';
import { appColors } from '../../src/theme/appTheme';

export default function BookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setDraft = useBookingStore((state) => state.setDraft);
  const addTicket = useBookingStore((state) => state.addTicket);
  const contentPadTop = Math.max(insets.top + 16, 56);

  const navigateBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)');
  };
  const params = useLocalSearchParams<{
    routeId?: string | string[];
    routeName?: string | string[];
    stationId?: string | string[];
    stationName?: string | string[];
    departureName?: string | string[];
    destinationName?: string | string[];
    availableSeats?: string | string[];
    pricePerSeat?: string | string[];
    etdIso?: string | string[];
    etdLabel?: string | string[];
  }>();

  /** Router params can drop on some navigations — fall back to the station already selected on Home. */
  const selectedStation = useStationStore((s) => s.selectedStation);
  const stationIdParam = singleRouteParam(params.stationId) ?? '';
  const stationId =
    stationIdParam.trim() || selectedStation?.id?.trim() || '';
  const stationName =
    (singleRouteParam(params.stationName) ?? '').trim() ||
    selectedStation?.name?.trim() ||
    'Depart station';
  const routeId = singleRouteParam(params.routeId) ?? '';
  const routeName = singleRouteParam(params.routeName) ?? 'Selected route';
  const departureName = singleRouteParam(params.departureName) ?? stationName;
  const destinationName = singleRouteParam(params.destinationName) ?? routeName;
  const pricePerSeat = Number(singleRouteParam(params.pricePerSeat) ?? 0) || 0;
  const availableSeatsParam = Number(singleRouteParam(params.availableSeats) ?? 0) || 0;
  const etdIso = singleRouteParam(params.etdIso) ?? new Date().toISOString();
  const etdLabel = singleRouteParam(params.etdLabel) ?? '--:--';

  const liveSeats = useBookingRoutesLiveStore(
    useCallback(
      (s) => (stationId && routeId ? s.metricsByStation[stationId]?.[routeId]?.available_seats : undefined),
      [stationId, routeId],
    ),
  );

  const availableSeatsLive =
    typeof liveSeats === 'number' ? liveSeats : availableSeatsParam;

  const [seatCount, setSeatCount] = useState(availableSeatsLive > 0 ? 1 : 0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (availableSeatsLive <= 0) {
      setSeatCount(0);
      return;
    }
    setSeatCount((current) => {
      if (current <= 0) return 1;
      return Math.min(current, availableSeatsLive);
    });
  }, [availableSeatsLive]);

  const totalPrice = useMemo(() => seatCount * pricePerSeat, [pricePerSeat, seatCount]);
  const canContinue = availableSeatsLive > 0 && seatCount > 0;

  useEffect(() => {
    if (!canContinue) return;

    setDraft({
      stationId,
      stationName,
      routeId,
      routeName,
      departureName,
      destinationName,
      availableSeats: availableSeatsLive,
      seatCount,
      pricePerSeat,
      totalPrice,
      etdIso,
      etdLabel,
      vehiclePlate: 'Pending',
    });
  }, [
    availableSeatsLive,
    canContinue,
    departureName,
    destinationName,
    etdIso,
    etdLabel,
    pricePerSeat,
    routeId,
    routeName,
    seatCount,
    setDraft,
    stationId,
    stationName,
    totalPrice,
  ]);

  const handleContinue = async () => {
    if (!canContinue || submitting) return;

    const sid = stationId.trim();
    const rid = String(routeId).trim();
    if (!sid || !rid) {
      Alert.alert(
        'Cannot continue',
        'Missing station or route. Go back to the booking sheet and pick your depart station and destination again.',
      );
      return;
    }

    setSubmitting(true);
    try {
      // NexaPay uses millimes — convert TND to millimes
      const amountInMillimes = Math.round(totalPrice * 1000);
      const res = await createBooking({
        station_id: sid,
        stationId: sid,
        destination_id: rid,
        destinationId: rid,
        seats_booked: seatCount,
        amount: amountInMillimes,
      });
      const centralBookingId =
        typeof res?.booking_id === 'string'
          ? res.booking_id
          : typeof res?.bookingId === 'string'
            ? res.bookingId
            : '';

      if (!centralBookingId) {
        throw new Error('Server did not return a booking reference.');
      }

      // Placeholder mode: ticket returned immediately — skip payment, go to ticket
      const ticket = (res as any)?.ticket;
      if (ticket?.id) {
        addTicket({
          id: ticket.id,
          qrValue: ticket.qr_payload ?? '',
          issuedAt: new Date().toISOString(),
          paymentStatus: 'confirmed',
          stationId: ticket.station_id ?? sid,
          stationName,
          routeId: rid,
          routeName,
          departureName,
          destinationName,
          availableSeats,
          seatCount: ticket.seats_booked ?? seatCount,
          pricePerSeat,
          totalPrice,
          etdIso,
          etdLabel,
          vehiclePlate: ticket.vehicle_plate ?? 'Assigned',
        });
        router.replace({ pathname: '/(app)/ticket', params: { ticketId: ticket.id } });
        return;
      }

      const paymentUrl =
        typeof res?.payment_url === 'string'
          ? res.payment_url
          : typeof res?.paymentUrl === 'string'
            ? res.paymentUrl
            : '';

      router.push({
        pathname: '/(app)/payment',
        params: {
          centralBookingId,
          paymentUrl,
          stationId,
          stationName,
          routeId,
          routeName,
          departureName,
          destinationName,
          availableSeats: String(availableSeatsLive),
          seatCount: String(seatCount),
          pricePerSeat: String(pricePerSeat),
          totalPrice: String(totalPrice),
          etdIso,
          etdLabel,
        },
      });
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        Alert.alert('Sign in required', 'Please sign in to reserve seats.');
        return;
      }
      const friendly = toUserFacingErrorCopy(error, 'Could not hold seats at this station.');
      Alert.alert(
        friendly.title,
        (friendly.detail ?? '').trim() || 'Please try again in a moment.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <YStack flex={1} bg={appColors.bg}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: contentPadTop }]}>
        <View style={styles.screenGlow} pointerEvents="none" />
        <Pressable onPress={navigateBack} style={styles.backButton}>
          <XStack items="center" gap="$2">
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.textPrimary} />
            <Text color={appColors.textPrimary} fontSize="$4" fontWeight="700">
              Back
            </Text>
          </XStack>
        </Pressable>

        <YStack gap="$5">
          <YStack gap="$3">
            <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.7}>
              DESTINATION
            </Text>
            <Text color={appColors.textPrimary} fontSize="$10" fontWeight="800">
              {destinationName}
            </Text>

            <YStack
              gap="$2"
              p="$4"
              borderWidth={1}
              borderColor={appColors.border}
              bg={appColors.surfaceStrong}
              rounded="$5"
            >
              <XStack justify="space-between" items="center" gap="$3">
                <Text color={appColors.textMuted} fontSize="$3">
                  Base (per seat)
                </Text>
                <Text color={appColors.textPrimary} fontSize="$4" fontWeight="700">
                  {formatCurrency(pricePerSeat)}
                </Text>
              </XStack>
              <XStack justify="space-between" items="center" gap="$3">
                <Text color={appColors.textMuted} fontSize="$3">
                  Total
                </Text>
                <Text color={appColors.accent} fontSize="$5" fontWeight="800">
                  {formatCurrency(totalPrice)}
                </Text>
              </XStack>
              <Text color={appColors.textMuted} fontSize="$3">
                Seats available now:{' '}
                <Text color={appColors.textPrimary} fontWeight="700">
                  {availableSeatsLive}
                </Text>
              </Text>
            </YStack>
          </YStack>

          <View style={styles.counterCard}>
            <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.6}>
              SEATS
            </Text>
            <Text
              mt="$2"
              color={appColors.textPrimary}
              fontSize="$6"
              fontWeight="800"
              style={styles.counterDestination}
            >
              {destinationName}
            </Text>

            <View style={styles.counterCircle}>
              <Text color={appColors.textPrimary} fontSize="$12" fontWeight="800">
                {seatCount}
              </Text>
            </View>

            <XStack justify="space-between" gap="$3">
              <Pressable
                disabled={seatCount <= 1 || availableSeatsLive <= 0}
                onPress={() => setSeatCount((count) => Math.max(1, count - 1))}
                style={({ pressed }) => [
                  styles.counterButton,
                  seatCount <= 1 || availableSeatsLive <= 0 ? styles.disabledControl : null,
                  pressed && seatCount > 1 ? styles.buttonPressed : null,
                ]}
              >
                <MaterialCommunityIcons name="minus" size={22} color={appColors.textPrimary} />
              </Pressable>

              <Pressable
                disabled={seatCount >= availableSeatsLive || availableSeatsLive <= 0}
                onPress={() => setSeatCount((count) => Math.min(availableSeatsLive, count + 1))}
                style={({ pressed }) => [
                  styles.counterButton,
                  seatCount >= availableSeatsLive || availableSeatsLive <= 0
                    ? styles.disabledControl
                    : null,
                  pressed && seatCount < availableSeatsLive ? styles.buttonPressed : null,
                ]}
              >
                <MaterialCommunityIcons name="plus" size={22} color={appColors.textPrimary} />
              </Pressable>
            </XStack>
          </View>

          <Pressable
            disabled={!canContinue || submitting}
            onPress={() => void handleContinue()}
            style={({ pressed }) => [
              styles.primaryButton,
              !canContinue || submitting ? styles.disabledControl : null,
              pressed && canContinue && !submitting ? styles.buttonPressed : null,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={appColors.bg} />
            ) : (
              <Text color={appColors.bg} fontSize="$4" fontWeight="800">
                Continue to payment
              </Text>
            )}
          </Pressable>
        </YStack>
      </ScrollView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 28,
    overflow: 'hidden',
  },
  screenGlow: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: appColors.accentGlowSoft,
    opacity: 0.35,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
  },
  counterCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surface,
    padding: 24,
    alignItems: 'center',
    gap: 18,
  },
  counterDestination: {
    textAlign: 'center',
  },
  counterCircle: {
    width: 124,
    height: 124,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.accentSoft,
  },
  counterButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceStrong,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: appColors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.borderStrong,
  },
  disabledControl: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
