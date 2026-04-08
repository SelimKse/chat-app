import User from "../models/User.js";
import SecurityCode from "../models/SecurityCode.js";
import crypto from "crypto";

import { comparePassword, generateAlphaNumericOTP, generateNumericOTP, generateToken } from "../utils/generateToken.js";
import { sendMail } from "../utils/mailer.js";
import { sendSMS } from "../utils/twilio.js";
import { LOGIN_ERRORS, LOGOUT_ERRORS, REGISTER_ERRORS, createErrorResponse, createSuccessResponse } from "../constants/errorCodes.js";
import { getBanResponseData, syncExpiredBan } from "../utils/ban.js";

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const normalizeCountryCode = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
};

const normalizePhoneNumber = (value) => String(value ?? "").replace(/\D/g, "");

const hashCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");

const createSecurityCode = async ({ userId, purpose, channel, rawCode, ttlMinutes = 10, maxAttempts = 5, metadata = {} }) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  await SecurityCode.updateMany({ userId, purpose, usedAt: null, expiresAt: { $gt: now } }, { $set: { usedAt: now } });

  await SecurityCode.create({
    userId,
    purpose,
    channel,
    codeHash: hashCode(rawCode),
    expiresAt,
    maxAttempts,
    metadata,
  });
};

const consumeSecurityCode = async ({ userId, purpose, rawCode }) => {
  const now = new Date();
  const codeHash = hashCode(rawCode);

  const codeDoc = await SecurityCode.findOne({
    userId,
    purpose,
    usedAt: null,
    expiresAt: { $gt: now },
  }).sort({ createdAt: -1 });

  if (!codeDoc) {
    return { ok: false, reason: "expired_or_missing" };
  }

  if (codeDoc.attempts >= codeDoc.maxAttempts) {
    codeDoc.usedAt = now;
    await codeDoc.save();
    return { ok: false, reason: "too_many_attempts" };
  }

  if (codeDoc.codeHash !== codeHash) {
    codeDoc.attempts += 1;
    await codeDoc.save();
    return { ok: false, reason: "invalid_code" };
  }

  codeDoc.usedAt = now;
  await codeDoc.save();
  return { ok: true };
};

const registerUser = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_BODY.code,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.message,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode,
          ),
        );
    }

    const { firstName, lastName, username, email, password, phoneNumber, countryCode } = body;
    const normalizedCountryCode = normalizeCountryCode(countryCode);
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    // Gerekli alanların doğrulanması
    if (!firstName || !lastName || !username || !email || !password || !normalizedPhoneNumber || !normalizedCountryCode) {
      return res
        .status(REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.code,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.message,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode,
          ),
        );
    }

    // Username doğrulaması (3-30 karakter, alphanumeric ve underscore)
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return res
        .status(400)
        .json(createErrorResponse("INVALID_USERNAME", "Kullanıcı adı 3-30 karakter olmalı, sadece harf, rakam ve alt çizgi içerebilir", 400));
    }

    // E-posta formatının doğrulanması
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_EMAIL.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.code,
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.message,
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.statusCode,
          ),
        );
    }

    // Telefon numarası formatının doğrulanması
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    const fullPhone = `${normalizedCountryCode}${normalizedPhoneNumber}`;
    if (!phoneRegex.test(fullPhone)) {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_PHONE.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_PHONE.code,
            REGISTER_ERRORS.REGISTER_INVALID_PHONE.message,
            REGISTER_ERRORS.REGISTER_INVALID_PHONE.statusCode,
          ),
        );
    }

    // Username, telefon numarası veya e-posta adresi zaten kayıtlı mı kontrolü
    const existingUserByUsername = await User.findOne({ username: username.toLowerCase() });
    const existingUserByPhone = await User.findOne({
      "phone.phoneNumber": normalizedPhoneNumber,
    });
    const existingUserByEmail = await User.findOne({ "email.address": email });

    if (existingUserByUsername) {
      return res.status(409).json(createErrorResponse("USERNAME_EXISTS", "Bu kullanıcı adı zaten kullanılıyor", 409));
    }

    if (existingUserByPhone) {
      return res
        .status(REGISTER_ERRORS.REGISTER_PHONE_EXISTS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_PHONE_EXISTS.code,
            REGISTER_ERRORS.REGISTER_PHONE_EXISTS.message,
            REGISTER_ERRORS.REGISTER_PHONE_EXISTS.statusCode,
          ),
        );
    }

    if (existingUserByEmail) {
      return res
        .status(REGISTER_ERRORS.REGISTER_EMAIL_EXISTS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_EMAIL_EXISTS.code,
            REGISTER_ERRORS.REGISTER_EMAIL_EXISTS.message,
            REGISTER_ERRORS.REGISTER_EMAIL_EXISTS.statusCode,
          ),
        );
    }

    // Şifre gücünün doğrulanması
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res
        .status(REGISTER_ERRORS.REGISTER_WEAK_PASSWORD.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_WEAK_PASSWORD.code,
            REGISTER_ERRORS.REGISTER_WEAK_PASSWORD.message,
            REGISTER_ERRORS.REGISTER_WEAK_PASSWORD.statusCode,
          ),
        );
    }

    // Yeni kullanıcı oluşturulması
    const newUser = new User({
      firstName,
      lastName,
      username: username.toLowerCase(),
      email: { address: email, verified: false },
      password,
      phone: { phoneNumber: normalizedPhoneNumber, countryCode: normalizedCountryCode, verified: true },
      role: "user",
      status: "active",
    });

    // Kullanıcı veritabanına kaydedilir
    await newUser.save();

    const token = generateToken(newUser._id);
    res.cookie("token", token, authCookieOptions);

    // Başarılı kayıt işlemi için yanıt gönderilir
    return res.status(201).json(
      createSuccessResponse("REGISTER_SUCCESS", "Kullanıcı başarıyla kaydedildi", 201, {
        userId: newUser.uuid,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        email: newUser.email.address,
        role: newUser.role,
      }),
    );
  } catch (error) {
    console.error("Kullanıcı kayıt hatası:", error);
    return res
      .status(REGISTER_ERRORS.REGISTER_ERROR.statusCode)
      .json(createErrorResponse(REGISTER_ERRORS.REGISTER_ERROR.code, REGISTER_ERRORS.REGISTER_ERROR.message, REGISTER_ERRORS.REGISTER_ERROR.statusCode));
  }
};

