import nodemailer from "nodemailer";

const getTransporter = () => {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false") === "true";

  // Dev mode: SMTP credentials yoksa dev transporter kullan
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("⚠️  SMTP ayarları eksik. Dev mode'da test transporter kullanılıyor.");
      return nodemailer.createTransport({
        host: "localhost",
        port: 1025,
        ignoreTLS: true,
      });
    }
    throw new Error("SMTP ayarlari eksik. SMTP_HOST, SMTP_USER ve SMTP_PASS zorunludur.");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  try {
    const transporter = getTransporter();

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@afet-koordinasyon.com";
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log(`✓ Email gönderildi: ${info.messageId}`);
    return info;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[TEST EMAIL] To: ${to}, Subject: ${subject}`);
      console.log(`[TEST EMAIL] Text: ${text.substring(0, 100)}...`);
      return { messageId: "test_mode" };
    }
    throw error;
  }
};

export { sendMail };
