import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { formatCurrency, formatIssuedAt } from '../../src/lib/bookingFlow';
import { singleRouteParam } from '../../src/lib/postAuthFlow';
import { useBookingStore } from '../../src/store';
import { appColors } from '../../src/theme/appTheme';

export default function TicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ticketId?: string | string[] }>();
  const ticketId = singleRouteParam(params.ticketId) ?? '';
  const ticket = useBookingStore((state) => state.tickets.find((item) => item.id === ticketId));

  if (!ticket) {
    return (
      <YStack flex={1} bg={appColors.bg} px="$5" pt="$7" items="center" justify="center" gap="$4">
        <Text color={appColors.textPrimary} fontSize="$7" fontWeight="800">
          Ticket not found
        </Text>
        <Text color={appColors.textSecondary} fontSize="$4" style={styles.centerText}>
          The ticket may have been cleared from memory. Create a new booking to generate another one.
        </Text>
        <Pressable onPress={() => router.replace('/(app)')} style={styles.primaryButton}>
          <Text color={appColors.bg} fontSize="$4" fontWeight="800">
            Back to home
          </Text>
        </Pressable>
      </YStack>
    );
  }

  return (
    <YStack flex={1} bg={appColors.bg}>
      <ScrollView contentContainerStyle={styles.content}>
        <YStack gap="$5">
          <YStack gap="$2">
            <Text color={appColors.textMuted} fontSize="$2" letterSpacing={0.7}>
              YOUR TICKET
            </Text>
            <Text color={appColors.textPrimary} fontSize="$10" fontWeight="800">
              Payment confirmed
            </Text>
            <Text color={appColors.textSecondary} fontSize="$4">
              Show this ticket and QR code when boarding.
            </Text>
          </YStack>

          <View style={styles.ticketCard}>
            <View style={styles.qrWrap}>
              <QRCode value={ticket.qrValue} size={180} backgroundColor="white" color="black" />
            </View>

            <YStack mt="$5" gap="$3">
              <TicketRow label="Ticket code" value={ticket.id} />
              <TicketRow label="Depart station" value={ticket.stationName} />
              <TicketRow label="Arrival station" value={ticket.destinationName} />
              <TicketRow label="Seats" value={`${ticket.seatCount}`} />
              <TicketRow label="ETD" value={ticket.etdLabel} />
              <TicketRow label="Vehicle LP" value={ticket.vehiclePlate} />
              <TicketRow label="Paid" value={formatCurrency(ticket.totalPrice)} highlight />
              <TicketRow label="Issued at" value={formatIssuedAt(ticket.issuedAt)} />
            </YStack>
          </View>

          <XStack gap="$3">
            <Pressable onPress={() => router.replace('/(app)')} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.buttonPressed : null]}>
              <XStack items="center" justify="center" gap="$2">
                <MaterialCommunityIcons name="home-variant-outline" size={18} color={appColors.textPrimary} />
                <Text color={appColors.textPrimary} fontSize="$4" fontWeight="700">
                  Home
                </Text>
              </XStack>
            </Pressable>

            <Pressable onPress={() => router.push('/(app)/history')} style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}>
              <XStack items="center" justify="center" gap="$2">
                <MaterialCommunityIcons name="history" size={18} color={appColors.bg} />
                <Text color={appColors.bg} fontSize="$4" fontWeight="800">
                  History
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}

function TicketRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
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
  ticketCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: appColors.accentGlowSoft,
    backgroundColor: '#143C5C',
    padding: 22,
  },
  qrWrap: {
    alignSelf: 'center',
    padding: 18,
    borderRadius: 22,
    backgroundColor: 'white',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: appColors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
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
