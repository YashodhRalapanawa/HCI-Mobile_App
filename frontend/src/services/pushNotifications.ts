import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiRequest } from './api';

type NotificationSubscription = {
  remove: () => void;
};

export async function registerForPushNotifications(token: string | null): Promise<NotificationSubscription | null> {
  // Expo Go cannot provide remote push notification support for this SDK.
  // A development/production build is required for the actual device token.
  if (!token || token === 'demo-jwt-token' || !Device.isDevice || Constants.appOwnership === 'expo') return null;

  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const existing = await Notifications.getPermissionsAsync();
  let permission = existing.status;
  if (permission !== 'granted') {
    permission = (await Notifications.requestPermissionsAsync()).status;
  }
  if (permission !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const pushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  await apiRequest<void>('notifications/push-token', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ token: pushToken }),
  });
  return Notifications.addNotificationResponseReceivedListener((response) => {
    void response;
  });
}