const loginUser = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(LOGIN_ERRORS.LOGIN_INVALID_BODY.statusCode)
        .json(createErrorResponse(LOGIN_ERRORS.LOGIN_INVALID_BODY.code, LOGIN_ERRORS.LOGIN_INVALID_BODY.message, LOGIN_ERRORS.LOGIN_INVALID_BODY.statusCode));
    }

    const { phoneNumber, countryCode, password } = body;
    const normalizedCountryCode = normalizeCountryCode(countryCode);
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    // Gerekli alanların doğrulanması
    if (!normalizedCountryCode || !normalizedPhoneNumber || !password) {
      return res
        .status(LOGIN_ERRORS.LOGIN_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(LOGIN_ERRORS.LOGIN_MISSING_FIELDS.code, LOGIN_ERRORS.LOGIN_MISSING_FIELDS.message, LOGIN_ERRORS.LOGIN_MISSING_FIELDS.statusCode),
        );
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findOne({
      "phone.countryCode": normalizedCountryCode,
      "phone.phoneNumber": normalizedPhoneNumber,
    });
    if (!user) {
      return res
        .status(LOGIN_ERRORS.LOGIN_INVALID_CREDENTIALS.statusCode)
        .json(
          createErrorResponse(
            LOGIN_ERRORS.LOGIN_INVALID_CREDENTIALS.code,
            LOGIN_ERRORS.LOGIN_INVALID_CREDENTIALS.message,
            LOGIN_ERRORS.LOGIN_INVALID_CREDENTIALS.statusCode,
          ),
        );
    }

    const { activeBan } = await syncExpiredBan(user);
    if (activeBan && activeBan.scope === "full") {
      return res
        .status(LOGIN_ERRORS.LOGIN_ACCOUNT_BANNED.statusCode)
        .json(
          createErrorResponse(
            LOGIN_ERRORS.LOGIN_ACCOUNT_BANNED.code,
            LOGIN_ERRORS.LOGIN_ACCOUNT_BANNED.message,
            LOGIN_ERRORS.LOGIN_ACCOUNT_BANNED.statusCode,
            { ban: getBanResponseData(activeBan) },
          ),
        );
    }

    if (user.status === "inactive") {
      return res
        .status(LOGIN_ERRORS.LOGIN_ACCOUNT_INACTIVE.statusCode)
        .json(
          createErrorResponse(
            LOGIN_ERRORS.LOGIN_ACCOUNT_INACTIVE.code,
            LOGIN_ERRORS.LOGIN_ACCOUNT_INACTIVE.message,
            LOGIN_ERRORS.LOGIN_ACCOUNT_INACTIVE.statusCode,
          ),
        );
    }

    // Şifrenin doğrulanması
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res
        .status(LOGIN_ERRORS.LOGIN_INVALID_CREDENTIALS.statusCode)
        .json(
          createErrorResponse(
            LOGIN_ERRORS.LOGIN_INVALID_CREDENTIALS.code,
            LOGIN_ERRORS.LOGIN_INVALID_CREDENTIALS.message,
            LOGIN_ERRORS.LOGIN_INVALID_CREDENTIALS.statusCode,
          ),
        );
    }

    // 2 faktörlü kimlik doğrulama kontrolü
    if (user.accountSecurity.twoFactorAuth.enabled) {
      const twoFactorCode = generateNumericOTP(6);

      await createSecurityCode({
        userId: user._id,
        purpose: "TWO_FACTOR_LOGIN",
        channel: "email",
        rawCode: twoFactorCode,
        ttlMinutes: 5,
        maxAttempts: 5,
        metadata: { email: user.email?.address || null },
      });

      if (user.email?.address) {
        await sendMail({
          to: user.email.address,
          subject: "2FA Dogrulama Kodu",
          text: `2FA kodunuz: ${twoFactorCode}`,
        });
      }

      return res.status(200).json(
        createSuccessResponse("TWO_FACTOR_REQUIRED", "2FA kodu gonderildi. Girisi tamamlamak icin kodu dogrulayin", 200, {
          userId: user._id,
        }),
      );
    }

    // JWT token oluşturulur
    const token = generateToken(user._id);
    res.cookie("token", token, authCookieOptions);

    // Başarılı giriş işlemi için yanıt gönderilir
    return res.status(200).json(
      createSuccessResponse("LOGIN_SUCCESS", "Giriş başarılı", 200, {
        userId: user.uuid,
        firstName: user.firstName,
        role: user.role,
      }),
    );
  } catch (error) {
    console.error("Giriş hatası:", error);
    return res
      .status(LOGIN_ERRORS.LOGIN_ERROR.statusCode)
      .json(createErrorResponse(LOGIN_ERRORS.LOGIN_ERROR.code, LOGIN_ERRORS.LOGIN_ERROR.message, LOGIN_ERRORS.LOGIN_ERROR.statusCode));
  }
};

