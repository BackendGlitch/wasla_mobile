import { useEffect, useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { formatCurrency } from '../../src/lib/bookingFlow';
import { singleRouteParam } from '../../src/lib/postAuthFlow';
import { useBookingStore } from '../../src/store';
import { appColors } from '../../src/theme/appTheme';

export default function BookingScreen() {
  const router = useRouter();
  const setDraft = useBookingStore((state) => state.setDraft);
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
    vehiclePlate?: string | string[];
  }>();

  const stationId = singleRouteParam(params.stationId) ?? '';
  const stationName = singleRouteParam(params.stationName) ?? 'Depart station';
  const routeId = singleRouteParam(params.routeId) ?? '';
  const routeName = singleRouteParam(params.routeName) ?? 'Selected route';
  const departureName = singleRouteParam(params.departureName) ?? stationName;
  const destinationName = singleRouteParam(params.destinationName) ?? routeName;
  const pricePerSeat = Number(singleRouteParam(params.pricePerSeat) ?? 0) || 0;
  const availableSeats = Number(singleRouteParam(params.availableSeats) ?? 0) || 0;
  const etdIso = singleRouteParam(params.etdIso) ?? new Date().toISOString();
  const etdLabel = singleRouteParam(params.etdLabel) ?? '--:--';
  const vehiclePlate = singleRouteParam(params.vehiclePlate) ?? 'Pending';
  const [seatCount, setSeatCount] = useState(availableSeats > 0 ? 1 : 0);

  useEffect(() => {
    if (availableSeats <= 0) {
      setSeatCount(0);
      return;
    }
    setSeatCount((current) => {
      if (current <= 0) return 1;
      return Math.min(current, availableSeats);
    });
  }, [availableSeats]);

  const totalPrice = useMemo(() => seatCount * pricePerSeat, [pricePerSeat, seatCount]);
  const canContinue = availableSeats > 0 && seatCount > 0;

  useEffect(() => {
    if (!canContinue) return;

    setDraft({
      stationId,
      stationName,
      routeId,
      routeName,
      departureName,
      destinationName,
      availableSeats,
      seatCount,
      pricePerSeat,
      totalPrice,
      etdIso,
      etdLabel,
      vehiclePlate,
    });
  }, [
    availableSeats,
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
    vehiclePlate,
  ]);

  const handleContinue = () => {
    if (!canContinue) return;

    router.push({
      pathname: '/(app)/payment',
      params: {
        stationId,
        stationName,
        routeId,
        routeName,
        departureName,
        destinationName,
        availableSeats: String(availableSeats),
        seatCount: String(seatCount),
        pricePerSeat: String(pricePerSeat),
        totalPrice: String(totalPrice),
        etdIso,
        etdLabel,
        vehiclePlate,
      },
    });
  };

  return (
    <YStack flex={1} bg={appColors.bg}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <XStack items="center" gap="$2">
            <MaterialCommunityIcons name="arrow-left" size={20} color={appColors.textPrimary} />
            <Text color={appColors.textPrimary} fontSize="$4" fontWeight="700">
              Back
            </Text>
          </XStack>
        </Pressable>

        <YStack gap="$5">
          <YStack gap="$2">
            <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.7}>
              SEAT SELECTOR
            </Text>
            <Text color={appColors.textPrimary} fontSize="$10" fontWeight="800">
              How many seats will you book?
            </Text>
            <Text color={appColors.textSecondary} fontSize="$4">
              Review the route details, set the seat count, then continue to payment.
            </Text>
          </YStack>

          <View style={styles.counterCard}>
            <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.6}>
              SEAT COUNT
            </Text>

            <View style={styles.counterCircle}>
              <Text color={appColors.textPrimary} fontSize="$12" fontWeight="800">
                {seatCount}
              </Text>
            </View>

            <XStack justify="space-between" gap="$3">
              <Pressable
                disabled={seatCount <= 1}
                onPress={() => setSeatCount((count) => Math.max(1, count - 1))}
                style={({ pressed }) => [
                  styles.counterButton,
                  seatCount <= 1 ? styles.disabledControl : null,
                  pressed && seatCount > 1 ? styles.buttonPressed : null,
                ]}
              >
                <MaterialCommunityIcons name="minus" size={22} color={appColors.textPrimary} />
              </Pressable>

              <Pressable
                disabled={seatCount >= availableSeats}
                onPress={() => setSeatCount((count) => Math.min(availableSeats, count + 1))}
                style={({ pressed }) => [
                  styles.counterButton,
                  seatCount >= availableSeats ? styles.disabledControl : null,
                  pressed && seatCount < availableSeats ? styles.buttonPressed : null,
                ]}
              >
                <MaterialCommunityIcons name="plus" size={22} color={appColors.textPrimary} />
              </Pressable>
            </XStack>

            <Text color={appColors.textSecondary} fontSize="$3" style={styles.centerText}>
              {availableSeats > 0
                ? `${availableSeats} seats are currently available on this route.`
                : 'This route is currently full.'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text color={appColors.textPrimary} fontSize="$6" fontWeight="800">
              Trip details
            </Text>

            <YStack mt="$4" gap="$3">
              <SummaryRow label="Depart station" value={stationName} />
              <SummaryRow label="Arrival station" value={destinationName} />
              <SummaryRow label="Route" value={routeName} />
              <SummaryRow label="ETD" value={etdLabel} />
              <SummaryRow label="Price per seat" value={formatCurrency(pricePerSeat)} />
              <SummaryRow label="Total price" value={formatCurrency(totalPrice)} highlight />
            </YStack>
          </View>

          <Pressable
            disabled={!canContinue}
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              !canContinue ? styles.disabledControl : null,
              pressed && canContinue ? styles.buttonPressed : null,
            ]}
          >
            <Text color={appColors.bg} fontSize="$4" fontWeight="800">
              Continue to payment
            </Text>
          </Pressable>
        </YStack>
      </ScrollView>
    </YStack>
  );
}

function SummaryRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <XStack items="center" justify="space-between" gap="$3">
      <Text color={appColors.textMuted} fontSize="$3">
        {label}
      </Text>
      <Text color={highlight ? appColors.accent : appColors.textPrimary} fontSize="$4" fontWeight="700">
        {value}
      </Text>
    </XStack>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 48,
    gap: 28,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
  },
  counterCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: appColors.accentGlowSoft,
    backgroundColor: '#143C5C',
    padding: 24,
    alignItems: 'center',
    gap: 20,
  },
  counterCircle: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(154, 62, 62, 0.75)',
  },
  counterButton: {
    width: 84,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(164, 62, 62, 0.82)',
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceStrong,
    padding: 20,
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: appColors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledControl: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  centerText: {
    textAlign: 'center',
  },
});
