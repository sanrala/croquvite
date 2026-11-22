import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, parseISODate } from './dates';
import { FoodItem, Location } from './types';

const CHANNEL_ID = 'expiry';

/** Combien de jours avant l'expiration on prévient (0 = le jour même, à 9 h). */
const REMINDER_DAYS: Record<Location, number[]> = {
  frigo: [3, 1],
  congelo: [7, 1],
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Dates d'expiration",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Planifie les rappels d'un article et retourne leurs identifiants. */
export async function scheduleExpiryNotifications(item: FoodItem): Promise<string[]> {
  const ids: string[] = [];
  const expiry = parseISODate(item.expiryDate);
  const now = Date.now();

  for (const before of REMINDER_DAYS[item.location]) {
    const when = addDays(expiry, -before);
    when.setHours(9, 0, 0, 0);
    if (when.getTime() <= now) continue;

    const body =
      before === 0
        ? `${item.name} expire aujourd'hui.`
        : `${item.name} expire dans ${before} jour${before > 1 ? 's' : ''}.`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: item.location === 'frigo' ? 'À consommer bientôt' : 'À sortir du congélateur',
        body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: CHANNEL_ID,
      },
    });
    ids.push(id);
  }
  return ids;
}

export async function cancelNotifications(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}
