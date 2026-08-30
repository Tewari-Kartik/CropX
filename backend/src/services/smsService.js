import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Sends an SMS to a farmer via Twilio.
 * @param {string} to - Recipient phone number (E.164 format)
 * @param {string} body - SMS message body
 */
export async function sendSMS(to, body) {
  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
      body,
    });
    console.log(`[SMS] Sent to ${to}: ${message.sid}`);
    return message.sid;
  } catch (err) {
    console.error(`[SMS] Failed to send to ${to}:`, err.message);
    throw err;
  }
}