const sendVerificationCode = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_BODY.code,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.message,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode,
          ),
        );
    }

    const { phoneNumber, countryCode } = body;
    const normalizedCountryCode = normalizeCountryCode(countryCode);
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    // Gerekli alanların doğrulanması
    if (!normalizedCountryCode || !normalizedPhoneNumber) {
      return res
        .status(REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.code,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.message,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode,
          ),
        );
    }

    // Telefon numarası formatının doğrulanması
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    if (!phoneRegex.test(`${normalizedCountryCode}${normalizedPhoneNumber}`)) {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_PHONE.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_PHONE.code,
            REGISTER_ERRORS.REGISTER_INVALID_PHONE.message,
            REGISTER_ERRORS.REGISTER_INVALID_PHONE.statusCode,
          ),
        );
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findOne({
      "phone.countryCode": normalizedCountryCode,
      "phone.phoneNumber": normalizedPhoneNumber,
    });

    if (!user) {
      return res
        .status(REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.code,
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.message,
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.statusCode,
          ),
        );
    }

    // Doğrulama kodu oluşturulur ve saklanır
    const verificationCode = generateNumericOTP(6);
    await createSecurityCode({
      userId: user._id,
      purpose: "PHONE_VERIFY",
      channel: "sms",
      rawCode: verificationCode,
      ttlMinutes: 10,
      metadata: { phone: `${normalizedCountryCode}${normalizedPhoneNumber}` },
    });

    // SMS gönder
    const fullPhoneNumber = `${normalizedCountryCode}${normalizedPhoneNumber}`;
    await sendSMS(fullPhoneNumber, `Doğrulama kodunuz: ${verificationCode}`);

    // Başarılı kod gönderme işlemi için yanıt gönderilir
    const responseData = {
      phoneNumber: normalizedPhoneNumber,
      countryCode: normalizedCountryCode,
    };

    if (process.env.NODE_ENV !== "production") {
      responseData.devVerificationCode = verificationCode;
    }

    return res.status(200).json(createSuccessResponse("VERIFICATION_CODE_SENT", "Doğrulama kodu gönderildi", 200, responseData));
  } catch (error) {
    console.error("Doğrulama kodu gönderme hatası:", error);
    return res
      .status(REGISTER_ERRORS.REGISTER_ERROR.statusCode)
      .json(createErrorResponse(REGISTER_ERRORS.REGISTER_ERROR.code, REGISTER_ERRORS.REGISTER_ERROR.message, REGISTER_ERRORS.REGISTER_ERROR.statusCode));
  }
};

