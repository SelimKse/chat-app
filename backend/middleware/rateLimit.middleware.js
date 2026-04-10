import rateLimit from "express-rate-limit";

const buildLimiter = ({ windowMs, max, code, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        status: false,
        code,
        message,
        statusCode: 429,
      });
    },
  });

const globalApiLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  code: "RATE_LIMIT_EXCEEDED",
  message: "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.",
});

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  code: "AUTH_RATE_LIMIT_EXCEEDED",
  message: "Kimlik doğrulama istek limiti aşıldı. Lütfen daha sonra tekrar deneyin.",
});

const loginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  code: "LOGIN_RATE_LIMIT_EXCEEDED",
  message: "Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.",
});

const supportCreateLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  code: "SUPPORT_CREATE_LIMIT_EXCEEDED",
  message: "Çok fazla destek talebi oluşturdunuz. Lütfen daha sonra tekrar deneyin.",
});

const supportMessageLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  code: "SUPPORT_MESSAGE_LIMIT_EXCEEDED",
  message: "Çok hızlı mesaj gönderimi tespit edildi. Lütfen bekleyip tekrar deneyin.",
});

export { globalApiLimiter, authLimiter, loginLimiter, supportCreateLimiter, supportMessageLimiter };
