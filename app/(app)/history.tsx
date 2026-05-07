import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { formatCurrency, formatIssuedAt } from '../../src/lib/bookingFlow';
import { useBookingStore } from '../../src/store';
import { appColors } from '../../src/theme/appTheme';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tickets = useBookingStore((state) => state.tickets);
  const contentPadTop = Math.max(insets.top + 16, 56);

  const navigateBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)');
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
              BOOKING HISTORY
            </Text>
            <Text color={appColors.textPrimary} fontSize="$10" fontWeight="800">
              Your recent tickets
            </Text>
            <Text color={appColors.textSecondary} fontSize="$4">
              Paid tickets from this session stay here so you can reopen the QR and trip details.
            </Text>
          </YStack>

          {tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="ticket-outline" size={34} color={appColors.textMuted} />
              <Text mt="$3" color={appColors.textPrimary} fontSize="$5" fontWeight="700">
                No bookings yet
              </Text>
              <Text mt="$2" color={appColors.textSecondary} fontSize="$4" style={styles.centerText}>
                Finish a booking and the confirmed ticket will show up here.
              </Text>
              <Pressable onPress={() => router.replace('/(app)')} style={styles.primaryButton}>
                <Text color={appColors.bg} fontSize="$4" fontWeight="800">
                  Start booking
                </Text>
              </Pressable>
            </View>
          ) : (
            <YStack gap="$3">
              {tickets.map((ticket) => (
                <Pressable
                  key={ticket.id}
                  onPress={() => router.push({ pathname: '/(app)/ticket', params: { ticketId: ticket.id } })}
                  style={({ pressed }) => [styles.ticketCard, pressed ? styles.buttonPressed : null]}
                >
                  <XStack items="center" justify="space-between" gap="$3">
                    <YStack flex={1} gap="$1">
                      <Text color={appColors.textPrimary} fontSize="$5" fontWeight="700">
                        {ticket.departureName} to {ticket.destinationName}
                      </Text>
                      <Text color={appColors.textSecondary} fontSize="$3">
                        {ticket.stationName} | ETD {ticket.etdLabel}
                      </Text>
                    </YStack>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={appColors.textMuted} />
                  </XStack>

                  <XStack mt="$4" gap="$2" flexWrap="wrap">
                    <View style={[styles.badge, styles.badgeAccent]}>
                      <Text color={appColors.textPrimary} fontSize="$3" fontWeight="700">
                        {ticket.seatCount} seat{ticket.seatCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.badge}>
                      <Text color={appColors.textSecondary} fontSize="$3" fontWeight="700">
                        {formatCurrency(ticket.totalPrice)}
                      </Text>
                    </View>
                    <View style={styles.badge}>
                      <Text color={appColors.textSecondary} fontSize="$3" fontWeight="700">
                        {ticket.vehiclePlate}
                      </Text>
                    </View>
                  </XStack>

                  <Text mt="$3" color={appColors.textMuted} fontSize="$2">
                    Issued {formatIssuedAt(ticket.issuedAt)}
                  </Text>
                </Pressable>
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 140,
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
  emptyState: {
    minHeight: 340,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceStrong,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceStrong,
    padding: 18,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeAccent: {
    borderColor: appColors.accentGlow,
    backgroundColor: appColors.accentSoft,
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 18,
    backgroundColor: appColors.accent,
    paddingVertical: 16,
    paddingHorizontal: 20,
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