const verifyPhoneNumber = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_BODY.code,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.message,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode,
          ),
        );
    }

    const { phoneNumber, countryCode, verificationCode } = body;
    const normalizedCountryCode = normalizeCountryCode(countryCode);
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    // Gerekli alanların doğrulanması

    if (!normalizedCountryCode || !normalizedPhoneNumber || !verificationCode) {
      return res
        .status(REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.code,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.message,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode,
          ),
        );
    }

    // Telefon numarası formatının doğrulanması
    const phoneRegex = /^\+[1-9]\d{7,14}$/;

    if (!phoneRegex.test(`${normalizedCountryCode}${normalizedPhoneNumber}`)) {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_PHONE.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_PHONE.code,
            REGISTER_ERRORS.REGISTER_INVALID_PHONE.message,
            REGISTER_ERRORS.REGISTER_INVALID_PHONE.statusCode,
          ),
        );
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findOne({
      "phone.countryCode": normalizedCountryCode,
      "phone.phoneNumber": normalizedPhoneNumber,
    });

    if (!user) {
      return res
        .status(REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.code,
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.message,
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.statusCode,
          ),
        );
    }

    const verifyResult = await consumeSecurityCode({
      userId: user._id,
      purpose: "PHONE_VERIFY",
      rawCode: verificationCode,
    });

    if (!verifyResult.ok) {
      return res.status(400).json(createErrorResponse("PHONE_VERIFICATION_CODE_INVALID", "Telefon doğrulama kodu geçersiz veya süresi dolmuş", 400));
    }

    // Telefon numarası doğrulandı olarak işaretlenir
    user.phone.verified = true;
    await user.save();

    // Başarılı doğrulama işlemi için yanıt gönderilir
    return res.status(200).json(
      createSuccessResponse("PHONE_VERIFIED", "Telefon numarası doğrulandı", 200, {
        phoneNumber: normalizedPhoneNumber,
        countryCode: normalizedCountryCode,
      }),
    );
  } catch (error) {
    console.error("Telefon numarası doğrulama hatası:", error);
    return res
      .status(REGISTER_ERRORS.REGISTER_ERROR.statusCode)
      .json(createErrorResponse(REGISTER_ERRORS.REGISTER_ERROR.code, REGISTER_ERRORS.REGISTER_ERROR.message, REGISTER_ERRORS.REGISTER_ERROR.statusCode));
  }
};

const sendEmailVerificationCode = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_BODY.code,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.message,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode,
          ),
        );
    }

    const { email } = body;
    // Gerekli alanların doğrulanması
    if (!email) {
      return res
        .status(REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.code,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.message,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode,
          ),
        );
    }

    // E-posta formatının doğrulanması
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_EMAIL.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.code,
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.message,
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.statusCode,
          ),
        );
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findOne({ "email.address": email });

    if (!user) {
      return res
        .status(REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.code,
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.message,
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.statusCode,
          ),
        );
    }

    // Doğrulama kodu oluşturulur ve kullanıcıya gönderilir
    const verificationCode = generateNumericOTP(6);
    await createSecurityCode({
      userId: user._id,
      purpose: "EMAIL_VERIFY",
      channel: "email",
      rawCode: verificationCode,
      ttlMinutes: 10,
      metadata: { email },
    });

    await sendMail({
      to: email,
      subject: "E-posta Dogrulama Kodu",
      text: `Dogrulama kodunuz: ${verificationCode}`,
    });
    // Başarılı kod gönderme işlemi için yanıt gönderilir
    const responseData = { email };

    if (process.env.NODE_ENV !== "production") {
      responseData.devVerificationCode = verificationCode;
    }

    return res.status(200).json(createSuccessResponse("EMAIL_VERIFICATION_CODE_SENT", "E-posta doğrulama kodu gönderildi", 200, responseData));
  } catch (error) {
    console.error("E-posta doğrulama kodu gönderme hatası:", error);
    return res
      .status(REGISTER_ERRORS.REGISTER_ERROR.statusCode)
      .json(createErrorResponse(REGISTER_ERRORS.REGISTER_ERROR.code, REGISTER_ERRORS.REGISTER_ERROR.message, REGISTER_ERRORS.REGISTER_ERROR.statusCode));
  }
};

