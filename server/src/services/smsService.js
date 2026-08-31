import { Textbee } from '@textbee/sdk';

const textbee = new Textbee({
  apiKey: process.env.TEXTBEE_API_KEY,
});

/**
 * Sends an SMS to a farmer via Textbee.
 * @param {string} to - Recipient phone number (E.164 format)
 * @param {string} body - SMS message body
 */
export async function sendSMS(to, body) {
  try {
    const result = await textbee.sendSms({
      ...(process.env.TEXTBEE_DEVICE_ID && { deviceId: process.env.TEXTBEE_DEVICE_ID }),
      recipients: [to],
      message: body,
    });
    console.log(`[SMS] Sent to ${to}:`, result);
    return result;
  } catch (err) {
    console.error(`[SMS] Failed to send to ${to}:`, err.message);
    throw err;
  }
}
