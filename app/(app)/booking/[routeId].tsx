import { useState, useMemo } from 'react';
import { Modal, ScrollView, FlatList } from 'react-native';
import { YStack, XStack, Text, Button, Spinner } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { waslaColors } from '../../../src/theme/colors';
import { MOCK_ROUTES, MOCK_TICKETS, Ticket } from '../../../src/lib/mockData';
import { useAuthStore } from '../../../src/store';

interface Seat {
  number: number;
  status: 'available' | 'selected' | 'booked';
}

export default function SeatSelectionScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Get route info
  const route = useMemo(
    () => MOCK_ROUTES.find((r) => r.id === routeId),
    [routeId]
  );

  // Generate seats (8 seats for this route - 2 rows of 4)
  const seats = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const seatNumber = i + 1;
        const isBooked = Math.random() > 0.75; // 25% booked
        return {
          number: seatNumber,
          status: isBooked ? 'booked' : 'available',
        } as Seat;
      }),
    []
  );

  const handleSelectSeat = (seatNumber: number) => {
    const seat = seats.find((s) => s.number === seatNumber);
    if (seat && seat.status === 'available') {
      setSelectedSeat(seatNumber === selectedSeat ? null : seatNumber);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedSeat || !route) return;

    setLoading(true);
    try {
      // Simulate booking delay
      await new Promise((r) => setTimeout(r, 1500));

      // Create ticket
      const newTicket: Ticket = {
        id: 'tkt_' + Date.now(),
        routeId: route.id,
        from: route.from,
        to: route.to,
        date: new Date().toISOString().split('T')[0],
        departureTime: route.departureTime,
        arrivalTime: route.arrivalTime,
        seat: selectedSeat,
        price: route.price,
        currency: route.currency,
        status: 'confirmed',
        passengerName: user?.name || 'Guest',
        qrCode: 'WASLA-' + Date.now(),
      };

      // Show ticket detail
      setShowConfirm(false);
      router.push({
        pathname: '/booking/[routeId]/ticket',
        params: { routeId: route.id, ticketId: newTicket.id },
      });
    } catch (e) {
      console.error('Booking failed:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!route) {
    return (
      <YStack flex={1} items="center" justify="center" bg={waslaColors.background}>
        <YStack items="center" gap="$4">
          <Text fontSize={60}>🚫</Text>
          <Text fontSize="$6" fontWeight="800" color={waslaColors.textPrimary}>
            Route Not Found
          </Text>
          <Text fontSize="$3" color={waslaColors.textSecondary} text="center" px="$6">
            Sorry, this route is no longer available. Please go back and select another route.
          </Text>
          <Button
            size="$4"
            bg={waslaColors.primary500}
            rounded="$3"
            pressStyle={{ bg: waslaColors.primary700 }}
            mt="$4"
            onPress={() => router.back()}
          >
            <Text color="white" fontWeight="700" fontSize="$4">
              ← Back to Routes
            </Text>
          </Button>
        </YStack>
      </YStack>
    );
  }

  const renderSeat = (seat: Seat) => (
    <Button
      size="$4"
      bg={
        seat.status === 'booked'
          ? waslaColors.gray300
          : selectedSeat === seat.number
            ? waslaColors.primary500
            : waslaColors.surface
      }
      borderWidth={
        selectedSeat === seat.number ? 0 : 1
      }
      borderColor={waslaColors.border}
      rounded="$2"
      m="$2"
      width={50}
      height={50}
      items="center"
      justify="center"
      disabled={seat.status === 'booked'}
      opacity={seat.status === 'booked' ? 0.5 : 1}
      onPress={() => handleSelectSeat(seat.number)}
      pressStyle={{
        bg:
          seat.status === 'booked'
            ? waslaColors.gray300
            : waslaColors.primary600,
      }}
    >
      <Text
        fontSize="$3"
        fontWeight="700"
        color={selectedSeat === seat.number ? 'white' : waslaColors.textPrimary}
      >
        {seat.number}
      </Text>
    </Button>
  );

  return (
    <YStack flex={1} bg={waslaColors.background}>
      {/* Header */}
      <YStack bg={waslaColors.primary500} p="$6" pt="$8" gap="$2">
        <XStack justify="space-between" items="center">
          <YStack>
            <Text fontSize="$8" fontWeight="800" color="white">
              Select Your Seat
            </Text>
            <Text fontSize="$3" color="rgba(255,255,255,0.9)">
              {route.from} → {route.to}
            </Text>
          </YStack>
          <Button
            size="$3"
            bg="rgba(255,255,255,0.2)"
            rounded="$2"
            pressStyle={{ bg: 'rgba(255,255,255,0.3)' }}
            onPress={() => router.back()}
          >
            <Text color="white" fontSize="$5">
              ✕
            </Text>
          </Button>
        </XStack>
      </YStack>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <YStack p="$6" gap="$6" pb="$8">
          {/* Route Info Card */}
          <YStack bg={waslaColors.surface} rounded="$4" p="$4" gap="$3">
            <XStack justify="space-between">
              <YStack flex={1}>
                <Text fontSize="$2" color={waslaColors.textMuted}>
                  Departure
                </Text>
                <Text fontSize="$5" fontWeight="700" color={waslaColors.textPrimary}>
                  {route.departureTime}
                </Text>
              </YStack>
              <YStack items="center" flex={1}>
                <Text fontSize="$8" color={waslaColors.primary500}>
                  →
                </Text>
              </YStack>
              <YStack flex={1} items="flex-end">
                <Text fontSize="$2" color={waslaColors.textMuted}>
                  Arrival
                </Text>
                <Text fontSize="$5" fontWeight="700" color={waslaColors.textPrimary}>
                  {route.arrivalTime}
                </Text>
              </YStack>
            </XStack>
            <XStack justify="space-between" pt="$3" borderTopWidth={1} borderTopColor={waslaColors.border}>
              <Text fontSize="$3" color={waslaColors.textSecondary}>
                Price per seat
              </Text>
              <Text fontSize="$5" fontWeight="800" color={waslaColors.primary500}>
                {route.price} {route.currency}
              </Text>
            </XStack>
          </YStack>

          {/* Seat Selection */}
          <YStack gap="$4">
            <Text fontSize="$4" fontWeight="700" color={waslaColors.textPrimary}>
              Coach Seats (8 seats)
            </Text>

            {/* Seat Legend */}
            <XStack gap="$3" mb="$4" px="$4" bg={waslaColors.surface} py="$3" rounded="$3" justify="center" flexWrap="wrap">
              <XStack items="center" gap="$2">
                <YStack width={28} height={28} rounded="$2" bg={waslaColors.surface} borderWidth={1} borderColor={waslaColors.border} />
                <Text fontSize="$2" color={waslaColors.textSecondary}>
                  Available
                </Text>
              </XStack>
              <XStack items="center" gap="$2">
                <YStack width={28} height={28} rounded="$2" bg={waslaColors.primary500} />
                <Text fontSize="$2" color={waslaColors.textSecondary}>
                  Selected
                </Text>
              </XStack>
              <XStack items="center" gap="$2">
                <YStack width={28} height={28} rounded="$2" bg={waslaColors.gray300} />
                <Text fontSize="$2" color={waslaColors.textSecondary}>
                  Booked
                </Text>
              </XStack>
            </XStack>

            {/* Seats Grid */}
            <YStack gap="$3" items="center" my="$4">
              {[0, 1].map((row) => (
                <XStack key={row} gap="$3" justify="center">
                  {seats.slice(row * 4, (row + 1) * 4).map((seat) => (
                    <Button
                      key={seat.number}
                      size="$4"
                      bg={
                        seat.status === 'booked'
                          ? waslaColors.gray300
                          : selectedSeat === seat.number
                            ? waslaColors.primary500
                            : waslaColors.surface
                      }
                      borderWidth={
                        selectedSeat === seat.number ? 0 : 1
                      }
                      borderColor={waslaColors.border}
                      rounded="$3"
                      width={60}
                      height={60}
                      items="center"
                      justify="center"
                      disabled={seat.status === 'booked'}
                      opacity={seat.status === 'booked' ? 0.5 : 1}
                      onPress={() => handleSelectSeat(seat.number)}
                      pressStyle={{
                        bg:
                          seat.status === 'booked'
                            ? waslaColors.gray300
                            : waslaColors.primary600,
                      }}
                    >
                      <Text
                        fontSize="$4"
                        fontWeight="800"
                        color={selectedSeat === seat.number ? 'white' : waslaColors.textPrimary}
                      >
                        {seat.number}
                      </Text>
                    </Button>
                  ))}
                </XStack>
              ))}
            </YStack>
          </YStack>

          {/* Selected Seat Summary */}
          {selectedSeat && (
            <YStack bg={waslaColors.primaryLight} rounded="$4" p="$4" gap="$2">
              <Text fontSize="$3" color={waslaColors.textMuted}>
                Selected Seat
              </Text>
              <XStack justify="space-between" items="center">
                <Text fontSize="$6" fontWeight="800" color={waslaColors.primary500}>
                  Seat {selectedSeat}
                </Text>
                <Text fontSize="$5" fontWeight="700" color={waslaColors.primary500}>
                  {route.price} {route.currency}
                </Text>
              </XStack>
            </YStack>
          )}

          {/* Confirm Button */}
          <Button
            size="$5"
            bg={selectedSeat ? waslaColors.primary500 : waslaColors.gray400}
            rounded="$3"
            pressStyle={{ bg: waslaColors.primary700 }}
            disabled={!selectedSeat}
            onPress={() => setShowConfirm(true)}
            mt="$4"
          >
            <Text color="white" fontWeight="700" fontSize="$5">
              Continue to Payment
            </Text>
          </Button>
        </YStack>
      </ScrollView>

      {/* Confirmation Modal */}
      {selectedSeat && (
        <Modal
          visible={showConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirm(false)}
        >
          <YStack
            flex={1}
            bg="rgba(0,0,0,0.5)"
            items="center"
            justify="flex-end"
          >
            <YStack
              bg={waslaColors.surface}
              rounded="$5"
              p="$6"
              width="100%"
              gap="$4"
            >
              <Text fontSize="$6" fontWeight="800" color={waslaColors.textPrimary}>
                Confirm Booking?
              </Text>

              <YStack bg={waslaColors.background} rounded="$3" p="$4" gap="$3">
                <ConfirmRow
                  label="Route"
                  value={`${route.from} → ${route.to}`}
                />
                <ConfirmRow label="Seat" value={`#${selectedSeat}`} />
                <ConfirmRow
                  label="Time"
                  value={`${route.departureTime} - ${route.arrivalTime}`}
                />
                <YStack height={1} bg={waslaColors.border} my="$2" />
                <ConfirmRow
                  label="Total"
                  value={`${route.price} ${route.currency}`}
                  isBold
                />
              </YStack>

              <XStack gap="$3">
                <Button
                  flex={1}
                  size="$4"
                  bg={waslaColors.gray300}
                  rounded="$3"
                  disabled={loading}
                  onPress={() => setShowConfirm(false)}
                >
                  <Text
                    color={waslaColors.textPrimary}
                    fontWeight="700"
                    fontSize="$4"
                  >
                    Cancel
                  </Text>
                </Button>
                <Button
                  flex={1}
                  size="$4"
                  bg={waslaColors.primary500}
                  rounded="$3"
                  pressStyle={{ bg: waslaColors.primary700 }}
                  disabled={loading}
                  onPress={handleConfirmBooking}
                >
                  {loading ? (
                    <Spinner color="white" />
                  ) : (
                    <Text color="white" fontWeight="700" fontSize="$4">
                      Confirm
                    </Text>
                  )}
                </Button>
              </XStack>
            </YStack>
          </YStack>
        </Modal>
      )}
    </YStack>
  );
}

const ConfirmRow = ({
  label,
  value,
  isBold,
}: {
  label: string;
  value: string;
  isBold?: boolean;
}) => (
  <XStack justify="space-between" items="center">
    <Text
      fontSize="$3"
      color={waslaColors.textSecondary}
      fontWeight={isBold ? '700' : '500'}
    >
      {label}
    </Text>
    <Text
      fontSize="$3"
      fontWeight={isBold ? '800' : '600'}
      color={isBold ? waslaColors.primary500 : waslaColors.textPrimary}
    >
      {value}
    </Text>
  </XStack>
);
