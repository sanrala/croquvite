import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { planReminders } from './reminderLogic';
import { NotifMap, notifSignature, planNotifications } from './syncLogic';
import { FoodItem } from './types';

const CHANNEL_ID = 'expiry';
const MAP_KEY = 'frigo:notif-map:v1';

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

/** Planifie les rappels d'un article (automatiques, ou à la date choisie) et retourne leurs identifiants. */
export async function scheduleExpiryNotifications(item: FoodItem): Promise<string[]> {
  const ids: string[] = [];
  const now = Date.now();

  for (const reminder of planReminders(item)) {
    if (reminder.when.getTime() <= now) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'À consommer bientôt',
        body: reminder.body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.when,
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

async function loadMap(): Promise<NotifMap> {
  try {
    const raw = await AsyncStorage.getItem(MAP_KEY);
    return raw ? (JSON.parse(raw) as NotifMap) : {};
  } catch {
    return {};
  }
}

async function reconcile(items: FoodItem[]): Promise<void> {
  const map = await loadMap();
  const plan = planNotifications(items, map);

  if (
    plan.cancel.length === 0 &&
    plan.schedule.length === 0 &&
    plan.drop.length === 0 &&
    Object.keys(plan.seed).length === 0
  ) {
    return;
  }

  await cancelNotifications(plan.cancel);
  for (const id of plan.drop) delete map[id];
  Object.assign(map, plan.seed);

  for (const item of plan.schedule) {
    try {
      const ids = await scheduleExpiryNotifications(item);
      map[item.id] = { sig: notifSignature(item), ids };
    } catch {
      // Permission refusée ou notifications indisponibles : on réessaiera à la prochaine modification.
    }
  }
  await AsyncStorage.setItem(MAP_KEY, JSON.stringify(map));
}

let queue: Promise<void> = Promise.resolve();

/**
 * Aligne les rappels de CET appareil sur la liste de produits (ajouts, modifications, suppressions,
 * y compris ceux venant d'un autre appareil via la synchronisation). Sans effet sur le web.
 */
export function syncNotifications(items: FoodItem[]): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  queue = queue.then(() => reconcile(items)).catch(() => {});
  return queue;
}
