import { env } from '../../config/env.js';
import type { UserDocument } from '../users/user.model.js';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
  sound: 'default';
}

export async function sendPushNotification(
  user: Pick<UserDocument, 'pushTokens' | 'preferences'>,
  message: Omit<ExpoPushMessage, 'to'>,
): Promise<void> {
  const pushTokens = user.pushTokens ?? [];
  if (!user.preferences.pushNotifications || pushTokens.length === 0) return;

  const messages: ExpoPushMessage[] = pushTokens.map((token) => ({ ...message, to: token }));
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      console.error('[push] Expo rejected notification:', response.status, await response.text());
    }
  } catch (error) {
    console.error('[push] Failed to send notification:', error);
  }
}
