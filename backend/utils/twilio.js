import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * SMS gönder
 * @param {string} toPhoneNumber - Alıcı telefon numarası (uluslararası format: +90...)
 * @param {string} message - SMS içeriği
 * @returns {Promise<Object>} Twilio response
 */
export const sendSMS = async (toPhoneNumber, message) => {
  try {
    if (!accountSid || !authToken || !fromNumber) {
      console.warn("⚠️  Twilio yapılandırması eksik. SMS gönderilmedi. (test mode)");
      console.log(`[TEST SMS] ${toPhoneNumber}: ${message}`);
      return { sid: "test_mode", status: "test" };
    }

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toPhoneNumber,
    });

    console.log(`✓ SMS gönderildi: ${result.sid}`);
    return result;
  } catch (error) {
    console.error("❌ SMS gönderme hatası:", error.message);
    throw error;
  }
};
