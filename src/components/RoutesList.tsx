 import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router'; // 👈 Expo Router navigation

import { getStationRoutes } from '../lib/routesApi';

interface RoutesListProps {
  stationId: string;
}

export const RoutesList = ({ stationId }: RoutesListProps) => {
  const router = useRouter();
  const isFocused = useIsFocused(); 

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['routes', stationId],
    // 👇 2. WE CLEANED THIS UP! It now uses your new lib function.
    queryFn: () => getStationRoutes(stationId),
    refetchInterval: isFocused ? 10000 : false,
    enabled: !!stationId,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading routes...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load routes.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No routes available at this station right now</Text>
      </View>
    );
  }

  const renderRouteCard = ({ item }: { item: any }) => {
    const isFull = item.available_seats === 0;
    const isAlmostFull = item.available_seats <= 2 && !isFull;

    return (
      <TouchableOpacity 
        style={[styles.card, isFull && styles.cardDisabled]}
        disabled={isFull}
        onPress={() => {
          // 👇 EXPO ROUTER NAVIGATION: Pushes to a booking screen
          // Ask your mentor what the exact URL path should be for the booking screen!
          router.push(`/booking?routeId=${item.id}`); 
        }}
      >
        <Text style={styles.destinationName}>{item.name}</Text>
        
        <View style={styles.badgeContainer}>
          <Text style={styles.seatsText}>{item.available_seats} seats left</Text>
          {isAlmostFull && <Text style={styles.warningText}>Almost full!</Text>}
          {isFull && <Text style={styles.fullText}>Full</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderRouteCard}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={isRefetching && !isLoading} onRefresh={refetch} />
      }
    />
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  list: { padding: 16 },
  card: { padding: 16, backgroundColor: '#fff', marginBottom: 12, borderRadius: 8, elevation: 2 },
  cardDisabled: { opacity: 0.5, backgroundColor: '#f0f0f0' },
  destinationName: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seatsText: { fontSize: 14, color: '#555' },
  warningText: { color: 'orange', fontWeight: 'bold' },
  fullText: { color: 'red', fontWeight: 'bold' },
  errorText: { color: 'red', marginBottom: 10 },
  retryButton: { padding: 10, backgroundColor: '#ddd', borderRadius: 5 },
  retryText: { fontWeight: 'bold' }
});