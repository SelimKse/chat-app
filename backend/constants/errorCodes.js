/**
 * Hata Kodları ve Durum Yönetimi
 * Tüm API response'ları bu standartlar ile dönülürler
 *
 * Response Format:
 * {
 *   status: true/false,
 *   code: "ERROR_CODE",
 *   message: "Hata veya başarı mesajı",
 *   statusCode: 200/400/401/403/404/409/500,
 *   data: {} // isteğe bağlı
 * }
 */

// ==================== KAYıT HATALARI ====================
export const REGISTER_ERRORS = {
  REGISTER_SUCCESS: {
    status: true,
    code: "REGISTER_SUCCESS",
    message: "Kayıt başarılı",
    statusCode: 201,
  },
  REGISTER_ERROR: {
    status: false,
    code: "REGISTER_ERROR",
    message: "Kayıt sırasında bir hata oluştu",
    statusCode: 500,
  },
  REGISTER_MISSING_FIELDS: {
    status: false,
    code: "REGISTER_MISSING_FIELDS",
    message: "Gerekli alanlar eksik",
    statusCode: 400,
  },
  REGISTER_INVALID_BODY: {
    status: false,
    code: "REGISTER_INVALID_BODY",
    message: "Geçersiz istek gövdesi. JSON body gönderin",
    statusCode: 400,
  },
  REGISTER_PHONE_EXISTS: {
    status: false,
    code: "REGISTER_PHONE_EXISTS",
    message: "Bu telefon numarası zaten kayıtlı",
    statusCode: 409,
  },
  REGISTER_EMAIL_EXISTS: {
    status: false,
    code: "REGISTER_EMAIL_EXISTS",
    message: "Bu e-posta adresi zaten kayıtlı",
    statusCode: 409,
  },
  REGISTER_WEAK_PASSWORD: {
    status: false,
    code: "REGISTER_WEAK_PASSWORD",
    message: "Şifre çok zayıf. En az 8 karakter, büyük harf, küçük harf ve rakam içermelidir",
    statusCode: 400,
  },
  REGISTER_INVALID_PHONE: {
    status: false,
    code: "REGISTER_INVALID_PHONE",
    message: "Geçersiz telefon numarası formatı",
    statusCode: 400,
  },
  REGISTER_INVALID_EMAIL: {
    status: false,
    code: "REGISTER_INVALID_EMAIL",
    message: "Geçersiz e-posta formatı",
    statusCode: 400,
  },
  REGISTER_PHONE_NOT_FOUND: {
    status: false,
    code: "REGISTER_PHONE_NOT_FOUND",
    message: "Telefon numarasına ait kullanıcı bulunamadı",
    statusCode: 404,
  },
  REGISTER_EMAIL_NOT_FOUND: {
    status: false,
    code: "REGISTER_EMAIL_NOT_FOUND",
    message: "E-posta adresine ait kullanıcı bulunamadı",
    statusCode: 404,
  },
  REGISTER_INVALID_CREDENTIALS: {
    status: false,
    code: "REGISTER_INVALID_CREDENTIALS",
    message: "Kimlik bilgileri hatalı",
    statusCode: 401,
  },
  REGISTER_REUSED_PASSWORD: {
    status: false,
    code: "REGISTER_REUSED_PASSWORD",
    message: "Yeni şifre, son kullanılan şifrelerle aynı olamaz",
    statusCode: 400,
  },
};

