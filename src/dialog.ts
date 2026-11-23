import { Alert, Platform } from 'react-native';

/**
 * Alert.alert ne fait rien dans un navigateur (react-native-web) :
 * on utilise donc window.alert / window.confirm sur le web.
 */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(
  title: string,
  message: string | undefined,
  confirmLabel: string,
  onConfirm: () => void,
  destructive = true,
): void {
  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
