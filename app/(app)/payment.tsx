import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import api from "../../src/lib/api";
import { useBookingStore, type TicketRecord } from "../../src/store";
import dayjs from "dayjs";

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    paymentUrl?: string;
    centralBookingId?: string;
    amount?: string;
    description?: string;
    vehiclePlate?: string;
    stationId?: string;
    stationName?: string;
    routeId?: string;
    routeName?: string;
    departureName?: string;
    destinationName?: string;
    availableSeats?: string;
    seatCount?: string;
    pricePerSeat?: string;
    totalPrice?: string;
    etdIso?: string;
    etdLabel?: string;
  }>();

  const paymentUrl = params.paymentUrl ?? "";
  const bookingId = params.centralBookingId ?? "";
  const amount = Number(params.amount ?? "0") || 0;
  const description = params.description ?? "Wasla booking";
  const [showWebView, setShowWebView] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [paymentDone, setPaymentDone] = useState(false);
  const amountTnd = (amount / 1000).toFixed(3);

  const addTicket = useBookingStore((s) => s.addTicket);

  const confirmTicket = useCallback(async (bId: string): Promise<boolean> => {
    try {
      const res = await api.post(`/bookings/${bId}/confirm-payment`);
      if (res.data?.ticket || res.data?.already_confirmed) {
        // Build ticket record from server response + draft params
        const t = res.data?.ticket || {};
        const ticketRecord: TicketRecord = {
          id: t.id || bId,
          qrValue: t.qr_payload || bId.slice(0, 8).toUpperCase(),
          issuedAt: t.created_at || new Date().toISOString(),
          paymentStatus: "confirmed",
          state: "active",
          stationId: t.station_id || params.stationId || "",
          stationName: params.stationName || params.departureName || "",
          routeId: t.destination_id || params.routeId || "",
          routeName: params.destinationName || params.routeName || "",
          departureName: params.departureName || params.stationName || "",
          destinationName: params.destinationName || params.routeName || "",
          availableSeats: Number(params.availableSeats ?? "0") || 1,
          seatCount: t.seats_booked || Number(params.seatCount ?? "1") || 1,
          pricePerSeat: Number(params.pricePerSeat ?? "0") || 0,
          totalPrice: Number(params.totalPrice ?? "0") || 0,
          etdIso: t.etd_timestamp || params.etdIso || new Date().toISOString(),
          etdLabel: t.etd_timestamp
            ? dayjs(t.etd_timestamp).format("HH:mm")
            : params.etdLabel || "--:--",
          vehiclePlate: t.vehicle_plate || params.vehiclePlate || "TBA",
        };

        // Save ticket to store
        addTicket(ticketRecord);

        // Navigate to ticket page with booking ID
        router.replace({
          pathname: "/(app)/ticket",
          params: { bookingId: bId },
        });

        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [router, addTicket, params]);

  const startPolling = useCallback(async () => {
    setShowWebView(false);
    setPaymentDone(true);
    setConfirming(true);
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const done = await confirmTicket(bookingId);
      if (done) { setConfirming(false); return; }
    }
    setConfirming(false);
    Alert.alert("Taking longer...", "Check your bookings shortly.", [
      { text: "OK", onPress: () => router.replace("/(app)") },
    ]);
  }, [bookingId, confirmTicket, router]);

  // Detect navigation to the backend return page
  const handleNavChange = useCallback((navState: { url?: string }) => {
    const url = navState.url || "";
    if (url.includes("/payments/return")) {
      if (url.includes("status=succeeded") || url.includes("status%3Dsucceeded")) {
        startPolling();
      } else if (url.includes("status=failed") || url.includes("status%3Dfailed")) {
        setShowWebView(false);
        setError("Payment was declined. Please try again.");
      }
    }
  }, [startPolling]);

  if (showWebView && paymentUrl) {
    return (
      <View style={{ flex: 1, backgroundColor: "#060B14" }}>
        <View style={{
          height: 56, backgroundColor: "#0d0d0d", flexDirection: "row",
          alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
        }}>
          <Text style={{ color: "#F0F4FF", fontSize: 16, fontWeight: "600" }}>NexaPay Checkout</Text>
          <TouchableOpacity onPress={() => setShowWebView(false)}>
            <Text style={{ color: "#EF4444", fontSize: 15, fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: paymentUrl }}
          style={{ flex: 1 }}
          onNavigationStateChange={handleNavChange}
          javaScriptEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#060B14" }}>
              <ActivityIndicator color="#00d4aa" size="large" />
            </View>
          )}
        />
      </View>
    );
  }

  if (confirming) {
    return (
      <View style={{ flex: 1, backgroundColor: "#060B14", padding: 20, justifyContent: "center", alignItems: "center", gap: 16 }}>
        <ActivityIndicator color="#00d4aa" size="large" />
        <Text style={{ color: "#F0F4FF", fontSize: 18, fontWeight: "bold" }}>Confirming booking...</Text>
        <Text style={{ color: "#8899B4", fontSize: 13 }}>Payment received. Generating your ticket.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14", padding: 20, justifyContent: "center", gap: 16 }}>
      <Text style={{ color: "#F0F4FF", fontSize: 22, fontWeight: "bold", textAlign: "center" }}>
        Pay with NexaPay
      </Text>
      <Text style={{ color: "#8899B4", fontSize: 16, textAlign: "center" }}>{amountTnd} TND</Text>
      <Text style={{ color: "#556580", fontSize: 13, textAlign: "center" }}>{description}</Text>

      {paymentDone ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Text style={{ color: "#22C55E", fontSize: 18, fontWeight: "bold" }}>Payment Complete!</Text>
          <TouchableOpacity
            onPress={() => startPolling()}
            style={{ backgroundColor: "#00d4aa", padding: 16, borderRadius: 12, width: "100%", alignItems: "center" }}
          >
            <Text style={{ color: "#000", fontWeight: "bold", fontSize: 16 }}>Get My Ticket</Text>
          </TouchableOpacity>
        </View>
      ) : error ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Text style={{ color: "#EF4444", fontSize: 16, fontWeight: "bold" }}>{error}</Text>
          <TouchableOpacity
            onPress={() => setError("")}
            style={{ backgroundColor: "#00d4aa", padding: 14, borderRadius: 10, width: "100%", alignItems: "center" }}
          >
            <Text style={{ color: "#000", fontWeight: "bold" }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setShowWebView(true)}
          style={{
            backgroundColor: "#00d4aa", padding: 16, borderRadius: 12, alignItems: "center",
          }}
        >
          <Text style={{ color: "#000", fontWeight: "bold", fontSize: 16 }}>
            Pay {amountTnd} TND
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
