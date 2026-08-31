import { initializeApp, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { cert } from 'firebase-admin/app';

// Initialize Firebase Admin once
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

/**
 * Sends a push notification to the officer topic/channel via FCM.
 * @param {{ title: string, body: string, data?: object }} notification
 */
export async function sendPushNotification({ title, body, data = {} }) {
  try {
    const message = {
      topic: 'officers',
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    };
    const messaging = getMessaging();
    const response = await messaging.send(message);
    console.log(`[Push] Notification sent:`, response);
    return response;
  } catch (err) {
    console.error('[Push] Failed to send notification:', err.message);
    throw err;
  }
}
