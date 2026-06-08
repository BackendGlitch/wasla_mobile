import { memo, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import type { RouteData } from '../../lib/routesApi';
import { buildBookingRouteMeta, formatCurrency } from '../../lib/bookingFlow';
import { useBookingRoutesLiveStore } from '../../store/bookingRoutesLiveStore';
import { appColors } from '../../theme/appTheme';

type Props = {
  stationId: string;
  stationName: string;
  item: RouteData;
  selectedRouteId: string | null;
  onSelectRouteId: (id: string) => void;
};

/**
 * Subscribes only to live seat availability for this route so the booking sheet stays cheap to update.
 */
function DestinationQueueRowInner({
  stationId,
  stationName,
  item,
  selectedRouteId,
  onSelectRouteId,
}: Props) {
  const routeKey = String(item.id);
  const liveSeats = useBookingRoutesLiveStore(
    useCallback(
      (s) => s.metricsByStation[stationId]?.[routeKey]?.available_seats,
      [stationId, routeKey],
    ),
  );

  const availableSeats = typeof liveSeats === 'number' ? liveSeats : item.available_seats;

  const meta = buildBookingRouteMeta(item, stationName);
  const isSelected = selectedRouteId === routeKey;
  const isFull = availableSeats <= 0;
  const baseLabel = formatCurrency(meta.pricePerSeat);

  return (
    <Pressable
      onPress={() => !isFull && onSelectRouteId(routeKey)}
      testID={`route-option-${routeKey}`}
      accessibilityLabel={`Route option ${meta.destinationName}`}
      disabled={isFull}
      style={({ pressed }) => [
        styles.routeCard,
        isSelected ? styles.routeCardSelected : null,
        isFull ? styles.routeCardDisabled : null,
        pressed && !isFull ? styles.routeCardPressed : null,
      ]}
    >
      <YStack gap="$3">
        <Text color={appColors.textPrimary} fontSize="$6" fontWeight="800">
          {meta.destinationName}
        </Text>

        <XStack justify="space-between" items="center" gap="$3">
          <Text color={appColors.textMuted} fontSize="$3">
            Base (per seat)
          </Text>
          <Text color={appColors.textPrimary} fontSize="$4" fontWeight="700">
            {baseLabel}
          </Text>
        </XStack>

        <XStack justify="space-between" items="center" gap="$3">
          <Text color={appColors.textMuted} fontSize="$3">
            Total (1 seat)
          </Text>
          <Text color={appColors.accent} fontSize="$4" fontWeight="800">
            {baseLabel}
          </Text>
        </XStack>

        <XStack justify="space-between" items="center" gap="$3">
          <Text color={appColors.textMuted} fontSize="$3">
            Seats left
          </Text>
          <Text
            color={isFull ? '#FFD7D7' : appColors.textPrimary}
            fontSize="$5"
            fontWeight="800"
          >
            {isFull ? '0' : String(availableSeats)}
          </Text>
        </XStack>
      </YStack>
    </Pressable>
  );
}

export const DestinationQueueRow = memo(
  DestinationQueueRowInner,
  (prev, next) =>
    prev.stationId === next.stationId &&
    prev.stationName === next.stationName &&
    prev.item === next.item &&
    prev.selectedRouteId === next.selectedRouteId,
);

const styles = StyleSheet.create({
  routeCard: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceStrong,
    marginBottom: 12,
  },
  routeCardSelected: {
    borderColor: appColors.accent,
    backgroundColor: appColors.accentGlowSoft,
  },
  routeCardDisabled: {
    opacity: 0.55,
  },
  routeCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
