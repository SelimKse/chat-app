/**
 * SMS gönder
 * @param {string} toPhoneNumber - Alıcı telefon numarası (uluslararası format: +90...)
 * @param {string} message - SMS içeriği
 * @returns {Promise<Object>} Fake SMS response
 */
export const sendSMS = async (toPhoneNumber, message) => {
  try {
    const fakeResult = {
      sid: `fake-sms-${Date.now()}`,
      status: "simulated",
      provider: "fake",
    };

    console.warn("⚠️  SMS gönderimi fake modda çalışıyor. Gerçek SMS gönderilmiyor.");
    console.log(`[FAKE SMS] ${toPhoneNumber}: ${message}`);
    return fakeResult;
  } catch (error) {
    console.error("❌ SMS gönderme hatası:", error.message);
    throw error;
  }
};
