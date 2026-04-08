// utils/generateToken.js
// Bu dosya, JWT token oluşturma ve şifre hashleme işlemleri için yardımcı fonksiyonları içerir.
// generateToken: Kullanıcı ID'si ve opsiyonel olarak token süresi alarak JWT token oluşturur.
// hashPassword: Düz metin şifreyi alır ve bcrypt kullanarak hashler.
// comparePassword: Düz metin şifre ile hashlenmiş şifreyi karşılaştırır.
// generateUserID: Benzersiz bir kullanıcı ID'si (UUID) oluşturur.

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const generateToken = (id, expiresIn) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || "30d",
  });
};

const decodedToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Token doğrulama hatası:", error);
    return null;
  }
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
};

const generateUserID = async () => {
  const { v4: uuidv4 } = await import("uuid");
  return uuidv4();
};

const generateAlphaNumericOTP = (length = 6) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

const generateNumericOTP = (length = 6) => {
  const digits = "0123456789";
  let token = "";

  for (let i = 0; i < length; i++) {
    token += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return token;
};

export { generateToken, decodedToken, hashPassword, comparePassword, generateUserID, generateAlphaNumericOTP, generateNumericOTP };