const verifyEmail = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_BODY.code,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.message,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode,
          ),
        );
    }

    const { email, verificationCode } = body;

    // Gerekli alanların doğrulanması
    if (!email || !verificationCode) {
      return res
        .status(REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.code,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.message,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode,
          ),
        );
    }

    // E-posta formatının doğrulanması
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_EMAIL.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.code,
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.message,
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.statusCode,
          ),
        );
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findOne({ "email.address": email });

    if (!user) {
      return res
        .status(REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.code,
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.message,
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.statusCode,
          ),
        );
    }

    const verifyResult = await consumeSecurityCode({
      userId: user._id,
      purpose: "EMAIL_VERIFY",
      rawCode: verificationCode,
    });

    if (!verifyResult.ok) {
      return res.status(400).json(createErrorResponse("VERIFICATION_CODE_INVALID", "Doğrulama kodu geçersiz veya süresi dolmuş", 400));
    }

    // E-posta doğrulandı olarak işaretlenir
    user.email.verified = true;
    await user.save();

    // Başarılı doğrulama işlemi için yanıt gönderilir
    return res.status(200).json(
      createSuccessResponse("EMAIL_VERIFIED", "E-posta doğrulandı", 200, {
        email,
      }),
    );
  } catch (error) {
    console.error("E-posta doğrulama hatası:", error);
    return res
      .status(REGISTER_ERRORS.REGISTER_ERROR.statusCode)
      .json(createErrorResponse(REGISTER_ERRORS.REGISTER_ERROR.code, REGISTER_ERRORS.REGISTER_ERROR.message, REGISTER_ERRORS.REGISTER_ERROR.statusCode));
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_BODY.code,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.message,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode,
          ),
        );
    }

    const { email } = body;

    // Gerekli alanların doğrulanması
    if (!email) {
      return res
        .status(REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.code,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.message,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode,
          ),
        );
    }

    // E-posta formatının doğrulanması
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_EMAIL.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.code,
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.message,
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.statusCode,
          ),
        );
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findOne({ "email.address": email });

    if (!user) {
      return res
        .status(REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.code,
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.message,
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.statusCode,
          ),
        );
    }

    // Şifre sıfırlama kodu oluşturulur ve kullanıcıya gönderilir
    const resetCode = generateNumericOTP(6);
    await createSecurityCode({
      userId: user._id,
      purpose: "PASSWORD_RESET",
      channel: "email",
      rawCode: resetCode,
      ttlMinutes: 10,
      metadata: { email },
    });

    await sendMail({
      to: email,
      subject: "Sifre Sifirlama Kodu",
      text: `Sifre sifirlama kodunuz: ${resetCode}`,
    });

    // Başarılı kod gönderme işlemi için yanıt gönderilir
    return res.status(200).json(
      createSuccessResponse("PASSWORD_RESET_CODE_SENT", "Şifre sıfırlama kodu gönderildi", 200, {
        email,
      }),
    );
  } catch (error) {
    console.error("Şifre sıfırlama kodu gönderme hatası:", error);
    return res
      .status(REGISTER_ERRORS.REGISTER_ERROR.statusCode)
      .json(createErrorResponse(REGISTER_ERRORS.REGISTER_ERROR.code, REGISTER_ERRORS.REGISTER_ERROR.message, REGISTER_ERRORS.REGISTER_ERROR.statusCode));
  }
};

