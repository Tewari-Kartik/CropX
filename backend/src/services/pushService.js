import admin from 'firebase-admin';

// Initialize Firebase Admin once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
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
    const response = await admin.messaging().send(message);
    console.log(`[Push] Notification sent:`, response);
    return response;
  } catch (err) {
    console.error('[Push] Failed to send notification:', err.message);
    throw err;
  }
}
