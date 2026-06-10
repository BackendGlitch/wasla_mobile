import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { Platform } from 'react-native';

/** Schedule a departure reminder 15 minutes before ETD. */
export async function scheduleDepartureReminder(ticket: {
  id: string;
  stationName: string;
  destinationName: string;
  etdIso?: string;
  etdLabel?: string;
  vehiclePlate?: string;
}) {
  const etd = dayjs(ticket.etdIso);
  if (!etd.isValid()) return;

  const triggerTime = etd.subtract(15, 'minute');
  if (triggerTime.isBefore(dayjs())) return; // Too late to schedule

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    identifier: `departure-${ticket.id}`,
    content: {
      title: `Departure in 15 min — ${ticket.stationName}`,
      body: `${ticket.destinationName} · ${ticket.etdLabel || etd.format('HH:mm')} · Plate ${ticket.vehiclePlate || 'TBA'}`,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'departures' } : {}),
    },
    trigger: { type: 'date' as const, date: triggerTime.toDate() },
  });
}

/** Cancel a reminder when ticket is cancelled. */
export async function cancelDepartureReminder(ticketId: string) {
  await Notifications.cancelScheduledNotificationAsync(`departure-${ticketId}`);
}

/** Initialize notification channel for Android. */
export async function initReminders() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('departures', {
      name: 'Departure Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}
