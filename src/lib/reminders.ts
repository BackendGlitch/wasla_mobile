import { Platform } from 'react-native';
import dayjs from 'dayjs';

/** Schedule a departure reminder 15 minutes before ETD. Works only in dev builds, silently skipped in Expo Go. */
export async function scheduleDepartureReminder(ticket: {
  id: string; stationName: string; destinationName: string;
  etdIso?: string; etdLabel?: string; vehiclePlate?: string;
}) {
  // Dynamic import — avoids Metro bundling issues in Expo Go
  let Notifications: any;
  try { Notifications = require('expo-notifications'); } catch { return; }
  if (!Notifications) return;
  const etd = dayjs(ticket.etdIso);
  if (!etd.isValid()) return;
  const triggerTime = etd.subtract(15, 'minute');
  if (triggerTime.isBefore(dayjs())) return;

  try {
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
      trigger: { date: triggerTime.toDate() } as any,
    });
  } catch { /* silently skip in Expo Go */ }
}

export async function cancelDepartureReminder(ticketId: string) {
  if (!Notifications) return;
  try { await Notifications.cancelScheduledNotificationAsync(`departure-${ticketId}`); } catch { /* */ }
}

export async function initReminders() {
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('departures', {
      name: 'Departure Reminders',
      importance: Notifications.AndroidImportance?.HIGH ?? 4,
    });
  } catch { /* */ }
}
