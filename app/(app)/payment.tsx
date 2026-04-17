import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { createTicketCode, formatCurrency } from '../../src/lib/bookingFlow';
import { singleRouteParam } from '../../src/lib/postAuthFlow';
import { useBookingStore } from '../../src/store';
import { appColors } from '../../src/theme/appTheme';

export default function PaymentScreen() {
  const router = useRouter();
  const addTicket = useBookingStore((state) => state.addTicket);
  const params = useLocalSearchParams<{
    stationId?: string | string[];
    stationName?: string | string[];
    routeId?: string | string[];
    routeName?: string | string[];
    departureName?: string | string[];
    destinationName?: string | string[];
    availableSeats?: string | string[];
    seatCount?: string | string[];
    pricePerSeat?: string | string[];
    totalPrice?: string | string[];
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
  const availableSeats = Number(singleRouteParam(params.availableSeats) ?? 0) || 0;
  const seatCount = Number(singleRouteParam(params.seatCount) ?? 0) || 0;
  const pricePerSeat = Number(singleRouteParam(params.pricePerSeat) ?? 0) || 0;
  const totalPrice = Number(singleRouteParam(params.totalPrice) ?? 0) || 0;
  const etdIso = singleRouteParam(params.etdIso) ?? new Date().toISOString();
  const etdLabel = singleRouteParam(params.etdLabel) ?? '--:--';
  const vehiclePlate = singleRouteParam(params.vehiclePlate) ?? 'Pending';

  const handleConfirmPayment = () => {
    const id = createTicketCode();
    const issuedAt = new Date().toISOString();

    addTicket({
      id,
      qrValue: id,
      issuedAt,
      paymentStatus: 'confirmed',
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

    router.replace({
      pathname: '/(app)/ticket',
      params: { ticketId: id },
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
              PAYMENT
            </Text>
            <Text color={appColors.textPrimary} fontSize="$10" fontWeight="800">
              Confirm trip and pay
            </Text>
            <Text color={appColors.textSecondary} fontSize="$4">
              This is a placeholder gateway screen until Konnect or Flouci is connected.
            </Text>
          </YStack>

          <View style={styles.paymentCard}>
            <Text color={appColors.textPrimary} fontSize="$6" fontWeight="800">
              Trip summary
            </Text>

            <YStack mt="$4" gap="$3">
              <SummaryRow label="Depart station" value={stationName} />
              <SummaryRow label="Arrival station" value={destinationName} />
              <SummaryRow label="Number of seats" value={`${seatCount}`} />
              <SummaryRow label="ETD" value={etdLabel} />
              <SummaryRow label="Vehicle LP" value={vehiclePlate} />
              <SummaryRow label="Price" value={formatCurrency(totalPrice)} highlight />
            </YStack>
          </View>

          <View style={styles.gatewayCard}>
            <MaterialCommunityIcons name="credit-card-check-outline" size={28} color={appColors.accent} />
            <Text mt="$3" color={appColors.textPrimary} fontSize="$5" fontWeight="700">
              Payment gateway placeholder
            </Text>
            <Text mt="$2" color={appColors.textSecondary} fontSize="$4" style={styles.centerText}>
              When your payment integration is ready, this screen can redirect to the real provider and return here on success.
            </Text>
          </View>

          <Pressable onPress={handleConfirmPayment} style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}>
            <Text color={appColors.bg} fontSize="$4" fontWeight="800">
              Mark payment as confirmed
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
  paymentCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: '#143C5C',
    padding: 20,
  },
  gatewayCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: appColors.accentGlowSoft,
    backgroundColor: appColors.surfaceStrong,
    padding: 24,
    alignItems: 'center',
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: appColors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  centerText: {
    textAlign: 'center',
  },
});
