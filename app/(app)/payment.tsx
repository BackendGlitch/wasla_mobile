import { useCallback, useEffect, useRef, useState } from 'react';
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
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { Text, XStack, YStack } from 'tamagui';
import { isAxiosError } from 'axios';
import { confirmBookingInApp, getBooking } from '../../src/lib/bookingApi';
import { formatCurrency } from '../../src/lib/bookingFlow';
import { toUserFacingErrorCopy } from '../../src/lib/networkErrors';
import { singleRouteParam } from '../../src/lib/postAuthFlow';
import { useBookingStore } from '../../src/store';
import { appColors } from '../../src/theme/appTheme';

type PollState = 'idle' | 'polling' | 'confirmed' | 'error';

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addTicket = useBookingStore((state) => state.addTicket);
  const contentPadTop = Math.max(insets.top + 16, 56);
  const [confirming, setConfirming] = useState(false);
  const [webViewOpen, setWebViewOpen] = useState(false);
  const [pollState, setPollState] = useState<PollState>('idle');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const params = useLocalSearchParams<{
    centralBookingId?: string | string[];
    paymentUrl?: string | string[];
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
  const paymentUrl = singleRouteParam(params.paymentUrl) ?? '';
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

  const hasRealPaymentUrl =
    paymentUrl.trim().length > 0 && !paymentUrl.includes('placeholder');

  // ── Polling for booking confirmation ───────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (!centralBookingId.trim()) return;
    stopPolling();
    setPollState('polling');

    const poll = async () => {
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const booking = await getBooking(centralBookingId.trim(), {
          signal: ac.signal,
        });
        if (booking.status === 'CONFIRMED') {
          stopPolling();
          setPollState('confirmed');
          setWebViewOpen(false);
          // Navigate to ticket using the confirmed booking
          router.replace({
            pathname: '/(app)/ticket',
            params: { bookingId: centralBookingId.trim() },
          });
        }
      } catch {
        // Silently retry on next interval
      }
    };

    pollRef.current = setInterval(poll, 2500);
    // Fire immediately on start
    void poll();
  }, [centralBookingId, stopPolling, router]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ── WebView navigation handler ──────────────────────────────
  const handleWebViewNavigation = useCallback(
    (navState: WebViewNavigation) => {
      const url = navState.url.toLowerCase();
      // NexaPay redirects after payment completion
      if (
        url.includes('/success') ||
        url.includes('payment_success') ||
        url.includes('checkout/success')
      ) {
        // Payment page indicates success — start polling for confirmation
        startPolling();
      }
      if (
        url.includes('/cancel') ||
        url.includes('/failure') ||
        url.includes('payment_failed')
      ) {
        setWebViewOpen(false);
        stopPolling();
        Alert.alert(
          'Payment cancelled',
          'The payment was not completed. Your seat hold will expire shortly.',
        );
      }
    },
    [startPolling, stopPolling],
  );

  // ── Placeholder / fallback confirmation ────────────────────
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
      const friendly = toUserFacingErrorCopy(
        error,
        'Could not confirm payment with the station.',
      );
      Alert.alert(
        friendly.title,
        (friendly.detail ?? '').trim() || 'Please try again in a moment.',
      );
    } finally {
      setConfirming(false);
    }
  };

  const navigateBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)');
  };

  // ── If WebView is open, show full-screen payment ────────────
  if (webViewOpen && hasRealPaymentUrl) {
    return (
      <View style={styles.webViewContainer}>
        <View style={[styles.webViewHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => {
              setWebViewOpen(false);
              stopPolling();
            }}
            style={styles.webViewClose}
          >
            <MaterialCommunityIcons
              name="close"
              size={22}
              color={appColors.textPrimary}
            />
            <Text color={appColors.textPrimary} fontSize="$3" fontWeight="600" ml="$2">
              Cancel payment
            </Text>
          </Pressable>
          {pollState === 'polling' && (
            <XStack items="center" gap="$2">
              <ActivityIndicator size="small" color={appColors.accent} />
              <Text color={appColors.accent} fontSize="$2">
                Waiting for confirmation...
              </Text>
            </XStack>
          )}
        </View>
        <WebView
          source={{ uri: paymentUrl.trim() }}
          onNavigationStateChange={handleWebViewNavigation}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator
              size="large"
              color={appColors.accent}
              style={styles.webViewLoader}
            />
          )}
          style={styles.webView}
        />
      </View>
    );
  }

  // ── Standard payment review screen ──────────────────────────
  return (
    <YStack flex={1} bg={appColors.bg}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: contentPadTop }]}
      >
        <View style={styles.screenGlow} pointerEvents="none" />
        <Pressable onPress={navigateBack} style={styles.backButton}>
          <XStack items="center" gap="$2">
            <MaterialCommunityIcons
              name="arrow-left"
              size={20}
              color={appColors.textPrimary}
            />
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
              Review and pay
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
              <SummaryRow
                label="Price"
                value={formatCurrency(totalPrice)}
                highlight
              />
            </YStack>
          </View>

          {hasRealPaymentUrl ? (
            <Pressable
              onPress={() => {
                setWebViewOpen(true);
                startPolling();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text color={appColors.bg} fontSize="$4" fontWeight="800">
                Pay with NexaPay
              </Text>
            </Pressable>
          ) : (
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
                  Confirm payment
                </Text>
              )}
            </Pressable>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <XStack items="center" justify="space-between" gap="$3">
      <Text color={appColors.textMuted} fontSize="$3">
        {label}
      </Text>
      <Text
        color={highlight ? appColors.accent : appColors.textPrimary}
        fontSize="$4"
        fontWeight="700"
      >
        {value}
      </Text>
    </XStack>
  );
}

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
            experimentalBlurMethod={
              Platform.OS === 'android' ? 'dimezisBlurView' : undefined
            }
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
    overflow: 'hidden',
  },
  screenGlow: {
    position: 'absolute',
    top: -85,
    left: -35,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: appColors.accentGlowSoft,
    opacity: 0.32,
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
  paymentCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surface,
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
  // WebView styles
  webViewContainer: {
    flex: 1,
    backgroundColor: appColors.bg,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: appColors.surfaceStrong,
    borderBottomWidth: 1,
    borderBottomColor: appColors.borderStrong,
  },
  webViewClose: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  webViewLoader: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
  },
  webView: {
    flex: 1,
  },
});
