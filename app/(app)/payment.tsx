import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { isAxiosError } from 'axios';
import { confirmBookingInApp } from '../../src/lib/bookingApi';
import { formatCurrency } from '../../src/lib/bookingFlow';
import { toUserFacingErrorCopy } from '../../src/lib/networkErrors';
import { singleRouteParam } from '../../src/lib/postAuthFlow';
import { useBookingStore } from '../../src/store';
import { appColors } from '../../src/theme/appTheme';

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addTicket = useBookingStore((state) => state.addTicket);
  const contentPadTop = Math.max(insets.top + 16, 56);
  const [confirming, setConfirming] = useState(false);

  const navigateBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)');
  };
  const params = useLocalSearchParams<{
    centralBookingId?: string | string[];
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
  }>();

  const centralBookingId = singleRouteParam(params.centralBookingId) ?? '';
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

  const handleConfirmPayment = async () => {
    if (!centralBookingId.trim()) {
      Alert.alert(
        'Missing booking',
        'Go back one step and tap Continue again so we can hold seats at the station.',
      );
      return;
    }
    if (confirming) return;

    setConfirming(true);
    try {
      const data = await confirmBookingInApp(centralBookingId.trim());
      const t = data.ticket;
      if (!t?.id || !t.qr_payload) {
        throw new Error('Invalid ticket response from server.');
      }

      const plate =
        (typeof t.vehicle_plate === 'string' && t.vehicle_plate.trim()) || 'Pending';
      const etdFromServer = t.etd_timestamp
        ? dayjs(t.etd_timestamp).toISOString()
        : etdIso;
      const etdLabelFromServer = t.etd_timestamp
        ? dayjs(t.etd_timestamp).format('HH:mm')
        : etdLabel;
      const issuedAt = t.created_at
        ? dayjs(t.created_at).toISOString()
        : new Date().toISOString();

      addTicket({
        id: t.id,
        qrValue: t.qr_payload,
        issuedAt,
        paymentStatus: 'confirmed',
        stationId: t.station_id ?? stationId,
        stationName,
        routeId,
        routeName,
        departureName,
        destinationName,
        availableSeats,
        seatCount: typeof t.seats_booked === 'number' ? t.seats_booked : seatCount,
        pricePerSeat,
        totalPrice,
        etdIso: etdFromServer,
        etdLabel: etdLabelFromServer,
        vehiclePlate: plate,
      });

      router.replace({
        pathname: '/(app)/ticket',
        params: { ticketId: t.id },
      });
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        Alert.alert('Sign in required', 'Please sign in to complete this booking.');
        return;
      }
      const friendly = toUserFacingErrorCopy(error, 'Could not confirm payment with the station.');
      Alert.alert(
        friendly.title,
        (friendly.detail ?? '').trim() || 'Please try again in a moment.',
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <YStack flex={1} bg={appColors.bg}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: contentPadTop }]}>
        <Pressable onPress={navigateBack} style={styles.backButton}>
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
          </YStack>

          <View style={styles.paymentCard}>
            <Text color={appColors.textPrimary} fontSize="$6" fontWeight="800">
              Trip summary
            </Text>

            <YStack mt="$4" gap="$3">
              <SummaryRow label="Destination" value={destinationName} />
              <SummaryRow label="Number of seats" value={`${seatCount}`} />
              <MaskedVehicleLpRow />
              <SummaryRow label="Price" value={formatCurrency(totalPrice)} highlight />
            </YStack>
          </View>

          <Pressable
            disabled={confirming}
            onPress={() => void handleConfirmPayment()}
            style={({ pressed }) => [
              styles.primaryButton,
              confirming ? styles.disabledControl : null,
              pressed && !confirming ? styles.buttonPressed : null,
            ]}
          >
            {confirming ? (
              <ActivityIndicator color={appColors.bg} />
            ) : (
              <Text color={appColors.bg} fontSize="$4" fontWeight="800">
                Mark payment as confirmed
              </Text>
            )}
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

/** Do not render a real plate here — assignment comes from the station only after confirm. */
function MaskedVehicleLpRow() {
  return (
    <YStack gap="$1.5">
      <XStack items="center" justify="space-between" gap="$3">
        <Text color={appColors.textMuted} fontSize="$3">
          Vehicle LP
        </Text>
        <View style={styles.lpMaskShell}>
          <Text
            selectable={false}
            color={appColors.textPrimary}
            fontSize="$4"
            fontWeight="700"
            style={styles.lpUnderlayText}
          >
            ···· ···· ····
          </Text>
          <BlurView
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            intensity={Platform.OS === 'android' ? 70 : 50}
            tint="dark"
            style={styles.lpBlur}
          />
        </View>
      </XStack>
      <Text color={appColors.textMuted} fontSize="$2">
        The real license plate is loaded from the station after you confirm payment.
      </Text>
    </YStack>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
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
  lpMaskShell: {
    position: 'relative',
    minWidth: 120,
    maxWidth: '62%',
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  lpUnderlayText: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    textAlign: 'right',
    letterSpacing: 2,
  },
  lpBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
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
});
