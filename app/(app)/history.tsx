import { useState } from 'react';
import { FlatList, Modal } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { waslaColors } from '../../src/theme/colors';
import { MOCK_TICKETS } from '../../src/lib/mockData';
import { useAuthStore } from '../../src/store';

export default function HistoryScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [selectedTicket, setSelectedTicket] = useState<typeof MOCK_TICKETS[0] | null>(null);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return waslaColors.success;
      case 'completed':
        return waslaColors.info;
      case 'cancelled':
        return waslaColors.error;
      default:
        return waslaColors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const renderTicket = ({ item }) => (
    <YStack
      bg={waslaColors.surface}
      p="$4"
      rounded="$3"
      mb="$3"
      borderWidth={1}
      borderColor={waslaColors.border}
    >
      {/* Header with Status */}
      <XStack justify="space-between" items="center" mb="$3">
        <YStack flex={1}>
          <Text fontSize="$3" color={waslaColors.textMuted}>
            {item.from} → {item.to}
          </Text>
          <Text fontSize="$5" fontWeight="700" color={waslaColors.textPrimary}>
            {item.date}
          </Text>
        </YStack>
        <YStack
          bg={getStatusColor(item.status)}
          px="$3"
          py="$2"
          rounded="$2"
        >
          <Text fontSize="$2" fontWeight="700" color="white">
            {getStatusLabel(item.status)}
          </Text>
        </YStack>
      </XStack>

      {/* Details */}
      <XStack justify="space-between" items="center" mb="$3">
        <XStack flex={1} gap="$2">
          <Text fontSize="$3" color={waslaColors.textSecondary}>
            Seat: <Text fontWeight="700">{item.seat}</Text>
          </Text>
          <Text fontSize="$3" color={waslaColors.border}>
            •
          </Text>
          <Text fontSize="$3" color={waslaColors.textSecondary}>
            {item.departureTime}
          </Text>
        </XStack>
        <Text fontSize="$5" fontWeight="800" color={waslaColors.primary500}>
          {item.price} {item.currency}
        </Text>
      </XStack>

      {/* View Detail Button */}
      <Button
        size="$3"
        bg={waslaColors.primary500}
        rounded="$3"
        pressStyle={{ bg: waslaColors.primary700 }}
        onPress={() => setSelectedTicket(item)}
      >
        <Text color="white" fontWeight="700" fontSize="$3">
          View Details
        </Text>
      </Button>
    </YStack>
  );

  return (
    <YStack flex={1} bg={waslaColors.background}>
      {/* Header */}
      <YStack bg={waslaColors.primary500} p="$6" pt="$8" pb="$4" gap="$3">
        <XStack justify="space-between" items="center" mb="$2">
          <YStack flex={1}>
            <Text fontSize="$8" fontWeight="800" color="white">
              Booking History
            </Text>
          </YStack>
          <Button
            size="$3"
            bg="rgba(255,255,255,0.2)"
            rounded="$2"
            pressStyle={{ bg: 'rgba(255,255,255,0.3)' }}
            onPress={handleLogout}
            ml="$2"
          >
            <Text color="white" fontWeight="700" fontSize="$3">
              🚪
            </Text>
          </Button>
        </XStack>
        <Text fontSize="$3" color="rgba(255,255,255,0.9)">
          View your past trips and tickets
        </Text>
      </YStack>

      {/* Tickets List */}
      <FlatList
        data={MOCK_TICKETS}
        renderItem={renderTicket}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 12 }}
        scrollEnabled
        ListEmptyComponent={
          <YStack items="center" justify="center" py="$8">
            <Text fontSize="$6" mb="$3">
              📋
            </Text>
            <Text fontSize="$4" fontWeight="600" color={waslaColors.textSecondary}>
              No bookings yet
            </Text>
          </YStack>
        }
      />

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <Modal
          visible={!!selectedTicket}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedTicket(null)}
        >
          <YStack flex={1} bg={waslaColors.background}>
            {/* Modal Header */}
            <YStack bg={waslaColors.primary500} p="$6" pt="$8">
              <XStack justify="space-between" items="center">
                <Text fontSize="$7" fontWeight="800" color="white">
                  Ticket Details
                </Text>
                <Text
                  fontSize="$6"
                  onPress={() => setSelectedTicket(null)}
                  color="white"
                >
                  ✕
                </Text>
              </XStack>
            </YStack>

            {/* Ticket Info */}
            <YStack p="$6" gap="$4">
              {/* QR Code Section */}
              <YStack
                bg={waslaColors.surface}
                p="$6"
                rounded="$4"
                items="center"
                gap="$3"
              >
                <Text fontSize="$4" fontWeight="700" color={waslaColors.textPrimary}>
                  Your QR Code
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
                  <Text fontSize="$8">📱</Text>
                </YStack>
                <Text fontSize="$2" color={waslaColors.textMuted}>
                  {selectedTicket.qrCode}
                </Text>
              </YStack>

              {/* Route Info */}
              <YStack bg={waslaColors.surface} p="$4" rounded="$3" gap="$3">
                <Text fontSize="$4" fontWeight="700" color={waslaColors.textPrimary}>
                  Trip Details
                </Text>
                <InfoRow label="From" value={selectedTicket.from} />
                <InfoRow label="To" value={selectedTicket.to} />
                <InfoRow label="Date" value={selectedTicket.date} />
                <InfoRow
                  label="Time"
                  value={`${selectedTicket.departureTime} - ${selectedTicket.arrivalTime}`}
                />
              </YStack>

              {/* Booking Info */}
              <YStack bg={waslaColors.surface} p="$4" rounded="$3" gap="$3">
                <Text fontSize="$4" fontWeight="700" color={waslaColors.textPrimary}>
                  Booking Information
                </Text>
                <InfoRow label="Ticket ID" value={selectedTicket.id} />
                <InfoRow label="Passenger" value={selectedTicket.passengerName} />
                <InfoRow label="Seat Number" value={`Seat ${selectedTicket.seat}`} />
                <InfoRow
                  label="Status"
                  value={getStatusLabel(selectedTicket.status)}
                  valueColor={getStatusColor(selectedTicket.status)}
                />
              </YStack>

              {/* Price */}
              <YStack
                bg={waslaColors.primary100}
                p="$4"
                rounded="$3"
                items="center"
                gap="$2"
              >
                <Text fontSize="$3" color={waslaColors.textSecondary}>
                  Total Price
                </Text>
                <Text fontSize="$7" fontWeight="800" color={waslaColors.primary500}>
                  {selectedTicket.price} {selectedTicket.currency}
                </Text>
              </YStack>

              {/* Close Button */}
              <Button
                size="$5"
                bg={waslaColors.error}
                rounded="$3"
                pressStyle={{ bg: waslaColors.error }}
                onPress={() => setSelectedTicket(null)}
              >
                <Text color="white" fontWeight="700" fontSize="$4">
                  Close
                </Text>
              </Button>
            </YStack>
          </YStack>
        </Modal>
      )}
    </YStack>
  );
  
}

// Helper component
const InfoRow = ({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) => (
  <XStack justify="space-between" items="center">
    <Text fontSize="$3" color={waslaColors.textSecondary}>
      {label}
    </Text>
    <Text
      fontSize="$3"
      fontWeight="700"
      color={valueColor || waslaColors.textPrimary}
    >
      {value}
    </Text>
  </XStack>
);