const changePassword = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_BODY.code,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.message,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode,
          ),
        );
    }

    const { userId, currentPassword, newPassword } = body;
    const requestUserId = req.user?._id?.toString();

    // Gerekli alanların doğrulanması
    if (!currentPassword || !newPassword) {
      return res
        .status(REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.code,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.message,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode,
          ),
        );
    }

    const targetUserId = requestUserId || userId;

    if (!targetUserId) {
      return res
        .status(REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.code,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.message,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode,
          ),
        );
    }

    if (requestUserId && userId && requestUserId !== String(userId)) {
      return res.status(403).json(createErrorResponse("USER_FORBIDDEN", "Bu islem icin yetkiniz yok", 403));
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findById(targetUserId);

    if (!user) {
      return res
        .status(REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.code,
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.message,
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.statusCode,
          ),
        );
    }

    // Mevcut şifrenin doğrulanması
    const isMatch = await comparePassword(currentPassword, user.password);

    if (!isMatch) {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_CREDENTIALS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_CREDENTIALS.code,
            REGISTER_ERRORS.REGISTER_INVALID_CREDENTIALS.message,
            REGISTER_ERRORS.REGISTER_INVALID_CREDENTIALS.statusCode,
          ),
        );
    }

    // Geçmiş 3 Şifreden farklı olması kontrolü
    const reusedPasswordChecks = await Promise.all((user.passwordHistory || []).map((historyItem) => comparePassword(newPassword, historyItem.password)));
    const isReusedPassword = reusedPasswordChecks.some(Boolean);

    if (isReusedPassword) {
      return res
        .status(REGISTER_ERRORS.REGISTER_REUSED_PASSWORD.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_REUSED_PASSWORD.code,
            REGISTER_ERRORS.REGISTER_REUSED_PASSWORD.message,
            REGISTER_ERRORS.REGISTER_REUSED_PASSWORD.statusCode,
          ),
        );
    }

    // Şifre güncellenir ve eski şifre geçmişine eklenir
    user.passwordHistory.unshift({ password: user.password, changedAt: new Date() });
    if (user.passwordHistory.length > 3) {
      user.passwordHistory.pop();
    }

    user.password = newPassword;
    await user.save();

    // Başarılı şifre değiştirme işlemi için yanıt gönderilir
    return res.status(200).json(
      createSuccessResponse("PASSWORD_CHANGED", "Şifre başarıyla değiştirildi", 200, {
        userId: targetUserId,
      }),
    );
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);
    return res
      .status(REGISTER_ERRORS.REGISTER_ERROR.statusCode)
      .json(createErrorResponse(REGISTER_ERRORS.REGISTER_ERROR.code, REGISTER_ERRORS.REGISTER_ERROR.message, REGISTER_ERRORS.REGISTER_ERROR.statusCode));
  }
};

const resetPassword = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_BODY.code,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.message,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode,
          ),
        );
    }

    const { email, verificationCode, newPassword } = body;

    // Gerekli alanların doğrulanması
    if (!email || !verificationCode || !newPassword) {
      return res
        .status(REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.code,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.message,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode,
          ),
        );
    }

    // E-posta formatının doğrulanması
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_EMAIL.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.code,
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.message,
            REGISTER_ERRORS.REGISTER_INVALID_EMAIL.statusCode,
          ),
        );
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findOne({ "email.address": email });

    if (!user) {
      return res
        .status(REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.code,
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.message,
            REGISTER_ERRORS.REGISTER_EMAIL_NOT_FOUND.statusCode,
          ),
        );
    }

    const verifyResult = await consumeSecurityCode({
      userId: user._id,
      purpose: "PASSWORD_RESET",
      rawCode: verificationCode,
    });

    if (!verifyResult.ok) {
      return res.status(400).json(createErrorResponse("PASSWORD_RESET_CODE_INVALID", "Sifirlama kodu gecersiz veya suresi dolmus", 400));
    }

    // Şifre sıfırlanır
    user.password = newPassword;
    await user.save();

    // Başarılı şifre sıfırlama işlemi için yanıt gönderilir
    return res.status(200).json(
      createSuccessResponse("PASSWORD_RESET_SUCCESS", "Şifre başarıyla sıfırlandı", 200, {
        email,
      }),
    );
  } catch (error) {
    console.error("Şifre sıfırlama hatası:", error);
    return res
      .status(REGISTER_ERRORS.REGISTER_ERROR.statusCode)
      .json(createErrorResponse(REGISTER_ERRORS.REGISTER_ERROR.code, REGISTER_ERRORS.REGISTER_ERROR.message, REGISTER_ERRORS.REGISTER_ERROR.statusCode));
  }
};

