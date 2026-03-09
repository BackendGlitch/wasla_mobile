import { YStack, XStack, Text, Button } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { waslaColors } from '../../../../src/theme/colors';
import { MOCK_TICKETS } from '../../../../src/lib/mockData';
import { useAuthStore } from '../../../../src/store';

export default function TicketDetailScreen() {
  const { routeId, ticketId } = useLocalSearchParams<{
    routeId: string;
    ticketId: string;
  }>();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('has_onboarded');
    } catch {
      // fallback
    }
    logout();
    router.replace('/(auth)');
  };

  // Find ticket or generate mock one
  const ticket = MOCK_TICKETS[0]; // Use first mock ticket or create new one

  if (!ticket) {
    return (
      <YStack flex={1} items="center" justify="center" bg={waslaColors.background}>
        <Text>Ticket not found</Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} bg={waslaColors.background}>
      {/* Success Header */}
      <YStack items="center" justify="center" bg={waslaColors.success} p="$8" gap="$3">
        <Text fontSize={60}>✅</Text>
        <Text fontSize="$7" fontWeight="800" color="white" text="center">
          Booking Confirmed!
        </Text>
        <Text fontSize="$3" color="rgba(255,255,255,0.9)" text="center">
          Your ticket has been booked successfully
        </Text>
      </YStack>

      {/* Content */}
      <YStack
        flex={1}
        p="$6"
        gap="$4"
        justifyContent="space-between"
      >
        {/* Ticket Card */}
        <YStack gap="$4">
          {/* QR Code Section */}
          <YStack
            bg={waslaColors.surface}
            p="$6"
            rounded="$4"
            items="center"
            gap="$3"
            borderWidth={2}
            borderColor={waslaColors.border}
            borderStyle="dashed"
          >
            <Text fontSize="$3" color={waslaColors.textMuted} fontWeight="600">
              Your Boarding Pass
            </Text>
            <YStack
              bg={waslaColors.gray100}
              p="$4"
              rounded="$3"
              width={150}
              height={150}
              items="center"
              justify="center"
            >
              <Text fontSize={80}>📲</Text>
            </YStack>
            <Text fontSize="$2" color={waslaColors.textSecondary} fontWeight="700">
              {ticket.qrCode}
            </Text>
            <Text fontSize="$2" color={waslaColors.textMuted} text="center">
              Present this at the station
            </Text>
          </YStack>

          {/* Trip Details */}
          <YStack bg={waslaColors.surface} rounded="$4" p="$4" gap="$4">
            {/* From/To */}
            <YStack gap="$2">
              <XStack justify="space-between" items="center">
                <YStack flex={1}>
                  <Text fontSize="$2" color={waslaColors.textMuted}>
                    FROM
                  </Text>
                  <Text
                    fontSize="$6"
                    fontWeight="800"
                    color={waslaColors.textPrimary}
                  >
                    {ticket.from}
                  </Text>
                </YStack>
                <YStack items="center">
                  <Text fontSize="$5" color={waslaColors.primary500}>
                    ✈️
                  </Text>
                </YStack>
                <YStack flex={1} items="flex-end">
                  <Text fontSize="$2" color={waslaColors.textMuted}>
                    TO
                  </Text>
                  <Text
                    fontSize="$6"
                    fontWeight="800"
                    color={waslaColors.textPrimary}
                  >
                    {ticket.to}
                  </Text>
                </YStack>
              </XStack>
            </YStack>

            {/* Divider */}
            <YStack height={1} bg={waslaColors.border} />

            {/* Date & Time */}
            <XStack justify="space-between" gap="$4">
              <YStack flex={1}>
                <Text fontSize="$2" color={waslaColors.textMuted} mb="$1">
                  Date
                </Text>
                <Text fontSize="$4" fontWeight="700" color={waslaColors.textPrimary}>
                  {ticket.date}
                </Text>
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$2" color={waslaColors.textMuted} mb="$1">
                  Departure
                </Text>
                <Text fontSize="$4" fontWeight="700" color={waslaColors.textPrimary}>
                  {ticket.departureTime}
                </Text>
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$2" color={waslaColors.textMuted} mb="$1">
                  Arrival
                </Text>
                <Text fontSize="$4" fontWeight="700" color={waslaColors.textPrimary}>
                  {ticket.arrivalTime}
                </Text>
              </YStack>
            </XStack>

            {/* Divider */}
            <YStack height={1} bg={waslaColors.border} />

            {/* Seat & Passenger */}
            <XStack justify="space-between" gap="$4">
              <YStack flex={1}>
                <Text fontSize="$2" color={waslaColors.textMuted} mb="$1">
                  Seat
                </Text>
                <YStack
                  bg={waslaColors.primaryLight}
                  px="$3"
                  py="$2"
                  rounded="$2"
                  items="center"
                >
                  <Text fontSize="$5" fontWeight="800" color={waslaColors.primary500}>
                    #{ticket.seat}
                  </Text>
                </YStack>
              </YStack>
              <YStack flex={1}>
                <Text fontSize="$2" color={waslaColors.textMuted} mb="$1">
                  Passenger
                </Text>
                <Text fontSize="$4" fontWeight="700" color={waslaColors.textPrimary}>
                  {ticket.passengerName}
                </Text>
              </YStack>
            </XStack>

            {/* Divider */}
            <YStack height={1} bg={waslaColors.border} />

            {/* Ticket ID */}
            <YStack>
              <Text fontSize="$2" color={waslaColors.textMuted} mb="$1">
                Ticket ID
              </Text>
              <Text fontSize="$3" fontFamily="monospace" color={waslaColors.primary500}>
                {ticket.id}
              </Text>
            </YStack>
          </YStack>

          {/* Price Summary */}
          <YStack bg={waslaColors.primaryLight} rounded="$4" p="$4" gap="$2">
            <XStack justify="space-between" items="center">
              <Text fontSize="$3" color={waslaColors.textSecondary}>
                Total Price
              </Text>
              <Text fontSize="$6" fontWeight="800" color={waslaColors.primary500}>
                {ticket.price} {ticket.currency}
              </Text>
            </XStack>
          </YStack>
        </YStack>

        {/* Action Buttons */}
        <YStack gap="$3">
          <Button
            size="$5"
            bg={waslaColors.primary500}
            rounded="$3"
            pressStyle={{ bg: waslaColors.primary700 }}
            onPress={() => {
              // Go back to routes
              router.replace('/(app)');
            }}
          >
            <Text color="white" fontWeight="700" fontSize="$5">
              Back to Routes
            </Text>
          </Button>

          <Button
            size="$5"
            bg={waslaColors.surface}
            borderWidth={1}
            borderColor={waslaColors.border}
            rounded="$3"
            pressStyle={{ bg: waslaColors.gray100 }}
            onPress={() => {
              // Share ticket
              console.log('Share ticket');
            }}
          >
            <Text color={waslaColors.textPrimary} fontWeight="700" fontSize="$5">
              📤 Share Ticket
            </Text>
          </Button>

          <Button
            size="$5"
            bg={waslaColors.surface}
            borderWidth={1}
            borderColor={waslaColors.border}
            rounded="$3"
            pressStyle={{ bg: waslaColors.gray100 }}
            onPress={() => {
              // Download ticket
              console.log('Download ticket');
            }}
          >
            <Text color={waslaColors.textPrimary} fontWeight="700" fontSize="$5">
              ⬇️ Download Ticket
            </Text>
          </Button>

          <Button
            size="$5"
            bg={waslaColors.error}
            rounded="$3"
            pressStyle={{ bg: '#c0392b' }}
            onPress={handleLogout}
          >
            <Text color="white" fontWeight="700" fontSize="$5">
              🚪 Sign Out
            </Text>
          </Button>
        </YStack>
      </YStack>
    </YStack>
  );
}