// ==================== GİRİŞ HATALARI ====================
export const LOGIN_ERRORS = {
  LOGIN_SUCCESS: {
    status: true,
    code: "LOGIN_SUCCESS",
    message: "Giriş başarılı",
    statusCode: 200,
  },
  LOGIN_ERROR: {
    status: false,
    code: "LOGIN_ERROR",
    message: "Giriş sırasında bir hata oluştu",
    statusCode: 500,
  },
  LOGIN_MISSING_FIELDS: {
    status: false,
    code: "LOGIN_MISSING_FIELDS",
    message: "Telefon numarası ve şifre gereklidir",
    statusCode: 400,
  },
  LOGIN_INVALID_BODY: {
    status: false,
    code: "LOGIN_INVALID_BODY",
    message: "Geçersiz istek gövdesi. JSON body gönderin",
    statusCode: 400,
  },
  LOGIN_USER_NOT_FOUND: {
    status: false,
    code: "LOGIN_USER_NOT_FOUND",
    message: "Kullanıcı bulunamadı",
    statusCode: 404,
  },
  LOGIN_INVALID_CREDENTIALS: {
    status: false,
    code: "LOGIN_INVALID_CREDENTIALS",
    message: "Telefon numarası veya şifre hatalı",
    statusCode: 401,
  },
  LOGIN_ACCOUNT_LOCKED: {
    status: false,
    code: "LOGIN_ACCOUNT_LOCKED",
    message: "Hesap kilitlenmiş. Lütfen daha sonra tekrar deneyiniz",
    statusCode: 403,
  },
  LOGIN_ACCOUNT_BANNED: {
    status: false,
    code: "LOGIN_ACCOUNT_BANNED",
    message: "Hesabınız yasaklanmış",
    statusCode: 403,
  },
  LOGIN_ACCOUNT_INACTIVE: {
    status: false,
    code: "LOGIN_ACCOUNT_INACTIVE",
    message: "Hesabınız pasif durumda",
    statusCode: 403,
  },
};

// ==================== DOĞRULAMA HATALARI ====================
export const VERIFICATION_ERRORS = {
  VERIFICATION_SUCCESS: {
    status: true,
    code: "VERIFICATION_SUCCESS",
    message: "Doğrulama başarılı",
    statusCode: 200,
  },
  VERIFICATION_ERROR: {
    status: false,
    code: "VERIFICATION_ERROR",
    message: "Doğrulama sırasında bir hata oluştu",
    statusCode: 500,
  },
  VERIFICATION_CODE_INVALID: {
    status: false,
    code: "VERIFICATION_CODE_INVALID",
    message: "Geçersiz doğrulama kodu",
    statusCode: 400,
  },
  VERIFICATION_CODE_EXPIRED: {
    status: false,
    code: "VERIFICATION_CODE_EXPIRED",
    message: "Doğrulama kodunun süresi dolmuş",
    statusCode: 400,
  },
  VERIFICATION_CODE_NOT_SENT: {
    status: false,
    code: "VERIFICATION_CODE_NOT_SENT",
    message: "Doğrulama kodu gönderilemedi",
    statusCode: 500,
  },
};

// ==================== KULLANICI HATALARI ====================
export const USER_ERRORS = {
  USER_NOT_FOUND: {
    status: false,
    code: "USER_NOT_FOUND",
    message: "Kullanıcı bulunamadı",
    statusCode: 404,
  },
  USER_ERROR: {
    status: false,
    code: "USER_ERROR",
    message: "Kullanıcı işlemi sırasında bir hata oluştu",
    statusCode: 500,
  },
  USER_UPDATE_SUCCESS: {
    status: true,
    code: "USER_UPDATE_SUCCESS",
    message: "Kullanıcı bilgileri güncellendi",
    statusCode: 200,
  },
  USER_DELETE_SUCCESS: {
    status: true,
    code: "USER_DELETE_SUCCESS",
    message: "Kullanıcı silindi",
    statusCode: 200,
  },
  USER_UNAUTHORIZED: {
    status: false,
    code: "USER_UNAUTHORIZED",
    message: "Yetkilendirme başarısız",
    statusCode: 401,
  },
  USER_FORBIDDEN: {
    status: false,
    code: "USER_FORBIDDEN",
    message: "Bu işlemi gerçekleştirme yetkisine sahip değilsiniz",
    statusCode: 403,
  },
};