const switchTwoFactorAuth = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_INVALID_BODY.code,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.message,
            REGISTER_ERRORS.REGISTER_INVALID_BODY.statusCode,
          ),
        );
    }

    const { userId, status } = body;
    const requestUserId = req.user?._id?.toString();

    // Gerekli alanların doğrulanması
    if (!userId && !requestUserId) {
      return res
        .status(REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.code,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.message,
            REGISTER_ERRORS.REGISTER_MISSING_FIELDS.statusCode,
          ),
        );
    }

    const targetUserId = requestUserId || userId;

    if (requestUserId && userId && requestUserId !== String(userId)) {
      return res.status(403).json(createErrorResponse("USER_FORBIDDEN", "Bu islem icin yetkiniz yok", 403));
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findById(targetUserId);

    if (!user) {
      return res
        .status(REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.code,
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.message,
            REGISTER_ERRORS.REGISTER_PHONE_NOT_FOUND.statusCode,
          ),
        );
    }

    // 2FA Statusu güncellenir
    user.accountSecurity.twoFactorAuth.enabled = status;

    let recoveryCodes = [];
    if (status) {
      recoveryCodes = Array.from({ length: 8 }, () => generateAlphaNumericOTP(8));

      await SecurityCode.deleteMany({ userId: user._id, purpose: "TWO_FACTOR_RECOVERY" });

      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await SecurityCode.insertMany(
        recoveryCodes.map((code) => ({
          userId: user._id,
          channel: "recovery",
          purpose: "TWO_FACTOR_RECOVERY",
          codeHash: hashCode(code),
          expiresAt,
          maxAttempts: 1,
        })),
      );
    }

    if (!status) {
      await SecurityCode.deleteMany({ userId: user._id, purpose: "TWO_FACTOR_RECOVERY" });
    }

    await user.save();

    // Başarılı 2FA etkinleştirme işlemi için yanıt gönderilir (Başarılı ise codes gönderilsin)
    return res
      .status(200)
      .json(
        createSuccessResponse(
          "TWO_FACTOR_AUTH_UPDATED",
          `İki faktörlü doğrulama ${status ? "etkinleştirildi" : "devre dışı bırakıldı"}`,
          200,
          status ? { recoveryCodes } : {},
        ),
      );
  } catch (error) {
    console.error("2FA etkinleştirme hatası:", error);
    return res
      .status(REGISTER_ERRORS.REGISTER_ERROR.statusCode)
      .json(createErrorResponse(REGISTER_ERRORS.REGISTER_ERROR.code, REGISTER_ERRORS.REGISTER_ERROR.message, REGISTER_ERRORS.REGISTER_ERROR.statusCode));
  }
};

const sendTwoFactorCode = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(LOGIN_ERRORS.LOGIN_INVALID_BODY.statusCode)
        .json(createErrorResponse(LOGIN_ERRORS.LOGIN_INVALID_BODY.code, LOGIN_ERRORS.LOGIN_INVALID_BODY.message, LOGIN_ERRORS.LOGIN_INVALID_BODY.statusCode));
    }

    const { userId } = body;
    const requestUserId = req.user?._id?.toString();

    // Gerekli alanların doğrulanması
    if (!userId && !requestUserId) {
      return res
        .status(LOGIN_ERRORS.LOGIN_MISSING_FIELDS.statusCode)
        .json(
          createErrorResponse(LOGIN_ERRORS.LOGIN_MISSING_FIELDS.code, LOGIN_ERRORS.LOGIN_MISSING_FIELDS.message, LOGIN_ERRORS.LOGIN_MISSING_FIELDS.statusCode),
        );
    }

    const targetUserId = requestUserId || userId;

    if (requestUserId && userId && requestUserId !== String(userId)) {
      return res.status(403).json(createErrorResponse("USER_FORBIDDEN", "Bu islem icin yetkiniz yok", 403));
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findById(targetUserId);

    if (!user) {
      return res
        .status(LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.code, LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.message, LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.statusCode),
        );
    }

    // 2FA kodu oluşturulur ve kullanıcıya gönderilir (e-posta)
    const twoFactorCode = generateNumericOTP(6);

    await createSecurityCode({
      userId: user._id,
      purpose: "TWO_FACTOR_LOGIN",
      channel: "email",
      rawCode: twoFactorCode,
      ttlMinutes: 5,
      maxAttempts: 5,
      metadata: { email: user.email?.address || null },
    });

    if (user.email?.address) {
      await sendMail({
        to: user.email.address,
        subject: "2FA Dogrulama Kodu",
        text: `2FA kodunuz: ${twoFactorCode}`,
      });
    }

    // Başarılı kod gönderme işlemi için yanıt gönderilir
    return res.status(200).json(
      createSuccessResponse("TWO_FACTOR_CODE_SENT", "İki faktörlü doğrulama kodu gönderildi", 200, {
        userId: user._id,
      }),
    );
  } catch (error) {
    console.error("2FA kodu gönderme hatası:", error);
    return res
      .status(LOGIN_ERRORS.LOGIN_ERROR.statusCode)
      .json(createErrorResponse(LOGIN_ERRORS.LOGIN_ERROR.code, LOGIN_ERRORS.LOGIN_ERROR.message, LOGIN_ERRORS.LOGIN_ERROR.statusCode));
  }
};

