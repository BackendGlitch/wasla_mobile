import { useEffect, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { useBookingStore } from '../../src/store';
import { appColors } from '../../src/theme/appTheme';

export default function TicketScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ticketId?: string | string[]; bookingId?: string | string[] }>();
  const tid = typeof params.ticketId === 'string' ? params.ticketId : Array.isArray(params.ticketId) ? params.ticketId[0] : '';
  const bid = typeof params.bookingId === 'string' ? params.bookingId : Array.isArray(params.bookingId) ? params.bookingId[0] : '';
  const ticket = useBookingStore((s) => s.tickets.find((t) => t.id === tid || t.id === bid));
  const topPad = Math.max(insets.top + 12, 48);

  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(app)'); };

  const handleShare = async () => {
    if (!ticket) return;
    await Share.share({
      message: `Wasla Ticket\nFrom: ${ticket.stationName}\nTo: ${ticket.destinationName}\nPlate: ${ticket.vehiclePlate}\nETD: ${ticket.etdLabel}\nSeats: ${ticket.seatCount}\nRef: ${ticket.id}`,
      title: 'Wasla Ticket',
    });
  };

  if (!ticket) {
    return (
      <YStack flex={1} bg="#060B14" px={20} pt={topPad} gap={16}>
        <Pressable onPress={goBack} style={s.backBtn}>
          <XStack items="center" gap={6}>
            <MaterialCommunityIcons name="arrow-left" size={18} color="#8899B4" />
            <Text color="#8899B4" fontSize={14} fontWeight="600">Back</Text>
          </XStack>
        </Pressable>
        <YStack flex={1} items="center" justify="center" gap={12}>
          <MaterialCommunityIcons name="ticket-account" size={48} color="#3A4A60" />
          <Text color="#F0F4FF" fontSize={18} fontWeight="700">Ticket not found</Text>
          <Text color="#556580" fontSize={13} text="center">The ticket may have been cleared.{'\n'}Create a new booking to generate another one.</Text>
          <Pressable onPress={() => router.replace('/(app)')} style={s.btn}>
            <Text color="#0A0F19" fontSize={14} fontWeight="700">Back to home</Text>
          </Pressable>
        </YStack>
      </YStack>
    );
  }

  const etdTime = ticket.etdLabel || dayjs(ticket.etdIso).format('HH:mm');

  return (
    <YStack flex={1} bg="#060B14">
      <ScrollView contentContainerStyle={{ paddingTop: topPad, paddingBottom: Math.max(insets.bottom, 20) + 40, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <XStack items="center" justify="space-between" mb={20}>
          <Pressable onPress={goBack} style={s.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#8899B4" />
          </Pressable>
          <YStack items="center">
            <Text color="#F0F4FF" fontSize={15} fontWeight="700">Your Ticket</Text>
            <Text color="#22C55E" fontSize={11} fontWeight="600">Confirmed</Text>
          </YStack>
          <Pressable onPress={handleShare} style={s.backBtn}>
            <MaterialCommunityIcons name="share-variant" size={18} color="#8899B4" />
          </Pressable>
        </XStack>

        {/* Main Ticket Card */}
        <View style={s.card}>
          {/* Top gradient strip */}
          <View style={s.cardTop}>
            <View style={s.cardTopBar} />
            <XStack items="center" justify="space-between" px={20} pt={20} pb={12}>
              <XStack gap={8} items="center">
                <MaterialCommunityIcons name="bus" size={20} color="#D4A853" />
                <YStack>
                  <Text color="#F0F4FF" fontSize={12} fontWeight="700">{ticket.stationName}</Text>
                  <Text color="#556580" fontSize={10}>{dayjs(ticket.issuedAt).format('DD MMM · HH:mm')}</Text>
                </YStack>
              </XStack>
              <View style={s.statusPill}>
                <View style={s.statusDot} />
                <Text color="#22C55E" fontSize={10} fontWeight="700">ACTIVE</Text>
              </View>
            </XStack>
          </View>

          {/* Route */}
          <View style={s.routeStrip}>
            <YStack flex={1} gap={2}>
              <Text color="#556580" fontSize={9} fontWeight="600" letterSpacing={1}>FROM</Text>
              <Text color="#F0F4FF" fontSize={22} fontWeight="800" letterSpacing={-0.5}>{ticket.stationName}</Text>
            </YStack>
            <View style={s.routeVis}>
              <View style={s.routeDot} />
              <View style={s.routeBar} />
              <MaterialCommunityIcons name="bus" size={14} color="#D4A853" />
              <View style={s.routeBar} />
              <View style={s.routeDotEnd} />
            </View>
            <YStack flex={1} gap={2} items="flex-end">
              <Text color="#556580" fontSize={9} fontWeight="600" letterSpacing={1}>TO</Text>
              <Text color="#F0F4FF" fontSize={22} fontWeight="800" letterSpacing={-0.5} text="right">{ticket.destinationName}</Text>
            </YStack>
          </View>

          {/* Dotted divider */}
          <View style={s.divider}>
            <View style={s.dividerCutLeft} />
            {Array.from({ length: 18 }).map((_, i) => <View key={i} style={s.dividerDot} />)}
            <View style={s.dividerCutRight} />
          </View>

          {/* QR Code Section */}
          <YStack items="center" py={8} gap={12}>
            <View style={s.qrContainer}>
              <View style={s.qrInner}>
                <QRCode value={ticket.qrValue || ticket.id} size={160} backgroundColor="#F0F4FF" color="#060B14" />
              </View>
            </View>
            <Text color="#556580" fontSize={10}>{ticket.id?.slice(0, 8).toUpperCase()}</Text>
          </YStack>

          {/* Dotted divider */}
          <View style={s.divider}>
            <View style={s.dividerCutLeft} />
            {Array.from({ length: 18 }).map((_, i) => <View key={i} style={s.dividerDot} />)}
            <View style={s.dividerCutRight} />
          </View>

          {/* Trip Info Grid */}
          <View style={s.infoGrid}>
            <View style={s.infoCell}>
              <MaterialCommunityIcons name="card-bulleted" size={14} color="#556580" />
              <Text color="#556580" fontSize={10} fontWeight="600">PLATE</Text>
              <Text color="#F0F4FF" fontSize={16} fontWeight="700">{ticket.vehiclePlate}</Text>
            </View>
            <View style={s.infoCell}>
              <MaterialCommunityIcons name="account-group" size={14} color="#556580" />
              <Text color="#556580" fontSize={10} fontWeight="600">SEATS</Text>
              <Text color="#F0F4FF" fontSize={16} fontWeight="700">{ticket.seatCount}</Text>
            </View>
            <View style={s.infoCell}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#556580" />
              <Text color="#556580" fontSize={10} fontWeight="600">DEPARTURE</Text>
              <Text color="#D4A853" fontSize={16} fontWeight="700">{etdTime}</Text>
            </View>
            <View style={s.infoCell}>
              <MaterialCommunityIcons name="cash" size={14} color="#556580" />
              <Text color="#556580" fontSize={10} fontWeight="600">PAID</Text>
              <Text color="#22C55E" fontSize={16} fontWeight="700">{ticket.totalPrice} TND</Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <XStack gap={10} mt={20}>
          <Pressable onPress={() => router.replace('/(app)')} style={({ pressed }) => [s.actionBtn, s.actionBtnSecondary, pressed && { opacity: 0.7 }]}>
            <MaterialCommunityIcons name="home-variant" size={18} color="#8899B4" />
            <Text color="#8899B4" fontSize={14} fontWeight="600">Home</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/history')} style={({ pressed }) => [s.actionBtn, s.actionBtnPrimary, pressed && { opacity: 0.8 }]}>
            <MaterialCommunityIcons name="history" size={18} color="#0A0F19" />
            <Text color="#0A0F19" fontSize={14} fontWeight="700">History</Text>
          </Pressable>
        </XStack>

        {/* Tip */}
        <Text color="#3A4A60" fontSize={10} text="center" mt={20}>Show the QR code to the staff when boarding the vehicle.</Text>
      </ScrollView>
    </YStack>
  );
}

const s = StyleSheet.create({
  backBtn: { padding: 6 },
  btn: { backgroundColor: '#D4A853', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  // Main card
  card: {
    borderRadius: 24, backgroundColor: '#0D1525',
    borderWidth: 1, borderColor: 'rgba(212,168,83,0.12)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  cardTop: {
    backgroundColor: 'rgba(212,168,83,0.06)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(212,168,83,0.08)',
  },
  cardTopBar: {
    height: 3, backgroundColor: '#D4A853',
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    marginHorizontal: '30%',
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.1)',
  },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22C55E' },
  // Route
  routeStrip: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 18, gap: 8,
  },
  routeVis: { alignItems: 'center', paddingTop: 26, width: 40 },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#0D1525' },
  routeDotEnd: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4A853', borderWidth: 2, borderColor: '#0D1525' },
  routeBar: { width: 2, height: 14, backgroundColor: '#1E2D45' },
  // Divider
  divider: {
    flexDirection: 'row', alignItems: 'center',
    height: 1, paddingHorizontal: 4,
  },
  dividerDot: {
    flex: 1, height: 1, backgroundColor: 'rgba(212,168,83,0.2)',
    marginHorizontal: 1, borderRadius: 0.5,
  },
  dividerCutLeft: {
    position: 'absolute', left: -10, top: -10,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#060B14',
  },
  dividerCutRight: {
    position: 'absolute', right: -10, top: -10,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#060B14',
  },
  // QR
  qrContainer: {
    padding: 12, borderRadius: 20,
    backgroundColor: 'rgba(212,168,83,0.1)',
    borderWidth: 1, borderColor: 'rgba(212,168,83,0.15)',
  },
  qrInner: {
    padding: 10, borderRadius: 14,
    backgroundColor: '#F0F4FF',
  },
  // Info grid
  infoGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 16, gap: 10,
  },
  infoCell: {
    width: '47%', gap: 3,
    padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
  },
  // Action buttons
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  actionBtnPrimary: { backgroundColor: '#D4A853' },
  actionBtnSecondary: { backgroundColor: '#0D1525', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
});