// ==================== TOKEN HATALARI ====================
export const TOKEN_ERRORS = {
  TOKEN_MISSING: {
    status: false,
    code: "TOKEN_MISSING",
    message: "Token bulunamadı",
    statusCode: 401,
  },
  TOKEN_INVALID: {
    status: false,
    code: "TOKEN_INVALID",
    message: "Geçersiz token",
    statusCode: 401,
  },
  TOKEN_EXPIRED: {
    status: false,
    code: "TOKEN_EXPIRED",
    message: "Token süresi dolmuş",
    statusCode: 401,
  },
  TOKEN_ERROR: {
    status: false,
    code: "TOKEN_ERROR",
    message: "Token işlemi sırasında bir hata oluştu",
    statusCode: 500,
  },
};

// ==================== ÇIKIŞ HATALARI ====================
export const LOGOUT_ERRORS = {
  LOGOUT_ERROR: {
    status: false,
    code: "LOGOUT_ERROR",
    message: "Çıkış işlemi sırasında bir hata oluştu",
    statusCode: 500,
  },
};

// ==================== GENEL HATALARI ====================
export const GENERAL_ERRORS = {
  SERVER_ERROR: {
    status: false,
    code: "SERVER_ERROR",
    message: "Sunucu hatası",
    statusCode: 500,
  },
  NOT_FOUND: {
    status: false,
    code: "NOT_FOUND",
    message: "Sayfa bulunamadı",
    statusCode: 404,
  },
  BAD_REQUEST: {
    status: false,
    code: "BAD_REQUEST",
    message: "Geçersiz istek",
    statusCode: 400,
  },
  UNAUTHORIZED: {
    status: false,
    code: "UNAUTHORIZED",
    message: "Yetkilendirme başarısız",
    statusCode: 401,
  },
  FORBIDDEN: {
    status: false,
    code: "FORBIDDEN",
    message: "Erişim yasak",
    statusCode: 403,
  },
};

// ==================== TÜM HATALARI BIRLEŞTIR ====================
export const ERROR_CODES = {
  ...REGISTER_ERRORS,
  ...LOGIN_ERRORS,
  ...VERIFICATION_ERRORS,
  ...USER_ERRORS,
  ...TOKEN_ERRORS,
  ...LOGOUT_ERRORS,
  ...GENERAL_ERRORS,
};

/**
 * Response Helper Fonksiyonu
 * @param {object} errorCode - ERROR_CODES içinden seçilen hata
 * @param {string|object} customMessage - İsteğe bağlı özel mesaj
 * @returns {object} Standart response objesi
 */
export const createResponse = (errorCode, customMessage = null) => {
  return {
    status: errorCode.status,
    code: errorCode.code,
    message: customMessage || errorCode.message,
    statusCode: errorCode.statusCode,
  };
};

/**
 * Başarı Response Helper Fonksiyonu
 * @param {string} code - Başarı kodu
 * @param {string} message - Başarı mesajı
 * @param {number} statusCode - HTTP status kodu
 * @param {object} data - İsteğe bağlı data
 * @returns {object} Standart success response objesi
 */
export const createSuccessResponse = (code, message, statusCode = 200, data = null) => {
  const response = {
    status: true,
    code,
    message,
    statusCode,
  };

  if (data) {
    response.data = data;
  }

  return response;
};

/**
 * Hata Response Helper Fonksiyonu
 * @param {string} code - Hata kodu
 * @param {string} message - Hata mesajı
 * @param {number} statusCode - HTTP status kodu
 * @param {object} errors - İsteğe bağlı detaylı hata bilgileri
 * @returns {object} Standart error response objesi
 */
export const createErrorResponse = (code, message, statusCode = 500, errors = null) => {
  const response = {
    status: false,
    code,
    message,
    statusCode,
  };

  if (errors) {
    response.errors = errors;
  }

  return response;
};