const verifyTwoFactorCode = async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!req.body || typeof req.body !== "object") {
      return res
        .status(LOGIN_ERRORS.LOGIN_INVALID_BODY.statusCode)
        .json(createErrorResponse(LOGIN_ERRORS.LOGIN_INVALID_BODY.code, LOGIN_ERRORS.LOGIN_INVALID_BODY.message, LOGIN_ERRORS.LOGIN_INVALID_BODY.statusCode));
    }

    const { userId, verificationCode } = body;
    const requestUserId = req.user?._id?.toString();

    // Gerekli alanların doğrulanması
    if ((!userId && !requestUserId) || !verificationCode) {
      return res
        .status(LOGIN_ERRORS.LOGIN_MISSING_FIELDS.statusCode)

        .json(
          createErrorResponse(LOGIN_ERRORS.LOGIN_MISSING_FIELDS.code, LOGIN_ERRORS.LOGIN_MISSING_FIELDS.message, LOGIN_ERRORS.LOGIN_MISSING_FIELDS.statusCode),
        );
    }

    const targetUserId = requestUserId || userId;

    if (requestUserId && userId && requestUserId !== String(userId)) {
      return res.status(403).json(createErrorResponse("USER_FORBIDDEN", "Bu islem icin yetkiniz yok", 403));
    }

    // Kullanıcının veritabanında bulunması
    const user = await User.findById(targetUserId);

    if (!user) {
      return res
        .status(LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.code, LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.message, LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.statusCode),
        );
    }

    let verifyResult = await consumeSecurityCode({
      userId: user._id,
      purpose: "TWO_FACTOR_LOGIN",
      rawCode: verificationCode,
    });

    if (!verifyResult.ok) {
      verifyResult = await consumeSecurityCode({
        userId: user._id,
        purpose: "TWO_FACTOR_RECOVERY",
        rawCode: verificationCode,
      });
    }

    if (!verifyResult.ok) {
      return res.status(400).json(createErrorResponse("TWO_FACTOR_CODE_INVALID", "2FA kodu gecersiz veya suresi dolmus", 400));
    }

    const token = generateToken(user._id);
    res.cookie("token", token, authCookieOptions);

    // Başarılı 2FA doğrulama işlemi için yanıt gönderilir
    return res.status(200).json(
      createSuccessResponse("TWO_FACTOR_VERIFIED", "İki faktörlü doğrulama başarılı", 200, {
        userId: user.uuid,
        firstName: user.firstName,
        role: user.role,
      }),
    );
  } catch (error) {
    console.error("2FA doğrulama hatası:", error);
    return res
      .status(LOGIN_ERRORS.LOGIN_ERROR.statusCode)
      .json(createErrorResponse(LOGIN_ERRORS.LOGIN_ERROR.code, LOGIN_ERRORS.LOGIN_ERROR.message, LOGIN_ERRORS.LOGIN_ERROR.statusCode));
  }
};

const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", authCookieOptions);
    return res.status(200).json(createSuccessResponse("LOGOUT_SUCCESS", "Çıkış başarılı", 200));
  } catch (error) {
    console.error("Çıkış hatası:", error);
    return res
      .status(LOGOUT_ERRORS.LOGOUT_ERROR.statusCode)
      .json(createErrorResponse(LOGOUT_ERRORS.LOGOUT_ERROR.code, LOGOUT_ERRORS.LOGOUT_ERROR.message, LOGOUT_ERRORS.LOGOUT_ERROR.statusCode));
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -passwordHistory -accountSecurity.twoFactorAuthSecret -accountSecurity.twoFactorAuthRecoveryCodes",
    );

    if (!user) {
      return res
        .status(LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.statusCode)
        .json(
          createErrorResponse(LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.code, LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.message, LOGIN_ERRORS.LOGIN_USER_NOT_FOUND.statusCode),
        );
    }

    return res.status(200).json(createSuccessResponse("CURRENT_USER_SUCCESS", "Kullanıcı bilgisi getirildi", 200, { user }));
  } catch (error) {
    console.error("Kullanıcı bilgisi getirme hatası:", error);
    return res
      .status(LOGIN_ERRORS.LOGIN_ERROR.statusCode)
      .json(createErrorResponse(LOGIN_ERRORS.LOGIN_ERROR.code, "Kullanıcı bilgisi alınırken bir hata oluştu", LOGIN_ERRORS.LOGIN_ERROR.statusCode));
  }
};

export {
  registerUser,
  loginUser,
  sendVerificationCode,
  verifyPhoneNumber,
  sendEmailVerificationCode,
  verifyEmail,
  requestPasswordReset,
  changePassword,
  resetPassword,
  switchTwoFactorAuth,
  sendTwoFactorCode,
  verifyTwoFactorCode,
  logoutUser,
  getCurrentUser,
};
