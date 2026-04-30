import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Text } from 'tamagui';
import { getStationRoutes, type RouteData } from '../lib/routesApi';
import { toUserFacingErrorCopy } from '../lib/networkErrors';
import { appColors } from '../theme/appTheme';

interface RoutesListProps {
  stationId: string;
}

export const RoutesList = ({ stationId }: RoutesListProps) => {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['routes', stationId],
    queryFn: ({ signal }) => getStationRoutes(stationId, { signal }),
    refetchInterval: isFocused ? 10_000 : false,
    refetchIntervalInBackground: false,
    enabled: !!stationId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(8_000, 500 * 2 ** attemptIndex),
  });

  const routes = useMemo(() => data ?? [], [data]);

  const handleRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch]);

  const handleRoutePress = useCallback(
    (route: RouteData) => {
      router.push({
        pathname: '/(app)/booking',
        params: {
          routeId: String(route.id),
          routeName: route.name,
          availableSeats: String(route.available_seats),
          stationId,
        },
      });
    },
    [router, stationId],
  );

  if (isLoading && !data) {
    return (
      <View style={styles.list}>
        {[0, 1, 2].map((item) => (
          <View key={item} style={styles.skeletonCard}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonMetaRow}>
              <View style={styles.skeletonBadgeWide} />
              <View style={styles.skeletonBadgeShort} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (isError && !data) {
    const friendly = toUserFacingErrorCopy(error, 'Could not load routes.');
    return (
      <View style={styles.center}>
        <Text color={appColors.textPrimary} fontSize="$4" style={styles.centerText}>
          {friendly.title}{friendly.detail ? ` ${friendly.detail}` : ''} Tap to retry.
        </Text>
        <Pressable style={styles.retryButton} onPress={() => void handleRefresh()}>
          <Text color={appColors.textPrimary} fontSize="$3" fontWeight="700">
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  if (routes.length === 0) {
    return (
      <View style={styles.center}>
        <Text color={appColors.textSecondary} fontSize="$4" style={styles.centerText}>
          No routes available at this station right now
        </Text>
      </View>
    );
  }

  const renderRouteCard = useCallback(({ item }: { item: RouteData }) => {
    const isFull = item.available_seats === 0;
    const isAlmostFull = item.available_seats <= 2 && !isFull;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          isFull && styles.cardDisabled,
          pressed && !isFull ? styles.cardPressed : null,
        ]}
        disabled={isFull}
        onPress={() => handleRoutePress(item)}
      >
        <Text color={appColors.textPrimary} fontSize="$6" fontWeight="700">
          {item.name}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeSeats]}>
            <Text
              color={isFull ? '#FFD7D7' : appColors.textPrimary}
              fontSize="$3"
              fontWeight="700"
            >
              {isFull ? 'Full' : `${item.available_seats} seats left`}
            </Text>
          </View>

          {isAlmostFull ? (
            <View style={[styles.badge, styles.badgeWarning]}>
              <Text color="#FFF1C2" fontSize="$3" fontWeight="700">
                Almost full
              </Text>
            </View>
          ) : null}
        </View>

        <Text color={isFull ? appColors.textMuted : appColors.accent} fontSize="$3" fontWeight="700">
          {isFull ? 'Fully booked' : 'Tap to book'}
        </Text>
      </Pressable>
    );
  }, [handleRoutePress]);

  const keyExtractor = useCallback((item: RouteData) => item.id.toString(), []);

  return (
    <View style={styles.container}>
      {isError ? (
        <View style={styles.banner}>
          <Text color={appColors.textPrimary} fontSize="$3" fontWeight="700">
            Could not refresh routes. Showing the latest available results.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={routes}
        keyExtractor={keyExtractor}
        renderItem={renderRouteCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={appColors.accent}
            refreshing={isPullRefreshing}
            onRefresh={() => void handleRefresh()}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centerText: {
    textAlign: 'center',
    maxWidth: 280,
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 71, 0.28)',
    backgroundColor: 'rgba(120, 78, 16, 0.35)',
  },
  list: {
    padding: 16,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceStrong,
    padding: 18,
    gap: 14,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardDisabled: {
    opacity: 0.55,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeSeats: {
    borderColor: appColors.accentGlow,
    backgroundColor: appColors.accentSoft,
  },
  badgeWarning: {
    borderColor: 'rgba(255, 204, 102, 0.45)',
    backgroundColor: 'rgba(120, 88, 16, 0.35)',
  },
  badgeFull: {
    borderColor: 'rgba(255, 111, 111, 0.4)',
    backgroundColor: 'rgba(120, 25, 25, 0.35)',
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: appColors.borderStrong,
    backgroundColor: appColors.surfaceStrong,
  },
  skeletonCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: appColors.border,
    backgroundColor: appColors.surfaceStrong,
    padding: 18,
    marginBottom: 12,
  },
  skeletonTitle: {
    width: '62%',
    height: 22,
    borderRadius: 999,
    backgroundColor: appColors.surface,
    marginBottom: 16,
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonBadgeWide: {
    width: 118,
    height: 34,
    borderRadius: 999,
    backgroundColor: appColors.surface,
  },
  skeletonBadgeShort: {
    width: 96,
    height: 34,
    borderRadius: 999,
    backgroundColor: appColors.surface,
  },
});
