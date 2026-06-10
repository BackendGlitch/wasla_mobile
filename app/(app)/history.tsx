import { useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { useBookingStore } from '../../src/store';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tickets = useBookingStore((s) => s.tickets);
  const topPad = Math.max(insets.top + 12, 48);

  // Stats
  const stats = useMemo(() => {
    const total = tickets.reduce((sum, t) => sum + (t.totalPrice || 0), 0);
    return { trips: tickets.length, spent: total };
  }, [tickets]);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, typeof tickets> = {};
    for (const t of tickets) {
      const day = dayjs(t.issuedAt).format('ddd, D MMM');
      if (!map[day]) map[day] = [];
      map[day].push(t);
    }
    return Object.entries(map);
  }, [tickets]);

  return (
    <YStack flex={1} bg="#060B14">
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: Math.max(insets.bottom, 20) + 120, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <XStack items="center" justify="space-between" mb={16}>
          <Text color="#F0F4FF" fontSize={22} fontWeight="700" letterSpacing={-0.4}>Trips</Text>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <MaterialCommunityIcons name="close" size={20} color="#556580" />
          </Pressable>
        </XStack>

        {/* Stats bar */}
        {tickets.length > 0 && (
          <XStack gap={8} mb={20}>
            <View style={hs.stat}>
              <Text color="#F0F4FF" fontSize={20} fontWeight="700">{stats.trips}</Text>
              <Text color="#556580" fontSize={10} fontWeight="600">TRIPS</Text>
            </View>
            <View style={hs.stat}>
              <Text color="#D4A853" fontSize={20} fontWeight="700">{stats.spent}</Text>
              <Text color="#556580" fontSize={10} fontWeight="600">TND SPENT</Text>
            </View>
          </XStack>
        )}

        {/* Ticket list */}
        {tickets.length === 0 ? (
          <YStack items="center" py={60} gap={12}>
            <View style={hs.emptyIcon}>
              <MaterialCommunityIcons name="ticket-outline" size={28} color="#3A4A60" />
            </View>
            <Text color="#F0F4FF" fontSize={16} fontWeight="700">No trips yet</Text>
            <Text color="#556580" fontSize={12} text="center">Your completed bookings will appear here</Text>
            <Pressable onPress={() => router.replace('/(app)')} style={hs.cta}>
              <Text color="#0A0F19" fontSize={13} fontWeight="700">Book a trip</Text>
            </Pressable>
          </YStack>
        ) : (
          grouped.map(([date, items]) => (
            <YStack key={date} mb={16}>
              <Text color="#556580" fontSize={10} fontWeight="600" letterSpacing={1} mb={8}>{date.toUpperCase()}</Text>
              {items.map((t) => {
                const state: string = (t as any).state || 'used';
                const isActive = state === 'active';
                const isExpired = state === 'expired';
                const accentColor = isActive ? '#22C55E' : isExpired ? '#EF4444' : '#556580';
                const bgColor = isActive ? 'rgba(34,197,94,0.04)' : isExpired ? 'rgba(239,68,68,0.04)' : 'transparent';
                const icon = isActive ? 'clock-outline' : isExpired ? 'timer-off-outline' : 'check-circle-outline';
                const stateLabel = isActive ? 'Active' : isExpired ? 'Expired' : 'Used';
                return (
                <Pressable
                  key={t.id}
                  onPress={() => router.push({ pathname: '/(app)/ticket', params: { ticketId: t.id } })}
                  style={({ pressed }) => [hs.card, { backgroundColor: bgColor }, pressed && { opacity: 0.7 }]}
                >
                  <View style={[hs.cardLeft, { backgroundColor: accentColor }]}>
                    <View style={[hs.routeDot, { backgroundColor: accentColor }]} />
                    <View style={hs.routeLine} />
                  </View>
                  <YStack flex={1} gap={4}>
                    <XStack items="center" justify="space-between">
                      <XStack gap={6} items="center">
                        <MaterialCommunityIcons name={icon as any} size={12} color={accentColor} />
                        <Text color="#F0F4FF" fontSize={14} fontWeight="600">{t.stationName} → {t.destinationName}</Text>
                      </XStack>
                      <Text color={accentColor} fontSize={12} fontWeight="700">{t.totalPrice} TND</Text>
                    </XStack>
                    <XStack gap={12}>
                      <Text color="#556580" fontSize={11}>{t.etdLabel}</Text>
                      <Text color="#556580" fontSize={11}>{t.vehiclePlate}</Text>
                      <Text color="#556580" fontSize={11}>{t.seatCount} seat{t.seatCount !== 1 ? 's' : ''}</Text>
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: bgColor }}>
                        <Text color={accentColor} fontSize={9} fontWeight="700">{stateLabel}</Text>
                      </View>
                    </XStack>
                  </YStack>
                  <MaterialCommunityIcons name="chevron-right" size={16} color="#3A4A60" />
                </Pressable>
              )})}
            </YStack>
          ))
        )}
      </ScrollView>
    </YStack>
  );
}

const hs = StyleSheet.create({
  stat: {
    flex: 1, padding: 12, borderRadius: 12,
    backgroundColor: '#0D1525', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#0D1525', alignItems: 'center', justifyContent: 'center',
  },
  cta: {
    marginTop: 8, backgroundColor: '#D4A853',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingRight: 14, paddingLeft: 0,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  cardLeft: { alignItems: 'center', width: 32 },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4A853' },
  routeLine: { width: 2, height: 28, backgroundColor: '#1E2D45', marginTop: -2 },
});
