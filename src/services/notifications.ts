import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Définir comment les notifications s'affichent lorsque l'app mobile est au premier plan
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function demanderPermissionNotifications(): Promise<boolean> {
  // 1. Cas Web / PWA
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // 2. Cas Android / iOS
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notifications croquvite',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function recupererExpoPushTokenMobile(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const autorise = await demanderPermissionNotifications();
  if (!autorise) return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    console.warn('projectId EAS introuvable dans la configuration Expo.');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

export async function envoyerNotificationLocale(titre: string, corps: string): Promise<void> {
  const autorise = await demanderPermissionNotifications();
  if (!autorise) return;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(titre, { body: corps });
    }
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: titre,
      body: corps,
      sound: 'default',
    },
    trigger: null, // Déclenchement immédiat
  });
}